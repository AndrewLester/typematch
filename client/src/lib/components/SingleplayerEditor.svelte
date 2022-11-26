<script lang="ts">
import { isNonLetterKey } from '$lib/keyboard';
import { getRandomPassage } from '$lib/passages';
import {
    SingleplayerStatisticsCollector,
    type SingleplayerStatistics,
} from '$lib/statistics';
import MultiplayerEditor from './MultiplayerEditor.svelte';

export let passage: string;
export let done = false;
export let statistics: SingleplayerStatistics | undefined = undefined;
export let inspect: number | undefined = undefined;

const statisticsCollector = new SingleplayerStatisticsCollector();

$: if ($statisticsCollector) {
    statistics = $statisticsCollector;
}

let startTime: Date | undefined = undefined;

function isStartKey(key: string) {
    return !isNonLetterKey(key);
}

function handleKeyDown(e: CustomEvent<KeyboardEvent>) {
    if (startTime !== undefined) {
        return;
    }

    if (isStartKey(e.detail.key)) {
        startTime = new Date();
        statisticsCollector.begin(passage, startTime);
    }
}
</script>

<MultiplayerEditor
    canRestart
    {startTime}
    {passage}
    {inspect}
    bind:done
    on:collect={(e) => statisticsCollector.onCollect(e.detail)}
    on:complete={(e) => statisticsCollector.end(e.detail)}
    on:keydown={handleKeyDown}
    on:restart={() => {
        passage = getRandomPassage();
        startTime = undefined;
        statisticsCollector.reset();
    }}
>
    <svelte:fragment slot="waiting">Ready? Begin typing</svelte:fragment>
</MultiplayerEditor>
