<script lang="ts" setup>
    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";
    import ResetNotice from "@/components/wizard/ResetNotice.vue";

    /** Step 4: the background, recommended one first. */
    const { wizard, entities, helpLevel, recommended } = useWizardContext();
    const { t } = useI18n();
    const { pending, revision, change, confirm, cancel } = useResetConfirmation();
    const pickBackground = (id: string): void =>
        change(() => wizard.chooseBackground(id), [wizard.character?.choices.background]);

    const backgrounds = computed(() => [...entities.value?.list("background") ?? []]
        .sort((a, b) => Number(!recommended("background", a.id)) - Number(!recommended("background", b.id))));
</script>

<template>
    <ResetNotice v-if="pending"
                 :names="pending.names"
                 @confirm="confirm"
                 @cancel="cancel" />
    <fieldset :key="`options-${revision}`" class="wizard-options">
        <legend class="wizard-options__legend">
            {{ t("wizard.steps.background") }}
        </legend>
        <ChoiceCard v-for="entity in backgrounds"
                    :key="entity.id"
                    name="background"
                    :value="entity.id"
                    :title="entities?.name(entity.id) ?? ''"
                    :summary="entities?.summary(entity.id)"
                    :checked="wizard.character?.choices.background === entity.id"
                    :recommended="recommended('background', entity.id)"
                    :help-level="helpLevel"
                    @select="pickBackground" />
        <p v-if="!backgrounds.length" class="wizard-options__empty">
            {{ t("wizard.empty") }}
        </p>
    </fieldset>
</template>
