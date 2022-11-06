<script lang="ts">
import { isNonLetterKey } from '$lib/keyboard';
import { getRandomPassage } from '$lib/passages';
import MultiplayerEditor from './MultiplayerEditor.svelte';

export let passage: string;

let startTime: Date | undefined = undefined;
</script>

<MultiplayerEditor
    canRestart
    {startTime}
    {passage}
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
    }}
>
    <svelte:fragment slot="waiting">Ready? Begin typing</svelte:fragment>
</MultiplayerEditor>
