import { defineStore } from "pinia";

import type { Archetype, Class } from "@byloth/dnd-platform-schema";
import type { Character } from "@byloth/dnd-platform-engine";
import type { PackageSet, PackageSource } from "@byloth/dnd-platform-loader";
import type { JSONValue } from "@byloth/core";
import { localize } from "@byloth/dnd-platform-composer";

import { deal, isPermutation, pointBuyCost, swap } from "@/composables/ability-scores";
import type { Scores } from "@/composables/ability-scores";

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
    /** The six totals the player rolled, as typed, when the method is "roll"; never part of the character. */
    readonly rolls?: readonly number[];
    readonly savedAt: string;
}

type Choices = Character["choices"];
type Method = NonNullable<Choices["abilityScores"]>["method"];

/** A rolled total: three to eighteen (4d6, the lowest dropped). */
const isRoll = (value: number): boolean => Number.isInteger(value) && (value >= 3) && (value <= 18);

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
    const rolls = ref<number[]>([]);
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
            rolls: rolls.value.length ? [...rolls.value] : undefined,
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
        rolls.value = [];
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
        rolls.value = [...draft.rolls ?? []];
        await _loadSources();

        return true;
    };

    /** Forgets the stored draft and the one on screen. */
    const discard = async (): Promise<void> =>
    {
        _cancelSave();
        character.value = undefined;
        archetype.value = undefined;
        rolls.value = [];
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

    /** The given abilities first, then the ruleset's others in its order. */
    const _order = (first: readonly string[]): string[] =>
        [...first, ...packageSet.value?.ruleset.abilities ?? []].filter((a, i, all) => all.indexOf(a) === i);

    /**
     * The order the highest scores go in: the archetype's priority, else the class's primary abilities, then the
     * ruleset's other abilities.
     */
    const recommendedOrder = computed((): string[] =>
    {
        const priority = _archetype(archetype.value)?.recommends.abilityPriority;
        if (priority?.length) { return _order(priority); }
        const cls = character.value?.choices.classes?.[0]?.class;
        const primary = cls ? (packageSet.value?.entities.get(cls)?.data as Class | undefined)?.primaryAbilities : [];

        return _order(primary ?? []);
    });

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
        const order = _order(recommends.abilityPriority ?? []);

        _choices((choices) => ({
            ...choices,
            species: recommends.species,
            subspecies: recommends.subspecies,
            classes: recommends.class ?
                [defined({ class: recommends.class, subclass: recommends.subclass, levels: 1 })] :
                choices.classes,
            background: recommends.background,
            abilityScores: array ? { method: "standard-array", base: deal(array, order) } : choices.abilityScores,
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

    const _scores = (change: (scores: NonNullable<Choices["abilityScores"]>) => Choices["abilityScores"]): void =>
    {
        _choices((choices) => ({
            ...choices,
            abilityScores: change(choices.abilityScores ?? { method: "standard-array", base: {} })
        }));
    };

    const _base = (): Record<string, number> =>
        Object.fromEntries(Object.entries(character.value?.choices.abilityScores?.base ?? {})
            .filter((entry): entry is [string, number] => entry[1] !== undefined));

    /** The scores a method starts from: the current ones when they fit it, else a fresh dealing. */
    const chooseMethod = (method: Method): void =>
    {
        const methods = packageSet.value?.ruleset.abilityScores;
        const abilities = packageSet.value?.ruleset.abilities ?? [];
        const array = methods?.standardArray ?? [];
        const base = _base();
        const complete = abilities.every((a) => base[a] !== undefined);

        let next = base;
        if (method === "standard-array")
        {
            if (!isPermutation(base, abilities, array)) { next = deal(array, recommendedOrder.value); }
        }
        else if (method === "point-buy")
        {
            const costs = methods?.pointBuy?.costs ?? {};
            const budget = methods?.pointBuy?.budget ?? 0;
            const fits = (scores: Scores): boolean => (pointBuyCost(scores, costs) ?? Infinity) <= budget;
            if (!complete || !fits(base))
            {
                const dealt = deal(array, recommendedOrder.value);
                const cheapest = Math.min(...Object.keys(costs).map(Number));
                next = fits(dealt) ? dealt : Object.fromEntries(abilities.map((a) => [a, cheapest]));
            }
        }
        else if (method === "roll")
        {
            if (rolls.value.length === abilities.length && rolls.value.every(isRoll))
            {
                next = isPermutation(base, abilities, rolls.value) ? base : deal(rolls.value, recommendedOrder.value);
            }
        }

        _scores((scores) => defined({ method: method, base: next, bonuses: scores.bonuses }));
    };

    /** An ability takes a value of the array or of the rolls; the ability that held it takes the old one. */
    const assign = (ability: string, value: number): void =>
    {
        _scores((scores) => ({ ...scores, base: swap(_base(), ability, value) }));
    };

    /** The rolled totals as typed; once all are valid, they are dealt (kept as they are when already dealt). */
    const setRolls = (values: readonly number[]): void =>
    {
        rolls.value = [...values];
        const abilities = packageSet.value?.ruleset.abilities ?? [];
        const valid = (values.length === abilities.length) && values.every(isRoll);
        if (valid && !isPermutation(_base(), abilities, values))
        {
            _scores((scores) => ({ ...scores, method: "roll", base: deal(values, recommendedOrder.value) }));
        }
        else { _scheduleSave(); }
    };

    /** Point buy: an ability at a score, refused outside the costs or beyond the budget. */
    const buy = (ability: string, score: number): boolean =>
    {
        const pointBuy = packageSet.value?.ruleset.abilityScores?.pointBuy;
        if (!pointBuy) { return false; }
        const next = { ..._base(), [ability]: score };
        const cost = pointBuyCost(next, pointBuy.costs);
        if ((cost === undefined) || (cost > pointBuy.budget)) { return false; }

        _scores((scores) => ({ ...scores, method: "point-buy", base: next }));

        return true;
    };

    /** The player's own adjustment of a score; zero removes it. */
    const adjust = (ability: string, amount: number): void =>
    {
        _scores((scores) =>
        {
            const bonuses = Object.fromEntries(Object.entries({ ...scores.bonuses, [ability]: amount })
                .filter(([, v]) => (v !== undefined) && (v !== 0)));

            return defined({ ...scores, bonuses: Object.keys(bonuses).length ? bonuses : undefined });
        });
    };

    /** Deals the current method's values again in the recommended order. */
    const dealRecommended = (): void =>
    {
        const method = character.value?.choices.abilityScores?.method ?? "standard-array";
        const values = method === "roll" ?
            rolls.value :
            (method === "point-buy" ? Object.values(_base()) : packageSet.value?.ruleset.abilityScores?.standardArray);
        if (!values?.length) { return; }

        _scores((scores) => ({ ...scores, base: deal(values, recommendedOrder.value) }));
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
        rolls,
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
        recommendedOrder,
        chooseMethod,
        assign,
        setRolls,
        buy,
        adjust,
        dealRecommended,
        recommendation
    };
});
