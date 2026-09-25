import type { ChoiceView } from "@byloth/dnd-platform-engine";

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

/** The choices the draft's sheet asks. */
function _sheetChoices(): readonly ChoiceView[]
{
    const wizard = useWizardStore();
    if (!wizard.character || !wizard.sources.length) { return []; }

    return useEngine().sheet(wizard.character, wizard.sources, { language: useNuxtApp().$i18n.locale.value })
        .sheet.choices;
}

/** Whether a step has what it asks for; the review never is: saving it leaves the wizard. */
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
        case "class":
            return ((choices.classes?.length ?? 0) > 0) &&
                _sheetChoices().every((c) => c.answered || (c.of !== "subclass"));
        case "background": return choices.background !== undefined;
        case "abilities":
        {
            const base = choices.abilityScores?.base ?? {};

            return (wizard.packageSet?.ruleset.abilities ?? []).every((a) => base[a] !== undefined);
        }
        case "choices":
            return Boolean(wizard.sources.length) &&
                _sheetChoices().every((c) => c.answered || (c.of === "asi-or-feat") || (c.of === "subclass"));
        case "equipment": return wizard.character?.state.currency !== undefined;
        case "personality": return Boolean(wizard.character?.name.trim());
        default: return false;
    }
}
