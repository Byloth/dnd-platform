import { defineStore } from "pinia";

import type { Archetype, Class, LocalizedString } from "@byloth/dnd-platform-schema";
import type { Character } from "@byloth/dnd-platform-engine";
import type { PackageSet, PackageSource } from "@byloth/dnd-platform-loader";
import type { JSONValue } from "@byloth/core";
import { localize } from "@byloth/dnd-platform-composer";

import { deal, isPermutation, pointBuyCost, swap } from "@/composables/ability-scores";
import { EMPTY_SELECTION, coins, useEquipment } from "@/composables/equipment";
import type { EquipmentSelection, Source } from "@/composables/equipment";
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
/** The draft of a stored character being edited: one at a time, apart from the creation draft. */
export const EDIT_KEY = "wizard-edit";
/** How long the draft waits after a change before it is written. */
const SAVE_DELAY = 300;

export interface WizardDraft
{
    readonly character: Character;
    readonly step: StepId;
    /** The archetype the draft started from; `null` when the player chose to skip them. */
    readonly archetype?: string | null;
    /** The six totals the player rolled, as typed, when the method is "roll"; never part of the character. */
    readonly rolls?: readonly (number | null)[];
    /** The player's equipment selections, from which `choices.equipment` is rebuilt. */
    readonly equipment?: EquipmentSelection;
    /** Whether `choices.equipment` is the stored character's own list, edited as it is, not rebuilt. */
    readonly keptEquipment?: boolean;
    /** The id of the stored character this draft edits; absent for a new character. */
    readonly editing?: string;
    readonly savedAt: string;
}

type Choices = Character["choices"];
type Method = NonNullable<Choices["abilityScores"]>["method"];

