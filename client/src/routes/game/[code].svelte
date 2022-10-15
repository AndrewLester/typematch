<script context="module" lang="ts">
export const load: Load = async ({ params }) => {
    const game = await fetch(`http://localhost:8787/game/${params.code}`).then(
        (res) => res.json(),
    );

    return {
        props: {
            game,
        },
    };
};
</script>

<script lang="ts">
import { browser } from '$app/env';

import { page } from '$app/stores';
import Editor from '$components/Editor.svelte';
import { passages } from '$lib/passages';
import { multiplayerWSStore, preferences } from '$lib/stores';
import { GameState, type MultiplayerGame } from '$lib/types';
import type { Load } from '@sveltejs/kit';
import { onMount } from 'svelte';
import { slide } from 'svelte/transition';

export let game: MultiplayerGame;
let joinModal: HTMLDialogElement | undefined;
let inGameModal: HTMLDialogElement | undefined;
let extend = false;
let gameStore: ReturnType<typeof multiplayerWSStore>;
$: if ($preferences) {
    gameStore = multiplayerWSStore(
        `ws://localhost:8787/connect/${$page.params.code}?name=${$preferences.name}&userId=${$preferences.userId}`,
    );
}
$: if ($gameStore) game = $gameStore;
$: otherUsers = game?.users
    ? Object.values(game?.users).filter(
          (user) => user.id !== $preferences?.userId,
      )
    : [];
$: me = $preferences?.userId ? game?.users[$preferences?.userId] : null;
$: passage =
    game && game?.passageIndex >= 0 ? passages[game?.passageIndex] : undefined;
$: position = me?.position ?? 0;
onMount(() => {
    if (me) {
        return;
    }

    if (game.state !== GameState.Waiting) {
        inGameModal?.showModal();
        return;
    }

    if (!$preferences) {
        joinModal?.showModal();
    }
});

async function selectPassage(passageIndex: number) {
    extend = false;

    await fetch(`http://localhost:8787/game/${$page.params.code}/passage`, {
        method: 'POST',
        body: passageIndex.toString(),
        headers: {
            'Content-Type': 'text/plain',
        },
    });
    passage = passages[passageIndex];
}

function onInput(e: CustomEvent<string>) {
    gameStore?.updatePosition(e.detail.length);
}

function joinGame(e: SubmitEvent) {
    e.preventDefault();
    preferences.set({
        name:
            new FormData(e.target as HTMLFormElement).get('name')?.toString() ??
            '',
        userId: crypto.randomUUID(),
    });
    joinModal?.close();
}

async function startGame() {
    await fetch(`http://localhost:8787/game/${$page.params.code}/start`, {
        method: 'POST',
    });
}
</script>

<section
    in:slide
    out:slide={{ delay: 250 }}
    on:introend={() => (extend = true)}
    on:outrostart={() => (extend = false)}
>
    {#if !passage}
        <div transition:slide|local class="select-wrapper" class:extend>
            <h1>Select a passage</h1>

            <div class="passages">
                {#each passages as availablePassage, i}
                    <button class="passage" on:click={() => selectPassage(i)}
                        >{availablePassage}</button
                    >
                {/each}
            </div>
        </div>
    {:else}
        <div style="padding: 20px;" transition:slide|local>
            {#if game?.users}
                <section>
                    <h2>
                        Players:
                        {#each Object.values(game.users) as user (user.id)}
                            <span
                                class="player"
                                class:me={user.id === $preferences?.userId}
                                class:offline={!user.connected && browser}
                                >{user.name}
                            </span>
                        {/each}
                        {#if me?.admin && game.state === GameState.Waiting}
                            <button on:click={startGame}>Start game</button>
                        {/if}
                    </h2>
                </section>
            {/if}
            {#if game.state == GameState.Finished}
                <p transition:slide|local>Leaderboard</p>
            {:else}
                <div transition:slide|local>
                    <Editor
                        {passage}
                        editable={game.state === GameState.Playing}
                        startTime={game.startTime}
                        selfStart={false}
                        {position}
                        otherCursors={otherUsers}
                        on:input={onInput}
                    />
                </div>
            {/if}
        </div>
    {/if}
</section>

<dialog bind:this={joinModal} class="modal">
    <h1>Join Game</h1>
    <h2>Please enter your name</h2>
    <form on:submit={joinGame}>
        <label for="name">Name:</label>
        <input type="text" name="name" required minlength="1" maxlength="30" />
        <button>Continue</button>
    </form>
</dialog>

<dialog bind:this={inGameModal} class="modal">
    <h1>Can't Join</h1>
    <h2>This game is in progress</h2>
    <p>Wait for the next one :)</p>
</dialog>

<style>
.modal {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px;
    background-color: #2c2c2c;
    border: 1px solid white;
    border-radius: 10px;
    color: white;
}
.modal::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: saturate(180%) blur(5px);
}
span.player {
    margin-right: 5px;
}
span.me {
    color: green;
}
span.offline {
    text-decoration: line-through;
    color: rgb(163, 163, 163);
}
.select-wrapper {
    width: 100%;
    transition: all 250ms ease;
    margin-left: 0;
}
h1 {
    padding: 1em;
}
.select-wrapper.extend {
    width: 100vw;
    margin-left: calc(-1 * calc(calc(100vw - 90ch) / 2));
}
.passages {
    display: flex;
    flex-flow: row nowrap;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    align-items: flex-end;
    overflow-x: auto;
    gap: 20px;
}
.passage {
    display: -webkit-box;
    max-width: 25ch;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.25;
    flex: 0 0 auto;
    font-size: 2rem;
    border: 1px solid white;
    padding: 20px;
    border-radius: 20px;
    max-height: 200px;

    color: white;
    background-color: transparent;
    cursor: pointer;
    scroll-snap-align: center;
}
</style>
