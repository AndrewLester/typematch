// @ts-nocheck
import { withDurables } from 'itty-durable';
import { RequestLike, Router } from 'itty-router';
import { withCORS, wrapCORS } from './cors';
import { Environment } from './env';
import { buildCallRequest } from './itty-stuff';
import { withSession } from './session';

export { GameDurableObject } from './durable-object';

const router = Router();
const gameRouter = Router({ base: '/game' });

function getDurableSession(request: RequestLike) {
	const getSession = async (sessionId: string) => {
		const res = await request.GameDurableObject.getSession(sessionId);
		if (res.status >= 400) return null;
		return res.json();
	};

	return getSession;
}

const withGameDurable = (request: RequestLike) => {
	request.GameDurableObject = request.GameDurableObject.get(
		request.params.code,
	);
};

const withGameSession = withSession({
	getSession: getDurableSession,
});

router
	.all('/game/*', gameRouter.handle)
	.all('*', () => new Response(null, { status: 404 }));

gameRouter
	.all('*', (request, env) =>
		withCORS({ allowOrigin: env.FRONTEND_URL })(request),
	)
	.all('*', withDurables())
	.all('/:code*', withGameDurable)
	.all(
		'/:code*',
		withSession({
			required: false,
			getSession: getDurableSession,
		}),
	)
	.get('/:code', ({ GameDurableObject }) => GameDurableObject.getGame())
	.get(
		'/:code/me',
		withGameSession,
		({ session }) => new Response(JSON.stringify(session)),
	)
	.get(
		'/:code/connect',
		withSession({
			required: false,
			getSession: getDurableSession,
		}),
		async (request, env) => {
			if (request.headers.get('upgrade') !== 'websocket') {
				return new Response('Upgrade header not set to websocket', {
					status: 400,
				});
			}

			const otherHeaders = {};
			for (const [key, val] of request.headers) {
				otherHeaders[key] = val;
			}

			const name = env.GameDurableObject.idFromName(request.params.code);
			const stub = env.GameDurableObject.get(name);

			const req = buildCallRequest(
				request.params.code,
				'connect',
				[request.query.name, request, env],
				otherHeaders,
			);
			const res = await stub.fetch(req);

			// const q = await request.GameDurableObject.connect(
			// 	request.query.name,
			// 	request,
			// 	env,
			// );

			return res;
		},
	)
	.post('/:code/start', withGameSession, ({ session, GameDurableObject }) =>
		GameDurableObject.attemptStart(session),
	)
	.post('/:code/passage', withGameSession, async (request) =>
		request.GameDurableObject.attemptSetPassage(
			request.session,
			await request.json(),
		),
	)
	.all('*', () => new Response(null, { status: 404 }));

const worker: ExportedHandler<Environment> = {
	fetch: (request, env, context) =>
		router
			.handle(request, env, context)
			.catch((e) => {
				console.log(e);
				return new Response(null, { status: 500 });
			})
			.then(wrapCORS({ allowOrigin: env.FRONTEND_URL })),
};

export default worker;
