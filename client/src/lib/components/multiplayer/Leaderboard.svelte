<script lang="ts">
import type { User } from '$lib/types';
import { flip } from 'svelte/animate';
import { backOut } from 'svelte/easing';
import { scale } from 'svelte/transition';
import Trophy from '../icons/Trophy.svelte';
import Hoverable from '../Hoverable.svelte';
import { horizontalSlide } from '$lib/transition';

export let users: User[];

$: leaderboard = users.sort(leaderboardSort);

function slideLeft(_: HTMLElement, { delay = 0, duration = 350 }) {
    return {
        delay,
        duration,
        css: (t: number) => {
            const eased = backOut(t);
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
    <h2>Leaderboard</h2>
    {#each leaderboard as user, i (user.id)}
        <p
            in:slideLeft={{ delay: i * 50 }}
            class:finished={user.finished !== undefined}
            animate:flip={{ duration: 250 }}
        >
            <span class="icon">
                {#if user.finished !== undefined && i <= 3}
                    <span transition:scale={{ delay: 100 }}>
                        <Trophy />
                    </span>
                {:else}
                    <strong out:scale={{ duration: 100 }}>{i + 1}</strong>
                {/if}
            </span>

            <Hoverable let:hovering>
                <span
                    class="username"
                    class:disconnected={!user.connected}
                    class:admin={user.admin}
                >
                    {user.name}
                </span>
                {#if hovering}
                    <span class="ping" transition:horizontalSlide>
                        {user.ping}ms
                    </span>
                {/if}
            </Hoverable>
        </p>
    {/each}
</div>

<style>
h2 {
    text-decoration: underline;
    text-underline-offset: 5px;
}

div {
    display: flex;
    flex-flow: column nowrap;
    gap: 10px;
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

.username.admin {
    text-decoration: underline;
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

.finished:first-of-type {
    background-color: var(--gold-light);
    --icon-color: var(--gold);
}

.finished:nth-of-type(2) {
    background-color: var(--silver-light);
    --icon-color: var(--silver);
}

.finished:nth-of-type(3) {
    background-color: var(--bronze-light);
    --icon-color: var(--bronze);
}

.username.disconnected {
    text-decoration: line-through;
    color: rgb(73, 73, 73);
}

.ping {
    font-size: 0.55rem;
    align-self: center;
}
</style>
