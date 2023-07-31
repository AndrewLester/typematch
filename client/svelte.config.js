import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [vitePreprocess()],
    kit: {
        adapter: adapter(),
    },
    ssr: {
        noExternal:
            process.env.NODE_ENV === 'production' ? ['@carbon/charts'] : [],
    },
};

export default config;
