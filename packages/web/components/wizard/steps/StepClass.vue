<script lang="ts" setup>
    import type { Class } from "@byloth/dnd-platform-schema";

    import AppButton from "@/components/ui/AppButton.vue";
    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";
    import ResetNotice from "@/components/wizard/ResetNotice.vue";
    import ChoiceGroup from "@/components/wizard/ChoiceGroup.vue";
    import StepChoiceGroups from "@/components/wizard/StepChoiceGroups.vue";
    import { useChoiceOptions } from "@/composables/choice-options";
    import { useFold } from "@/composables/fold";
    import { choicesOfStep } from "@/composables/wizard";

    /**
     * Step 3: the class, recommended one first, with its stats, primary abilities and saving throws; below it,
     * the subclass once the class's level unlocks one, then what the class asks (skills, a fighting style,
     * expertise); the spells are the Spells step's (doc 14).
     */
    const { wizard, entities, helpLevel, recommended, entry } = useWizardContext();
    const { t, locale } = useI18n();
    const { pending, revision, change, confirm, cancel } = useResetConfirmation();

    const sheet = computed(() => (wizard.character && wizard.sources.length ?
        useEngine().sheet(wizard.character, wizard.sources, { language: locale.value }).sheet :
        undefined));
    const subclass = computed(() =>
    {
        const choice = sheet.value?.choices.find((c) => (c.of === "subclass") && current.value &&
            c.key.startsWith(`${current.value}#`));
        if (!choice || !sheet.value || !wizard.packageSet) { return undefined; }
        const naming = useChoiceOptions(wizard.packageSet, sheet.value, locale.value, t);

        return { choice: choice, eyebrow: naming.owner(choice).root, options: naming.options(choice) };
    });

    const current = computed(() => wizard.character?.choices.classes?.[0]?.class);
    const { track, publicId } = useAnalytics();
    const pickClass = (id: string): void =>
        change(() =>
        {
            track("wizard-class", { class: publicId(id) });
            wizard.chooseClass(id);

        }, [current.value, wizard.character?.choices.classes?.[0]?.subclass]);
    const classes = computed(() => [...entities.value?.list("class") ?? []]
        .sort((a, b) => Number(!recommended("class", a.id)) - Number(!recommended("class", b.id))));

    // Once chosen, the list folds to the class and what the class asks next takes the focus (doc 14).
    const fold = useFold(
        () => current.value,
        () => choicesOfStep("class").length > 0,
        () => helpLevel.value === "expert"
    );
    const { next: afterClass, toggle: foldToggle } = fold;
    const foldLabel = computed(() => t(fold.folded.value ? "wizard.fold.change" : "wizard.fold.keep"));
    const foldWhat = computed(() => `: ${t("wizard.steps.class")}`);
    const shown = computed(() => (fold.folded.value ?
        classes.value.filter((e) => e.id === current.value) :
        classes.value));

    const abilities = (list: readonly string[] | undefined): string =>
        (list ?? []).map((a) => t(`sheet.abilities.${a}`)).join(", ");
    const facts = (id: string): string[] =>
    {
        const data = entities.value?.data<Class>(id);
        if (!data) { return []; }

        // The hit die is among the entry's stats.
        return [
            ...(data.primaryAbilities?.length ?
                [t("wizard.class.primary", { list: abilities(data.primaryAbilities) })] :
                []),
            t("wizard.class.saves", { list: abilities(data.savingThrows) })
        ];
    };
</script>

<template>
    <ResetNotice v-if="pending"
                 :names="pending.names"
                 @confirm="confirm"
                 @cancel="cancel" />
    <fieldset :key="`options-${revision}`" class="wizard-options">
        <legend class="wizard-options__legend">
            {{ t("wizard.steps.class") }}
        </legend>
        <ChoiceCard v-for="entity in shown"
                    :key="entity.id"
                    name="class"
                    :value="entity.id"
                    :title="entities?.name(entity.id) ?? ''"
                    :summary="entities?.summary(entity.id)"
                    :checked="current === entity.id"
                    :recommended="recommended('class', entity.id)"
                    :help-level="helpLevel"
                    :entry="entry(entity.id)"
                    @select="pickClass">
            <span class="wizard-options__facts">
                <span v-for="fact in facts(entity.id)"
                      :key="fact"
                      class="wizard-options__fact">{{ fact }}</span>
            </span>
        </ChoiceCard>
    </fieldset>
    <AppButton v-if="fold.folded.value || (fold.opened.value && current)"
               ref="foldToggle"
               theme="secondary"
               outline
               small
               class="wizard-options__fold"
               @click="fold.folded.value ? fold.open() : fold.close()">
        <!-- One line, or the name would read "Change : Species". -->
        {{ foldLabel }}<span class="wizard-options__sr">{{ foldWhat }}</span>
    </AppButton>
    <div ref="afterClass">
        <ChoiceGroup v-if="subclass"
                     class="step-class__subclass"
                     :choice="subclass.choice"
                     kind="subclass"
                     :eyebrow="subclass.eyebrow"
                     :title="t('wizard.choices.titles.subclass')"
                     :options="subclass.options"
                     :help-level="helpLevel"
                     @answer="(values) => wizard.answer(subclass!.choice.key, values, 'subclass')" />
        <StepChoiceGroups step="class" skip="subclass" />
    </div>
</template>

<style lang="scss" scoped>
    .step-class__subclass
    {
        margin-top: var(--space-6);
    }
</style>
