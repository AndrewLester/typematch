<script lang="ts">
import { browser, dev } from '$app/environment';

import { invalidate } from '$app/navigation';

import { page } from '$app/stores';
import { PUBLIC_WORKER_HOST } from '$env/static/public';
import { gameURL } from '$lib/api';
import { sleep } from '$lib/async';
import Countdown from '$lib/components/Countdown.svelte';
import Hoverable from '$lib/components/Hoverable.svelte';
import Multiplayer from '$lib/components/Multiplayer.svelte';
import MultiplayerStatisticsView from '$lib/components/MultiplayerStatisticsView.svelte';
import { countWords, passages } from '$lib/passages';
import type { SingleplayerStatistics } from '$lib/statistics';
import { clock, multiplayerWSStore, preferences, time } from '$lib/stores';
import { horizontalSlide } from '$lib/transition';
import { countdownTime, GameState } from '$lib/types';
import { onMount, tick } from 'svelte';
import { slide } from 'svelte/transition';
import type { PageData } from './$types';
import type { FormEventHandler, HTMLFormAttributes } from 'svelte/elements';

export let data: PageData;

let joinModal: HTMLDialogElement | undefined;
let inGameModal: HTMLDialogElement | undefined;
let extend = false;
let multiplayer: Multiplayer | undefined;
let gameStore: ReturnType<typeof multiplayerWSStore> | undefined;
let statistics: SingleplayerStatistics | undefined = undefined;
let statsOpen = false;
let stats: HTMLButtonElement | undefined;
let inspect: number | undefined = undefined;

$: if (data.game.state === GameState.Waiting) {
    inspect = undefined;
    statsOpen = false;
}

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
    invalidate(`${gameURL}/${$page.params.code}/me`);
}
const goMessageDuration = 500;
$: countdownTimer =
    data.game.state === GameState.Countdown ||
    (data.game.state === GameState.Playing &&
        $time.getTime() - data.game.countdownTime! <
            countdownTime + goMessageDuration)
        ? clock(100)
        : null;

$: if ($gameStore) data.game = $gameStore;
$: gameReady = !!$gameStore;
$: if (
    statistics &&
    gameReady &&
    data?.me?.position !== data.game.passage?.length
) {
    gameStore?.sendStatistics(statistics);
}

onMount(() => {
    if (!data.game.passage) {
        sleep(650).then(() => (extend = true));
    }

    if (data.me) {
        return;
    }

    if (data.game.state !== GameState.Waiting) {
        inGameModal?.showModal();
        return;
    }

    if (!$preferences) {
        joinModal?.showModal();
    }
});

async function selectPassage(passageIndex: number) {
    extend = false;

    const passage = {
        index: passageIndex,
        length: passages[passageIndex].length,
    };

    await fetch(
        `http${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}/game/${
            $page.params.code
        }/passage`,
        {
            method: 'POST',
            body: JSON.stringify(passage),
            headers: {
                'Content-Type': 'text/plain',
            },
            credentials: 'include',
        },
    );

    data.game.passage = passage;
}

function onInput(e: CustomEvent<string>) {
    gameStore?.updatePosition(e.detail.length);
}

const joinGame: FormEventHandler<HTMLFormElement> = (e) => {
    preferences.set({
        name:
            new FormData(e.target as HTMLFormElement).get('name')?.toString() ??
            '',
    });
    joinModal?.close();
};

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
    multiplayer?.focus?.();
}
</script>

