<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import ChoiceGroup from "@/components/wizard/ChoiceGroup.vue";
    import { choiceKind, useChoiceOptions } from "@/composables/choice-options";

    /**
     * Step 6: every choice the derived sheet asks at this level (languages, tools, skills, expertise, feature
     * options, cantrips and spells), answered or not, so the archetype's answers show and can change; the
     * subclass is step 3's.
     * Ordered by where they come from: species, class, background.
     */
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
        let id = owner;
        for (let parent = wizard.packageSet?.entities.get(id)?.inline?.owner; parent;
             parent = wizard.packageSet?.entities.get(id)?.inline?.owner)
        {
            id = parent;
        }
        const index = ORDER.indexOf(wizard.packageSet?.entities.get(id)?.type ?? "");

        return index < 0 ? ORDER.length : index;
    };

    const choices = computed(() =>
    {
        const list = sheet.value?.choices ?? [];
        const names = naming.value;
        if (!names) { return []; }

        return [...list]
            // The subclass is chosen with the class, in step 3.
            .filter((c) => (c.of !== "asi-or-feat") && (c.of !== "subclass"))
            .sort((a, b) => rank(a.owner) - rank(b.owner))
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
</script>

<template>
    <div class="step-choices">
        <ChoiceGroup v-for="entry in choices"
                     :key="entry.choice.key"
                     :choice="entry.choice"
                     :kind="entry.kind"
                     :eyebrow="entry.eyebrow"
                     :title="entry.title"
                     :options="entry.options"
                     :help-level="helpLevel"
                     @answer="(values) => wizard.answer(entry.choice.key, values, entry.choice.of)" />
        <p v-if="!choices.length" class="step-choices__none">
            <FontAwesome icon="circle-check" aria-hidden="true" />
            {{ t("wizard.choices.none") }}
        </p>
    </div>
</template>

<style lang="scss" scoped>
    .step-choices
    {
        display: grid;
        gap: var(--space-6);

        &__none
        {
            align-items: center;
            color: var(--color-healing);
            display: flex;
            font-weight: 700;
            gap: var(--space-2);
        }
    }
</style>