/** A rolled total: three to eighteen (4d6, the lowest dropped). */
const isRoll = (value: number | null | undefined): value is number =>
    Number.isInteger(value) && (value! >= 3) && (value! <= 18);

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
    /** The rolled totals as typed, one place per ability; `null` where nothing is typed yet. */
    const rolls = ref<(number | null)[]>([]);
    const equipment = ref<EquipmentSelection>(structuredClone(EMPTY_SELECTION));
    /** True while the equipment is a stored character's own list (edited as it is) rather than rebuilt. */
    const keptEquipment = ref(false);
    /** The id of the stored character being edited; undefined while creating one. */
    const editing = ref<string>();
    const sources = shallowRef<PackageSource[]>([]);

    /** The steps on offer: editing a character has no concept step, an archetype only makes sense at the start. */
    const steps = computed((): readonly StepId[] => (editing.value ? STEPS.filter((s) => s !== "concept") : STEPS));
    const _key = (): string => (editing.value ? EDIT_KEY : DRAFT_KEY);

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
            // A plain copy: the selections are reactive all the way down, which IndexedDB cannot clone.
            equipment: JSON.parse(JSON.stringify(equipment.value)) as EquipmentSelection,
            keptEquipment: keptEquipment.value || undefined,
            editing: editing.value,
            savedAt: new Date().toISOString()
        });
        const key = _key();
        _saving = _saving.then(() => useBrowserStorage().meta.set(key, draft as unknown as JSONValue));

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

        _cancelSave();
        editing.value = undefined;
        character.value = emptyCharacter({ id: base.manifest.id, version: base.manifest.version });
        step.value = "content";
        archetype.value = undefined;
        rolls.value = [];
        equipment.value = structuredClone(EMPTY_SELECTION);
        keptEquipment.value = false;
        await _loadSources();
        await save();
    };

    /**
     * Opens a stored character in the wizard, at a step (the review by default); its draft is the edit draft,
     * so a character being created is never touched. False when no character has this id.
     */
    const edit = async (id: string, at: StepId = "review"): Promise<boolean> =>
    {
        const found = await useBrowserStorage().characters.get(id);
        if (!found) { return false; }

        _cancelSave();
        editing.value = id;
        character.value = found;
        step.value = at === "concept" ? "review" : at;
        archetype.value = null;
        rolls.value = [];
        equipment.value = structuredClone(EMPTY_SELECTION);
        keptEquipment.value = true;
        await _loadSources();
        await save();

        return true;
    };

    /** The stored creation draft, or the edit draft of this character, without loading it. */
    const stored = async (id?: string): Promise<WizardDraft | undefined> =>
    {
        const draft = (await useBrowserStorage().meta.get<JSONValue>(id ? EDIT_KEY : DRAFT_KEY) ?? undefined) as
            WizardDraft | undefined;

        return (!id || (draft?.editing === id)) ? draft : undefined;
    };

    /** Loads the stored creation draft, or the edit draft of this character; false when there is none. */
    const resume = async (id?: string): Promise<boolean> =>
    {
        const draft = await stored(id);
        if (!draft) { return false; }

        _cancelSave();
        editing.value = draft.editing;
        character.value = draft.character;
        step.value = draft.step;
        archetype.value = draft.archetype;
        rolls.value = [...draft.rolls ?? []];
        equipment.value = structuredClone(draft.equipment ?? EMPTY_SELECTION);
        keptEquipment.value = draft.keptEquipment ?? false;
        await _loadSources();

        return true;
    };

    /** Forgets the draft on screen and its stored copy (the edit draft when editing). */
    const discard = async (): Promise<void> =>
    {
        _cancelSave();
        const key = _key();
        editing.value = undefined;
        character.value = undefined;
        archetype.value = undefined;
        rolls.value = [];
        equipment.value = structuredClone(EMPTY_SELECTION);
        keptEquipment.value = false;
        step.value = "content";
        await useBrowserStorage().meta.set(key, null);
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

    const _equipment = () =>
        (packageSet.value ? useEquipment(packageSet.value, useNuxtApp().$i18n.locale.value) : undefined);

    /** Rebuilds `choices.equipment` from the grants and the selections (packs unpacked). */
    const _rebuildEquipment = (): void =>
    {
        const tools = _equipment();
        const current = character.value;
        if (!tools || !current || keptEquipment.value) { return; }
        const entries = tools.build(current, equipment.value);

        const choices = defined({ ...current.choices, equipment: entries.length ? entries : undefined });

        _write({ ...current, choices: choices });
    };

    /** Forgets the selections that belonged to a grant the player replaced. */
    const _resetEquipment = (source: Source): void =>
    {
        const own = (key: string): boolean => key.startsWith(`${source}#`);
        const selection = equipment.value;
        equipment.value = {
            ...selection,
            options: Object.fromEntries(Object.entries(selection.options).filter(([k]) => !own(k))),
            picks: Object.fromEntries(Object.entries(selection.picks).filter(([k]) => !own(k))),
            removed: selection.removed.filter((k) => !own(k))
        };
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
        _resetEquipment("class");
        _resetEquipment("background");
        _rebuildEquipment();
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
                classes: [defined({ class: id, subclass: subclass, levels: current?.levels ?? 1 })],
                answers: _withoutAnswersOf(choices.answers, [current?.class, current?.subclass])
            };
        });
        _resetEquipment("class");
        _rebuildEquipment();
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
        _resetEquipment("background");
        _rebuildEquipment();
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
            const typed = _validRolls();
            if (typed) { next = isPermutation(base, abilities, typed) ? base : deal(typed, recommendedOrder.value); }
        }

        _scores((scores) => defined({ method: method, base: next, bonuses: scores.bonuses }));
    };

    /** An ability takes a value of the array or of the rolls; the ability that held it takes the old one. */
    const assign = (ability: string, value: number): void =>
    {
        _scores((scores) => ({ ...scores, base: swap(_base(), ability, value) }));
    };

    /** The rolls, when one valid total is typed for every ability. */
    const _validRolls = (): number[] | undefined =>
    {
        const abilities = packageSet.value?.ruleset.abilities ?? [];
        const typed = rolls.value;

        return (typed.length === abilities.length) && typed.every(isRoll) ? typed as number[] : undefined;
    };

    /** The rolled totals as typed; once all are valid, they are dealt (kept as they are when already dealt). */
    const setRolls = (values: readonly (number | null)[]): void =>
    {
        rolls.value = [...values];
        const typed = _validRolls();
        if (typed && !isPermutation(_base(), packageSet.value?.ruleset.abilities ?? [], typed))
        {
            _scores((scores) => ({ ...scores, method: "roll", base: deal(typed, recommendedOrder.value) }));
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
            _validRolls() :
            (method === "point-buy" ? Object.values(_base()) : packageSet.value?.ruleset.abilityScores?.standardArray);
        if (!values?.length) { return; }

        _scores((scores) => ({ ...scores, base: deal(values, recommendedOrder.value) }));
    };

    /**
     * The answers of a choice the sheet asks; none forgets it. The level 1 class's subclass choice also writes
     * the class entry's subclass, as a character document carries it.
     */
    const answer = (key: string, values: readonly string[], of?: string): void =>
    {
        _choices((choices) =>
        {
            const answers: Record<string, string[]> = Object.fromEntries(Object.entries(choices.answers ?? {})
                .filter((entry): entry is [string, string[]] => (entry[0] !== key) && (entry[1] !== undefined)));
            if (values.length) { answers[key] = [...values]; }

            const first = choices.classes?.[0];
            const classes = (of === "subclass") && first && key.startsWith(`${first.class}#`) ?
                [defined({ ...first, subclass: values[0] }), ...choices.classes!.slice(1)] as Choices["classes"] :
                choices.classes;

            return { ...choices, classes: classes, answers: Object.keys(answers).length ? answers : undefined };
        });
    };

    const _select = (change: (selection: EquipmentSelection) => EquipmentSelection): void =>
    {
        equipment.value = change(equipment.value);
        _rebuildEquipment();
    };

    /** An option of a choice group of the class or background grant. */
    const chooseOption = (group: string, index: number): void =>
        _select((s) => ({ ...s, options: { ...s.options, [group]: index } }));

    /** The item a filter slot gives ("any martial weapon" → a longsword). */
    const pick = (slot: string, item: string): void => _select((s) => ({ ...s, picks: { ...s.picks, [slot]: item } }));

    /** Takes a granted item out, or puts it back. */
    const removeSlot = (slot: string, removed: boolean): void =>
        _select((s) => ({
            ...s,
            removed: removed ? [...new Set([...s.removed, slot])] : s.removed.filter((k) => k !== slot)
        }));

    /** The stored list, edited as it is (kept equipment). */
    const _owned = (change: (entries: NonNullable<Choices["equipment"]>) => Choices["equipment"]): void =>
        _choices((choices) =>
        {
            const entries = change([...choices.equipment ?? []]);

            return { ...choices, equipment: entries?.length ? entries : undefined };
        });

    const addItem = (item: string): void =>
    {
        if (keptEquipment.value)
        {
            _owned((entries) =>
            {
                const existing = entries.find((e) => e.item === item);

                return existing ?
                    entries.map((e) => (e === existing ? { ...e, quantity: (e.quantity ?? 1) + 1 } : e)) :
                    [...entries, { item: item, quantity: 1 }];
            });

            return;
        }
        _select((s) =>
        {
            const existing = s.added.findIndex((a) => a.item === item);
            const added = existing < 0 ?
                [...s.added, { item: item, quantity: 1 }] :
                s.added.map((a, i) => (i === existing ? { ...a, quantity: a.quantity + 1 } : a));

            return { ...s, added: added };
        });
    };

    const dropItem = (item: string): void =>
    {
        if (keptEquipment.value) { _owned((entries) => entries.filter((e) => e.item !== item)); }
        else { _select((s) => ({ ...s, added: s.added.filter((a) => a.item !== item) })); }
    };

    const equip = (item: string, on: boolean): void =>
    {
        if (keptEquipment.value)
        {
            _owned((entries) => entries
                .map((e) => (e.item === item ? defined({ ...e, equipped: on || undefined }) : e)));
        }
        else { _select((s) => ({ ...s, equipped: { ...s.equipped, [item]: on } })); }
    };

    /** Leaves the stored list for the starting equipment of the class and background, chosen again. */
    const chooseEquipmentAgain = (): void =>
    {
        keptEquipment.value = false;
        equipment.value = structuredClone(EMPTY_SELECTION);
        _rebuildEquipment();
    };

    /** The suggested purse, in copper: the grants' gold, plus removed items, minus added ones. */
    const suggestedCopper = computed((): number =>
    {
        const tools = _equipment();

        return tools && character.value ? tools.suggestedCopper(character.value, equipment.value) : 0;
    });

    type Currency = NonNullable<Character["state"]["currency"]>;

    /** The coins the character starts with; zeros are left out. */
    const setCoins = (currency: Currency): void =>
    {
        const current = character.value;
        if (!current) { return; }
        const kept = Object.fromEntries(Object.entries(currency).filter(([, v]) => (v ?? 0) > 0)) as Currency;

        _write({ ...current, state: { ...current.state, currency: kept } });
    };

    const useSuggestedCoins = (): void => setCoins(coins(suggestedCopper.value));

    type Personal = "traits" | "ideals" | "bonds" | "flaws" | "appearance" | "notes";

    const setName = (name: string): void =>
    {
        const current = character.value;
        if (!current) { return; }

        _write({ ...current, name: name });
    };

    /** An alignment id of the ruleset, or what the player typed; `undefined` clears it. */
    const setAlignment = (alignment: string | undefined): void =>
        _choices((choices) => ({ ...choices, alignment: alignment?.trim() || undefined }));

    /**
     * A text of the player's own, kept in the language it was first written in (the player writes one text, not
     * a translation); an empty text removes the field.
     */
    const setPersonal = (key: Personal, text: string): void =>
    {
        const written = (previous: LocalizedString | undefined): LocalizedString | undefined =>
        {
            if (!text.trim()) { return undefined; }
            const language = Object.keys(previous ?? {})[0] ?? useNuxtApp().$i18n.locale.value;

            return { [language]: text };
        };

        _choices((choices) =>
        {
            if ((key === "appearance") || (key === "notes"))
            {
                return { ...choices, [key]: written(choices[key]) };
            }
            const personality = defined({ ...choices.personality, [key]: written(choices.personality?.[key]) });

            return { ...choices, personality: Object.keys(personality).length ? personality : undefined };
        });
    };

    /**
     * Stores the draft as a character and forgets the draft; its id, or `undefined` without a name (the one thing
     * the wizard asks before saving; owner, 2026-09-25). A new character starts at full hit points and keeps its
     * choices "as created" in a snapshot (docs/phase-1/02-content-and-character-stores.md); an edited one replaces
     * its stored document.
     */
    const finish = async (): Promise<string | undefined> =>
    {
        const current = character.value;
        const name = current?.name.trim();
        if (!current || !name) { return undefined; }

        const sheet = useEngine().sheet(current, sources.value, { language: useNuxtApp().$i18n.locale.value }).sheet;
        const value = sheet.values["hp.max"]?.value;
        const max = typeof value === "number" ? value : 0;

        if (editing.value)
        {
            // The state goes on as it was, but no more hit points than the new maximum; no new snapshot.
            const hp = current.state.hp;
            const changed: Character = {
                ...current,
                name: name,
                state: { ...current.state, hp: { ...hp, current: Math.min(hp.current, max) } }
            };
            await useBrowserStorage().characters.put(JSON.parse(JSON.stringify(changed)) as Character);
            await discard();

            return changed.id;
        }

        const created: Character = {
            ...current,
            name: name,
            state: { ...current.state, hp: { current: max, temporary: 0 } },
            snapshots: [
                ...current.snapshots ?? [],
                { at: new Date().toISOString(), level: sheet.level, label: "as created", choices: current.choices }
            ]
        };

        // A plain copy: IndexedDB cannot clone what Vue made reactive.
        await useBrowserStorage().characters.put(JSON.parse(JSON.stringify(created)) as Character);
        await discard();

        return created.id;
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
        equipment,
        keptEquipment,
        editing,
        steps,
        sources,
        packageSet,
        start,
        edit,
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
        answer,
        chooseOption,
        pick,
        removeSlot,
        addItem,
        dropItem,
        equip,
        chooseEquipmentAgain,
        suggestedCopper,
        setCoins,
        useSuggestedCoins,
        setName,
        setAlignment,
        setPersonal,
        finish,
        recommendation
    };
});
