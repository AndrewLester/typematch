<script lang="ts">
import SingleplayerEditor from '$lib/components/SingleplayerEditor.svelte';
import Statistics from '$lib/components/SingleplayerStatistics.svelte';
import type { SingleplayerStatistics } from '$lib/statistics';
import { tick } from 'svelte';
import { fade, slide } from 'svelte/transition';
import type { PageData } from './$types';

export let data: PageData;

let stats: HTMLButtonElement | undefined;
let statistics: SingleplayerStatistics | undefined = undefined;
let statsOpen = false;
let done = false;
let inspect: number | undefined = undefined;

$: if (!done) {
    // statsOpen = false;
    inspect = undefined;
}
</script>

<svelte:head>
    <title>TypeMatch</title>
</svelte:head>

<!-- Delay lets previous element slide a little bit out -->
<section class="editor-wrapper" in:slide={{ delay: 250 }} out:slide>
    <SingleplayerEditor
        passage={data.passage}
        {inspect}
        bind:done
        bind:statistics
    />
</section>

{#if statistics && done}
    <div
        class="stats-wrapper"
        class:open={statsOpen}
        in:slide={{ delay: 250 }}
        out:fade
        on:outroend={() => (statsOpen = false)}
    >
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
        >
            <Statistics
                {statistics}
                skeleton={!statsOpen}
                on:inspect={(e) => (inspect = e.detail)}
            />
        </button>
    </div>
{/if}

<style>
.editor-wrapper,
.stats-wrapper {
    --padding: 30px;
    width: calc(85ch + calc(2 * var(--padding)));
    padding: var(--padding);
    margin-inline: auto;
}

.stats-wrapper {
    position: relative;
    margin-top: -100px;
    height: 100px;
    overflow: hidden;
    padding-top: 0;
}

.stats-wrapper.open {
    overflow: visible;
}

.stats-wrapper.open .stats {
    cursor: default;
}

.stats {
    width: 100%;
    text-align: unset;
    transition: all 250ms ease;
    border: none;
    appearance: none;
}

.stats-wrapper:not(.open)::after {
    content: 'Click to see statistics';
    position: absolute;
    display: grid;
    place-items: center;
    top: 0;
    font-size: 2rem;
    left: calc(-1 * calc(var(--padding) / 2));
    height: 100%;
    width: 100%;
    overflow: hidden;
    background-image: linear-gradient(transparent 5%, rgb(60, 60, 60));
    backdrop-filter: blur(2px);
    pointer-events: none;
}
</style>
