<script lang="ts">
import { preferences, type TypingMode } from '$lib/stores';
import { clickOutside } from '$lib/utils';

export let settingsVisible: boolean;

let form: HTMLFormElement | undefined;

$: localPrefs = $preferences;

function onClose() {
    if (form?.reportValidity()) {
        $preferences = localPrefs;
        settingsVisible = false;
    }
}
</script>

<div
    class="settings-wrapper"
    inert={!settingsVisible}
    class:open={settingsVisible}
>
    <div class="settings" use:clickOutside={onClose}>
        <div class="settings-header">
            <h2>Settings</h2>
            <button on:click={onClose}>
                <svg
                    height="24"
                    viewBox="0 -960 960 960"
                    width="24"
                    fill="white"
                >
                    <path
                        d="M480-438 270-228q-9 9-21 9t-21-9q-9-9-9-21t9-21l210-210-210-210q-9-9-9-21t9-21q9-9 21-9t21 9l210 210 210-210q9-9 21-9t21 9q9 9 9 21t-9 21L522-480l210 210q9 9 9 21t-9 21q-9 9-21 9t-21-9L480-438Z"
                    />
                </svg>
            </button>
        </div>
        <form
            class="settings-list"
            bind:this={form}
            on:submit|preventDefault={onClose}
        >
            <label for="name">Name:</label>
            <input
                type="text"
                required
                name="name"
                minlength="1"
                maxlength="16"
                bind:value={localPrefs.name}
            />
            <label for="editor-typing-mode">Typing mode:</label>
            <select
                id="editor-typing-mode"
                name="editor-typing-mode"
                bind:value={localPrefs.typingMode}
            >
                <option value="passage-separated" selected
                    >Passage above input</option
                >
                <option value="inline">Inline</option>
            </select>
        </form>
    </div>
</div>

<style>
svg {
    display: block;
}

.settings-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: 2;
    transition: backdrop-filter 250ms ease;
    overflow: hidden;
}

.settings-wrapper.open {
    backdrop-filter: blur(5px) brightness(0.65);
}

.settings {
    position: absolute;
    top: 0;
    left: 100%;
    height: 100%;
    min-width: 400px;
    background-color: var(--color-background);
    transition: transform 250ms ease;
    padding: 1em;
}

.settings-wrapper.open .settings {
    transform: translateX(-100%);
}

.settings-header {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 5px;
    margin-bottom: 20px;
}

.settings h2 {
    margin: 0;
}

.settings-list {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
    grid-auto-flow: row;
    gap: 20px 0px;
    align-items: center;
}
</style>
