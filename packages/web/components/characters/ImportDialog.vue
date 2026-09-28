<script lang="ts" setup>
    import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { ImportPlan, ImportStatus } from "@/composables/character-files";

    /**
     * Importing a character file (docs/phase-1/05-print-and-export.md): the content it uses and what happens to
     * each package (on the site, already here, added from the file, missing), and, when a stored character has the
     * same id, whether to replace it or keep both (the safe answer, chosen first).
     */
    const props = defineProps<{ open: boolean, plan: ImportPlan }>();
    const emit = defineEmits<{ confirm: [replace: boolean], cancel: [] }>();

    const { t } = useI18n();

    const ICONS: Readonly<Record<ImportStatus, string>> = {
        site: "globe",
        stored: "hard-drive",
        embedded: "file-arrow-down",
        missing: "triangle-exclamation"
    };
    const choice = ref<"keep" | "replace">("keep");
    watch(() => props.plan, () => { choice.value = "keep"; });
    const id = useId();
</script>

<template>
    <ConfirmDialog :open="open"
                   :title="t('characters.import.title', { name: plan.document.character.name })"
                   :confirm="t('characters.import.confirm')"
                   :cancel="t('characters.import.cancel')"
                   @confirm="emit('confirm', plan.conflict && (choice === 'replace'))"
                   @cancel="emit('cancel')">
        <h3 class="import-dialog__subtitle">
            {{ t("characters.import.packages") }}
        </h3>
        <ul class="import-dialog__packages">
            <li v-for="p in plan.packages"
                :key="p.id"
                class="import-dialog__package"
                :class="`import-dialog__package--${p.status}`">
                <FontAwesome class="import-dialog__icon"
                             :icon="ICONS[p.status]"
                             aria-hidden="true" />
                <span>
                    <code>{{ p.id }}</code> {{ t(`characters.import.status.${p.status}`) }}
                    <small v-if="p.here && (p.here !== p.version)" class="import-dialog__versions">
                        {{ t("characters.import.versions", { file: p.version, here: p.here }) }}
                    </small>
                </span>
            </li>
        </ul>
        <fieldset v-if="plan.conflict" class="import-dialog__conflict">
            <legend>{{ t("characters.import.conflict") }}</legend>
            <label class="import-dialog__option">
                <input v-model="choice"
                       type="radio"
                       :name="id"
                       value="keep" />
                {{ t("characters.import.keep") }}
            </label>
            <label class="import-dialog__option">
                <input v-model="choice"
                       type="radio"
                       :name="id"
                       value="replace" />
                {{ t("characters.import.replace") }}
            </label>
        </fieldset>
    </ConfirmDialog>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .import-dialog
    {
        &__subtitle
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            letter-spacing: 0.08em;
            margin: 0 0 var(--space-2);
            text-transform: uppercase;
        }

        &__packages
        {
            display: grid;
            gap: var(--space-2);
            list-style: none;
            margin: 0 0 var(--space-3);
            padding: 0;
        }

        &__package
        {
            align-items: baseline;
            display: flex;
            gap: var(--space-2);

            &--missing
            {
                color: var(--color-warning);
            }
        }

        &__icon
        {
            flex: none;
        }

        &__versions
        {
            color: var(--color-ink-muted);
            display: block;
        }

        &__conflict
        {
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            margin: 0;
            padding: var(--space-3);
        }

        &__option
        {
            @include mixins.tap-target;

            align-items: center;
            cursor: pointer;
            display: flex;
            gap: var(--space-2);
        }
    }
</style>
