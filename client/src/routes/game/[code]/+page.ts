import { gameURL } from '$lib/api';
import type { MultiplayerGame, User } from '$lib/types';
import type { Load } from '@sveltejs/kit';

export const load: Load = async ({ params, fetch }) => {
    return {
        game: fetch(`${gameURL}/${params.code}`).then((res) =>
            res.json(),
        ) as Promise<MultiplayerGame>,
        me: fetch(`${gameURL}/${params.code}/me`, {
            credentials: 'include',
        }).then((res) =>
            res.status < 300 ? res.json() : null,
        ) as Promise<User>,
    };
};
