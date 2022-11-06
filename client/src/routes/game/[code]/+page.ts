import type { MultiplayerGame, User } from '$lib/types';
import type { Load } from '@sveltejs/kit';
import { PUBLIC_WORKER_HOST } from '$env/static/public';

export const load: Load = async ({ params, fetch }) => {
    const [game, me] = (await Promise.all([
        fetch(`http://${PUBLIC_WORKER_HOST}/game/${params.code}`).then((res) =>
            res.json(),
        ),
        fetch(`http://${PUBLIC_WORKER_HOST}/game/${params.code}/me`, {
            credentials: 'include',
        }).then((res) => (res.status < 300 ? res.json() : null)),
    ])) as [MultiplayerGame, User];

    return {
        game,
        me,
    };
};
