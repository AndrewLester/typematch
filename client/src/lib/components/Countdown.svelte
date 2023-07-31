<script lang="ts">
import { quintOut } from 'svelte/easing';
import { crossfade } from 'svelte/transition';
import CountdownText from './CountdownText.svelte';

export let countdown: number;
export let totalTime: number;

const key = 'countdown';

const [send, receive] = crossfade({
    duration: (d) => Math.sqrt(d * 500),
    fallback(node) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;

        return {
            duration: 600,
            easing: quintOut,
            css: (t) => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`,
        };
    },
});
</script>

{#if countdown > Number((totalTime * (3 / 4)).toPrecision(1))}
    <div class="absolute" in:receive|global={{ key }} out:send|global={{ key }}>
        <CountdownText {countdown} {totalTime} />
    </div>
{:else}
    <div class="relative" in:receive|global={{ key }} out:send|global={{ key }}>
        <CountdownText {countdown} {totalTime} />
    </div>
{/if}

<style>
.relative,
.absolute {
    display: grid;
    place-items: center;
    border-radius: 50%;
    padding: 35px;
    font-size: 2rem;
    width: 5em;
    height: 5em;
}

.relative {
    position: relative;
    aspect-ratio: 1 /1;
}

.absolute {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 15vh;
    z-index: 10;
    background: radial-gradient(rgba(0, 0, 0, 1), transparent);
}
</style>
