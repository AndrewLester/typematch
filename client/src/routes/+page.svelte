<script lang="ts">
import SingleplayerEditor from '$lib/components/SingleplayerEditor.svelte';
import Statistics from '$lib/components/Statistics.svelte';
import type { PlayerStatistic } from '$lib/statistics';
import { tick } from 'svelte';
import { fade, slide } from 'svelte/transition';
import type { PageData } from './$types';

export let data: PageData;

let stats: HTMLButtonElement | undefined;
let statistics: PlayerStatistic[] | undefined = undefined;
let statsOpen = false;
let done = false;

$: if (!done) {
    statsOpen = false;
}
</script>

<svelte:head>
    <title>TypeMatch</title>
</svelte:head>

<!-- Delay lets previous element slide a little bit out -->
<div class="editor-wrapper" in:slide={{ delay: 250 }} out:slide>
    <SingleplayerEditor passage={data.passage} bind:done bind:statistics />
</div>

{#if statistics && done}
    <button
        class="stats"
        in:fade={{ delay: 300 }}
        out:fade
        bind:this={stats}
        on:click|once={async () => {
            statsOpen = true;
            await tick();
            stats?.scrollIntoView({ behavior: 'smooth' });
        }}
        class:open={statsOpen}
    >
        <Statistics {statistics} />
    </button>
{/if}

<style>
.editor-wrapper,
.stats {
    --padding: 0;
    width: calc(85ch + calc(2 * var(--padding)));
}

.editor-wrapper {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    --padding: 30px;
    padding: var(--padding);
}

.stats {
    position: relative;
    grid-row: 2 / 3;
    padding-bottom: 50px;
    --padding: 30px;
    height: 100%;
    overflow-y: hidden;
    text-align: unset;
    transition: all 250ms ease;
    border: none;
}

.stats:not(.open)::after {
    content: 'Click to see statistics';
    position: absolute;
    display: grid;
    place-items: center;
    --scale: 50px;
    top: 0;
    font-size: 2rem;
    left: calc(-1 * calc(var(--scale) / 2));
    height: 100%;
    width: calc(100% + var(--scale));
    background-image: linear-gradient(transparent 5%, rgb(60, 60, 60));
    backdrop-filter: blur(2px);
}

.stats.open {
    height: auto;
    overflow: unset;
    cursor: default;
}
</style>
