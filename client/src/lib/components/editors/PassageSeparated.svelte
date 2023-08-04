<script lang="ts">
import type { User } from '$lib/types';
import type { Readable } from 'svelte/motion';
import { fade, slide } from 'svelte/transition';

export let passageSections: string[];
export let focused: boolean;
export let started: boolean;
export let done: boolean;
export let currentSectionNumber: number;
export let input: HTMLTextAreaElement;
export let sectionViewStart: number;
export let sectionViewEnd: number;
export let passage: string;
export let cursorMap: Record<number, User>;
export let common_prefix: string;
export let canRestart: boolean;
export let startTime: Date | undefined;
export let time: Readable<Date>;
export let lastTyped: number;
export let text: string;
export let inspect: number | undefined = undefined;

function isCharacterInspected(
    sectionIndex: number,
    i: number,
    inspect: number | undefined,
) {
    if (inspect === undefined || !done) return;

    const inspectIdx = Math.trunc(passage.length * (inspect / 100));

    const characterIndex = sectionIndex + i;

    return Math.abs(inspectIdx - characterIndex) < 5;
}
</script>

<!-- Safe to disable since keyboard navigating to the text area focuses -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="wrapper"
    class:done={currentSectionNumber === passageSections.length}
    class:focused
    class:started
    style:--current-section-number={currentSectionNumber - sectionViewStart}
    on:click={() => input?.focus()}
    role="textbox"
    tabindex="0"
>
    {#each passageSections.slice(sectionViewStart, sectionViewEnd) as section, i (i + sectionViewStart)}
        {@const sectionCharIndex = passage.indexOf(section)}
        {@const sectionIndex = i + sectionViewStart}
        <div transition:slide|local class="line">
            {#if currentSectionNumber === sectionIndex}
                <div class="editor" transition:slide|local>
                    <p class="line">
                        {#each section as letter, i}
                            <span
                                class="letter"
                                class:other-cursor={i >= common_prefix.length &&
                                    !!cursorMap[i + sectionCharIndex]}
                                data-user={cursorMap[i + sectionCharIndex]
                                    ?.name}
                                class:hidden={i < common_prefix.length &&
                                    letter !== ' '}>{letter}</span
                            >
                        {/each}
                    </p>
                    <!-- prettier-ignore -->
                    <pre>{#each common_prefix as letter, j}<span class="letter correct" class:other-cursor={!!cursorMap[j + sectionCharIndex]} data-user={cursorMap[j + sectionCharIndex ]?.name} in:fade={{delay: 198, duration: 0}}>{letter}</span>{/each}<span class="error">{text.slice(common_prefix.length)}</span><span class="carrot" class:blocked={!canRestart && !startTime} class:animate={$time.getTime() - lastTyped > 750}>|</span></pre>
                </div>
            {:else}
                <div transition:slide|local>
                    <p class="line">
                        <!-- prettier-ignore -->
                        {#each section as character, j}<span class:other-cursor={!!cursorMap[j + sectionCharIndex]} data-user={cursorMap[j + sectionCharIndex ]?.name} class:inspect={isCharacterInspected(sectionCharIndex, j, inspect)}>{character}</span>{/each}
                    </p>
                </div>
            {/if}
        </div>
    {/each}
</div>

<style>
pre,
p {
    color: rgb(163, 163, 163);
    font-family: Arial, Helvetica, sans-serif;
    min-height: 20px;
    font-size: 1.5rem;
    font-kerning: none;
    --line-height: 1.2;
    line-height: var(--line-height);
    cursor: text;
}
span.letter {
    display: inline;
}
span.hidden {
    display: inline-block;
    animation: fly 200ms ease-out forwards;
}
span.error {
    color: #ff6161;
    text-decoration: underline;
    text-decoration-color: #ff6161;
}
span.carrot {
    display: inline-block;
    width: 1px;
    height: 100%;
    color: white;
}
span.other-cursor {
    position: relative;
}
span.other-cursor::before {
    content: '|';
    position: absolute;
    top: 0;
    left: -2px;
    width: 1px;
    height: 100%;
    color: rgba(255, 0, 0, 0.75);
}
span.other-cursor::after {
    content: attr(data-user);
    position: absolute;
    bottom: 100%;
    left: 1px;
    font-size: 0.8rem;
    border-radius: 5px 5px 5px 0px;
    padding: 0.25em;
    background-color: rgba(255, 0, 0, 0.75);
    color: white;
    white-space: nowrap;
}
span.correct {
    color: rgb(217, 255, 228);
}
span.carrot.blocked {
    color: rgba(255, 0, 0, 0.75);
    animation: none !important;
}
span.carrot.animate {
    animation: blink 1s infinite;
}
span.inspect {
    font-weight: bold;
    color: rgb(216, 97, 255);
}
p.line > span {
    transition: all 150ms ease;
}
div.editor {
    margin: 10px 0px;
}
div:where(.editor, .current) :where(p, pre) {
    color: white;
}
div.wrapper {
    position: relative;
    display: flex;
    flex-flow: column nowrap;
}
div.wrapper:not(.done):not(.focused)::after {
    content: 'Editor unfocused. Click here to refocus.';
    position: absolute;
    display: grid;
    place-items: center;
    line-height: 1;
    vertical-align: middle;
    font-size: 2rem;
    text-align: center;
    border-radius: 20px;
    border: 5px dashed gray;
    background-color: rgba(0, 0, 0, 0.75);
    color: white;
    --scale: 20px;
    width: calc(100% + var(--scale));
    height: calc(100% + var(--scale));
    top: calc(-1 * var(--scale) / 2);
    left: calc(-1 * var(--scale) / 2);
    cursor: pointer;
    backdrop-filter: blur(3px);
}
p.line {
    transition: color 200ms ease;
}
div.done p.line {
    color: white;
}
div.line {
    margin-block: 0.15rem;
}
div.wrapper::before {
    content: '→';
    position: absolute;
    left: -35px;
    top: 0px;
    --start-height: 0.45em;
    --line-height: 1.41em;
    transform: translateY(
        calc(
            var(--start-height) +
                calc(var(--current-section-number) * var(--line-height))
        )
    );
    font-size: 1.5rem;
    color: white;
    font-family: Arial, Helvetica, sans-serif;
    opacity: 0;
    transition: opacity 0.5s ease, transform 200ms ease;
    animation: fade-in 0.5s 1 ease;
    font-family: var(--font-heading);
}
div.wrapper.done::before {
    opacity: 0;
    /* One last past the end minus the translate of one line (the last line) */
    transform: translateY(
        calc(
            var(--start-height) +
                calc(calc(var(--current-section-number) * var(--line-height))) -
                calc(var(--start-height) + var(--line-height))
        )
    );
}

div.wrapper.focused:not(.done)::before {
    opacity: 1;
}

@keyframes fly {
    0% {
        transform: translateY(0px);
        opacity: 1;
        color: white;
    }
    99% {
        transform: translateY(calc(1em * var(--line-height)));
        opacity: 1;
    }
    100% {
        transform: translateY(calc(1em * var(--line-height)));
        opacity: 0;
        color: rgb(217, 255, 228);
    }
}
@keyframes blink {
    from {
        opacity: 1;
    }
    50% {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
@keyframes fade-in {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
</style>
