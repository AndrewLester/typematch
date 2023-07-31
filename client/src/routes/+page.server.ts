import { getRandomPassageIdx } from '$lib/passages';

export function load() {
    return { passageIdx: getRandomPassageIdx() };
}