{#if !data.game.passage}
    <section
        in:slide={{ delay: 250 }}
        out:slide
        class="select-wrapper"
        class:extend
        on:outrostart={() => (extend = false)}
    >
        <h1>Select a passage</h1>

        <div class="passages">
            {#each [...passages].sort((a, b) => a.length - b.length) as availablePassage}
                <button
                    class="passage"
                    on:click={() =>
                        selectPassage(passages.indexOf(availablePassage))}
                    ><span class="passage-header"
                        >~{Math.round(countWords(availablePassage))} words</span
                    >{availablePassage}</button
                >
            {/each}
        </div>
    </section>
{:else}
    <section class="game" in:slide={{ delay: 250 }} out:slide>
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
                            <span class="player-name" class:admin={user.admin}
                                >{user.name}</span
                            >
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
                            (data.game?.countdownTime ?? 0))}
                    <div class="countdown-wrapper">
                        <Countdown {countdown} totalTime={countdownTime} />
                    </div>
                {/if}
            </section>
        {/if}
        <Multiplayer
            bind:this={multiplayer}
            bind:statistics
            me={data.me}
            game={data.game}
            on:input={onInput}
        />
    </section>
{/if}

<div
    class="stats-transition"
    in:slide={{ delay: 250 }}
    out:slide={{ duration: 250 }}
    class:open={statsOpen}
>
    {#if data.game.statistics && data.game.state === GameState.Finished}
        <div
            class="stats-wrapper"
            in:slide|local={{ delay: 250 }}
            out:slide|local={{ duration: 250 }}
            on:outroend={() => (statsOpen = false)}
        >
            <button
                class="stats"
                bind:this={stats}
                on:click|once={async () => {
                    statsOpen = true;
                    await tick();
                    stats?.scrollIntoView({ behavior: 'smooth' });
                }}
            >
                <MultiplayerStatisticsView
                    me={data.me}
                    users={data.game.users}
                    statistics={data.game.statistics}
                    skeleton={!statsOpen}
                    startTime={data.game.startTime ?? 0}
                    on:inspect={(e) => (inspect = e.detail)}
                />
            </button>
        </div>
    {/if}
</div>

<dialog bind:this={joinModal} class="modal">
    <h1>Join Game</h1>
    <h2>Please enter your name</h2>
    <form on:submit|preventDefault={joinGame}>
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
.game,
.stats-wrapper {
    --padding: 30px;
    padding: var(--padding);
    width: calc(80ch + calc(2 * var(--padding)));
    margin-inline: auto;
}

.stats-transition {
    position: relative;
    margin-top: -125px;
    max-height: 125px;
    overflow: hidden;
    padding-top: 0;
}

.stats-transition.open {
    overflow: visible;
}

.stats-transition.open .stats {
    cursor: default;
}

.stats {
    width: 100%;
    text-align: unset;
    transition: all 250ms ease;
    border: none;
    appearance: none;
}

.stats-transition:not(.open)::after {
    content: 'Click to see statistics';
    position: absolute;
    display: grid;
    place-items: center;
    top: 0;
    font-size: 2rem;
    left: calc(-1 * calc(var(--padding) / 2));
    height: 100%;
    width: 100%;
    overflow: hidden;
    background-image: linear-gradient(transparent 5%, rgb(60, 60, 60));
    backdrop-filter: blur(2px);
    pointer-events: none;
}
.modal {
    top: 50%;
    left: 50%;
    padding: 20px;
    background-color: #2c2c2c;
    border: 1px solid white;
    border-radius: 10px;
    color: white;
    transform-origin: top left;
    animation: pop 350ms ease 1 both;
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
.player-name.admin {
    text-decoration: underline;
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
    transition: all 250ms ease;
    margin-left: 0;
    width: 75vw;
}
.start-game {
    margin-right: 10px;
}
h1 {
    padding: 1em;
}
.select-wrapper.extend {
    width: 100vw;
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
.passage-header {
    float: right;
    margin: 5px 0 0 30px;
    border: 1px solid white;
    padding: 2px;
    font-size: 1.25rem;
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
    text-align: left;
    color: white;
    background-color: transparent;
    cursor: pointer;
    scroll-snap-align: center;
}
.countdown-wrapper {
    margin-left: auto;
}

@keyframes pop {
    from {
        transform: scale(0.65) translate(-50%, -50%);
        opacity: 0.3;
    }
    to {
        transform: scale(1) translate(-50%, -50%);
        opacity: 1;
    }
}
</style>
