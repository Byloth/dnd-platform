<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /**
     * A file picker that is also a drop zone (docs/phase-1/09-interface-revisions.md): a card around a native file
     * input, so the keyboard and screen readers keep the picker, and files dropped on it go the same way. A file
     * dropped beside it does not make the browser leave the page to open it. Used by the packages page and by the
     * characters page's import.
     */
    const props = withDefaults(defineProps<{
        accept: string;
        multiple?: boolean;
        /** "Choose files", in bold. */
        action: string;
        /** One line under it: what to choose, and that dropping works. */
        hint: string;
    }>(), { multiple: false });
    const emit = defineEmits<{ files: [files: File[]] }>();

    const onChange = (event: Event): void =>
    {
        const input = event.target as HTMLInputElement;
        const files = [...(input.files ?? [])];
        input.value = "";
        if (files.length) { emit("files", files); }
    };

    // A counter, not a flag: entering a child of the card fires dragleave on the card itself.
    const dragDepth = ref(0);
    const hasFiles = (event: DragEvent): boolean => event.dataTransfer?.types.includes("Files") ?? false;
    const onDragEnter = (event: DragEvent): void =>
    {
        if (hasFiles(event)) { dragDepth.value += 1; }
    };
    const onDragLeave = (): void =>
    {
        dragDepth.value = Math.max(0, dragDepth.value - 1);
    };
    const onDrop = (event: DragEvent): void =>
    {
        dragDepth.value = 0;
        const files = [...(event.dataTransfer?.files ?? [])];
        if (files.length) { emit("files", props.multiple ? files : files.slice(0, 1)); }
    };

    const holdFiles = (event: DragEvent): void =>
    {
        if (hasFiles(event)) { event.preventDefault(); }
    };
    onMounted(() =>
    {
        window.addEventListener("dragover", holdFiles);
        window.addEventListener("drop", holdFiles);
    });
    onBeforeUnmount(() =>
    {
        window.removeEventListener("dragover", holdFiles);
        window.removeEventListener("drop", holdFiles);
    });
</script>

<template>
    <label class="file-picker"
           :class="{ 'file-picker--over': dragDepth > 0 }"
           @dragenter.prevent="onDragEnter"
           @dragover.prevent
           @dragleave="onDragLeave"
           @drop.prevent="onDrop">
        <span class="file-picker__icon" aria-hidden="true">
            <FontAwesome icon="file-arrow-up" />
        </span>
        <span class="file-picker__text">
            <strong class="file-picker__action">{{ action }}</strong>
            <span class="file-picker__hint">{{ hint }}</span>
        </span>
        <input type="file"
               class="file-picker__input"
               :accept="accept"
               :multiple="multiple"
               @change="onChange" />
    </label>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .file-picker
    {
        align-items: center;
        background-color: var(--color-surface-raised);
        border: 2px dashed var(--color-border-strong);
        border-radius: var(--radius-lg);
        cursor: pointer;
        display: flex;
        gap: var(--space-4);
        padding: var(--space-5);
        transition:
            border-color var(--duration-fast) var(--easing),
            background-color var(--duration-fast) var(--easing);

        &:hover,
        &--over
        {
            background-color: var(--color-accent-soft);
            border-color: var(--color-accent);
        }

        &:focus-within
        {
            @include mixins.focus-ring;
        }

        &__icon
        {
            align-items: center;
            background-color: var(--color-accent);
            border-radius: var(--radius-md);
            color: var(--color-accent-ink);
            display: inline-flex;
            flex: none;
            font-size: var(--text-xl);
            height: 3rem;
            justify-content: center;
            width: 3rem;
        }

        &__text
        {
            display: grid;
            gap: var(--space-1);
        }

        &__action
        {
            font-size: var(--text-lg);
        }

        &__hint
        {
            color: var(--color-ink-muted);
        }

        &__input
        {
            @include mixins.sr-only;
        }
    }
</style>
