<script lang="ts">
import type { User } from '$lib/types';
import Trophy from '../icons/Trophy.svelte';

export let users: User[];
</script>

<div>
    {#each users as user, i (user.id)}
        <p style="animation-delay: {i * 50}ms">
            {#if i <= 3}
                <Trophy />
            {:else}
                <strong>{i + 1}</strong>
            {/if}
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
    gap: 4px;
    padding: 0.5em 1em;
    animation: slide-left 350ms ease 1 both;
}

p {
    background-color: rgb(175, 175, 175);
    clip-path: polygon(0% 0%, 90% 0%, 100% 100%, 10% 100%);
    color: black;
}

p:first-child {
    background-color: var(--gold-light);
    --icon-color: var(--gold);
}

p:nth-child(2) {
    background-color: var(--silver-light);
    --icon-color: var(--silver);
}

p:nth-child(3) {
    background-color: var(--bronze-light);
    --icon-color: var(--bronze);
}

@keyframes slide-left {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: unset;
        opacity: 1;
    }
}
</style>
