<script lang="ts">
import { dev } from '$app/environment';
import { timerTimeFormat } from '$lib/format';
import { isNonLetterKey } from '$lib/keyboard';
import { countWords, splitPassage } from '$lib/passages';
import type { EditorStatisticsEvent } from '$lib/statistics';
import { clock, preferences } from '$lib/stores';
import { lcp } from '$lib/string';
import type { User } from '$lib/types';
import { createEventDispatcher } from 'svelte';
import { fade, slide } from 'svelte/transition';
import Inline from './Inline.svelte';
import PassageSeparated from './PassageSeparated.svelte';

export let passage: string;
export let startTime: Date | undefined = undefined;
export let endTime: Date | undefined = undefined;
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
    complete: Date;
}>();

let input: HTMLTextAreaElement;
let elapsed =
    startTime && endTime ? endTime.getTime() - startTime.getTime() : 0;

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
let time = clock(1000);

const getCurrentWordsTyped = () => wordsTyped;

$: started = startTime !== undefined;
$: editable = started && !done;
$: passageSections = passage ? splitPassage(passage) : [];
$: currentSection = passageSections[currentSectionNumber];

$: if (editable) time = clock(1000);
$: if (editable) {
    elapsed = $time.getTime() - startTime!.getTime();
}
$: if (elapsed) {
    prevWordsTyped = getCurrentWordsTyped();
    wordsTyped = calculateCorrectWordsTyped();
}
$: if (elapsed) wpm = Math.max((wordsTyped - prevWordsTyped) / (1 / 60), 0);
$: if (elapsed) smoothWPM = (2 * smoothWPM + wpm) / 3;
$: if (elapsed) {
    const commonPrefix = lcp(input?.value ?? '', passage ?? '');
    dispatch('collect', {
        lcp: commonPrefix,
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
            if (firstPosition < total.length) {
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

$: editorTypingMode =
    $preferences.typingMode === 'passage-separated' ? PassageSeparated : Inline;

function handleKeyDown(e: KeyboardEvent) {
    // TODO: Remove all handling of text input by user from key down... bind to text area
    // text and use key down soley for cancelation
    if (
        e.ctrlKey ||
        e.metaKey ||
        (e.repeat && e.key !== ' ' && e.key !== 'Backspace')
    ) {
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
        } else if (e.key === '>' && dev) {
            text = currentSection;
            input!.value += currentSection.slice(common_prefix.length);
            dispatch('input', input!.value);
        } else {
            text += e.key;
        }
        const commonPrefix = lcp(input?.value + e.key, passage!);
        dispatch('input', commonPrefix);
        if (commonPrefix.length < (input?.value + e.key).length) {
            dispatch('collect', {
                lcp: commonPrefix,
                incorrect: (input?.value + e.key).slice(commonPrefix.length),
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
            dispatch('complete', new Date());
        }
    }
    lastTyped = $time.getTime();
}

function calculateCorrectWordsTyped(str?: string) {
    const correctPrefix = lcp(str || input?.value || '', passage || '');
    return correctPrefix ? countWords(correctPrefix) : 0;
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
    <h1 class="metadata">
        <span class="time">
            {startTime ? timerTimeFormat(elapsed) : '0:00'}
        </span>
        {#if !started}
            <span transition:fade={{ duration: 250 }}>
                <slot name="waiting">Waiting to start...</slot>
            </span>
        {/if}
        {#if done && canRestart}
            <button class="restart" in:slide on:click={restart}
                >Click to restart</button
            >
        {/if}
    </h1>

    <svelte:component
        this={editorTypingMode}
        {passageSections}
        {focused}
        {started}
        {done}
        {canRestart}
        {text}
        {time}
        {lastTyped}
        {startTime}
        {currentSectionNumber}
        {input}
        {inspect}
        {sectionViewStart}
        {sectionViewEnd}
        {passage}
        {cursorMap}
        {common_prefix}
    />

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
.metadata {
    color: white;
    font-weight: normal;
    font-family: Arial, Helvetica, sans-serif;
    margin-bottom: 25px;
    font-size: 1.17rem;
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

span.time {
    font-weight: bold;
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
