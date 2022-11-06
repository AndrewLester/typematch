<script lang="ts">
import { goto } from '$app/navigation';
import { preferences } from '$lib/stores';
import { fade, slide } from 'svelte/transition';
import { PUBLIC_WORKER_HOST } from '$env/static/public';
import { dev } from '$app/environment';

async function createGame(e: SubmitEvent) {
    e.preventDefault();
    const data = await fetch(
        `http${!dev ? 's' : ''}://${PUBLIC_WORKER_HOST}/game/create`,
        {
            method: 'POST',
            redirect: 'manual',
        },
    ).then((res) => res.text());
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name');
    if (name) {
        preferences.set({
            name: name.toString(),
        });
    }

    goto(data);
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
