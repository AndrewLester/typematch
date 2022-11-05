<script lang="ts">
import SingleplayerEditor from '../components/SingleplayerEditor.svelte';

import { fade, slide } from 'svelte/transition';
</script>

<svelte:head>
    <title>TypeMatch</title>
</svelte:head>

<a
    transition:fade
    href="/multiplayer"
    class="button"
    style="position: fixed; top: 20px; left: 20px;">Multiplayer</a
>

<div in:slide={{ delay: 250 }} out:slide>
    <SingleplayerEditor />
</div>
