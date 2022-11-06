<script lang="ts">
import SingleplayerEditor from '../components/SingleplayerEditor.svelte';
import type { PageData } from './$types';
import { fade, slide } from 'svelte/transition';

export let data: PageData;
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
    <SingleplayerEditor passage={data.passage} />
</div>
