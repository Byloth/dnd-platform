<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";
    import CustomBackground from "@/components/wizard/CustomBackground.vue";
    import ResetNotice from "@/components/wizard/ResetNotice.vue";
    import StepChoiceGroups from "@/components/wizard/StepChoiceGroups.vue";
    import { useFold } from "@/composables/fold";
    import { choicesOfStep } from "@/composables/wizard";

    /**
     * Step 4: the background, recommended one first, then what it asks (the Acolyte's two languages); last, a
     * background of the player's own by the SRD's rule. Once one is chosen, the list folds to it and what it asks
     * takes the focus (doc 14).
     */
    const { wizard, entities, helpLevel, recommended, entry } = useWizardContext();
    const { t } = useI18n();
    const { pending, revision, change, confirm, cancel } = useResetConfirmation();
    const CUSTOM = "custom";
    const pickBackground = (id: string): void =>
        change(() => (id === CUSTOM ? wizard.chooseCustomBackground() : wizard.chooseBackground(id)),
               [wizard.character?.choices.background]);

    const backgrounds = computed(() => [...entities.value?.list("background") ?? []]
        .sort((a, b) => Number(!recommended("background", a.id)) - Number(!recommended("background", b.id))));

    const custom = computed(() => wizard.character?.choices.customBackground !== undefined);
    const chosen = computed(() => wizard.character?.choices.background ?? (custom.value ? CUSTOM : undefined));
    const fold = useFold(
        () => chosen.value,
        () => custom.value || (choicesOfStep("background").length > 0),
        () => helpLevel.value === "expert"
    );
    const { next: afterBackground, toggle: foldToggle } = fold;
    const shown = computed(() => (fold.folded.value ?
        backgrounds.value.filter((e) => e.id === chosen.value) :
        backgrounds.value));
    const showCustom = computed(() => !fold.folded.value || custom.value);
    const foldLabel = computed(() => t(fold.folded.value ? "wizard.fold.change" : "wizard.fold.keep"));
    const foldWhat = computed(() => `: ${t("wizard.steps.background")}`);
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
        <ChoiceCard v-for="entity in shown"
                    :key="entity.id"
                    name="background"
                    :value="entity.id"
                    :title="entities?.name(entity.id) ?? ''"
                    :summary="entities?.summary(entity.id)"
                    :checked="wizard.character?.choices.background === entity.id"
                    :recommended="recommended('background', entity.id)"
                    :help-level="helpLevel"
                    :entry="entry(entity.id)"
                    @select="pickBackground" />
        <ChoiceCard v-if="showCustom"
                    name="background"
                    :value="CUSTOM"
                    :title="t('wizard.background.custom.card')"
                    :summary="t('wizard.background.custom.cardText')"
                    :checked="custom"
                    :help-level="helpLevel"
                    @select="pickBackground" />
        <p v-if="!backgrounds.length" class="wizard-options__empty">
            {{ t("wizard.empty") }}
        </p>
    </fieldset>
    <AppButton v-if="fold.folded.value || (fold.opened.value && chosen)"
               ref="foldToggle"
               theme="secondary"
               outline
               small
               class="wizard-options__fold"
               @click="fold.folded.value ? fold.open() : fold.close()">
        <!-- One line, or the name would read "Change : Background". -->
        {{ foldLabel }}<span class="wizard-options__sr">{{ foldWhat }}</span>
    </AppButton>
    <div ref="afterBackground">
        <CustomBackground v-if="custom" />
        <StepChoiceGroups v-else step="background" />
    </div>
</template>
