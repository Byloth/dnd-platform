import type { StepId } from "@/stores/wizard";

/**
 * What every step of the creation wizard reads: the store, the entities of the draft's package set in the
 * interface language, and the help level that decides how much copy and how many reasons are shown.
 */
export function useWizardContext()
{
    const wizard = useWizardStore();
    const preferences = usePreferencesStore();
    const { locale } = useI18n();

    const entities = computed(() => (wizard.packageSet ? useEntities(wizard.packageSet, locale.value) : undefined));
    const helpLevel = computed(() => preferences.helpLevel);

    /** Whether the archetype recommends this value for a key, and why (in the interface language). */
    const recommended = (key: "species" | "subspecies" | "class" | "background", id: string) =>
    {
        const recommendation = wizard.recommendation(key);

        return recommendation?.value === id ? { why: recommendation.why } : undefined;
    };

    return { wizard, entities, helpLevel, recommended };
}

/** Whether a step has what it asks for; steps built later (M1.4c/d) are never done yet. */
export function stepDone(step: StepId): boolean
{
    const wizard = useWizardStore();
    const choices = wizard.character?.choices;
    if (!choices) { return false; }

    switch (step)
    {
        case "content": return true;
        case "concept": return wizard.archetype !== undefined;
        case "species":
        {
            if (!choices.species) { return false; }
            const hasSubspecies = wizard.packageSet ?
                [...wizard.packageSet.entities.values()].some((e) => e.inline?.owner === choices.species &&
                    e.type === "species") :
                false;

            return !hasSubspecies || (choices.subspecies !== undefined);
        }
        case "class": return (choices.classes?.length ?? 0) > 0;
        case "background": return choices.background !== undefined;
        case "abilities":
        {
            const base = choices.abilityScores?.base ?? {};

            return (wizard.packageSet?.ruleset.abilities ?? []).every((a) => base[a] !== undefined);
        }
        case "choices":
        {
            if (!wizard.character || !wizard.sources.length) { return false; }
            const sheet = useEngine().sheet(wizard.character, wizard.sources, {
                language: useNuxtApp().$i18n.locale.value
            }).sheet;

            return sheet.choices.every((c) => c.answered || (c.of === "asi-or-feat"));
        }
        case "equipment": return wizard.character?.state.currency !== undefined;
        default: return false;
    }
}
