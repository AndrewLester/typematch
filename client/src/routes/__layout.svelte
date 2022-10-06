<script lang="ts">
import { page } from '$app/stores';
import { slide } from 'svelte/transition';
import '../app.css';
</script>

<main>
    <slot />
</main>

<style>
main {
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    background-color: rgb(31, 31, 31);
    height: 100vh;
    margin: 0px auto;
    width: 90ch;
}
</style>
