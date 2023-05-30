<script lang="ts">
import type { User } from '$lib/types';
import Trophy from '../icons/Trophy.svelte';

export let podium;
export let first: User | undefined;
export let second: User | undefined;
export let third: User | undefined;
</script>

<dialog bind:this={podium}>
    <h1>Podium</h1>
    <button>X</button>
    <div class="podium">
        {#if second}
            <div class="second">
                <Trophy width="25%" height="25%" />
                <p>{second.name}</p>
            </div>
        {/if}
        <div class="first">
            <Trophy width="25%" height="25%" />
            <p>{first?.name}</p>
        </div>
        {#if third}
            <div class="third">
                <Trophy width="25%" height="25%" />
                <p>{third.name}</p>
            </div>
        {/if}
    </div>
</dialog>

<style>
dialog {
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50vw;
    background-color: transparent;
    outline: none;
    border: none;
    background: radial-gradient(closest-side, black 0%, black 33%, transparent);
    padding: 5em;
    overflow: hidden;
    box-sizing: content-box;
    animation: pop-in 200ms ease 1 both;
}

dialog > button {
    position: absolute;
    top: 10px;
    right: 10px;
    outline: none;
    border: none;
}

dialog > h1 {
    color: white;
}

.podium {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 1fr;
    grid-template-areas: 'silver gold bronze';
    grid-auto-flow: column;
    justify-items: end;
    width: 100%;
    min-height: 250px;
    align-items: end;
    border-radius: 10px;
    overflow: hidden;
}

.podium > :where(div) {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: black;
    width: 100%;
    border-radius: 10px 10px 0 0;
}

.podium p {
    font-size: 1.5rem;
    font-weight: bold;
}

.first {
    grid-area: gold;
    background-color: var(--gold-light);
    --icon-color: var(--gold);
    --full-height: 250px;
    animation: slide-in 400ms ease 1 both;
}

.second {
    grid-area: silver;
    background-color: var(--silver-light);
    --icon-color: var(--silver);
    --full-height: 175px;
    border-top-right-radius: 0;
    animation: slide-in 400ms ease 1 both 400ms;
}

.third {
    grid-area: bronze;
    background-color: var(--bronze-light);
    --icon-color: var(--bronze);
    --full-height: 100px;
    border-top-left-radius: 0;
    animation: slide-in 400ms ease 1 both 800ms;
}

@keyframes pop-in {
    from {
        opacity: 0.25;
        transform: translate(-50%, -50%) scale(0.2);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%);
    }
}

@keyframes slide-in {
    from {
        height: 0;
    }
    to {
        height: var(--full-height);
    }
}
</style>
