<script lang="ts">
import { page } from '$app/stores';
import { fade } from 'svelte/transition';
import '../app.css';

$: singleplayer = $page.url.pathname === '/';
</script>

{#key $page.url.pathname}
    <a
        transition:fade
        href={singleplayer ? '/multiplayer' : '/'}
        class="button nav"
        data-sveltekit-noscroll
    >
        {#if singleplayer}
            Multiplayer
        {:else}
            Singleplayer
        {/if}
    </a>
{/key}

<main>
    <slot />
</main>

<style>
main {
    position: relative;
    display: grid;
    grid-template-rows: 1fr;
    place-items: center;
    min-height: 100vh;
    width: 100%;
}

main > :global(section) {
    grid-area: 1 / 1 / 2 / 2;
}

.nav {
    position: fixed;
    z-index: 1;
}

.nav {
    top: 20px;
    left: 20px;
}
</style>
