<script lang="ts">
import type { User } from '$lib/types';
import { scale } from 'svelte/transition';
import Trophy from '../icons/Trophy.svelte';
import { cubicInOut } from 'svelte/easing';
import { flip } from 'svelte/animate';

export let users: User[];

$: leaderboard = users.sort(leaderboardSort);

function slideLeft(element: Element, { delay = 0, duration = 350 }) {
    return {
        delay,
        duration,
        css: (t: number) => {
            const eased = cubicInOut(t);
            return `
            transform: translateX(${(1 - eased) * 100}%);
            opacity: ${eased};
        `;
        },
    };
}

function leaderboardSort(a: User, b: User) {
    if (a.finished !== undefined && b.finished !== undefined) {
        return a.finished - b.finished;
    }

    if (a.finished) {
        return -1;
    }

    if (b.finished) {
        return 1;
    }

    return b.position - a.position || a.name.localeCompare(b.name);
}
</script>

<div>
    {#each leaderboard as user, i (user.id)}
        <p
            in:slideLeft|local={{ delay: i * 50 }}
            class:finished={user.finished !== undefined}
            animate:flip={{ duration: 250 }}
        >
            <span class="icon">
                {#if user.finished !== undefined && i <= 3}
                    <span transition:scale|local={{ delay: 100 }}>
                        <Trophy />
                    </span>
                {:else}
                    <strong out:scale|local={{ duration: 100 }}>{i + 1}</strong>
                {/if}
            </span>

            {user.name}
        </p>
    {/each}
</div>

<style>
div {
    display: flex;
    flex-flow: column nowrap;
    gap: 10px;
    overflow: hidden;
}

p {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: 5px;
    padding: 0.5em 1em;
    background-color: rgb(175, 175, 175);
    clip-path: polygon(0% 0%, 90% 0%, 100% 100%, 10% 100%);
    color: black;
    transition: background-color 250ms ease;
}

p .icon {
    display: grid;
    place-items: center;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    width: 1.35em;
    height: 1.35em;
    border-radius: 50%;
    transition: background-color 250ms ease;
}

p .icon > * {
    grid-area: 1 / 1 / 2 / 2;
}

.finished:nth-child(n + 4) .icon {
    background-color: rgb(225, 225, 225);
}

.finished:first-child {
    background-color: var(--gold-light);
    --icon-color: var(--gold);
}

.finished:nth-child(2) {
    background-color: var(--silver-light);
    --icon-color: var(--silver);
}

.finished:nth-child(3) {
    background-color: var(--bronze-light);
    --icon-color: var(--bronze);
}
</style>
