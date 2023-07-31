<script lang="ts">
import Singleplayer from '$lib/components/Singleplayer.svelte';
import SingleplayerStatisticsView from '$lib/components/SingleplayerStatisticsView.svelte';
import { passages } from '$lib/passages';
import type { SingleplayerStatistics } from '$lib/statistics';
import { tick } from 'svelte';
import { slide } from 'svelte/transition';

export let data;

let editor: Singleplayer | undefined;
let stats: HTMLButtonElement | undefined;
let statistics: SingleplayerStatistics | undefined = undefined;
let statsOpen = false;
let done = false;
let inspect: number | undefined = undefined;
let startTime: Date | undefined = undefined;

$: if (!done) {
    inspect = undefined;
}
</script>

<!-- Delay lets previous element slide a little bit out -->
<section
    class="editor-wrapper"
    in:slide|global={{ delay: 250 }}
    out:slide|global
>
    <!-- <button
        class="prev"
        on:pointerdown={async () => {
            data.passageIdx -= 1;
            data.passageIdx %= passages.length;
            await tick();
            editor?.focus();
        }}>&larr;</button
    > -->
    <Singleplayer
        passage={passages[data.passageIdx]}
        {inspect}
        bind:done
        bind:statistics
        bind:startTime
        bind:this={editor}
    />
    <!-- <button
        class="next"
        on:pointerdown={async () => {
            data.passageIdx += 1;
            data.passageIdx %= passages.length;
            await tick();
            editor?.focus();
        }}>&rarr;</button
    > -->
</section>

{#if statistics && done}
    <div
        class="stats-wrapper"
        class:open={statsOpen}
        in:slide={{ delay: 250 }}
        out:slide
        on:outroend={() => (statsOpen = false)}
    >
        <button
            class="stats"
            bind:this={stats}
            on:click|once={async () => {
                statsOpen = true;
                await tick();
                stats?.scrollIntoView({ behavior: 'smooth' });
            }}
        >
            <SingleplayerStatisticsView
                {statistics}
                startTime={startTime?.getTime() ?? 0}
                skeleton={!statsOpen}
                on:inspect={(e) => (inspect = e.detail)}
            />
        </button>
    </div>
{/if}

<style>
.editor-wrapper,
.stats-wrapper {
    position: relative;
    --padding: 30px;
    width: calc(80ch + calc(2 * var(--padding)));
    padding: var(--padding);
    margin-inline: auto;
}

/* .editor-wrapper > button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
}

.prev {
    left: -50px;
}

.next {
    right: -50px;
} */

.stats-wrapper {
    position: relative;
    margin-top: -125px;
    height: 125px;
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
