<script context="module" lang="ts">
export type EditorStatisticsEvent = {
    lcp: string;
    wpm: number;
    incorrect: string;
    percent: number;
};
</script>

<script lang="ts">
import { timerTimeFormat } from '$lib/format';
import { isNonLetterKey } from '$lib/keyboard';
import { splitPassage } from '$lib/passages';
import { time } from '$lib/stores';
import { lcp } from '$lib/string';
import type { User } from '$lib/types';
import { createEventDispatcher } from 'svelte';
import { fade, slide } from 'svelte/transition';

export let passage: string;
export let startTime: Date | undefined = undefined;
export let otherCursors: User[] = [];
export let position: number = 0;
export let canRestart = false;
export let inspect: number | undefined = undefined;
export let done = false;

const dispatch = createEventDispatcher<{
    input: string;
    collect: EditorStatisticsEvent;
    restart: undefined;
    keydown: KeyboardEvent;
}>();

let input: HTMLTextAreaElement | undefined;
let elapsed = 0;

let focused = true;
let currentSectionNumber = 0;
let text = '';
let lastTyped = 0;
let wpm = 0;
let smoothWPM = 0;
let wordsTyped = 0;
let prevWordsTyped = 0;
let firstPosition: number | null = null;
let loadedFirstPosition = false;

const getText = () => text;
const getCurrentWordsTyped = () => wordsTyped;

$: started = startTime !== undefined;
$: editable = started && !done;
$: passageSections = passage ? splitPassage(passage) : [];
$: currentSection = passageSections[currentSectionNumber];

$: if (editable) {
    elapsed = $time.getTime() - startTime!.getTime();
}
$: if (elapsed) {
    prevWordsTyped = getCurrentWordsTyped();
    wordsTyped = calculateCorrectWordsTyped();
}
$: if (elapsed) wpm = Math.max((wordsTyped - prevWordsTyped) / (1 / 60), 0);
$: if (elapsed) smoothWPM = (5 * smoothWPM + wpm) / 6;
$: if (elapsed) {
    const commonPrefix = lcp(input?.value ?? '', passage ?? '');
    dispatch('collect', {
        lcp: commonPrefix,
        incorrect: getText().slice(commonPrefix.length),
        wpm: smoothWPM,
        percent: Math.trunc((commonPrefix.length / passage.length) * 100),
    });
}
$: common_prefix = lcp(currentSection || '', text);
$: cursorMap = otherCursors.reduce(
    (obj, user) => ((obj[user.position] = user), obj),
    {} as Record<number, User>,
);
$: if (firstPosition === null) {
    firstPosition = position;
}
$: if (firstPosition !== null && !loadedFirstPosition && input !== undefined) {
    if (firstPosition >= (passage?.length ?? 0)) {
        done = true;
        currentSectionNumber = passageSections.length;
        text = '';
    } else {
        let total = '';
        for (let i = 0; i < passageSections.length; i++) {
            const section = passageSections[i];
            total += section;
            if (firstPosition <= total.length) {
                currentSectionNumber = i;
                const typed = section.substring(
                    0,
                    firstPosition - (total.length - section.length),
                );
                text = typed;
                const calculated = calculateCorrectWordsTyped(
                    total.substring(0, total.length - section.length) + typed,
                );
                prevWordsTyped = calculated;
                wordsTyped = calculated;
                input!.value += text;
                break;
            }
            input!.value += section;
        }
    }

    loadedFirstPosition = true;
}

$: sectionViewStart = done
    ? 0
    : Math.max(
          0,
          currentSectionNumber -
              (currentSectionNumber >= passageSections.length - 1 ? 3 : 2),
      );
$: sectionViewEnd = done
    ? passageSections.length
    : Math.min(
          passageSections.length,
          currentSectionNumber + (currentSectionNumber === 0 ? 4 : 3),
      );

function handleKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
        return;
    }

    const shouldContinue = dispatch('keydown', e, { cancelable: true });

    if (!loadedFirstPosition || !shouldContinue) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }

    if (e.code === 'Backspace') {
        if (input!.selectionEnd - input!.selectionStart > 0) {
            text =
                text.slice(0, input!.selectionStart) +
                text.slice(input!.selectionEnd);
        } else if (!text && currentSectionNumber > 0) {
            text = passageSections[--currentSectionNumber].slice(
                0,
                text.length - 1,
            );
        } else {
            text = text.slice(0, text.length - 1);
        }
        dispatch(
            'input',
            lcp(
                input?.value.slice(0, input?.value.length - 1 ?? 0) ?? '',
                passage!,
            ),
        );
    } else if (!isNonLetterKey(e.key)) {
        if (e.key === 'Enter') {
            text += '↩';
        } else if (e.key === '>') {
            text = currentSection;
            input!.value += currentSection.slice(common_prefix.length);
        } else {
            text += e.key;
        }
        const commonPrefix = lcp(input?.value + e.key, passage!);
        dispatch('input', commonPrefix);
        if (commonPrefix.length < (input?.value + e.key).length) {
            dispatch('collect', {
                lcp: commonPrefix,
                incorrect: text.slice(commonPrefix.length),
                wpm: smoothWPM,
                percent: Math.trunc(
                    (commonPrefix.length / passage.length) * 100,
                ),
            });
        }
    }

    if (text === currentSection) {
        text = '';
        if (++currentSectionNumber === passageSections.length) {
            done = true;
        }
    }
    lastTyped = $time.getTime();
}

function calculateCorrectWordsTyped(str?: string) {
    const correctPrefix = lcp(str || input?.value || '', passage || '');
    return correctPrefix ? correctPrefix.length / 5 : 0;
}

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

function restart() {
    elapsed = 0;
    currentSectionNumber = 0;
    text = '';
    lastTyped = 0;
    wpm = 0;
    smoothWPM = 0;
    wordsTyped = 0;
    prevWordsTyped = 0;
    done = false;
    input!.value = '';
    input?.focus();
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    dispatch('restart');
}

export function focus() {
    input?.focus();
}
</script>

<section>
    <h1>
        <span class="time">
            {startTime ? timerTimeFormat(elapsed) : '0:00'}
        </span>
        {#if !started}
            <span transition:fade|local={{ duration: 250 }}>
                <slot name="waiting">Waiting to start...</slot>
            </span>
        {/if}
        {#if done && canRestart}
            <button class="restart" in:slide on:click={restart}
                >Click to restart</button
            >
        {/if}
    </h1>
    <h2>
        WPM: {smoothWPM.toFixed(0)}
    </h2>

    <!-- Safe to disable since keyboard navigating to the text area focuses -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="wrapper"
        class:done
        class:focused
        class:started
        style="--current-section-number: {currentSectionNumber -
            sectionViewStart};"
        on:click={() => input?.focus()}
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
                                    class:other-cursor={i >=
                                        common_prefix.length &&
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
        {#each otherCursors as cursor}
            {#if cursor.position > (passage?.indexOf(passageSections[sectionViewEnd - 1]) ?? 20000) + (passageSections[sectionViewEnd - 1]?.length ?? 2000)}
                <p>{cursor.name} past</p>
            {:else if cursor.position >= passage.length}
                <p>{cursor.name} done</p>
            {/if}
        {/each}
    </div>

    <!-- svelte-ignore a11y-autofocus -->
    <textarea
        bind:this={input}
        autofocus
        on:blur={() => (focused = false)}
        on:focus={() => (focused = true)}
        on:keydown={handleKeyDown}
        autocomplete="false"
        autocapitalize="false"
        autocorrect="false"
        spellcheck="false"
    />
</section>

<style>
h1,
h2 {
    color: white;
    font-weight: normal;
    font-family: Arial, Helvetica, sans-serif;
    margin-bottom: 5px;
    font-size: 1.17rem;
}
h2 {
    margin-bottom: 20px;
    font-size: 1rem;
}
textarea {
    resize: none;
    opacity: 0;
    height: 0.1px;
    width: 0.1px;

    padding: 0;
    margin: 0;
    border: none;
    appearance: none;
}
pre,
p {
    color: rgb(163, 163, 163);
    font-family: Arial, Helvetica, sans-serif;
    min-height: 20px;
    font-size: 1.5rem;
    font-kerning: none;
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
span.time {
    font-weight: bold;
}
div.editor {
    margin: 10px 0px;
}
div.editor p,
div.editor pre {
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
    left: -30px;
    top: 0px;
    transform: translateY(
        calc(0.9ex + calc(var(--current-section-number) * 2.675ex))
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
            0.9ex + calc(calc(var(--current-section-number) * 2.675ex)) -
                3.575ex
        )
    );
}

div.wrapper.focused:not(.done)::before {
    opacity: 1;
}

.restart {
    display: inline;
    color: white;
    font-size: inherit;
    appearance: none;
    background-color: transparent;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
}
@keyframes fly {
    0% {
        transform: translateY(0px);
        opacity: 1;
        color: white;
    }
    99% {
        transform: translateY(1.9rem);
        opacity: 1;
    }
    100% {
        transform: translateY(1.9rem);
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
