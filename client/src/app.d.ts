/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#the-app-namespace
// for information about these interfaces
declare namespace App {
    // interface Locals {}
    // interface Platform {}
    // interface Session {}
    // interface Stuff {}
}

interface ImportMetaEnv {
    VITE_GITHUB_ACCESS_TOKEN: string;
}