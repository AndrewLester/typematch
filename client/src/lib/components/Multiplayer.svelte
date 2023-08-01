<script lang="ts">
import { passages } from '$lib/passages';
import {
    SingleplayerStatisticsCollector,
    type SingleplayerStatistics,
} from '$lib/statistics';
import { GameState, type MultiplayerGame, type User } from '$lib/types';
import { confetti } from '@neoconfetti/svelte';
import Editor from './Editor.svelte';
import Leaderboard from './multiplayer/Leaderboard.svelte';
import Podium from './multiplayer/Podium.svelte';
import { horizontalSlide } from '$lib/transition';
import { fade } from 'svelte/transition';

export let me: User | undefined;
export let game: MultiplayerGame;
export let statistics: SingleplayerStatistics | undefined = undefined;

let editor: Editor | undefined;
let podium: HTMLDialogElement | undefined;

$: playerStats = me ? game.statistics[me.id] : undefined;
$: statisticsCollector = new SingleplayerStatisticsCollector(playerStats);

$: if (game.state === GameState.Playing && !statisticsCollector.startTime) {
    statisticsCollector.begin(
        passages[game.passage!.index],
        new Date(game.startTime!),
    );
}

$: if ($statisticsCollector) {
    statistics = $statisticsCollector;
}

$: passage = passages[game.passage?.index ?? 0];
$: otherUsers = Object.values(game.users).filter((user) => user.id !== me?.id);
$: finishedUsers = Object.values(game.users)
    .filter((user) => user.finished !== undefined)
    .sort((a, b) => a.finished! - b.finished!);
$: finished = game.state === GameState.Finished;
$: if (finished && podium) {
    podium.showModal();
}

export function focus() {
    editor?.focus();
}
</script>

<svelte:window on:click={() => podium?.close()} />

{#if finished}
    <div class="confetti" use:confetti />
{/if}

<Editor
    bind:this={editor}
    {passage}
    position={me?.position ?? 0}
    startTime={game.startTime ? new Date(game.startTime) : undefined}
    endTime={game.endTime ? new Date(game.endTime) : undefined}
    on:keydown={(e) => {
        if (game.state !== GameState.Playing) {
            e.preventDefault();
        }
    }}
    done={game.state === GameState.Finished}
    otherCursors={otherUsers}
    on:collect={(e) => statisticsCollector.onCollect(e.detail)}
    on:complete={(e) => statisticsCollector.end(e.detail)}
    on:input
>
    <svelte:fragment slot="waiting">
        {#if game.state === GameState.Finished}
            Game over
        {:else}
            Waiting to start...
        {/if}
    </svelte:fragment>
</Editor>

<Podium
    bind:podium
    first={finishedUsers[0]}
    second={finishedUsers[1]}
    third={finishedUsers[2]}
/>

<aside in:fade|global={{ delay: 250 }}>
    <Leaderboard users={Object.values(game.users)} />
</aside>

<style>
aside {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 0;
    padding-right: 20px;
    min-height: 50%;
    max-height: 80%;
}

.confetti {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999;
}
</style>
