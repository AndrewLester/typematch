<script context="module" lang="ts">
export const load: Load = async ({ params, fetch }) => {
    const [game, me] = await Promise.all([
        fetch(`http://localhost:8787/game/${params.code}`).then((res) =>
            res.json(),
        ),
        fetch(`http://localhost:8787/game/${params.code}/me`, {
            credentials: 'include',
        }).then((res) => (res.status < 300 ? res.json() : null)),
    ]);

    return {
        props: {
            game,
            me,
        },
    };
};
</script>

<script lang="ts">
import { browser } from '$app/env';
import { invalidate } from '$app/navigation';

import { page } from '$app/stores';
import MultiplayerEditor from '$components/MultiplayerEditor.svelte';
import { passages } from '$lib/passages';
import { multiplayerWSStore, preferences } from '$lib/stores';
import { GameState, type MultiplayerGame, type User } from '$lib/types';
import type { Load } from '@sveltejs/kit';
import { onMount } from 'svelte';
import { fade, slide } from 'svelte/transition';

export let game: MultiplayerGame;
export let me: User | null;
let joinModal: HTMLDialogElement | undefined;
let inGameModal: HTMLDialogElement | undefined;
let extend = false;
let gameStore: ReturnType<typeof multiplayerWSStore>;
$: userCount = Object.values(game?.users).length;
// Not sure why but sometimes $page.params.code is undefined
$: if ($preferences?.name && $page.params.code) {
    gameStore = multiplayerWSStore(
        `ws://localhost:8787/game/${$page.params.code}/connect?name=${$preferences?.name}`,
    );
}
$: if (!me && userCount > 0 && browser) {
    invalidate(`http://localhost:8787/game/${$page.params.code}/me`);
}
$: console.log(game?.users, me);
$: if ($gameStore) game = $gameStore;
$: otherUsers = game?.users
    ? Object.values(game?.users).filter((user) => user.id !== me?.id)
    : [];
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
        credentials: 'include',
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
    });
    joinModal?.close();
}

function startGame() {
    fetch(`http://localhost:8787/game/${$page.params.code}/start`, {
        method: 'POST',
        credentials: 'include',
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
                <section class="multiplayer-bar">
                    {#if me?.admin && game.state === GameState.Waiting}
                        <button on:click={startGame} transition:fade
                            >Start game</button
                        >
                    {/if}
                    {#each Object.values(game.users) as user (user.id)}
                        <div
                            class="player"
                            class:me={user.id === me?.id}
                            class:offline={!user.connected && browser}
                        >
                            <span class="player-name">{user.name}</span>
                            ({user.ping}ms)
                        </div>
                    {/each}
                </section>
            {/if}
            {#if game.state == GameState.Finished}
                <p transition:slide|local>Leaderboard</p>
            {:else}
                <div transition:slide|local>
                    <MultiplayerEditor
                        {passage}
                        startTime={game.state === GameState.Playing
                            ? new Date(game.startTime)
                            : undefined}
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
.player-name {
    font-size: 1.5rem;
}
.me .player-name {
    color: green;
}
.player.offline {
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
.multiplayer-bar {
    min-height: 75px;
    display: flex;
    flex-flow: row nowrap;
    gap: 10px;
    padding-block: 1em;
    align-items: center;
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
