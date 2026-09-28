<script lang="ts" setup>
    import type { Character } from "@byloth/dnd-platform-engine";

    import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
    import { useCharacterFiles } from "@/composables/character-files";

    /**
     * Exporting a character (docs/phase-1/05-print-and-export.md): what the file is for, the player's own content
     * inside it on request (off by default), and the reminder that private books never go in. "Download" saves
     * `<name>.dnd.json`.
     */
    const props = defineProps<{ open: boolean, character: Character }>();
    const emit = defineEmits<{ close: [] }>();

    const { t } = useI18n();
    const files = useCharacterFiles();

    const canEmbed = ref(false);
    const embed = ref(false);
    watch(() => [props.open, props.character.id] as const, async ([open]) =>
    {
        if (!open) { return; }
        embed.value = false;
        canEmbed.value = (await files.embeddable(props.character)).length > 0;

    }, { immediate: true });

    const download = async (): Promise<void> =>
    {
        files.download(await files.exportDocument(props.character, { embed: embed.value }));
        useAnalytics().track("character-export", { embedded: embed.value });
        emit("close");
    };
</script>

<template>
    <ConfirmDialog :open="open"
                   :title="t('characters.export.title', { name: character.name })"
                   :confirm="t('characters.export.confirm')"
                   :cancel="t('characters.export.cancel')"
                   @confirm="download"
                   @cancel="emit('close')">
        <p>{{ t("characters.export.text") }}</p>
        <label v-if="canEmbed" class="export-dialog__embed">
            <input v-model="embed"
                   type="checkbox"
                   class="export-dialog__checkbox" />
            <span>
                <strong>{{ t("characters.export.embed") }}</strong>
                <small class="export-dialog__hint">{{ t("characters.export.embedHint") }}</small>
            </span>
        </label>
        <p class="export-dialog__private">
            {{ t("characters.export.private") }}
        </p>
    </ConfirmDialog>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .export-dialog
    {
        &__embed
        {
            @include mixins.tap-target;

            align-items: flex-start;
            background-color: var(--color-surface-sunken);
            border-radius: var(--radius-md);
            cursor: pointer;
            display: flex;
            gap: var(--space-3);
            margin: var(--space-3) 0;
            padding: var(--space-3);
        }

        &__checkbox
        {
            accent-color: var(--color-accent);
            flex: none;
            height: 1.25rem;
            margin-top: 0.15em;
            width: 1.25rem;

            &:focus-visible
            {
                @include mixins.focus-ring;
            }
        }

        &__hint
        {
            color: var(--color-ink-muted);
            display: block;
        }

        &__private
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
        }
    }
</style>
