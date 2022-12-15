import { dev } from '$app/environment';
import { PUBLIC_WORKER_HOST } from '$env/static/public';

const baseURL = `http${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}`;
export const gameURL = `${baseURL}/game`;
