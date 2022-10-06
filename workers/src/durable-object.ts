interface User {
    id: string;
    name: string;
    city: string | undefined;
    country: string;
    webSocket: WebSocket;
    ping: number;
    position: number;
}

const enum GameState {
    Waiting,
    Playing,
    Finished,
}

type Message =
    | Message.Ping
    | Message.Pong
    | Message.IncomingPosition
    | Message.OutgoingPositions;

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
            dolocation: string;
            users: Array<User & { ping: number; webSocket: undefined }>;
        };
    };

    export type IncomingPosition = {
        type: 'update-position';
        data: number;
    };

    export type OutgoingPositions = {
        type: 'positions';
        data: Map<User['id'], number>;
    };
}

// every 10 seconds
const healthCheckInterval = 10e3;

export interface MultiplayerGame {
    state: GameState;
    users: Record<string, User>;
    passageIndex: number;
}

export class GameDurableObject {
    game: MultiplayerGame;
    storage: DurableObjectStorage;
    dolocation: string;

    constructor(state: DurableObjectState) {
        this.storage = state.storage;
        this.dolocation = '';
        this.game = {
            users: {},
            state: GameState.Waiting,
            passageIndex: -1,
        };

        this.scheduleNextAlarm(this.storage);
        this.getDurableObjectLocation();
    }

    async fetch(request: Request) {
        if (new URL(request.url).pathname.endsWith('/passage')) {
            const text = await request.text();
            this.game.passageIndex = parseInt(text);
            this.sendGame();
            return new Response(null, { status: 200 });
        }

        if (new URL(request.url).pathname.startsWith('/game/')) {
            return new Response(JSON.stringify(this.game), { status: 200 });
        }

        let pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        await this.handleWebSocketSession(server, request);

        return new Response(null, { status: 101, webSocket: client });
    }

    async handleWebSocketSession(webSocket: WebSocket, request: Request) {
        webSocket.accept();

        const metadata = request.cf;
        const submission = new URL(request.url).searchParams;
        const userId = submission.get('userId');
        this.game.users[userId] = {
            id: userId,
            name: submission.get('name'),
            city: metadata.city,
            country: metadata.country,
            webSocket: webSocket,
            ping: 0,
            position: 0,
        };

        this.sendGame();

        webSocket.addEventListener('message', async (msg) => {
            try {
                // Parse the incoming message
                let incomingMessage = JSON.parse(
                    msg.data.toString()
                ) as Message;

                switch (incomingMessage.type) {
                    case 'ping':
                        const lastPingMs = incomingMessage.data.lastPingMs;

                        const msg: Message.Pong = {
                            type: 'pong',
                            data: {
                                id: incomingMessage.data.id,
                                time: Date.now(),
                                dolocation: this.dolocation,
                                users: Object.values(this.game.users).map(
                                    (user) => {
                                        // update user's ping
                                        if (
                                            lastPingMs &&
                                            user.webSocket === webSocket
                                        ) {
                                            user.ping = lastPingMs;
                                        }

                                        return {
                                            ...user,
                                            ping: user.ping,
                                            webSocket: undefined,
                                        };
                                    }
                                ),
                            },
                        };
                        webSocket.send(JSON.stringify([msg]));
                        break;
                    case 'update-position':
                        this.game.users[userId] = {
                            ...this.game.users[userId],
                            position: incomingMessage.data,
                        };

                        this.sendGame();
                        break;
                }
            } catch (err) {
                // Report any exceptions directly back to the client. As with our handleErrors() this
                // probably isn't what you'd want to do in production, but it's convenient when testing.
                webSocket.send(JSON.stringify({ error: err.stack }));
            }
        });

        const closeOrErrorHandler = () => {
            delete this.game.users[userId];
        };
        webSocket.addEventListener('close', closeOrErrorHandler);
        webSocket.addEventListener('error', closeOrErrorHandler);
    }

    sendGame() {
        const users = {} as Record<string, User>;
        for (const [_, user] of Object.entries(this.game.users)) {
            users[user.id] = {
                ...user,
                webSocket: undefined,
                city: undefined,
            };
        }

        this.broadcast(
            JSON.stringify({
                type: 'game',
                data: {
                    ...this.game,
                    users,
                },
            })
        );
    }

    // broadcast() broadcasts a message to all clients.
    broadcast(message: string, exclude: Set<User['id']> = new Set()) {
        // Iterate over all the sessions sending them messages.
        console.log('Broadcasting', message);
        Object.entries(this.game.users)
            .filter(([_, user]) => !exclude.has(user.id))
            .forEach(([key, user]) => {
                try {
                    user.webSocket.send(message);
                } catch (err) {
                    delete this.game.users[key];
                }
            });
    }

    async getDurableObjectLocation() {
        const res = await fetch('https://workers.cloudflare.com/cf.json');
        const json = (await res.json()) as IncomingRequestCfProperties;
        this.dolocation = `${json.city} (${json.country})`;
    }

    scheduleNextAlarm(storage: DurableObjectStorage) {
        try {
            const alarmTime = Date.now() + healthCheckInterval;
            storage.setAlarm(alarmTime);
        } catch {
            console.log(
                'Durable Objects Alarms not supported in Miniflare (--local mode) yet.'
            );
        }
    }

    alarm() {
        this.sendGame();

        if (Object.keys(this.game.users).length > 0)
            this.scheduleNextAlarm(this.storage);
    }
}
