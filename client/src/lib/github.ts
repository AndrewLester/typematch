import { Octokit } from '@octokit/rest';

const github = new Octokit({
    auth: import.meta.env.VITE_GITHUB_ACCESS_TOKEN,
    userAgent: 'TypeRacer v1.0',
    timeZone: 'US/Central',
});

export default github;
