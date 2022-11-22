import { generateCode } from '$lib/game';
import { redirect } from '@sveltejs/kit';
import type { Action, Actions } from './$types';

const createGame: Action = () => {
    const code = generateCode();
    throw redirect(303, `/game/${code}`);
};

export const actions: Actions = {
    createGame,
};
