<script lang="ts">
import { browser, dev } from '$app/environment';

import { invalidate } from '$app/navigation';

import { page } from '$app/stores';
import { PUBLIC_WORKER_HOST } from '$env/static/public';
import Countdown from '$lib/components/Countdown.svelte';
import CountdownText from '$lib/components/CountdownText.svelte';
import Hoverable from '$lib/components/Hoverable.svelte';
import MultiplayerEditor from '$lib/components/MultiplayerEditor.svelte';
import { passages } from '$lib/passages';
import { clock, multiplayerWSStore, preferences, time } from '$lib/stores';
import { horizontalSlide } from '$lib/transition';
import { countdownTime, GameState } from '$lib/types';
import { onMount } from 'svelte';
import { slide } from 'svelte/transition';
import type { PageData } from './$types';

export let data: PageData;
let joinModal: HTMLDialogElement | undefined;
let inGameModal: HTMLDialogElement | undefined;
let extend = false;
let gameStore: ReturnType<typeof multiplayerWSStore> | undefined;
$: userCount = Object.values(data?.game?.users).length;
// Not sure why but sometimes $page.params.code is undefined
$: if ($preferences?.name && $page.params.code && !gameStore) {
    gameStore = multiplayerWSStore(
        `ws${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}/game/${
            $page.params.code
        }/connect?name=${$preferences?.name}`,
    );
}
$: if (
    !data.me &&
    userCount > 0 &&
    browser &&
    data.game.state === GameState.Waiting &&
    $preferences?.name
) {
    invalidate(
        `http${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}/game/${
            $page.params.code
        }/me`,
    );
}
const goMessageDuration = 500;
$: countdownTimer =
    data.game.state === GameState.Countdown ||
    (data.game.state === GameState.Playing &&
        $time.getTime() - data.game.countdownTime <
            countdownTime + goMessageDuration)
        ? clock(100)
        : null;

$: if ($gameStore) data.game = $gameStore;
$: otherUsers = data.game?.users
    ? Object.values(data.game?.users).filter((user) => user.id !== data.me?.id)
    : [];
$: passage =
    data.game && data.game?.passageIndex >= 0
        ? passages[data.game?.passageIndex]
        : undefined;
$: position = data.me?.position ?? 0;
onMount(() => {
    if (data?.me) {
        return;
    }

    if (data?.game.state !== GameState.Waiting) {
        inGameModal?.showModal();
        return;
    }

    if (!$preferences) {
        joinModal?.showModal();
    }
});

async function selectPassage(passageIndex: number) {
    extend = false;

    await fetch(
        `http${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}/game/${
            $page.params.code
        }/passage`,
        {
            method: 'POST',
            body: passageIndex.toString(),
            headers: {
                'Content-Type': 'text/plain',
            },
            credentials: 'include',
        },
    );

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
    fetch(
        `http${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}/game/${
            $page.params.code
        }/start`,
        {
            method: 'POST',
            credentials: 'include',
        },
    );
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
            {#if data.game?.users}
                <section class="multiplayer-bar">
                    {#if data.me?.admin && data.game.state === GameState.Waiting}
                        <button
                            on:click={startGame}
                            transition:horizontalSlide|local
                            class="start-game">Start game</button
                        >
                    {/if}
                    {#each Object.values(data.game.users) as user, i (user.id)}
                        <Hoverable let:hovering>
                            <div
                                class="player"
                                class:me={user.id === data.me?.id}
                                class:offline={!user.connected && browser}
                            >
                                <span class="player-name">{user.name}</span>
                                {#if data?.game.state === GameState.Waiting || hovering}<span
                                        class="player-ping"
                                        transition:horizontalSlide|local
                                        >({user.ping}ms)</span
                                    >{/if}
                                {#if i !== userCount - 1}&mdash;{/if}
                            </div>
                        </Hoverable>
                    {/each}
                    {#if countdownTimer && $countdownTimer !== null}
                        {@const countdown =
                            countdownTime -
                            ($countdownTimer.getTime() -
                                data.game.countdownTime)}
                        <div class="countdown-wrapper">
                            <Countdown {countdown} totalTime={countdownTime} />
                        </div>
                    {/if}
                </section>
            {/if}
            {#if data?.game.state == GameState.Finished}
                <p>Leaderboard</p>
            {:else}
                <MultiplayerEditor
                    {passage}
                    startTime={data?.game.state === GameState.Playing
                        ? new Date(data?.game.startTime)
                        : undefined}
                    {position}
                    on:keydown={(e) => {
                        if (data?.game.state !== GameState.Playing) {
                            e.preventDefault();
                        }
                    }}
                    otherCursors={otherUsers}
                    on:input={onInput}
                />
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
.player {
    margin-right: 10px;
}
.player-name {
    font-size: 1.5rem;
}
.me .player-name {
    color: green;
}
.player-ping {
    line-height: 1;
    vertical-align: baseline;
    display: inline-block;
}
.player.offline .player-name {
    text-decoration: line-through;
    color: rgb(163, 163, 163);
}
.select-wrapper {
    width: 100%;
    transition: all 250ms ease;
    margin-left: 0;
}
.start-game {
    margin-right: 10px;
}
h1 {
    padding: 1em;
}
.select-wrapper.extend {
    width: 100vw;
    margin-left: calc(-1 * calc(calc(100vw - 90ch) / 2));
}
.multiplayer-bar {
    height: 75px;
    display: flex;
    flex-flow: row nowrap;
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
.countdown-wrapper {
    margin-left: auto;
}
</style>
