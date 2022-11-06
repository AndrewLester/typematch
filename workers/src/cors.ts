import { RequestLike, RouteHandler } from 'itty-router';

type CORSOptions = {
	allowOrigin: string;
};

const defaultCORSOptions = { allowOrigin: '*' };

export const withCORS = ({
	allowOrigin = '*',
}: CORSOptions = defaultCORSOptions) => {
	const handler: RouteHandler = (request) => {
		const { handleOptions } = setupCORS(allowOrigin);
		if (request.method === 'OPTIONS') {
			const response = handleOptions(request);
			if (response) {
				return response;
			}
		}
	};

	return handler;
};

export const wrapCORS = ({
	allowOrigin = '*',
}: CORSOptions = defaultCORSOptions) => {
	return setupCORS(allowOrigin).wrapCORS;
};

function setupCORS(allowOrigin: string) {
	const CORSHeaders = {
		'Access-Control-Allow-Origin': allowOrigin,
		'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
		'Access-Control-Max-Age': '86400',
		'Access-Control-Allow-Headers': 'Cookie',
		'Access-Control-Allow-Credentials': 'true',
	};

	return {
		wrapCORS(response: Response) {
			const clonedResponse = new Response(response.body, response);
			for (const [header, value] of Object.entries(CORSHeaders)) {
				clonedResponse.headers.set(header, value);
			}
			return clonedResponse;
		},
		handleOptions(request: RequestLike) {
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
				const respHeaders = {
					...CORSHeaders,
					// Allow all future content Request headers to go back to browser
					// such as Authorization (Bearer) or X-Client-Name-Version
					'Access-Control-Allow-Headers': request.headers.get(
						'Access-Control-Request-Headers',
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
		},
	};
}
