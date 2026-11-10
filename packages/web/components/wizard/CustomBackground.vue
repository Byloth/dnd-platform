<script lang="ts" setup>
    import { firstSentence, localize } from "@byloth/dnd-platform-composer";
    import type { ChoiceView } from "@byloth/dnd-platform-engine";
    import type { Background, LocalizedString } from "@byloth/dnd-platform-schema";

    import ChoiceGroup from "@/components/wizard/ChoiceGroup.vue";
    import { useChoiceOptions } from "@/composables/choice-options";
    import type { ChoiceKind, ChoiceOption } from "@/composables/choice-options";
    import { CUSTOM_SKILLS, CUSTOM_TOOLS_OR_LANGUAGES } from "@/composables/wizard";

    /**
     * A background of the player's own (docs/phase-1/14-wizard-steps-revision.md), by the SRD's "Customizing a
     * Background": a name, two skills of any, a total of two tools and languages (the tools of the sample
     * backgrounds), one feature of a loaded background and a background's equipment package. Each part is a
     * choice group like the sheet's, written into `choices.customBackground` as fixed lists.
     */
    const { wizard, helpLevel } = useWizardContext();
    const { t, locale } = useI18n();

    const custom = computed(() => wizard.character?.choices.customBackground);
    const set = computed(() => wizard.packageSet);
    const text = (label: LocalizedString | undefined): string => localize(label, locale.value);

    const sheet = computed(() => (wizard.character && wizard.sources.length ?
        useEngine().sheet(wizard.character, wizard.sources, { language: locale.value }).sheet :
        undefined));
    const naming = computed(() => (set.value && sheet.value ?
        useChoiceOptions(set.value, sheet.value, locale.value, t) :
        undefined));

    /** A choice of this form, in the shape the choice groups read. */
    const view = (choice: string, of: string, count: number, answers: readonly string[]): ChoiceView => ({
        key: `custom-background#${choice}`,
        owner: "custom-background",
        choice: choice,
        of: of,
        count: count,
        options: [],
        answers: answers,
        answered: answers.length >= count

    } as unknown as ChoiceView);

    const backgrounds = computed(() => [...set.value?.entities.values() ?? []]
        .filter((e) => (e.type === "background") && e.active && (e.inline === undefined)));

    // Skills: any of the ruleset's.
    const skills = computed(() => view("skills", "skill", CUSTOM_SKILLS, custom.value?.skills ?? []));
    const skillOptions = computed((): readonly ChoiceOption[] =>
    {
        const all = { ...skills.value, options: set.value?.ruleset.skills?.map((s) => s.id) ?? [] } as ChoiceView;

        return naming.value?.options(all) ?? [];
    });

    // Tools and languages, two in all: the languages of the ruleset, the tools the sample backgrounds give.
    const toolIds = computed(() =>
    {
        const ids = backgrounds.value.flatMap((e) =>
        {
            const tools = (e.data as Background).proficiencies?.tools;

            return Array.isArray(tools) ? tools : (tools?.from ?? []);
        });

        return [...new Set(ids)];
    });
    const mixedAnswers = computed(() => [
        ...(custom.value?.tools ?? []).map((id) => `tool:${id}`),
        ...(custom.value?.languages ?? []).map((id) => `language:${id}`)
    ]);
    const mixed = computed(() => view("tools-or-languages", "other", CUSTOM_TOOLS_OR_LANGUAGES, mixedAnswers.value));
    const mixedOptions = computed((): readonly ChoiceOption[] =>
    {
        const names = naming.value;
        if (!names) { return []; }
        const languages = names.options(view("languages", "language", 1, []))
            .map((o) => ({ ...o, id: `language:${o.id}` }));
        const tools = names.options({ ...view("tools", "tool", 1, []), options: toolIds.value } as ChoiceView)
            .map((o) => ({ ...o, id: `tool:${o.id}` }));

        return [...tools, ...languages];
    });

    // One feature of a loaded background, and one background's equipment package.
    const feature = computed(() => view("feature", "option", 1, custom.value?.feature ? [custom.value.feature] : []));
    const featureOptions = computed((): readonly ChoiceOption[] => [...set.value?.entities.values() ?? []]
        .filter((e) => (e.type === "feature") && e.active && (e.inline !== undefined) &&
            (set.value?.entities.get(e.inline.owner)?.type === "background"))
        .map((e) =>
        {
            const data = e.data as { name?: LocalizedString, text?: LocalizedString };
            const owner = set.value?.entities.get(e.inline!.owner)?.data as { name?: LocalizedString } | undefined;

            return {
                id: e.id,
                name: text(data.name),
                summary: firstSentence(text(data.text)),
                facts: [t("wizard.background.custom.from", { name: text(owner?.name) })]
            };
        }));
    const equipment = computed(() =>
        view("equipment", "option", 1, custom.value?.equipment ? [custom.value.equipment] : []));
    const equipmentOptions = computed((): readonly ChoiceOption[] => backgrounds.value
        .filter((e) => (e.data as Background).equipment !== undefined)
        .map((e) =>
        {
            const data = e.data as Background;

            return {
                id: e.id,
                name: text(data.name),
                summary: text(data.equipment?.text),
                facts: []
            };
        }));

    interface Group
    {
        readonly choice: ChoiceView;
        readonly kind: ChoiceKind;
        readonly title: string;
        readonly options: readonly ChoiceOption[];
        readonly write: (values: string[]) => void;
    }
    const groups = computed((): Group[] => [
        {
            choice: skills.value,
            kind: "skill",
            title: t("wizard.choices.titles.skill"),
            options: skillOptions.value,
            write: (values) => wizard.chooseCustomBackground({ skills: values })
        },
        {
            choice: mixed.value,
            kind: "other",
            title: t("wizard.background.custom.toolsOrLanguages"),
            options: mixedOptions.value,
            write: (values) => wizard.chooseCustomBackground({
                tools: values.filter((v) => v.startsWith("tool:")).map((v) => v.slice("tool:".length)),
                languages: values.filter((v) => v.startsWith("language:")).map((v) => v.slice("language:".length))
            })
        },
        {
            choice: feature.value,
            kind: "option",
            title: t("wizard.background.custom.feature"),
            options: featureOptions.value,
            write: (values) => wizard.chooseCustomBackground({ feature: values[0] })
        },
        {
            choice: equipment.value,
            kind: "option",
            title: t("wizard.background.custom.equipment"),
            options: equipmentOptions.value,
            write: (values) => wizard.chooseCustomBackground({ equipment: values[0] })
        }
    ]);

    const onName = (event: Event): void =>
        wizard.chooseCustomBackground({ name: (event.target as HTMLInputElement).value });
