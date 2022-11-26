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
    statsOpen = false;
    inspect = undefined;
}
</script>

<svelte:head>
    <title>TypeMatch</title>
</svelte:head>

<section>
    <!-- Delay lets previous element slide a little bit out -->
    <div class="editor-wrapper" in:slide={{ delay: 250 }} out:slide>
        <SingleplayerEditor
            passage={data.passage}
            {inspect}
            bind:done
            bind:statistics
        />
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
            <Statistics
                {statistics}
                skeleton={!statsOpen}
                on:inspect={(e) => (inspect = e.detail)}
            />
        </button>
    {/if}
</section>

<style>
section {
    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: 80% auto;
    justify-content: center;
    justify-items: center;
    gap: 15px;
    height: 100vh;
}

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
