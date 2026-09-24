import { defineStore } from "pinia";

import type { Archetype } from "@byloth/dnd-platform-schema";
import type { Character } from "@byloth/dnd-platform-engine";
import type { PackageSet, PackageSource } from "@byloth/dnd-platform-loader";
import type { JSONValue } from "@byloth/core";
import { localize } from "@byloth/dnd-platform-composer";

/**
 * The creation wizard (docs/phase-1/04-character-creation.md): a draft character document, the step on screen
 * and the archetype it started from. Every choice writes the document, which the pages derive; the draft saves
 * itself in the browser (the `meta` store, `wizard-draft`) so a reload resumes it. An archetype prefills its
 * recommendations, all of them still changeable (owner, 2026-09-24).
 */

export const STEPS = [
    "content", "concept", "species", "class", "background", "abilities", "choices", "equipment", "personality", "review"

] as const;
export type StepId = typeof STEPS[number];

export const DRAFT_KEY = "wizard-draft";
/** How long the draft waits after a change before it is written. */
const SAVE_DELAY = 300;

export interface WizardDraft
{
    readonly character: Character;
    readonly step: StepId;
    /** The archetype the draft started from; `null` when the player chose to skip them. */
    readonly archetype?: string | null;
    readonly savedAt: string;
}

type Choices = Character["choices"];

function emptyCharacter(ruleset: { id: string, version: string }): Character
{
    return {
        formatVersion: 0,
        id: `character-${crypto.randomUUID()}`,
        name: "",
        ruleset: ruleset,
        packages: [ruleset],
        choices: {},
        state: {
            hp: { current: 0, temporary: 0 },
            hitDice: { spent: 0 },
            resources: {},
            conditions: [],
            deathSaves: { successes: 0, failures: 0 },
            inspiration: false
        }
    };
}