</script>

<template>
    <section class="custom-background" aria-labelledby="custom-background-title">
        <h2 id="custom-background-title"
            class="custom-background__title"
            tabindex="-1">
            {{ t("wizard.background.custom.title") }}
        </h2>
        <p v-if="helpLevel === 'newcomer'" class="custom-background__about">
            {{ t("wizard.background.custom.about") }}
        </p>
        <label class="custom-background__name">
            <span class="custom-background__label">{{ t("wizard.background.custom.name") }}</span>
            <span v-if="helpLevel !== 'expert'" class="custom-background__hint">
                {{ t("wizard.background.custom.nameHint") }}
            </span>
            <input class="custom-background__input"
                   type="text"
                   maxlength="60"
                   :value="custom?.name ?? ''"
                   @input="onName" />
        </label>
        <ChoiceGroup v-for="group in groups"
                     :key="group.choice.key"
                     :choice="group.choice"
                     :kind="group.kind"
                     :eyebrow="t('wizard.background.custom.title')"
                     :title="group.title"
                     :options="group.options"
                     :help-level="helpLevel"
                     @answer="group.write" />
    </section>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .custom-background
    {
        display: grid;
        gap: var(--space-6);
        margin-top: var(--space-6);

        &__title
        {
            font-size: var(--text-xl);
            margin: 0;
        }

        &__about
        {
            color: var(--color-ink-muted);
            margin: calc(var(--space-4) * -1) 0 0;
        }

        &__name
        {
            display: grid;
            gap: var(--space-1);
            max-width: 28rem;
        }

        &__label
        {
            font-weight: 700;
        }

        &__hint
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
        }

        &__input
        {
            @include mixins.tap-target;

            background-color: var(--color-surface);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-sm);
            color: var(--color-ink);
            font: inherit;
            padding: 0 var(--space-3);
        }
    }
</style>
