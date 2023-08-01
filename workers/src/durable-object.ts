import { createDurable } from 'itty-durable';
import { RequestLike } from 'itty-router';
import { Environment } from './env';
import { signAndSerializeSessionId } from './session';

interface User {
	id: string;
	name: string;
	city?: string;
	country: string;
	webSocket?: WebSocket;
	ping: number;
	position: number;
	connected: boolean;
	admin: boolean;
	finished?: number;
}

interface SafeUser extends User {
	webSocket: undefined;
	city: undefined;
}

const enum GameState {
	Waiting,
	Countdown,
	Playing,
	Finished,
}

type Message =
	| Message.Ping
	| Message.Pong
	| Message.IncomingPosition
	| Message.OutgoingPositions
	| Message.Statistics;

namespace Message {
	export type Ping = {
		type: 'ping';
		data: {
			id: string;
			lastPingMs: number;
		};
	};

	export type Pong = {
		type: 'pong';
		data: {
			id: string;
			time: number;
		};
	};

	export type IncomingPosition = {
		type: 'update-position';
		data: number;
	};

	export type OutgoingPositions = {
		type: 'positions';
		data: Map<SafeUser['id'], number>;
	};

	export type Statistics = {
		type: 'statistics';
		data: any;
	};
}

const healthCheckInterval = 10000;
const countdownTime = 10000;

export interface MultiplayerGame {
	state: GameState;
	startTime?: number;
	endTime?: number;
	countdownTime?: number;
	users: Record<string, User>;
	passage?: {
		index: number;
		length: number;
	};
	statistics: Record<string, any>;
}

export class GameDurableObject extends createDurable() {
	game: MultiplayerGame;
	dolocation: string;
	env: Environment;

	constructor(state: DurableObjectState, env: Environment) {
		super(state);

		this.dolocation = '';
		this.game = {
			users: {},
			startTime: undefined,
			countdownTime: undefined,
			state: GameState.Waiting,
			passage: undefined,
			statistics: {},
		};
		this.env = env;

		this.scheduleNextAlarm();
		this.getDurableObjectLocation();
	}

