<script lang="ts">
import { isNonLetterKey } from '$lib/keyboard';
import { getRandomPassage } from '$lib/passages';
import {
    SingleplayerStatisticsCollector,
    type PlayerStatistic,
} from '$lib/statistics';
import MultiplayerEditor from './MultiplayerEditor.svelte';

export let passage: string;
export let done = false;
export let statistics: PlayerStatistic[] | undefined = undefined;

const statisticsCollector = new SingleplayerStatisticsCollector();

$: if ($statisticsCollector) {
    statistics = $statisticsCollector;
}

let startTime: Date | undefined = undefined;
</script>

<MultiplayerEditor
    canRestart
    {startTime}
    {passage}
    bind:done
    on:collect={(e) => statisticsCollector.onCollect(e)}
    on:keydown={(e) => {
        if (startTime !== undefined) {
            return;
        }

        if (!isNonLetterKey(e.detail.key)) {
            startTime = new Date();
        }
    }}
    on:restart={() => {
        passage = getRandomPassage();
        startTime = undefined;
        statisticsCollector.reset();
    }}
>
    <svelte:fragment slot="waiting">Ready? Begin typing</svelte:fragment>
</MultiplayerEditor>
