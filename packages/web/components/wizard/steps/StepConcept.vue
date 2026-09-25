<script lang="ts" setup>
    import { localize } from "@byloth/dnd-platform-composer";
    import type { Archetype } from "@byloth/dnd-platform-schema";

    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";

    /** Step 1: an idea to start from, which fills in the next steps (owner, 2026-09-24), or "I'll choose myself". */
    const { wizard, entities, helpLevel } = useWizardContext();
    const { t, locale } = useI18n();

    const archetypes = computed(() => entities.value?.list("archetype") ?? []);
    const SKIP = "";

    const pitch = (id: string): string =>
        localize(entities.value?.data<Archetype>(id)?.pitch, locale.value);
    const builds = (id: string): string =>
    {
        const recommends = entities.value?.data<Archetype>(id)?.recommends;
        const name = (ref?: string): string => (ref ? entities.value?.name(ref) ?? "" : "");

        return t("wizard.concept.builds", {
            class: name(recommends?.class),
            species: name(recommends?.subspecies ?? recommends?.species)
        });
    };

    const { track, publicId } = useAnalytics();
    const select = (value: string): void =>
    {
        track("wizard-archetype", { archetype: value === SKIP ? "none" : publicId(value) });
        wizard.chooseArchetype(value === SKIP ? null : value);
    };
</script>

<template>
    <fieldset class="wizard-options">
        <legend class="wizard-options__legend">
            {{ t("wizard.steps.concept") }}
        </legend>
        <ChoiceCard v-for="archetype in archetypes"
                    :key="archetype.id"
                    name="archetype"
                    :value="archetype.id"
                    :title="entities?.name(archetype.id) ?? ''"
                    :summary="pitch(archetype.id)"
                    :checked="wizard.archetype === archetype.id"
                    :help-level="helpLevel"
                    @select="select">
            <span class="wizard-options__fact">{{ builds(archetype.id) }}</span>
        </ChoiceCard>
        <ChoiceCard name="archetype"
                    :value="SKIP"
                    :title="t('wizard.concept.skip')"
                    :summary="t('wizard.concept.skipText')"
                    :checked="wizard.archetype === null"
                    :help-level="helpLevel"
                    @select="select" />
    </fieldset>
</template>
