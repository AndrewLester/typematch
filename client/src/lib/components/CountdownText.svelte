<script lang="ts">
import { linear } from 'svelte/easing';
import { tweened } from 'svelte/motion';

export let countdown: number;
export let totalTime: number;

const percentFilled = tweened(
    (totalTime / 1000 - Math.ceil(countdown / 1000)) / (totalTime / 1000),
    {
        duration: 1050,
        easing: linear,
    },
);

let path: SVGPathElement | undefined;

$: cleanTime = Math.ceil(countdown / 1000);
$: totalTimeSeconds = totalTime / 1000;
$: percentFilled.set((totalTimeSeconds - cleanTime + 1) / totalTimeSeconds);
</script>

<svg class="progress" viewBox="0 0 70 70">
    <title>{cleanTime} second{cleanTime !== 1 ? 's' : ''} left.</title>
    <path
        bind:this={path}
        d="M 35 0 A 35 35 0 0 1 70 35 A 35 35 0 0 1 35 70 A 35 35 0 0 1 0 35 A 35 35 0 0 1 35 0"
        stroke-width={cleanTime > 0 ? 4 : 0}
        stroke="white"
        fill="none"
        stroke-dasharray={path && path.getTotalLength()}
        stroke-dashoffset={path &&
            Math.min(1, Math.max(0, 1 - $percentFilled)) *
                path.getTotalLength()}
    />
</svg>
<p class:jump={cleanTime <= 0}>
    {#if cleanTime > 0}
        {cleanTime}
    {:else}
        Go!
    {/if}
</p>

<style>
.progress {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 2.5em;
    height: 2.5em;
    overflow: visible;
}

path {
    transition: stroke-width 150ms ease;
}

p {
    width: 2em;
    height: 1.2em;
    font-size: inherit;
    text-align: center;
    transform-origin: center;
}

p.jump {
    animation: text-jump 450ms ease-in-out both;
}

@keyframes text-jump {
    33% {
        transform: scale(2) rotate(25deg);
    }
    66% {
        transform: scale(2) rotate(-25deg);
    }
    100% {
        transform: scale(2) rotate(0);
    }
}
</style>
