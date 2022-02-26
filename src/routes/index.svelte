<script>
import { timerTimeFormat } from '$lib/format';
import { time } from '$lib/stores';
import { lcp } from '$lib/string';
import { fade, fly } from 'svelte/transition';

let input;
let start = undefined;
$: elapsed = start && $time.getTime() - start.getTime();

const passage = "This is what you're supposed to type. It should be longgg";
let text = '';
let lastTyped = 0;
const handleKeyDown = (e) => {
    if (e.code === 'Backspace') {
        text = text.slice(0, text.length - 1);
    } else if (
        ![
            'Shift',
            'Alt',
            'Meta',
            'Control',
            'Enter',
            'Tab',
            'CapsLock',
            'ArrowRight',
            'ArrowUp',
            'ArrowLeft',
            'ArrowDown',
        ].includes(e.key)
    ) {
        text += e.key;
    }
    lastTyped = $time.getTime();
};
$: elapsedSeconds = Math.trunc(elapsed / 1000);
$: wordsTyped = text.split(' ').map((sub) => sub.trim()).length;
$: wpm = Math.trunc(wordsTyped / (elapsedSeconds / 60));
$: common_prefix = lcp(passage, text);
</script>

<main>
    <h3>WPM: {wpm}</h3>
    <h4>
        {start ? timerTimeFormat(elapsed) : '0:00 Ready? Begin typing'}
    </h4>

    <div>
        <p>
            {#each passage as letter, i}
                <span
                    class="letter"
                    class:hidden={i < common_prefix.length && letter !== ' '}
                    >{letter}</span
                >
            {/each}
        </p>
        <!-- prettier-ignore -->
        <pre>{#each common_prefix as letter}<span class="letter" in:fade={{delay: 198, duration: 0}}>{letter}</span>{/each}<span class="error">{text.slice(common_prefix.length)}</span><span class="carrot" class:animate={$time.getTime() - lastTyped > 750}>|</span></pre>
    </div>

    <input
        bind:this={input}
        autofocus
        on:input|once={() => (start = new Date())}
        on:blur={() => input.focus()}
        on:keydown={handleKeyDown}
    />
</main>

<style>
main {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
    background-color: rgb(31, 31, 31);
    height: 100vh;
    width: 100vw;
}
h3,
h4 {
    color: white;
}
input {
    opacity: 0;
}
pre,
p {
    color: white;
    font-family: Arial, Helvetica, sans-serif;
    min-height: 20px;
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
span.carrot.animate {
    animation: blink 1s infinite;
}
@keyframes fly {
    0% {
        transform: translateY(0px);
        opacity: 1;
    }
    99% {
        transform: translateY(20px);
        opacity: 1;
    }
    100% {
        transform: translateY(20px);
        opacity: 0;
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
