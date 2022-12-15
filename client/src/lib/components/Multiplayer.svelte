<script lang="ts">
import { passages } from '$lib/passages';
import {
    SingleplayerStatisticsCollector,
    type SingleplayerStatistics,
} from '$lib/statistics';
import { GameState, type MultiplayerGame, type User } from '$lib/types';
import Editor from './Editor.svelte';

export let me: User | undefined;
export let game: MultiplayerGame;
export let statistics: SingleplayerStatistics | undefined = undefined;

$: playerStats = me ? game.statistics[me.id] : undefined;
$: statisticsCollector = new SingleplayerStatisticsCollector(playerStats);

let editor: Editor | undefined;

$: if (game.state === GameState.Playing && !statisticsCollector.startTime) {
    statisticsCollector.begin(passages[game.passage!.index], new Date());
}

$: if ($statisticsCollector) {
    statistics = $statisticsCollector;
}

$: passage = passages[game.passage?.index ?? 0];

$: otherUsers = Object.values(game.users).filter((user) => user.id !== me?.id);

export function focus() {
    editor?.focus();
}
</script>

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
