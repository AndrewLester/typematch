type Environment = {
    GAME_DO: DurableObjectNamespace;
};

export { GameDurableObject } from './durable-object';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
};

function handleOptions(request) {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    let headers = request.headers;
    if (
        headers.get('Origin') !== null &&
        headers.get('Access-Control-Request-Method') !== null &&
        headers.get('Access-Control-Request-Headers') !== null
    ) {
        // Handle CORS pre-flight request.
        // If you want to check or reject the requested method + headers
        // you can do that here.
        let respHeaders = {
            ...corsHeaders,
            // Allow all future content Request headers to go back to browser
            // such as Authorization (Bearer) or X-Client-Name-Version
            'Access-Control-Allow-Headers': request.headers.get(
                'Access-Control-Request-Headers'
            ),
        };

        return new Response(null, {
            headers: respHeaders,
        });
    } else {
        // Handle standard OPTIONS request.
        // If you want to allow other HTTP Methods, you can do that here.
        return new Response(null, {
            headers: {
                Allow: 'GET, HEAD, POST, OPTIONS',
            },
        });
    }
}

function generateCode() {
    return Math.random().toString(36).slice(2, 7);
}

function getDurableObject(env: Environment, code: string) {
    const durableObjectId = env.GAME_DO.idFromName(code);
    const durableObjectStub = env.GAME_DO.get(durableObjectId);
    return durableObjectStub;
}

const worker: ExportedHandler<Environment> = {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        if (request.method === 'POST') {
            if (url.pathname === '/create') {
                const code = generateCode();
                return new Response(null, {
                    status: 302,
                    headers: {
                        location: `http://localhost:3000/game/${code}`,
                        ...corsHeaders,
                    },
                });
            } else if (url.pathname.startsWith('/game')) {
                const [_, code] = url.pathname.match(/\/game\/([\w\d]+).*/);
                if (url.pathname.endsWith('/passage')) {
                    await getDurableObject(env, code).fetch(request);
                    return new Response(null, {
                        status: 200,
                        headers: corsHeaders,
                    });
                }
            } else {
                return new Response(null, { status: 404 });
            }
        }

        if (request.method === 'GET') {
            if (url.pathname.startsWith('/connect/')) {
                if (request.headers.get('upgrade') !== 'websocket') {
                    return new Response('Upgrade header not set to websocket', {
                        status: 400,
                    });
                }

                const [_, code] = url.pathname.match(/\/connect\/([\w\d]+)/i);
                return getDurableObject(env, code).fetch(request);
            }

            if (url.pathname.startsWith('/game/')) {
                const [_, code] = url.pathname.match(/\/game\/([\w\d]+).*/);
                const data = await getDurableObject(env, code)
                    .fetch(request)
                    .then((res) => res.text());
                return new Response(data, {
                    status: 200,
                    headers: corsHeaders,
                });
            }
        }

        return new Response(null, {
            status: 404,
        });
    },
};

export default worker;
