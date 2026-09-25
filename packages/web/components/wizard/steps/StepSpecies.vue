<script lang="ts" setup>
    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";
    import ResetNotice from "@/components/wizard/ResetNotice.vue";

    /** Step 2: the species, recommended one first, then its subspecies when it has any. */
    const { wizard, entities, helpLevel, recommended } = useWizardContext();
    const { t } = useI18n();
    const { pending, revision, change, confirm, cancel } = useResetConfirmation();
    const pickSpecies = (id: string): void =>
        change(() => wizard.chooseSpecies(id), [choices.value?.species, choices.value?.subspecies]);
    const pickSubspecies = (id: string): void =>
        change(() => wizard.chooseSubspecies(id), [choices.value?.subspecies]);

    const choices = computed(() => wizard.character?.choices);
    const species = computed(() => recommendedFirst(entities.value?.list("species") ?? [], "species"));
    const subspecies = computed(() =>
    {
        const chosen = choices.value?.species;

        return chosen ? recommendedFirst(entities.value?.subspeciesOf(chosen) ?? [], "subspecies") : [];
    });

    function recommendedFirst<T extends { id: string }>(items: T[], key: "species" | "subspecies"): T[]
    {
        return [...items].sort((a, b) => Number(!recommended(key, a.id)) - Number(!recommended(key, b.id)));
    }
</script>

<template>
    <ResetNotice v-if="pending"
                 :names="pending.names"
                 @confirm="confirm"
                 @cancel="cancel" />
    <fieldset :key="`options-${revision}`" class="wizard-options">
        <legend class="wizard-options__legend">
            {{ t("wizard.steps.species") }}
        </legend>
        <ChoiceCard v-for="entity in species"
                    :key="entity.id"
                    name="species"
                    :value="entity.id"
                    :title="entities?.name(entity.id) ?? ''"
                    :summary="entities?.summary(entity.id)"
                    :checked="choices?.species === entity.id"
                    :recommended="recommended('species', entity.id)"
                    :help-level="helpLevel"
                    @select="pickSpecies" />
    </fieldset>
    <fieldset v-if="subspecies.length"
              :key="`subspecies-${revision}`"
              class="wizard-options wizard-options--nested">
        <legend class="wizard-options__title">
            {{ t("wizard.species.subspecies") }}
        </legend>
        <ChoiceCard v-for="entity in subspecies"
                    :key="entity.id"
                    name="subspecies"
                    :value="entity.id"
                    :title="entities?.name(entity.id) ?? ''"
                    :summary="entities?.summary(entity.id)"
                    :checked="choices?.subspecies === entity.id"
                    :recommended="recommended('subspecies', entity.id)"
                    :help-level="helpLevel"
                    @select="pickSubspecies" />
    </fieldset>
</template>