	async connect(name: string, request: RequestLike) {
		if (!request.session) {
			if (this.game.state !== GameState.Waiting) {
				return new Response("Can't join an in progress game", {
					status: 400,
				});
			}

			if (name.length < 1 || name.length > 16) {
				return new Response(
					'Name length must be between 1 and 16 characters (inclusive)',
					{ status: 400 },
				);
			}
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		const user = await this.handleWebSocketSession(server, request, name);

		let headers = {};
		if (user.id !== request?.session?.id) {
			const cookie = await signAndSerializeSessionId(
				user.id,
				this.env.SESSION_SECRET,
				this.env.WORKER_ENV !== 'development',
				this.env.WORKER_ENV !== 'development'
					? this.env.WORKER_HOST
					: undefined,
			);

			headers = {
				'Set-Cookie': cookie,
			};
		}

		return new Response(null, {
			status: 101,
			webSocket: client,
			headers,
		});
	}

	attemptStart(session: User) {
		if (!session.admin) {
			return new Response(null, { status: 403 });
		}

		if (this.game.state !== GameState.Waiting) {
			return new Response(null, { status: 400 });
		}

		const now = Date.now();

		this.game.state = GameState.Countdown;
		this.game.countdownTime = now;
		this.setAlarm(now + countdownTime);
		this.sendGame();
		return 'Success';
	}

	attemptSetPassage(
		session: User,
		passage: { index: number; length: number },
	) {
		if (!session.admin) {
			return new Response(null, { status: 403 });
		}

		if (this.game.passage) {
			return new Response(null, { status: 400 });
		}

		this.game.passage = passage;
		this.sendGame();
		return 'Success';
	}

	async handleWebSocketSession(
		webSocket: WebSocket,
		request: RequestLike,
		name: string,
	) {
		(webSocket as any).accept();

		const metadata = request.cf;
		let user = request?.session;

		if (!user) {
			user = {
				id: crypto.randomUUID(),
				name,
				city: metadata?.city,
				country: metadata?.country,
				webSocket: webSocket,
				ping: 0,
				position: 0,
				connected: true,
				admin: Object.keys(this.game.users).length === 0,
			};

			this.game.users[user.id] = user;
		}

		this.game.users[user.id] = {
			...user,
			connected: true,
			webSocket: webSocket,
		};

		this.sendGame();

		webSocket.addEventListener('message', async (msg) => {
			try {
				const incomingMessage = JSON.parse(
					msg.data.toString(),
				) as Message;

				const user = this.getUserByConnection(webSocket);

				if (!user) return;

				switch (incomingMessage.type) {
					case 'ping':
						const lastPingMs = incomingMessage.data.lastPingMs;

						if (lastPingMs) {
							user.ping = lastPingMs;
						}

						const msg: Message.Pong = {
							type: 'pong',
							data: {
								id: incomingMessage.data.id,
								time: Date.now(),
							},
						};
						webSocket.send(JSON.stringify(msg));
						this.sendGame();
						break;
					case 'update-position':
						const position = incomingMessage.data;

						this.game.users[user.id].position = position;

						if (position === this.game.passage?.length) {
							this.game.users[user.id].finished = Object.values(
								this.game.users,
							).reduce(
								(prev, cur) =>
									prev + Number(cur.finished !== undefined),
								0,
							);

							const allDone = Object.values(
								this.game.users,
							).every(
								(user) =>
									user.position ===
										this.game.passage?.length ||
									!user.connected,
							);

							if (allDone) {
								this.game.endTime = Date.now();
								this.game.state = GameState.Finished;
							}
						}

						this.sendGame();
						break;
					case 'statistics':
						this.game.statistics[user.id] = incomingMessage.data;
						break;
				}
			} catch (err) {
				// Report any exceptions directly back to the client. As with our handleErrors() this
				// probably isn't what you'd want to do in production, but it's convenient when testing.
				webSocket.send(JSON.stringify({ error: err.stack }));
			}
		});

		const closeOrErrorHandler = () => {
			this.game.users[user.id].connected = false;
			this.sendGame();
		};
		webSocket.addEventListener('close', closeOrErrorHandler);
		webSocket.addEventListener('error', closeOrErrorHandler);

		return user;
	}

	getGame() {
		const users = {} as Record<string, SafeUser>;
		for (const [_, user] of Object.entries(this.game.users)) {
			users[user.id] = {
				...user,
				webSocket: undefined,
				city: undefined,
			};
		}

		return {
			...this.game,
			users,
		};
	}

	sendGame() {
		const game = this.getGame();

		this.broadcast(
			JSON.stringify({
				type: 'game',
				data: game,
			}),
		);
	}

	// broadcast() broadcasts a message to all clients.
	broadcast(message: string, exclude: Set<User['id']> = new Set()) {
		// Iterate over all the sessions sending them messages.
		Object.entries(this.game.users)
			.filter(([_, user]) => !exclude.has(user.id) && user.connected)
			.forEach(([key, user]) => {
				try {
					user?.webSocket?.send(message);
				} catch (err) {
					this.game.users[key].connected = false;
				}
			});
	}

	async getDurableObjectLocation() {
		const res = await fetch('https://workers.cloudflare.com/cf.json');
		const json =
			(await res.json()) as IncomingRequestCfPropertiesGeographicInformation;
		this.dolocation =
			'city' in json ? `${json.city} (${json.country})` : 'No location';
	}

	getSession(sessionId: string) {
		const user = this.game.users[sessionId] ?? null;
		return user;
	}

	getUserByConnection(socket: WebSocket) {
		return Object.values(this.game.users).find(
			({ webSocket }) => webSocket === socket,
		);
	}

	scheduleNextAlarm() {
		try {
			const alarmTime = Date.now() + healthCheckInterval;
			this.setAlarm(alarmTime);
		} catch {
			console.log(
				'Durable Objects Alarms not supported in Miniflare (--local mode) yet.',
			);
		}
	}

	alarm() {
		if (this.game.state === GameState.Countdown) {
			this.game.state = GameState.Playing;
			this.game.startTime = Date.now();
		}

		if (
			Object.keys(this.game.users).filter(
				(id) => this.game.users[id].connected,
			).length > 0
		) {
			this.scheduleNextAlarm();
		}

		this.sendGame();
	}
}
