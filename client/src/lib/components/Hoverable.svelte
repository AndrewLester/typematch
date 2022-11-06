<script lang="ts">
let hovering = false;
</script>

<div
    on:mouseenter={() => (hovering = true)}
    on:mouseleave={() => (hovering = false)}
>
    <slot {hovering} />
</div>

<style>
div {
    display: contents;
}
</style>
