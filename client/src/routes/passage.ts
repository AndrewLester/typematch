import github from '$lib/github';
import type { RequestHandler } from '@sveltejs/kit';

export const get: RequestHandler = async () => {
    const results = await github.rest.search.code({
        q: 'function+language:js',
        per_page: 100,
        page: 1,
    });

    return {
        body: results.data.items[0].text_matches,
        status: 200,
    };
};
