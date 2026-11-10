<script lang="ts" setup>
    import { localize } from "@byloth/dnd-platform-composer";
    import type { EntryView } from "@byloth/dnd-platform-composer";
    import type { Archetype } from "@byloth/dnd-platform-schema";

    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";

    /**
     * Step 1 (docs/phase-1/14-wizard-steps-revision.md, point 1): one question first, "from scratch or from a
     * sketched character?"; only the second shows the ideas, which fill in the next steps, all still changeable.
     * The ideas are the famous characters' while their extension is on (DEC-27), the SRD's otherwise.
     */
    const { wizard, helpLevel } = useWizardContext();
    const { t, locale } = useI18n();

    type Start = "scratch" | "sketched";
    const initial = (): Start | undefined =>
    {
        if (wizard.archetype === null) { return "scratch"; }

        return wizard.archetype ? "sketched" : undefined;
    };
    const start = ref<Start | undefined>(initial());

    const set = computed(() => wizard.ideaSet);
    const names = computed(() => (set.value ? useEntities(set.value, locale.value) : undefined));
    const data = (id: string): Archetype | undefined => set.value?.entities.get(id)?.data as Archetype | undefined;

    /** An idea's card: its build as stats, and the levels that make the character behind "Details". */
    const entry = (id: string): EntryView =>
    {
        const archetype = data(id);
        const recommends = archetype?.recommends;
        const name = (ref?: string): string => (ref ? names.value?.name(ref) ?? "" : "");
        const facts = [name(recommends?.class), name(recommends?.subspecies ?? recommends?.species)]
            .filter((f) => f !== "");

        return {
            kind: "archetype",
            name: localize(archetype?.name, locale.value),
            subtitle: "",
            lines: [],
            text: "",
            sections: (archetype?.path ?? []).map((step) => ({
                title: t("wizard.concept.level", { level: step.level }),
                text: localize(step.text, locale.value)
            })),
            facts: facts
        };
    };

    const { track, publicId } = useAnalytics();
    const chooseStart = (value: string): void =>
    {
        start.value = value as Start;
        if (value === "scratch")
        {
            track("wizard-archetype", { archetype: "none" });
            wizard.chooseArchetype(null);
        }
    };
    const select = (value: string): void =>
    {
        track("wizard-archetype", { archetype: publicId(value) });
        wizard.chooseArchetype(value);
    };
</script>

<template>
    <fieldset class="wizard-options step-concept__start">
        <legend class="wizard-options__legend">
            {{ t("wizard.concept.question") }}
        </legend>
        <ChoiceCard name="start"
                    value="scratch"
                    :title="t('wizard.concept.scratch')"
                    :summary="t('wizard.concept.scratchText')"
                    :checked="start === 'scratch'"
                    :help-level="helpLevel"
                    @select="chooseStart" />
        <ChoiceCard name="start"
                    value="sketched"
                    :title="t('wizard.concept.sketched')"
                    :summary="t('wizard.concept.sketchedText')"
                    :checked="start === 'sketched'"
                    :help-level="helpLevel"
                    @select="chooseStart" />
    </fieldset>
    <fieldset v-if="start === 'sketched'" class="wizard-options wizard-options--nested">
        <legend class="wizard-options__title">
            {{ t("wizard.concept.ideas") }}
        </legend>
        <ChoiceCard v-for="archetype in wizard.ideas"
                    :key="archetype.id"
                    name="archetype"
                    :value="archetype.id"
                    :title="names?.name(archetype.id) ?? ''"
                    :summary="localize(data(archetype.id)?.pitch, locale)"
                    :checked="wizard.archetype === archetype.id"
                    :help-level="helpLevel"
                    :entry="entry(archetype.id)"
                    @select="select" />
    </fieldset>
</template>

<style lang="scss" scoped>
    .step-concept__start
    {
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
    }
</style>
