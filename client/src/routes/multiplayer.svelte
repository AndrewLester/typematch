<script lang="ts">
import { goto } from '$app/navigation';
import { preferences } from '$lib/stores';
import { fade, slide } from 'svelte/transition';

async function createGame(e: SubmitEvent) {
    e.preventDefault();
    const res = await fetch('http://localhost:8787/create', {
        method: 'POST',
    });
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name');
    if (name) {
        preferences.set({
            name: name.toString(),
            userId: crypto.randomUUID(),
        });
    }
    goto(res.url);
}
</script>

<a
    transition:fade
    href="/"
    class="button"
    style="position: fixed; top: 20px; left: 20px;">Singleplayer</a
>
<section in:slide={{ delay: 250 }} out:slide>
    <header>
        <h1>Multiplayer</h1>
    </header>
    <p>Create a multiplayer room with a unique code to play with friends.</p>
    <form action="#" on:submit={createGame}>
        <label for="name">Enter your name:</label>
        <input
            id="name"
            type="text"
            placeholder="Name"
            name="name"
            required
            minlength="1"
            maxlength="40"
        />
        <button>Create</button>
    </form>
</section>
