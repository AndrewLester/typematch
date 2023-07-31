import { generateCode } from '$lib/game';
import { redirect } from '@sveltejs/kit';

export const actions = {
    createGame() {
        const code = generateCode();
        throw redirect(303, `/game/${code}`);
    },
};
