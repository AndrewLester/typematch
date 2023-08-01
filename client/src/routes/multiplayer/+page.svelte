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

    const onCreateGame: ReturnType<SubmitFunction> = async ({
        result,
        update,
        formData,
    }) => {
        if (result.type === 'redirect') {
            preferences.set({
                name: formData.get('name') as string,
            });
        }

        await update();
        submitting = false;
    };

    return onCreateGame;
};
</script>

<!-- Delay lets previous element slide a little bit out -->

<section in:slide|global={{ delay: 250 }} out:slide|global>
    <h1>Multiplayer</h1>
    <div class="game-options">
        <div>
            <h2>Create</h2>
            <p>Your own room with a unique code to play with friends.</p>
            <form
                method="post"
                action="?/createGame"
                use:enhance={setupOnCreateGame}
            >
                <label for="name">Player name:</label>
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
        </div>
        <div>
            <h2>Join</h2>
            <p>Have a code already?</p>
            <form
                method="post"
                action="?/joinGame"
                use:enhance={() => {
                    submitting = true;
                    return async ({ update }) => {
                        await update();
                        submitting = false;
                    };
                }}
            >
                <label for="code">Room code:</label>
                <!-- svelte-ignore a11y-autofocus -->
                <input
                    id="code"
                    type="text"
                    placeholder="abc12"
                    name="code"
                    autofocus
                    required
                    minlength="5"
                    maxlength="5"
                    pattern="[\da-zA-Z]+"
                />
                <div class="button-row">
                    <button disabled={submitting}>Join</button>
                </div>
            </form>
        </div>
    </div>
</section>

<style>
.game-options {
    display: flex;
    flex-flow: row nowrap;
    gap: 10ch;
}

.game-options > div {
    width: 30ch;
    text-align: center;
    border: 1px solid rgb(217, 217, 217);
    padding: 1em;
    border-radius: 5px;
}
</style>
