<script>
import { timerTimeFormat } from '$lib/format';
import passages from '$lib/passages';
import { time } from '$lib/stores';
import { lcp } from '$lib/string';
import { tick } from 'svelte';
import { fade, fly, slide } from 'svelte/transition';

let input;
let start = undefined;
let elapsed = 0;
let passage = passages[Math.trunc(Math.random() * passages.length)];
$: if (!done) {
    elapsed = start && $time.getTime() - start.getTime();
}

function splitPassage(passage) {
    let sections = passage
        .replace(/\n/i, '↩\n')
        .replace(/’/i, "'")
        .replace(/[”“]/i, '"')
        .split(/[\n]/i);
    sections = sections.flatMap((section) => {
        const split = [];
        while (section.length > 70) {
            const nextSpaceLocation = section.indexOf(' ', 60);
            const nextSpace =
                nextSpaceLocation === -1 ? section.length : nextSpaceLocation;
            const sub = section.slice(0, Math.min(70, nextSpace));
            split.push(sub.trim() + ' ');
            section = section.slice(Math.min(70, nextSpace));
        }
        split.push(section.trim());
        return split;
    });
    return sections;
}

$: passageSections = splitPassage(passage);
let currentSectionNumber = 0;
$: currentSection = passageSections[currentSectionNumber];
let text = '';
let lastTyped = 0;
let done = false;
let peakWPM = 0;
const handleKeyDown = (e) => {
    if (done) {
        return;
    }

    if (e.ctrlKey || e.metaKey) {
        return;
    }

    if (e.code === 'Backspace') {
        if (input.selectionEnd - input.selectionStart > 0) {
            text =
                text.slice(0, input.selectionStart) +
                text.slice(input.selectionEnd);
        } else {
            text = text.slice(0, text.length - 1);
        }
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
        } else {
            if (e.key === ' ' && text.length === 0) return;

            text += e.key;

            if (start === undefined) {
                start = new Date();
            }
        }
    }

    if (text === currentSection) {
        text = '';
        if (currentSectionNumber + 1 === passageSections.length) {
            done = true;
        }
        currentSectionNumber++;
    }
    lastTyped = $time.getTime();
};
$: elapsedSeconds = Math.trunc(elapsed / 1000);
$: wordsTyped = getWordsTyped(text, currentSectionNumber);
let wpm = 0;
$: wpm = Math.trunc(wordsTyped / (elapsedSeconds / 60));
$: if (wpm > peakWPM && elapsed > 4000) {
    peakWPM = wpm;
}
$: common_prefix = lcp(currentSection || '', text);

function getWordsTyped(text, currentSectionNumber) {
    const current = text.split(' ').map((sub) => sub.trim()).length;
    let previous = 0;
    for (let i = 0; i < currentSectionNumber; i++) {
        previous += passageSections[i]
            .split(' ')
            .map((sub) => sub.trim()).length;
    }
    return current + previous;
}

function restart() {
    start = undefined;
    text = '';
    lastTyped = 0;
    peakWPM = 0;
    currentSectionNumber = 0;
    passage = passages[Math.trunc(Math.random() * passages.length)];
    done = false;
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
</script>

<main>
    <h3>
        WPM: {(elapsed || 0) < 3000 ? 'Unknown' : wpm}, Peak: {peakWPM ||
            'Unknown'}
    </h3>
    <h4>
        <span class="time">{start ? timerTimeFormat(elapsed) : '0:00'}</span>
        {#if !start}
            Ready? Begin typing
        {/if}
        {#if done}
            <span class="restart" in:slide on:click={restart}
                >Click to restart</span
            >
        {/if}
    </h4>

    <div
        class="wrapper"
        class:done
        style="--current-section-number: {currentSectionNumber -
            sectionViewStart};"
    >
        {#each passageSections.slice(sectionViewStart, sectionViewEnd) as section, i (i + sectionViewStart)}
            {@const sectionIndex = i + sectionViewStart}
            {#if currentSectionNumber === sectionIndex}
                <div class="editor" transition:slide>
                    <p>
                        {#each section as letter, i}
                            <span
                                class="letter"
                                class:hidden={i < common_prefix.length &&
                                    letter !== ' '}>{letter}</span
                            >
                        {/each}
                    </p>
                    <!-- prettier-ignore -->
                    <pre>{#each common_prefix as letter}<span class="letter correct" in:fade={{delay: 198, duration: 0}}>{letter}</span>{/each}<span class="error">{text.slice(common_prefix.length)}</span><span class="carrot" class:animate={$time.getTime() - lastTyped > 750}>|</span></pre>
                </div>
            {:else}
                <div transition:slide>
                    <p>{section}</p>
                </div>
            {/if}
        {/each}
    </div>

    <textarea
        bind:this={input}
        autofocus
        on:blur={() => input.focus()}
        on:keydown={handleKeyDown}
        autocomplete="false"
        autocapitalize="false"
        autocorrect="false"
        spellcheck="false"
    />
</main>

<style>
main {
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    background-color: rgb(31, 31, 31);
    height: 100vh;
    margin: 0px auto;
    width: max-content;
    min-width: 700px;
}
h3,
h4 {
    color: white;
    font-weight: normal;
    font-family: Arial, Helvetica, sans-serif;
}
h4 {
    margin-bottom: 20px;
}
textarea {
    opacity: 0;
}
pre,
p {
    color: rgb(163, 163, 163);
    font-family: Arial, Helvetica, sans-serif;
    min-height: 20px;
    font-size: 20px;
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
    color: red;
    text-decoration: underline;
    text-decoration-color: red;
}
span.carrot {
    display: inline-block;
    width: 1px;
    height: 100%;
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
div.wrapper {
    position: relative;
}
div > div > p {
    transition: color 200ms ease;
}
div.done > div > p {
    color: white;
}
div.wrapper:not(.done)::before {
    content: '→';
    position: absolute;
    left: -30px;
    top: 0px;
    transform: translateY(
        calc(8px + calc(var(--current-section-number) * 23px))
    );
    transition: transform 200ms ease;
    font-size: 20px;
    color: white;
    font-family: Arial, Helvetica, sans-serif;
}
span.restart {
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
        transform: translateY(22px);
        opacity: 1;
    }
    100% {
        transform: translateY(22px);
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
</style>
