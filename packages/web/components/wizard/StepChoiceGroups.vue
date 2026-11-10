<script lang="ts" setup>
    import ChoiceGroup from "@/components/wizard/ChoiceGroup.vue";
    import { choiceKind, useChoiceOptions } from "@/composables/choice-options";
    import { choiceStep, rootOwner } from "@/composables/choice-steps";
    import type { ChoiceStep } from "@/composables/choice-steps";

    /**
     * The choices the derived sheet asks in one step (docs/phase-1/14-wizard-steps-revision.md, point 6): the
     * Acolyte's languages in Background, the skills and the fighting style in Class, every spell in Spells; answered
     * or not, so the archetype's answers show and can change. Ordered by where they come from; `skip` leaves out
     * a kind the step shows by itself (the class step's subclass).
     */
    const props = withDefaults(defineProps<{ step: ChoiceStep, skip?: string }>(), { skip: undefined });

    const { wizard, helpLevel } = useWizardContext();
    const { t, locale } = useI18n();

    const sheet = computed(() => (wizard.character && wizard.sources.length ?
        useEngine().sheet(wizard.character, wizard.sources, { language: locale.value }).sheet :
        undefined));
    const naming = computed(() => (wizard.packageSet && sheet.value ?
        useChoiceOptions(wizard.packageSet, sheet.value, locale.value, t) :
        undefined));

    const ORDER = ["species", "class", "subclass", "background", "feature"];
    const rank = (owner: string): number =>
    {
        const id = rootOwner({ owner: owner } as never, wizard.packageSet);
        const index = ORDER.indexOf(wizard.packageSet?.entities.get(id)?.type ?? "");

        return index < 0 ? ORDER.length : index;
    };

    const groups = computed(() =>
    {
        const names = naming.value;
        if (!names) { return []; }

        return (sheet.value?.choices ?? [])
            .filter((c) => (choiceStep(c, wizard.packageSet) === props.step) && (c.of !== props.skip))
            // Cantrips before spells, then by where they come from.
            .sort((a, b) => (Number(choiceKind(a) !== "cantrip") - Number(choiceKind(b) !== "cantrip")) ||
                (rank(a.owner) - rank(b.owner)))
            .map((choice) =>
            {
                const kind = choiceKind(choice);
                const { name, root } = names.owner(choice);

                return {
                    choice: choice,
                    kind: kind,
                    eyebrow: root,
                    title: name === root ? t(`wizard.choices.titles.${kind}`) : name,
                    options: names.options(choice)
                };
            });
    });

    defineExpose({ count: computed(() => groups.value.length) });
</script>

<template>
    <div v-if="groups.length" class="step-choice-groups">
        <ChoiceGroup v-for="entry in groups"
                     :key="entry.choice.key"
                     :choice="entry.choice"
                     :kind="entry.kind"
                     :eyebrow="entry.eyebrow"
                     :title="entry.title"
                     :options="entry.options"
                     :help-level="helpLevel"
                     @answer="(values) => wizard.answer(entry.choice.key, values, entry.choice.of)" />
    </div>
</template>

<style lang="scss" scoped>
    .step-choice-groups
    {
        display: grid;
        gap: var(--space-6);
        margin-top: var(--space-6);
    }
</style>
