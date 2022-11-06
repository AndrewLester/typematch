import { GameState, type MultiplayerGame, type User } from '$lib/types';
import type { Load } from '@sveltejs/kit';
import { PUBLIC_WORKER_HOST } from '$env/static/public';
import { dev } from '$app/environment';

export const load: Load = async ({ params, fetch }) => {
    // const [game, me] = (await Promise.all([
    //     fetch(
    //         `http${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}/game/${
    //             params.code
    //         }`,
    //     ).then((res) => res.json()),
    //     fetch(
    //         `http${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}/game/${
    //             params.code
    //         }/me`,
    //         {
    //             credentials: 'include',
    //         },
    //     ).then((res) => (res.status < 300 ? res.json() : null)),
    // ])) as [MultiplayerGame, User];

    const me: User = {
        admin: true,
        connected: true,
        country: 'US',
        id: '5235',
        name: 'test',
        ping: 5,
        position: 0,
    };

    const game: MultiplayerGame = {
        state: GameState.Waiting,
        users: { [me.id]: me },
        passageIndex: 0,
        startTime: 0,
    };

    return {
        game,
        me,
    };
};
