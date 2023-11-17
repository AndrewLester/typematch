<script lang="ts">
import { browser, dev } from '$app/environment';

import { invalidate } from '$app/navigation';

import { page } from '$app/stores';
import { PUBLIC_WORKER_HOST } from '$env/static/public';
import { sleep } from '$lib/async';
import Countdown from '$lib/components/Countdown.svelte';
import Multiplayer from '$lib/components/Multiplayer.svelte';
import MultiplayerStatisticsView from '$lib/components/MultiplayerStatisticsView.svelte';
import { countWords, passages } from '$lib/passages';
import type {
    MultiplayerStatistics,
    SingleplayerStatistics,
} from '$lib/statistics';
import { clock, multiplayerWSStore, preferences, time } from '$lib/stores';
import { horizontalSlide } from '$lib/transition';
import { GameState, countdownTime } from '$lib/types';
import { onMount, tick } from 'svelte';
import type { FormEventHandler } from 'svelte/elements';
import type { Readable } from 'svelte/store';
import { fade, scale, slide } from 'svelte/transition';

export let data;

let { game } = data;
let extend = false;
let gameStore: ReturnType<typeof multiplayerWSStore> | undefined;
let statsOpen = false;
let inspect: number | undefined;

let multiplayer: Multiplayer | undefined;
let statistics: SingleplayerStatistics | undefined;
let stats: HTMLButtonElement | undefined;
let joinModal: HTMLDialogElement | undefined;
let inGameModal: HTMLDialogElement | undefined;

let countdownTimer: Readable<Date> | undefined;

$: if (game.state === GameState.Waiting) {
    inspect = undefined;
    statsOpen = false;
}

$: userCount = Object.values(game.users).length;
$: name = $preferences?.name;
const getGameStore = () => gameStore;
// Not sure why but sometimes $page.params.code is undefined
$: if (browser && name && $page.params.code) {
    getGameStore()?.disconnect();
    gameStore = multiplayerWSStore(
        `ws${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}/game/${
            $page.params.code
        }/connect?name=${name}`,
    );
}
$: if ($gameStore) {
    game = $gameStore;
}

$: if (
    !data.me &&
    userCount > 0 &&
    browser &&
    game.state === GameState.Waiting &&
    $preferences?.name
) {
    invalidate('game:state');
}

const goMessageDuration = 500;
$: isCountdown =
    game.state === GameState.Countdown ||
    (game.state === GameState.Playing &&
        $time.getTime() - game.local?.countdownTime! <
            countdownTime + goMessageDuration);
$: if (isCountdown) {
    countdownTimer = clock(100);
} else {
    countdownTimer = undefined;
}

$: if (
    statistics &&
    game.state === GameState.Playing &&
    data.me?.finished === undefined
) {
    gameStore?.sendStatistics(statistics);
}

onMount(() => {
    if (!game.passage) {
        sleep(650).then(() => (extend = true));
    }

    if (data.me) {
        return;
    }

    if (game.state !== GameState.Waiting) {
        inGameModal?.showModal();
        return;
    }

    if (!$preferences?.name) {
        joinModal?.showModal();
    }
});

async function selectPassage(passageIndex: number) {
    extend = false;

    const passage = {
        index: passageIndex,
        length: passages[passageIndex].length,
    };

    await fetch(`//${PUBLIC_WORKER_HOST}/game/${$page.params.code}/passage`, {
        method: 'POST',
        body: JSON.stringify(passage),
        headers: {
            'Content-Type': 'text/plain',
        },
        credentials: 'include',
    });

    game.passage = passage;
}

function onInput(e: CustomEvent<string>) {
    gameStore?.updatePosition(e.detail.length);
}

const joinGame: FormEventHandler<HTMLFormElement> = (e) => {
    preferences.update((cur) => ({
        ...cur,
        name:
            new FormData(e.target as HTMLFormElement).get('name')?.toString() ??
            '',
    }));
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

{#if !game.passage}
    <section
        in:slide|global={{ delay: 250 }}
        out:slide|global
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
    <section class="game" in:slide|global={{ delay: 250 }} out:slide|global>
        {#if game?.users}
            <section class="multiplayer-bar">
                {#if game.state === GameState.Waiting}
                    {#if data.me?.admin}
                        <button
                            on:click={startGame}
                            transition:horizontalSlide|global
                            class="start-game">Start game</button
                        >
                    {/if}
                    <p transition:fade>
                        Code: <strong>{$page.params.code}</strong>
                    </p>
                {/if}
                {#if $countdownTimer && game.local?.countdownTime}
                    {@const countdown =
                        countdownTime -
                        ($countdownTimer.getTime() - game.local.countdownTime)}
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
            {game}
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
    {#if game.statistics && game.state === GameState.Finished}
        <div
            class="stats-wrapper"
            in:slide={{ delay: 250 }}
            out:slide={{ duration: 250 }}
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
                    users={game.users}
                    statistics={game.statistics}
                    skeleton={!statsOpen}
                    startTime={game.startTime ?? 0}
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
