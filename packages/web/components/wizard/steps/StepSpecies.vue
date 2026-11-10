<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";
    import ResetNotice from "@/components/wizard/ResetNotice.vue";
    import { useFold } from "@/composables/fold";

    /**
     * Step 2: the species, recommended one first, then its subspecies when it has any. Once a species with
     * subspecies is chosen, the list folds to it and the subspecies take the focus (doc 14).
     */
    const { wizard, entities, helpLevel, recommended, entry } = useWizardContext();
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

    const fold = useFold(
        () => choices.value?.species,
        () => subspecies.value.length > 0,
        () => helpLevel.value === "expert"
    );
    const { next: subspeciesTitle, toggle: foldToggle } = fold;
    const foldLabel = computed(() => t(fold.folded.value ? "wizard.fold.change" : "wizard.fold.keep"));
    const foldWhat = computed(() => `: ${t("wizard.steps.species")}`);
    const shown = computed(() => (fold.folded.value ?
        species.value.filter((e) => e.id === choices.value?.species) :
        species.value));

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
        <ChoiceCard v-for="entity in shown"
                    :key="entity.id"
                    name="species"
                    :value="entity.id"
                    :title="entities?.name(entity.id) ?? ''"
                    :summary="entities?.summary(entity.id)"
                    :checked="choices?.species === entity.id"
                    :recommended="recommended('species', entity.id)"
                    :help-level="helpLevel"
                    :entry="entry(entity.id)"
                    @select="pickSpecies" />
    </fieldset>
    <AppButton v-if="fold.folded.value || (fold.opened.value && choices?.species)"
               ref="foldToggle"
               theme="secondary"
               outline
               small
               class="wizard-options__fold"
               @click="fold.folded.value ? fold.open() : fold.close()">
        <!-- One line, or the name would read "Change : Species". -->
        {{ foldLabel }}<span class="wizard-options__sr">{{ foldWhat }}</span>
    </AppButton>
    <fieldset v-if="subspecies.length"
              :key="`subspecies-${revision}`"
              class="wizard-options wizard-options--nested">
        <legend ref="subspeciesTitle"
                class="wizard-options__title"
                tabindex="-1">
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
                    :entry="entry(entity.id)"
                    @select="pickSubspecies" />
    </fieldset>
</template>
