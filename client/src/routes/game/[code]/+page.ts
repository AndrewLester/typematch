import { gameURL } from '$lib/api';
import type { MultiplayerGame, User } from '$lib/types';
import type { Load } from '@sveltejs/kit';

export const ssr = false;

export const load: Load = async ({ params, fetch }) => {
    const [game, me] = (await Promise.all([
        fetch(`${gameURL}/${params.code}`).then((res) => res.json()),
        fetch(`${gameURL}/${params.code}/me`, {
            credentials: 'include',
        }).then((res) => (res.status < 300 ? res.json() : null)),
    ])) as [MultiplayerGame, User];

    return {
        game,
        me,
    };
};
