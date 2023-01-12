import { serialize } from 'cookie';
import { RequestLike } from 'itty-router';
import { Environment } from './env';

const SESSION_ID_COOKIE = '__sess_id';
const SIGNATURE_DELIMETER = '.';
const encoder = new TextEncoder();

type WithSessionOptions<T> = {
	getSession: (request: RequestLike) => (sessionId: string) => T;
	required?: boolean;
};

export function withSession<T>({
	getSession,
	required = true,
}: WithSessionOptions<T>) {
	const handler = async (request: RequestLike, env: Environment) => {
		withCookies(request);

		const { cookies } = request;

		const signedSessionId = cookies[SESSION_ID_COOKIE];
		let sessionId: string;
		try {
			sessionId = await unsignSessionId(
				signedSessionId,
				env.SESSION_SECRET,
			);
		} catch {
			if (required) {
				return new Response(null, { status: 401 });
			}
			request.session = null;
			return;
		}

		const session = await getSession(request)(sessionId);
		if (!session && required) {
			return new Response(null, { status: 401 });
		}
		request.session = session;
	};
	return handler;
}

export async function signAndSerializeSessionId(
	sessionId: string,
	secret: string,
	secure: boolean,
	domain?: string,
) {
	const signedSessionId = await signSessionId(sessionId, secret);

	return serialize(SESSION_ID_COOKIE, signedSessionId, {
		domain,
		secure,
		sameSite: 'strict',
		httpOnly: true,
		path: '/',
	});
}

function importKey(secret: string) {
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify'],
	);
}

async function signSessionId(sessionId: string, secret: string) {
	const key = await importKey(secret);

	const signature = await crypto.subtle.sign(
		'HMAC',
		key,
		encoder.encode(sessionId),
	);

	return `${sessionId}${SIGNATURE_DELIMETER}${encodeSignature(signature)}`;
}

async function unsignSessionId(signedSessionId: string, secret: string) {
	const key = await importKey(secret);
	const delimeterLocation = signedSessionId.lastIndexOf(SIGNATURE_DELIMETER);
	if (delimeterLocation < 0) {
		throw new Error('Invalid signed session ID');
	}

	const sessionId = signedSessionId.substring(0, delimeterLocation);

	const signature = decodeSignature(
		decodeURIComponent(signedSessionId.substring(delimeterLocation + 1)),
	);

	const valid = await crypto.subtle.verify(
		'HMAC',
		key,
		signature,
		encoder.encode(sessionId),
	);

	if (!valid) {
		throw new Error('Invalid signed session ID');
	}

	return sessionId;
}

function encodeSignature(signature: ArrayBuffer) {
	return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function decodeSignature(signature: string) {
	return Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
}
// Stolen from here for now: https://github.com/kwhitley/itty-router/blob/340a46068656179be6cd06582d9ebe6724d82ab0/src/extras/withCookies.ts#L2
// Will update once the PR for itty-router v3 is merged
const withCookies = (request) => {
	request.cookies = {};
	try {
		request.cookies = (request.headers.get('Cookie') || '')
			.split(/;\s*/)
			.map((pair) => pair.split(/=(.+)/))
			.reduce((acc, [key, value]) => {
				acc[key] = value;

				return acc;
			}, {});
	} catch (err) {}
};
