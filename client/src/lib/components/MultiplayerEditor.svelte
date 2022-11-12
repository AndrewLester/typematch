<script lang="ts">
import { timerTimeFormat } from '$lib/format';
import { isNonLetterKey } from '$lib/keyboard';
import { splitPassage } from '$lib/passages';
import { time } from '$lib/stores';
import { lcp } from '$lib/string';
import type { User } from '$lib/types';
import { createEventDispatcher, onMount } from 'svelte';
import { fade, slide } from 'svelte/transition';

export let passage: string;
export let startTime: Date | undefined = undefined;
export let otherCursors: User[] = [];
export let position: number = 0;
export let canRestart = false;

const dispatch = createEventDispatcher<{
    input: string;
    restart: undefined;
    keydown: KeyboardEvent;
}>();

let input: HTMLTextAreaElement | undefined;
let elapsed = 0;

let currentSectionNumber = 0;
let text = '';
let lastTyped = 0;
let done = false;
let peakWPM = 0;
let wpm = 0;
let smoothWPM = 0;
let wordsTyped = 0;
let prevWordsTyped = 0;
let firstPosition: number | null = null;
let loadedFirstPosition = false;

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
$: peakWPM = smoothWPM > peakWPM ? smoothWPM : peakWPM;
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
        dispatch('input', lcp(input?.value + e.key, passage!));
    }

    if (text === currentSection) {
        text = '';
        if (++currentSectionNumber === passageSections.length) {
            done = true;
        }
    }
    lastTyped = $time.getTime();
}

onMount(() => {
    setTimeout(() => input?.blur(), 50);
});

function calculateCorrectWordsTyped(str?: string) {
    const correctPrefix = lcp(str || input?.value || '', passage || '');
    return correctPrefix ? correctPrefix.length / 5 : 0;
}

function restart() {
    elapsed = 0;
    currentSectionNumber = 0;
    text = '';
    lastTyped = 0;
    peakWPM = 0;
    wpm = 0;
    smoothWPM = 0;
    wordsTyped = 0;
    prevWordsTyped = 0;
    done = false;
    input!.value = '';
    dispatch('restart');
}
</script>

<svelte:body on:focus={() => input?.focus()} />

<section>
    <h3>
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
    </h3>
    <h4>
        WPM: {smoothWPM.toFixed(0)}, Peak: {peakWPM.toFixed(0) || 'Unknown'}
    </h4>

    <div
        class="wrapper"
        class:done
        style="--current-section-number: {currentSectionNumber -
            sectionViewStart};"
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
                        <pre>{#each common_prefix as letter, i}<span class="letter correct" class:other-cursor={!!cursorMap[i + sectionCharIndex]} data-user={cursorMap[i + sectionCharIndex ]?.name} in:fade={{delay: 198, duration: 0}}>{letter}</span>{/each}<span class="error">{text.slice(common_prefix.length)}</span><span class="carrot" class:blocked={!canRestart && !startTime} class:animate={$time.getTime() - lastTyped > 750}>|</span></pre>
                    </div>
                {:else}
                    <div transition:slide|local>
                        <p class="line">
                            <!-- prettier-ignore -->
                            {#each section as character, i}<span class:other-cursor={!!cursorMap[i + sectionCharIndex]} data-user={cursorMap[i + sectionCharIndex ]?.name}>{character}</span>{/each}
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
        on:blur={() => input?.focus()}
        on:keydown={handleKeyDown}
        autocomplete="false"
        autocapitalize="false"
        autocorrect="false"
        spellcheck="false"
    />
</section>

<style>
h3,
h4 {
    color: white;
    font-weight: normal;
    font-family: Arial, Helvetica, sans-serif;
    margin-bottom: 5px;
}
h4 {
    margin-bottom: 20px;
}
textarea {
    opacity: 0;
    height: 0;
    padding: 0;
    margin: 0;
    border: 0;
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
p.line {
    transition: color 200ms ease;
}
div.done p.line {
    color: white;
}
div.line {
    margin-block: 0.15rem;
}
div.wrapper:not(.done)::before {
    content: '→';
    position: absolute;
    left: -30px;
    top: 0px;
    transform: translateY(
        calc(0.9ex + calc(var(--current-section-number) * 2.8ex))
    );
    transition: transform 200ms ease;
    font-size: 1.5rem;
    color: white;
    font-family: Arial, Helvetica, sans-serif;
    animation: fade-in 0.5s both 1 ease-in;
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
