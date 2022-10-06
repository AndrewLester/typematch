<script lang="ts">
import { timerTimeFormat } from '$lib/format';
import { passages, splitPassage } from '$lib/passages';
import { time } from '$lib/stores';
import { lcp } from '$lib/string';
import type { User } from '$lib/types';
import { createEventDispatcher } from 'svelte';
import { fade, slide } from 'svelte/transition';

export let passage: string | undefined = undefined;
export let editable = true;
export let selfStart = true;
export let otherCursors: User[] = [];

const dispatch = createEventDispatcher<{ input: string }>();

const moods = {
    20: '😬',
    40: '🥱',
    60: '😑',
    80: '😒',
    100: '😌',
    120: '😯',
    140: '😃',
    [Number.MAX_SAFE_INTEGER]: '🤩',
};
let mood = moods[20];
let input: HTMLTextAreaElement | undefined;
let start: Date | undefined;
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

const getCurrentWordsTyped = () => wordsTyped;

$: passageSections = passage ? splitPassage(passage) : [];
$: currentSection = passageSections[currentSectionNumber];

$: if (!done) {
    elapsed = start ? $time.getTime() - start.getTime() : 0;
}

$: if (elapsed) {
    prevWordsTyped = getCurrentWordsTyped();
    wordsTyped = calculateCorrectWordsTyped();
}
$: if (elapsed) wpm = (wordsTyped - prevWordsTyped) / (1 / 60);
$: if (elapsed) smoothWPM = (5 * smoothWPM + wpm) / 6;
$: peakWPM = smoothWPM > peakWPM ? smoothWPM : peakWPM;
$: common_prefix = lcp(currentSection || '', text);
$: cursorMap = otherCursors.reduce(
    (obj, user) => ((obj[user.position] = user), obj),
    {} as Record<number, User>,
);
$: for (const [cutoff, emoji] of Object.entries(moods)) {
    if (smoothWPM <= parseInt(cutoff)) {
        mood = emoji;
        break;
    }
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
    if (done || !editable) {
        return;
    }

    if (e.ctrlKey || e.metaKey) {
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
    } else if (
        ![
            'Shift',
            'Alt',
            'Meta',
            'Control',
            'Tab',
            'CapsLock',
            'ArrowRight',
            'ArrowUp',
            'ArrowLeft',
            'ArrowDown',
        ].includes(e.key)
    ) {
        if (e.key === 'Enter') {
            text += '↩';
        } else if (e.key === '>') {
            text = currentSection;
            input!.value += currentSection.slice(common_prefix.length);
        } else {
            text += e.key;

            if (start === undefined) {
                start = new Date();
            }
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

function calculateCorrectWordsTyped() {
    const correctPrefix = lcp(input?.value || '', passage || '');
    return correctPrefix ? correctPrefix.length / 5 : 0;
}

function restart() {
    start = undefined;
    elapsed = 0;
    currentSectionNumber = 0;
    text = '';
    lastTyped = 0;
    peakWPM = 0;
    wpm = 0;
    smoothWPM = 0;
    wordsTyped = 0;
    prevWordsTyped = 0;
    passage = passages[Math.trunc(Math.random() * passages.length)];
    done = false;
    input!.value = '';
}
</script>

<section>
    <h3>
        WPM: {smoothWPM.toFixed(0)}, Peak: {peakWPM.toFixed(0) || 'Unknown'}
        <span class="mood">{smoothWPM > 5 ? mood : ''}</span>
    </h3>
    <h4>
        <span class="time">{start ? timerTimeFormat(elapsed) : '0:00'}</span>
        {#if !start && selfStart}
            Ready? Begin typing
        {/if}
        {#if done && selfStart}
            <button class="restart" in:slide on:click={restart}
                >Click to restart</button
            >
        {/if}
    </h4>

    {#if passage}
        <div
            class="wrapper"
            class:done
            style="--current-section-number: {currentSectionNumber -
                sectionViewStart};"
            transition:slide|local
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
                                        data-user={cursorMap[
                                            i + sectionCharIndex
                                        ]?.name}
                                        class:hidden={i <
                                            common_prefix.length &&
                                            letter !== ' '}>{letter}</span
                                    >
                                {/each}
                            </p>
                            <!-- prettier-ignore -->
                            <pre>{#each common_prefix as letter, i}<span class="letter correct" class:other-cursor={!!cursorMap[i + sectionCharIndex]} data-user={cursorMap[i + sectionCharIndex ]?.name} in:fade={{delay: 198, duration: 0}}>{letter}</span>{/each}<span class="error">{text.slice(common_prefix.length)}</span><span class="carrot" class:animate={$time.getTime() - lastTyped > 750}>|</span></pre>
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
    {/if}
</section>

<style>
h3,
h4 {
    color: white;
    font-weight: normal;
    font-family: Arial, Helvetica, sans-serif;
    margin-bottom: 0;
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
.mood {
    font-family: 'Noto Color Emoji', sans-serif;
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