/** An object without the keys whose value is undefined (the format has optional keys, never undefined ones). */
function defined<T extends object>(value: T): T
{
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export const useWizardStore = defineStore("wizard", () =>
{
    const character = shallowRef<Character>();
    const step = ref<StepId>("content");
    /** Undefined until the concept step is answered; `null` when the player skipped the archetypes. */
    const archetype = ref<string | null>();
    const sources = shallowRef<PackageSource[]>([]);

    let _saveTimer: ReturnType<typeof setTimeout> | undefined;
    let _saving: Promise<void> = Promise.resolve();

    const _cancelSave = (): void =>
    {
        if (_saveTimer !== undefined) { clearTimeout(_saveTimer); }
        _saveTimer = undefined;
    };

    /** The package set of the draft's packages, pinned at their versions. */
    const packageSet = computed((): PackageSet | undefined =>
    {
        const current = character.value;
        if (!current || (sources.value.length === 0)) { return undefined; }

        const pins = Object.fromEntries(current.packages.map((p) => [p.id, p.version]));

        return useEngine().packageSet(sources.value, pins);
    });

    const _loadSources = async (): Promise<void> =>
    {
        const ids = character.value?.packages.map((p) => p.id) ?? [];
        sources.value = await useContentStore().sources(ids);
    };

    /** Writes the draft now; pending changes are written first. */
    const save = async (): Promise<void> =>
    {
        _cancelSave();
        const current = character.value;
        if (!current) { return; }

        const draft = defined<WizardDraft>({
            character: current,
            step: step.value,
            archetype: archetype.value,
            savedAt: new Date().toISOString()
        });
        _saving = _saving.then(() => useBrowserStorage().meta.set(DRAFT_KEY, draft as unknown as JSONValue));

        await _saving;
    };

    const _scheduleSave = (): void =>
    {
        _cancelSave();
        _saveTimer = setTimeout(() => { void save(); }, SAVE_DELAY);
    };

    const _write = (next: Character): void =>
    {
        character.value = next;
        _scheduleSave();
    };

    const _choices = (change: (choices: Choices) => Choices): void =>
    {
        const current = character.value;
        if (!current) { return; }

        _write({ ...current, choices: defined(change(current.choices)) });
    };

    /** Whether an answer key belongs to one of the given entities or to anything declared inside them. */
    const _ownedBy = (key: string, roots: readonly (string | undefined)[]): boolean =>
    {
        const owners = new Set(roots.filter((r): r is string => r !== undefined));
        let id: string | undefined = key.split("#")[0];
        while (id !== undefined)
        {
            if (owners.has(id)) { return true; }
            id = packageSet.value?.entities.get(id)?.inline?.owner;
        }

        return false;
    };

    const _withoutAnswersOf = (answers: Choices["answers"], roots: readonly (string | undefined)[]) =>
    {
        const kept = Object.entries(answers ?? {}).filter(([key]) => !_ownedBy(key, roots));

        return kept.length ? Object.fromEntries(kept) : undefined;
    };

    /** A new draft on the site's base package. */
    const start = async (): Promise<void> =>
    {
        const content = useContentStore();
        if (content.site.length === 0) { await content.refresh(); }
        const base = content.site.find((p) => p.manifest.kind === "base") ?? content.site[0];
        if (!base) { throw new Error("The site publishes no base package."); }

        character.value = emptyCharacter({ id: base.manifest.id, version: base.manifest.version });
        step.value = "content";
        archetype.value = undefined;
        await _loadSources();
        await save();
    };

    /** The stored draft, if any, without loading it. */
    const stored = async (): Promise<WizardDraft | undefined> =>
        (await useBrowserStorage().meta.get<JSONValue>(DRAFT_KEY) ?? undefined) as WizardDraft | undefined;

    /** Loads the stored draft; false when there is none. */
    const resume = async (): Promise<boolean> =>
    {
        const draft = await stored();
        if (!draft) { return false; }

        character.value = draft.character;
        step.value = draft.step;
        archetype.value = draft.archetype;
        await _loadSources();

        return true;
    };

    /** Forgets the stored draft and the one on screen. */
    const discard = async (): Promise<void> =>
    {
        _cancelSave();
        character.value = undefined;
        archetype.value = undefined;
        step.value = "content";
        await useBrowserStorage().meta.set(DRAFT_KEY, null);
    };

    const goTo = (next: StepId): void =>
    {
        step.value = next;
        _scheduleSave();
    };

    /** The packages of the draft: the base package first, then the chosen ones among the stored packages. */
    const choosePackages = async (packages: readonly { id: string, version: string }[]): Promise<void> =>
    {
        const current = character.value;
        if (!current) { return; }

        _write({ ...current, packages: [current.ruleset, ...packages.filter((p) => p.id !== current.ruleset.id)] });
        await _loadSources();
    };

    const _archetype = (id: string | null | undefined): Archetype | undefined =>
        (id ? packageSet.value?.entities.get(id)?.data as Archetype | undefined : undefined);

    /** Starts from an archetype, prefilling its recommendations; `null` means "I'll choose myself". */
    const chooseArchetype = (id: string | null): void =>
    {
        archetype.value = id;
        const recommends = _archetype(id)?.recommends;
        if (!recommends)
        {
            _scheduleSave();

            return;
        }

        const array = packageSet.value?.ruleset.abilityScores?.standardArray;
        const abilities = packageSet.value?.ruleset.abilities ?? [];
        const order = [...(recommends.abilityPriority ?? []), ...abilities].filter((a, i, all) => all.indexOf(a) === i);

        _choices((choices) => ({
            ...choices,
            species: recommends.species,
            subspecies: recommends.subspecies,
            classes: recommends.class ?
                [defined({ class: recommends.class, subclass: recommends.subclass, levels: 1 })] :
                choices.classes,
            background: recommends.background,
            abilityScores: array ?
                { method: "standard-array", base: Object.fromEntries(order.map((a, i) => [a, array[i] ?? 8])) } :
                choices.abilityScores,
            answers: { ...choices.answers, ...recommends.answers }
        }));
    };

    const chooseSpecies = (id: string): void =>
    {
        _choices((choices) =>
        {
            if (choices.species === id) { return choices; }
            const subspecies = packageSet.value?.entities.get(choices.subspecies ?? "")?.inline?.owner === id ?
                choices.subspecies :
                undefined;

            return {
                ...choices,
                species: id,
                subspecies: subspecies,
                answers: _withoutAnswersOf(choices.answers, [choices.species, choices.subspecies])
            };
        });
    };

    const chooseSubspecies = (id: string | undefined): void =>
    {
        _choices((choices) => ({
            ...choices,
            subspecies: id,
            answers: choices.subspecies === id ?
                choices.answers :
                _withoutAnswersOf(choices.answers, [choices.subspecies])
        }));
    };

    const chooseClass = (id: string): void =>
    {
        _choices((choices) =>
        {
            const current = choices.classes?.[0];
            if (current?.class === id) { return choices; }
            const recommends = _archetype(archetype.value)?.recommends;
            const subclass = recommends?.class === id ? recommends.subclass : undefined;

            return {
                ...choices,
                classes: [defined({ class: id, subclass: subclass, levels: 1 })],
                answers: _withoutAnswersOf(choices.answers, [current?.class, current?.subclass])
            };
        });
    };

    const chooseBackground = (id: string): void =>
    {
        _choices((choices) => (choices.background === id ?
            choices :
            {
                ...choices,
                background: id,
                answers: _withoutAnswersOf(choices.answers, [choices.background])
            }));
    };

    /** The archetype's recommendation for a key (`species`, `class`…) and why, when the draft started from one. */
    const recommendation = (key: keyof Archetype["recommends"]): { value: unknown, why?: string } | undefined =>
    {
        const chosen = _archetype(archetype.value);
        const value = chosen?.recommends[key];
        if (value === undefined) { return undefined; }
        const why = chosen?.why?.[key === "subspecies" ? "species" : key];

        return { value: value, ...(why ? { why: localize(why, useNuxtApp().$i18n.locale.value) } : {}) };
    };

    return {
        character,
        step,
        archetype,
        sources,
        packageSet,
        start,
        stored,
        resume,
        discard,
        save,
        goTo,
        choosePackages,
        chooseArchetype,
        chooseSpecies,
        chooseSubspecies,
        chooseClass,
        chooseBackground,
        recommendation
    };
});
