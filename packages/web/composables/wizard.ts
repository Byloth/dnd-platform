import { composeEntry } from "@byloth/dnd-platform-composer";
import type { EntryView } from "@byloth/dnd-platform-composer";
import type { Character, ChoiceView } from "@byloth/dnd-platform-engine";

import { choiceStep } from "@/composables/choice-steps";
import { preferredUnits } from "@/composables/sheet";

import type { StepId } from "@/stores/wizard";

/**
 * What every step of the creation wizard reads: the store, the entities of the draft's package set in the
 * interface language, their entries (facts and traits), and the help level that decides how much copy and how
 * many reasons are shown.
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

    // The composer's words for a species, a class or a background (docs/phase-1/14-wizard-steps-revision.md).
    const translate = useSheetTranslate();
    const entry = (id: string): EntryView | undefined => (wizard.packageSet ?
        composeEntry(id, {
            packages: wizard.packageSet,
            language: locale.value,
            translate: translate,
            units: preferredUnits(locale.value)
        }) :
        undefined);

    return { wizard, entities, helpLevel, recommended, entry };
}

/** The choices the draft's sheet asks. */
function _sheetChoices(): readonly ChoiceView[]
{
    const wizard = useWizardStore();
    if (!wizard.character || !wizard.sources.length) { return []; }

    return useEngine().sheet(wizard.character, wizard.sources, { language: useNuxtApp().$i18n.locale.value })
        .sheet.choices;
}

/** How many skills a background of the player's own gives, and how many tools and languages together (SRD 5.1). */
export const CUSTOM_SKILLS = 2;
export const CUSTOM_TOOLS_OR_LANGUAGES = 2;

/** The choices the draft's sheet asks in a step (docs/phase-1/14-wizard-steps-revision.md, point 6). */
export function choicesOfStep(step: StepId): readonly ChoiceView[]
{
    const set = useWizardStore().packageSet;

    return _sheetChoices().filter((c) => choiceStep(c, set) === step);
}

const _answered = (step: StepId): boolean => choicesOfStep(step).every((c) => c.answered);

/**
 * Whether a chosen id is an entity of that type in the draft's package set: a choice whose package left the draft,
 * or is not loaded here, leaves its step undone (docs/phase-1/10-wizard-integrity.md, point 10).
 */
function _resolves(id: string | undefined, type: "species" | "class" | "subclass" | "background"): boolean
{
    const entity = id === undefined ? undefined : useWizardStore().packageSet?.entities.get(id);

    return entity?.type === type;
}

/** The SRD's rule: a name, two skills, a total of two tools and languages, a feature and an equipment package. */
function _customBackgroundDone(custom: NonNullable<Character["choices"]["customBackground"]>): boolean
{
    const set = useWizardStore().packageSet;

    return Boolean(custom.name.trim()) && ((custom.skills?.length ?? 0) === CUSTOM_SKILLS) &&
        (((custom.tools?.length ?? 0) + (custom.languages?.length ?? 0)) === CUSTOM_TOOLS_OR_LANGUAGES) &&
        (set?.entities.get(custom.feature ?? "")?.type === "feature") &&
        _resolves(custom.equipment, "background");
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
            if (!_resolves(choices.species, "species")) { return false; }
            if ((choices.subspecies !== undefined) && !_resolves(choices.subspecies, "species")) { return false; }
            const hasSubspecies = wizard.packageSet ?
                [...wizard.packageSet.entities.values()].some((e) => e.inline?.owner === choices.species &&
                    e.type === "species") :
                false;

            return (!hasSubspecies || (choices.subspecies !== undefined)) && _answered("species");
        }
        case "class":
            return ((choices.classes?.length ?? 0) > 0) &&
                (choices.classes ?? []).every((c) => _resolves(c.class, "class") &&
                    ((c.subclass === undefined) || _resolves(c.subclass, "subclass"))) &&
                    _answered("class");
        case "background":
            return choices.customBackground ?
                _customBackgroundDone(choices.customBackground) :
                _resolves(choices.background, "background") && _answered("background");
        case "abilities":
        {
            const base = choices.abilityScores?.base ?? {};

            return (wizard.packageSet?.ruleset.abilities ?? []).every((a) => base[a] !== undefined);
        }
        case "spells":
        case "choices":
            return Boolean(wizard.sources.length) && _answered(step);
        case "equipment": return wizard.character?.state.currency !== undefined;
        case "personality": return Boolean(wizard.character?.name.trim());
        default: return false;
    }
}

/** Smooth scrolling, unless the player asked the device for reduced motion. */
export function scrollBehavior(): ScrollBehavior
{
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * Moves the wizard to a step from a button of the page: the store, the address, and back to the top of the page.
 * The step's heading takes the focus when the step has faded in (`WizardStep`).
 */
export function useStepNavigation()
{
    const wizard = useWizardStore();
    const router = useRouter();
    const route = useRoute();

    return (step: StepId): void =>
    {
        wizard.goTo(step);
        void router.replace({ query: { ...route.query, step: step } });
        if (import.meta.client) { window.scrollTo({ top: 0, behavior: scrollBehavior() }); }
    };
}
