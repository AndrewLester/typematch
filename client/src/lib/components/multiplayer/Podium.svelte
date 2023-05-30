<script lang="ts">
import type { User } from '$lib/types';
import Trophy from '../icons/Trophy.svelte';

export let podium;
export let users: User[];
</script>

<dialog bind:this={podium}>
    <h1>Podium</h1>
    <button>X</button>
    <div class="podium">
        {#if users.length > 1}
            <div>
                <Trophy width="25%" height="25%" />
                <p>{users[1].name}</p>
            </div>
        {/if}
        <div>
            <Trophy width="25%" height="25%" />
            <p>{users[0]?.name}</p>
        </div>
        {#if users.length > 2}
            <div>
                <Trophy width="25%" height="25%" />
                <p>{users[2].name}</p>
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
    grid-template-columns: 1fr 1fr 1fr;
    grid-auto-flow: column;
    justify-items: end;
    width: 100%;
    min-height: 250px;
    align-items: end;
    border-radius: 10px;
    overflow: hidden;
}

.podium > div {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
    gap: 10px;
    --icon-color: var(--gold);
    color: black;
    width: 100%;
    border-radius: 10px 10px 0 0;
}

.podium p {
    font-size: 1.5rem;
    font-weight: bold;
}

.podium > div:nth-child(2) {
    background-color: var(--gold-light);
    --full-height: 250px;
    animation: slide-in 400ms ease 1 both;
}

.podium > div:nth-child(1) {
    background-color: var(--silver-light);
    --icon-color: var(--silver);
    --full-height: 175px;
    animation: slide-in 400ms ease 1 both 425ms;
}

.podium > div:nth-child(3) {
    background-color: var(--bronze-light);
    --icon-color: var(--bronze);
    --full-height: 100px;
    animation: slide-in 400ms ease 1 both 850ms;
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
