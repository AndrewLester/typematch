export const lcp = (s1: string, s2: string) => {
    let lcp = '';
    const minLen = Math.min(s1.length, s2.length);
    for (let i = 0; i < minLen; i++) {
        if (s1[i] != s2[i]) break;

        lcp += s1[i];
    }
    return lcp;
};
