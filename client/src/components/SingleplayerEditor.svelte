<script lang="ts">
import { isNonLetterKey } from '$lib/keyboard';
import { passages } from '$lib/passages';
import MultiplayerEditor from './MultiplayerEditor.svelte';

let startTime: Date | undefined = undefined;
let passage = getRandomPassage();

function getRandomPassage() {
    return passages[Math.trunc(Math.random() * passages.length)];
}
</script>

<MultiplayerEditor
    canRestart
    {startTime}
    {passage}
    on:keydown={(e) => {
        if (!isNonLetterKey(e.detail.key) && startTime === undefined) {
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
