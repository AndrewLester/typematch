import { getRandomPassageIdx } from '$lib/passages';
import type { Load } from '@sveltejs/kit';

export const load: Load = () => ({ passageIdx: getRandomPassageIdx() });
