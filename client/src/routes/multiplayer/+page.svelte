<script lang="ts">
import { enhance } from '$app/forms';
import { preferences } from '$lib/stores';
import type { SubmitFunction } from '@sveltejs/kit';
import { slide } from 'svelte/transition';

let submitting = false;

const setupOnCreateGame: SubmitFunction = ({ cancel }) => {
    if (submitting) {
        cancel();
        return;
    }

    submitting = true;

    const onCreateGame: ReturnType<SubmitFunction> = ({
        result,
        update,
        formData,
    }) => {
        if (result.type === 'redirect') {
            preferences.set({
                name: formData.get('name') as string,
            });
        }

        update();
        submitting = false;
    };

    return onCreateGame;
};
</script>

<!-- Delay lets previous element slide a little bit out -->

<section in:slide|global={{ delay: 250 }} out:slide|global>
    <header>
        <h1>Multiplayer</h1>
    </header>
    <p>Create a multiplayer room with a unique code to play with friends.</p>
    <form method="post" action="?/createGame" use:enhance={setupOnCreateGame}>
        <label for="name">Enter your name:</label>
        <!-- svelte-ignore a11y-autofocus -->
        <input
            id="name"
            type="text"
            placeholder="Name"
            name="name"
            autofocus
            required
            minlength="1"
            maxlength="16"
        />
        <div class="button-row">
            <button disabled={submitting}>Create</button>
        </div>
    </form>
</section>
