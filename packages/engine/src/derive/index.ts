/**
 * `derive`: character + packages → computed sheet with provenance.
 * See docs/phase-0/03-engine-contract.md for the algorithm.
 */

import { parseFormula } from "@byloth/dnd-platform-schema";
import type {
    Background, Character, Class, ConditionEntity, Effect, LocalizedString, ProficiencyGrants, Rule, Species, Spell,
    Table
} from "@byloth/dnd-platform-schema";

import { evaluateWhen, ConditionError } from "../conditions/evaluate.js";
import type { Facts } from "../conditions/evaluate.js";
import { stableStringify } from "@byloth/dnd-platform-schema";
import { evaluateFormula, formatValue } from "../formula/evaluate.js";
import type {
    ActionView, ChoiceView, ComputedSheet, ConditionRef, Contribution, ContributionSource, CustomSectionView,
    DefenseView, DeriveOptions, DerivedValue, Diagnostic, FeatureView, HitDicePool, PackageSet, PlayRules,
    ProficiencyView, Provenance, ResolvedRoll, ResourceView, RollModifierView, SlotView, SpellcastingView, SpellView,
    TextView, ToggleView, ValuePath
} from "../index.js";
import { baseAbilityScores, buildFacts, classLevelsOf, equippedItems, totalLevel } from "./facts.js";
import { assembleAttacks } from "./attacks.js";
import type { AttackModifier } from "./attacks.js";
import { collectFeatures, noteExcluded } from "./features.js";
import type { ActiveFeature, PendingChoice } from "./features.js";
import { ValueGraph } from "./values.js";
import type { PendingContribution, TableEntry } from "./values.js";

const ALWAYS_SECTIONS = [
    "identity", "core", "abilities", "saves", "skills", "combat", "features", "equipment", "personality", "conditions",
    "notes", "credits"
];
const PROFICIENCY_KEYS: Record<string, ProficiencyView["type"]> = {
    skills: "skill", savingThrows: "save", armor: "armor", weapons: "weapon", tools: "tool", languages: "language"
};

interface Collector
{
    readonly proficiencies: Map<string, ProficiencyView>;
    readonly choices: ChoiceView[];
    readonly warnings: Diagnostic[];
}

type GrantList = string[] | { choose: number, from: string[] } | undefined;
interface Grant { fixed: string[], choose?: { count: number, from: string[] } }

function grantList(list: GrantList): Grant
{
    if (list === undefined) { return { fixed: [] }; }
    if (Array.isArray(list)) { return { fixed: list }; }

    return { fixed: [], choose: { count: list.choose, from: list.from } };
}

function addProficiency(
    col: Collector,
    type: ProficiencyView["type"],
    item: string,
    source: ContributionSource,
    expertise = false
): void
{
    const key = `${type}:${item}`;
    const existing = col.proficiencies.get(key);
    if ((existing === undefined) || (expertise && !existing.expertise))
    {
        col.proficiencies.set(key, { type: type, item: item, expertise: expertise, source: source });
    }
}

type Answers = Record<string, readonly string[]>;

type ChoiceInput = Omit<ChoiceView, "answers" | "answered">;

function registerChoice(col: Collector, answers: Answers, view: ChoiceInput): readonly string[]
{
    const given = answers[view.key] ?? [];
    const answered = given.length >= view.count;
    col.choices.push({ ...view, answers: given, answered: answered });
    if (!answered)
    {
        col.warnings.push({
            severity: "warning",
            code: "W_UNANSWERED_CHOICE",
            entity: view.owner,
            path: view.key,
            message: `choice "${view.key}" (${view.of}) has ${given.length} of ${view.count} answers`
        });
    }

    return given;
}

/** Proficiencies granted by an entity's `proficiencies` block (class, background, subclass multiclass…). */
function grantsOf(
    owner: string,
    grants: ProficiencyGrants | undefined,
    source: ContributionSource,
    col: Collector,
    answers: Answers
): void
{
    for (const [key, type] of Object.entries(PROFICIENCY_KEYS))
    {
        const list = grantList((grants as Record<string, GrantList> | undefined)?.[key]);
        for (const item of list.fixed) { addProficiency(col, type, item, source); }
        if (list.choose)
        {
            const chosen = registerChoice(col, answers, {
                key: `${owner}#${key}`,
                owner: owner,
                choice: key,
                of: type === "save" ? "option" : type,
                count: list.choose.count,
                options: list.choose.from
            });
            for (const item of chosen) { addProficiency(col, type, item, source); }
        }
    }
}

function languagesOf(
    owner: string,
    languages: { fixed?: string[], choose?: number } | undefined,
    source: ContributionSource,
    col: Collector,
    answers: Answers
): void
{
    for (const item of languages?.fixed ?? []) { addProficiency(col, "language", item, source); }
    if (languages?.choose)
    {
        const chosen = registerChoice(col, answers, {
            key: `${owner}#languages`,
            owner: owner,
            choice: "languages",
            of: "language",
            count: languages.choose,
            options: []
        });
        for (const item of chosen) { addProficiency(col, "language", item, source); }
    }
}

function choiceView(pending: PendingChoice, answers: Record<string, readonly string[]>, col: Collector): void
{
    const c = pending.choice;
    registerChoice(col, answers, {
        key: `${pending.owner}#${c.id}`,
        owner: pending.owner,
        choice: c.id,
        of: c.of,
        count: c.count ?? 1,
        options: c.from ?? [],
        ...(c.filter ? { filter: c.filter } : {}),
        ...(pending.level !== undefined ? { level: pending.level } : {})
    });
}

function tablesOf(set: PackageSet, classes: readonly { id: string, data: Class }[]): Map<string, TableEntry>
{
    const tables = new Map<string, TableEntry>();
    for (const entity of set.entities.values())
    {
        if (entity.type !== "table") { continue; }
        const table = entity.data as Table;
        tables.set(table.id, { by: table.by, rows: table.rows });
    }
    for (const cls of classes)
    {
        const short = cls.id.split(".").pop() ?? cls.id;
        for (const [name, def] of Object.entries(cls.data.tables ?? {}))
        {
            if (def) { tables.set(`${short}.${name}`, { by: def.by, rows: def.rows, ownerClass: cls.id }); }
        }
    }

    return tables;
}

/** Evaluates an effect's `when`; an unknown key becomes a diagnostic and the effect stays inactive. */
function whenHolds(when: Effect["when"], facts: Facts, featureId: string, warnings: Diagnostic[]): boolean
{
    try
    {
        return evaluateWhen(when, facts);
    }
    catch (error)
    {
        if (!(error instanceof ConditionError)) { throw error; }
        warnings.push({
            severity: "error", code: "E_UNKNOWN_CONDITION_KEY", entity: featureId, message: error.message
        });

        return false;
    }
}

interface RechargeEntry { on: string, amount: string | number }

interface EffectContext
{
    readonly feature: ActiveFeature;
    readonly index: number;
    readonly effect: Effect;
    readonly applied: boolean;
    readonly source: ContributionSource;
}

/** `W_EXCLUDED_CONTENT` is raised at every lookup of an entity; the sheet reports each entity once. */
function dedupeExcluded(warnings: readonly Diagnostic[]): Diagnostic[]
{
    const seen = new Set<string>();

    return warnings.filter((w) =>
    {
        if (w.code !== "W_EXCLUDED_CONTENT") { return true; }
        const key = w.entity ?? "";
        if (seen.has(key)) { return false; }
        seen.add(key);

        return true;
    });
}

export function derive(character: Character, set: PackageSet, options: DeriveOptions = {}): ComputedSheet
{
    const warnings: Diagnostic[] = [];
    const answers: Answers = Object.fromEntries(
        Object.entries(character.choices.answers ?? {}).map(([k, v]) => [k, v ?? []])
    );
    const col: Collector = { proficiencies: new Map(), choices: [], warnings: warnings };

    const collected = collectFeatures(character, set);
    warnings.push(...collected.warnings);
    const classes = (character.choices.classes ?? []).flatMap((entry) =>
    {
        const resolved = set.entities.get(entry.class);

        if ((resolved === undefined) || (resolved.type !== "class")) { return []; }

        return [{ id: entry.class, data: resolved.data as Class, levels: entry.levels, package: resolved.package }];
    });
    const species = set.entities.get(character.choices.species ?? "")?.data as Species | undefined;
    type SubspeciesData = { speed?: Species["speed"], size?: Species["size"] } | undefined;
    const subspecies = set.entities.get(character.choices.subspecies ?? "")?.data as SubspeciesData;
    const background = set.entities.get(character.choices.background ?? "")?.data as Background | undefined;

    // ---- pass 1: proficiencies and choices from entity blocks and effects ----
    classes.forEach((cls, index) =>
    {
        const source = { package: cls.package, entity: cls.id };
        if (index === 0)
        {
            for (const save of cls.data.savingThrows) { addProficiency(col, "save", save, source); }
            grantsOf(cls.id, cls.data.proficiencies, source, col, answers);
        }
        else
        {
            // Multiclassing: later classes grant only their multiclass proficiencies, never saves.
            grantsOf(cls.id, cls.data.multiclass?.proficiencies, source, col, answers);
        }
    });
    if (species && character.choices.species)
    {
        const source = { package: set.entities.get(character.choices.species)?.package ?? "", entity: species.id };
        languagesOf(character.choices.species, species.languages, source, col, answers);
    }
    if (background && character.choices.background)
    {
        const pkg = set.entities.get(character.choices.background)?.package ?? "";
        const source = { package: pkg, entity: background.id };
        grantsOf(background.id, background.proficiencies, source, col, answers);
        languagesOf(background.id, background.languages, source, col, answers);
    }
    // Level and class gates on proficiency grants are known before any proficiency is: evaluate them now,
    // with no proficiencies in the facts; anything that needs them is re-evaluated in pass 2.
    const baseScores = baseAbilityScores(character);
    const preFacts: Facts = buildFacts({
        character: character,
        set: set,
        features: new Set(collected.features.map((f) => f.id)),
        proficiencies: new Set(),
        abilities: baseScores,
        knownSpells: new Set()
    });
    const gateHolds = (when: Effect["when"]): boolean =>
    {
        try { return evaluateWhen(when, preFacts); }
        catch (error)
        {
            // An unknown condition key is reported by pass 2.
            if (error instanceof ConditionError) { return true; }
            throw error;
        }
    };
    for (const feature of collected.features)
    {
        (feature.data.effects ?? []).forEach((effect) =>
        {
            if (effect.kind !== "grant-proficiency") { return; }
            if (!gateHolds(effect.when)) { return; }
            for (const item of effect.items ?? [])
            {
                const name = item === "self" ? feature.owner : item;
                addProficiency(col, effect.type, name, feature.source, effect.expertise === true);
            }
            if (effect.choose)
            {
                const chooseId = effect.choose.id ?? effect.type;
                const chosen = registerChoice(col, answers, {
                    key: `${feature.id}#${chooseId}`,
                    owner: feature.id,
                    choice: chooseId,
                    of: effect.type === "save" ? "option" : effect.type,
                    count: effect.choose.count,
                    options: effect.choose.from
                });
                for (const item of chosen)
                {
                    addProficiency(col, effect.type, item, feature.source, effect.expertise === true);
                }
            }
        });
    }
    for (const pending of collected.choices) { choiceView(pending, answers, col); }

    // ---- facts ----
    const proficiencySet = new Set<string>();
    for (const p of col.proficiencies.values())
    {
        proficiencySet.add(`${p.type}:${p.item}`);
        if (p.expertise) { proficiencySet.add(`${p.type}:${p.item}:expertise`); }
    }
    const facts: Facts = buildFacts({
        character: character,
        set: set,
        features: new Set(collected.features.map((f) => f.id)),
        proficiencies: proficiencySet,
        abilities: baseScores,
        knownSpells: new Set()
    });

    // ---- pass 2: effects → contributions and views ----
    const contexts: EffectContext[] = [];
    for (const feature of collected.features)
    {
        (feature.data.effects ?? []).forEach((effect, index) =>
        {
            const applied = whenHolds(effect.when, facts, feature.id, warnings);
            contexts.push({
                feature: feature,
                index: index,
                effect: effect,
                applied: applied,
                source: { ...feature.source, effectIndex: index }
            });
        });
    }

    // Option effects of answered inline choices are features of their own ("option" origin).
    for (const ctx of [...contexts])
    {
        if ((ctx.effect.kind !== "open-choice") || !ctx.effect.options || !ctx.applied) { continue; }
        const key = `${ctx.feature.id}#${ctx.effect.choice}`;
        const chosen = registerChoice(col, answers, {
            key: key,
            owner: ctx.feature.id,
            choice: ctx.effect.choice,
            of: ctx.effect.of,
            count: ctx.effect.count ?? 1,
            options: ctx.effect.options.map((o) => o.id),
            optionDetails: Object.fromEntries(ctx.effect.options.map((o) => [
                o.id,
                { ...(o.name ? { name: o.name } : {}), ...(o.text ? { text: o.text } : {}) }
            ]))
        });
        for (const option of ctx.effect.options.filter((o) => chosen.includes(o.id)))
        {
            (option.effects ?? []).forEach((effect, index) =>
            {
                const applied = evaluateWhen(effect.when, facts);
                const feature: ActiveFeature = {
                    ...ctx.feature,
                    id: option.id,
                    data: { id: option.id, name: option.name, effects: option.effects ?? [] },
                    origin: "option"
                };
                contexts.push({
                    feature: feature,
                    index: index,
                    effect: effect,
                    applied: applied,
                    source: { ...ctx.feature.source, feature: option.id, effectIndex: index }
                });
            });
        }
    }
    /** Spells chosen through feature choices (High Elf cantrip, Bonus Cantrip); added after spellcasting. */
    interface ChosenSpell { readonly id: string, readonly source: ContributionSource, readonly ownerClass?: string }
    const chosenSpells: ChosenSpell[] = [];
    for (const ctx of contexts)
    {
        if ((ctx.effect.kind === "open-choice") && !ctx.effect.options)
        {
            const gate = ctx.effect.level;
            const reached = ctx.feature.ownerClass !== undefined ?
                (facts.classLevels[ctx.feature.ownerClass] ?? 0) :
                facts.level;
            if (!ctx.applied || ((gate !== undefined) && (reached < gate))) { continue; }
            const given = registerChoice(col, answers, {
                key: `${ctx.feature.id}#${ctx.effect.choice}`,
                owner: ctx.feature.id,
                choice: ctx.effect.choice,
                of: ctx.effect.of,
                count: ctx.effect.count ?? 1,
                options: ctx.effect.from ?? [],
                ...(ctx.effect.filter ? { filter: ctx.effect.filter } : {})
            });
            if ((ctx.effect.of === "skill") || (ctx.effect.of === "tool") || (ctx.effect.of === "language"))
            {
                for (const item of given) { addProficiency(col, ctx.effect.of, item, ctx.source); }
            }
            if (ctx.effect.of === "spell")
            {
                for (const id of given)
                {
                    const ownerClass = ctx.feature.ownerClass;
                    const scope = ownerClass ? { ownerClass: ownerClass } : {};
                    chosenSpells.push({ id: id, source: ctx.source, ...scope });
                }
            }
        }
    }

    const contributions: PendingContribution[] = [];
    const tables = tablesOf(set, classes);
    for (const ctx of contexts)
    {
        const e = ctx.effect;
        if (e.kind === "modify")
        {
            contributions.push({
                target: e.target,
                op: e.op,
                ...(e.value !== undefined ? { value: e.value } : {}),
                ...(e.formula !== undefined ? { formula: e.formula } : {}),
                label: ctx.feature.data.name,
                source: ctx.source,
                applied: ctx.applied,
                ...(ctx.feature.ownerClass ? { ownerClass: ctx.feature.ownerClass } : {})
            });
        }
        else if (e.kind === "define-table")
        {
            const ownerClass = ctx.feature.ownerClass;
            tables.set(e.table, { by: e.by, rows: e.rows, ...(ownerClass ? { ownerClass: ownerClass } : {}) });
        }
        else if (e.kind === "declare-resource")
        {
            const target = `resource.${e.resource}.max`;
            const max: { value: number | string } | { formula: string } =
                ((typeof e.max === "number") || (e.max === "unlimited")) ? { value: e.max } : { formula: e.max };
            contributions.push({
                target: target,
                op: "set",
                ...max,
                label: ctx.feature.data.name,
                source: ctx.source,
                applied: ctx.applied,
                ...(ctx.feature.ownerClass ? { ownerClass: ctx.feature.ownerClass } : {})
            });
        }
    }

    const graph = new ValueGraph({
        ruleset: set.ruleset,
        level: totalLevel(character),
        classLevels: classLevelsOf(character),
        classes: classes,
        baseScores: baseScores,
        abilityAdjustments: character.choices.abilityScores?.bonuses ?? {},
        ...(species ? { species: species } : {}),
        ...(subspecies ? { subspecies: subspecies } : {}),
        equipment: equippedItems(character, set),
        proficiencies: proficiencySet,
        tables: tables,
        contributions: contributions,
        warnings: warnings,
        rulesetPackage: set.rulesetPackage
    });

    // ---- views ----
    const resources: ResourceView[] = [];
    const actions: ActionView[] = [];
    const attackModifiers: AttackModifier[] = [];
    const rollModifiers: RollModifierView[] = [];
    const defenses: DefenseView[] = [];
    const spellcasting: SpellcastingView[] = [];
    /** A `modify resource.<id>.recharge set <rest>` contribution (Font of Inspiration) replaces the declared one. */
    const rechargeOf = (resource: string, declared: RechargeEntry[]): RechargeEntry[] =>
    {
        const path = `resource.${resource}.recharge`;
        if (!contributions.some((c) => c.target === path && c.applied)) { return declared; }
        const value = graph.get(path).value;

        if (typeof value !== "string" || value === "0") { return declared; }

        // A short-rest recharge is also regained on a long rest.
        return value === "short-rest" ?
            [{ on: "short-rest", amount: "full" }, { on: "long-rest", amount: "full" }] :
            [{ on: value, amount: "full" }];
    };
    const spells: SpellView[] = [];
    const sections = new Set<string>(ALWAYS_SECTIONS);
    const texts: TextView[] = [];
    const declared = new Map<string, CustomSectionView>();
    const spellEntity = (spellId: string): Spell | undefined =>
    {
        const resolved = set.entities.get(spellId);
        noteExcluded(resolved, warnings);

        return (resolved && resolved.type === "spell") ? resolved.data as Spell : undefined;
    };
    const addSpell = (
        spellId: string,
        as: SpellView["as"],
        paidWith: SpellView["paidWith"],
        source: ContributionSource,
        ability?: string,
        caster?: string
    ): void =>
    {
        const spell = spellEntity(spellId);
        if (spell === undefined)
        {
            warnings.push({
                severity: "warning",
                code: "W_MISSING_ENTITY",
                entity: spellId,
                message: `spell "${spellId}" is not loaded`
            });

            return;
        }
        const cantrip = spell.level === 0;
        spells.push({
            id: spellId,
            name: spell.name,
            level: spell.level,
            as: cantrip ? "cantrip" : as,
            ...(ability ? { ability: ability } : {}),
            paidWith: cantrip && "slot" in paidWith ? { free: true } : paidWith,
            ...(caster ? { caster: caster } : {}),
            duration: spell.duration,
            ...(spell.onCast?.length ? { onCast: spell.onCast } : {}),
            source: source
        });
    };
    /** The row of a global table with the highest key ≤ `key` (step function). */
    const tableRow = (tableId: string, key: number): number | string | number[] | undefined =>
    {
        const resolved = set.entities.get(tableId);
        if (!resolved || resolved.type !== "table") { return undefined; }
        const rows = (resolved.data as Table).rows;
        const keys = Object.keys(rows)
            .map(Number)
            .filter((k) => k <= key)
            .sort((a, b) => b - a);

        return keys[0] === undefined ? undefined : rows[String(keys[0])];
    };
    const globalTable = (tableId: string, key: number): number =>
    {
        const raw = tableRow(tableId, key);

        return typeof raw === "number" ? raw : 0;
    };
    const slotRow = (tableId: string, key: number): number[] =>
    {
        const raw = tableRow(tableId, key);

        return Array.isArray(raw) ? raw : [];
    };
    const evaluateDc = (formula: string | undefined, ownerClass: string | undefined): DerivedValue | undefined =>
    {
        if (formula === undefined) { return undefined; }
        const parsed = parseFormula(formula);
        if (!parsed.ok) { return undefined; }
        try
        {
            const value = evaluateFormula(parsed.ast, graph.environment(ownerClass));

            const shown = formatValue(value);
            const contribution = {
                kind: "base" as const,
                value: shown,
                formula: formula,
                label: { en: "Save DC" },
                source: { package: set.rulesetPackage },
                applied: true
            };

            return { value: shown, provenance: [contribution] };
        }
        catch { return undefined; }
    };

    for (const ctx of contexts)
    {
        const e = ctx.effect;
        const ownerClass = ctx.feature.ownerClass;
        switch (e.kind)
        {
            case "declare-resource":
                if (!ctx.applied) { break; }
                resources.push({
                    id: e.resource,
                    name: e.name ?? ctx.feature.data.name,
                    max: graph.get(`resource.${e.resource}.max`),
                    current: character.state.resources[e.resource] ?? null,
                    recharge: rechargeOf(e.resource, e.recharge.map((r) => ({ on: r.on, amount: r.amount }))),
                    display: e.display ?? "pips",
                    source: ctx.source
                });
                sections.add(e.section ?? "resources");
                break;
            case "add-action":
            {
                const dc = evaluateDc(e.dc, ownerClass);
                const rolls: ResolvedRoll[] | undefined = e.rolls?.map((r) =>
                {
                    const ability = r.ability;
                    const bonusParts: string[] = [];
                    let bonus = 0;
                    if (ability)
                    {
                        bonus += graph.number(`mod.${ability}`);
                        bonusParts.push(`mod(${ability})`);
                    }
                    if ((r.type === "attack") && r.proficient)
                    {
                        bonus += graph.number("proficiencyBonus");
                        bonusParts.push("proficiencyBonus");
                    }
                    const rollDc = evaluateDc(r.dc, ownerClass);

                    return {
                        type: r.type,
                        ...(ability ? { ability: ability } : {}),
                        bonus: {
                            value: bonus,
                            provenance: [{
                                kind: "base",
                                value: bonus,
                                formula: bonusParts.join(" + ") || "0",
                                label: { en: "Roll bonus" },
                                source: ctx.source,
                                applied: true
                            }]
                        },
                        ...(r.dice ? { dice: r.dice } : {}),
                        ...(r.damageType ? { damageType: r.damageType } : {}),
                        ...(rollDc ? { dc: rollDc } : {}),
                        ...(r.onSuccess ? { onSuccess: r.onSuccess } : {})
                    };
                });
                actions.push({
                    id: e.action,
                    name: e.name ?? ctx.feature.data.name,
                    activation: e.activation,
                    cost: e.cost ?? [],
                    ...(e.requires ? { requires: e.requires } : {}),
                    ...(dc ? { dc: dc } : {}),
                    ...(rolls ? { rolls: rolls } : {}),
                    ...(e.text ? { text: e.text } : {}),
                    ...(e.toggle ? { toggle: e.toggle.state } : {}),
                    ...(e.onUse ? { onUse: e.onUse } : {}),
                    ...(e.onHit ? { onHit: e.onHit } : {}),
                    source: ctx.source,
                    available: ctx.applied
                });
                sections.add("actions");
                if (rolls?.some((r) => r.type === "attack")) { sections.add("attacks"); }
                break;
            }
            case "modify-attacks":
                attackModifiers.push({
                    effect: e,
                    applied: ctx.applied,
                    source: ctx.source,
                    label: ctx.feature.data.name,
                    ...(ownerClass ? { ownerClass: ownerClass } : {})
                });
                break;
            case "roll-advantage":
            case "roll-disadvantage":
                rollModifiers.push({
                    kind: e.kind === "roll-advantage" ? "advantage" : "disadvantage",
                    on: {
                        type: e.on.type,
                        ...(e.on.ability ? { ability: e.on.ability } : {}),
                        ...(e.on.skill ? { skill: e.on.skill } : {}),
                        ...(e.on.against ? { against: e.on.against } : {})
                    },
                    ...(e.note ? { note: e.note } : {}),
                    source: ctx.source,
                    applied: ctx.applied
                });
                break;
            case "defense":
                if (ctx.applied) { defenses.push({ defense: e.defense, to: e.to, source: ctx.source }); }
                break;
            case "add-text":
                if (!ctx.applied) { break; }
                sections.add(e.section);
                if (options.includeText !== false)
                {
                    texts.push({ section: e.section, text: e.text, source: ctx.source });
                }
                break;
            case "add-section":
                // The first declaration of an id wins; the section shows only once something is added to it.
                if (ctx.applied && !declared.has(e.section))
                {
                    declared.set(e.section, {
                        id: e.section,
                        name: e.name,
                        ...(e.layout ? { layout: e.layout } : {}),
                        source: ctx.source
                    });
                }
                break;
            case "grant-spellcasting":
            {
                if (!ctx.applied) { break; }
                const classId = ownerClass ?? ctx.feature.owner;
                const classLevel = facts.classLevels[classId] ?? facts.level;
                const prof = graph.number("proficiencyBonus");
                const mod = graph.number(`mod.${e.ability}`);
                const part = (kind: "base" | "add", value: number, label: string): Contribution => ({
                    kind: kind,
                    value: value,
                    label: { en: label },
                    source: ctx.source,
                    applied: true
                });
                const dcProvenance = [
                    part("base", 8, "Base"),
                    part("add", prof, "Proficiency bonus"),
                    part("add", mod, `${e.ability.toUpperCase()} modifier`)
                ];
                const casters = contexts.filter((c) => c.effect.kind === "grant-spellcasting" && c.applied);
                const spellSlots = set.ruleset.spellSlots as Record<string, { table: string } | undefined> | undefined;
                let slotLevels: number[] = [];
                let pact: SpellcastingView["pact"];
                if ("progression" in e.slots)
                {
                    const tableId = spellSlots?.[e.slots.progression]?.table;
                    if (e.slots.progression === "pact")
                    {
                        const row = tableId ? slotRow(tableId, classLevel) : [];
                        const current = character.state.spellSlots?.["pact"] ?? null;
                        pact = { slots: row[0] ?? 0, level: row[1] ?? 0, current: current };
                    }
                    else if (casters.length > 1 && spellSlots?.["multiclass"])
                    {
                        const casterLevel = Math.floor(casters.reduce((sum, c) =>
                        {
                            const cls = classes.find((k) => k.id === (c.feature.ownerClass ?? c.feature.owner));

                            return sum + (cls ? cls.levels * (cls.data.casterWeight ?? 0) : 0);

                        }, 0));
                        slotLevels = slotRow(spellSlots["multiclass"].table, casterLevel);
                    }
                    else if (tableId)
                    {
                        slotLevels = slotRow(tableId, classLevel);
                    }
                }
                else
                {
                    slotLevels = slotRow(e.slots.table, classLevel);
                }
                const slotViews: SlotView[] = slotLevels
                    .map((max, index) => ({
                        level: index + 1,
                        max: max,
                        current: character.state.spellSlots?.[String(index + 1)] ?? null
                    }))
                    .filter((s) => s.max > 0);
                const cantripsKnown = e.cantrips ? globalTable(e.cantrips.table, classLevel) : undefined;
                const spellsKnown = e.known ? globalTable(e.known.table, classLevel) : undefined;
                spellcasting.push({
                    class: classId,
                    ability: e.ability,
                    dc: { value: 8 + prof + mod, provenance: dcProvenance },
                    attackBonus: { value: prof + mod, provenance: dcProvenance.slice(1) },
                    preparation: e.preparation,
                    list: e.list,
                    slots: slotViews,
                    ...(pact ? { pact: pact } : {}),
                    ...(cantripsKnown !== undefined ? { cantripsKnown: cantripsKnown } : {}),
                    ...(spellsKnown !== undefined ? { spellsKnown: spellsKnown } : {}),
                    ritual: e.ritual === true,
                    source: ctx.source
                });
                // Chosen cantrips and spells live in the answers: `<class id>#cantrips`, `<class id>#spells`.
                const progression = "progression" in e.slots ? e.slots.progression : "full";
                const divisor = progression === "half" ? 2 : progression === "third" ? 3 : 1;
                const levelsForPreparation = Math.floor(classLevel / divisor);
                const preparedCount = e.preparation === "known" ?
                    (spellsKnown ?? 0) :
                    Math.max(1, levelsForPreparation + mod);
                const cantrips = (cantripsKnown ?? 0) > 0 ?
                    registerChoice(col, answers, {
                        key: `${classId}#cantrips`,
                        owner: classId,
                        choice: "cantrips",
                        of: "spell",
                        count: cantripsKnown ?? 0,
                        options: [],
                        filter: { type: "spell", list: e.list, level: 0 }
                    }) :
                    (answers[`${classId}#cantrips`] ?? []);
                const chosen = registerChoice(col, answers, {
                    key: `${classId}#spells`,
                    owner: classId,
                    choice: "spells",
                    of: "spell",
                    count: preparedCount,
                    options: [],
                    filter: { type: "spell", list: e.list }
                });
                const chosenAs = e.preparation === "known" ? "known" : "prepared";
                for (const spellId of cantrips)
                {
                    addSpell(spellId, "known", { free: true }, ctx.source, e.ability, classId);
                }
                for (const spellId of chosen)
                {
                    addSpell(spellId, chosenAs, { slot: true }, ctx.source, e.ability, classId);
                }
                sections.add("spellcasting");
                sections.add("spells");
                break;
            }
            case "grant-spells":
            {
                if (!ctx.applied) { break; }
                const cost = e.cost?.[0];
                let paidWith: SpellView["paidWith"] = { slot: true };
                if (cost && "amount" in cost) { paidWith = { resource: cost.resource, amount: cost.amount }; }
                else if (e.uses) { paidWith = { uses: e.uses.count, recharge: e.uses.recharge }; }
                for (const spellId of e.spells)
                {
                    addSpell(spellId, e.as, paidWith, ctx.source, e.ability, ctx.feature.ownerClass);
                }
                sections.add("spells");
                break;
            }
            default:
                break;
        }
    }
    for (const chosen of chosenSpells)
    {
        const caster = spellcasting.find((s) => s.class === chosen.ownerClass) ?? spellcasting[0];
        addSpell(chosen.id, "known", { slot: true }, chosen.source, caster?.ability, caster?.class);
        sections.add("spells");
    }
    const attacks = assembleAttacks(
        equippedItems(character, set),
        proficiencySet,
        graph,
        attackModifiers,
        { package: set.rulesetPackage, entity: set.ruleset.id }
    );
    if (attacks.length > 0) { sections.add("attacks"); }
    // Identical actions declared twice (Rogue and Hunter both have Uncanny Dodge) collapse into one row.
    const seenActions = new Map<string, ActionView>();
    for (const action of actions)
    {
        const first = seenActions.get(action.id);
        if (first === undefined)
        {
            seenActions.set(action.id, action);

            continue;
        }
        if (!first.available && action.available)
        {
            // Variants gated by `when` (Divine Strike 1d8 / 2d8): the one that applies wins silently.
            seenActions.set(action.id, action);

            continue;
        }
        if (first.available && !action.available) { continue; }
        const comparable = (a: ActionView): string => stableStringify({ ...a, source: null, available: null });
        const same = comparable(first) === comparable(action);
        if (!same)
        {
            const entity = action.source.feature ?? action.source.entity;
            warnings.push({
                severity: "warning",
                code: "W_DUPLICATE_ACTION",
                ...(entity !== undefined ? { entity: entity } : {}),
                message: `action "${action.id}" is declared twice with different content; the first declaration wins`
            });
        }
    }

    // Base actions of the ruleset (Attack, Dash…) are listed after the granted ones, without activating
    // the Actions section: they belong to the cheat sheet, not to the character (docs/phase-0/07).
    for (const ruleId of set.ruleset.baseActions ?? [])
    {
        const resolved = set.entities.get(ruleId);
        if ((resolved === undefined) || (resolved.type !== "rule"))
        {
            warnings.push({
                severity: "warning", code: "W_MISSING_ENTITY", entity: ruleId, message: `rule "${ruleId}" is not loaded`
            });

            continue;
        }
        noteExcluded(resolved, warnings);
        const rule = resolved.data as Rule;
        const id = ruleId.slice(ruleId.lastIndexOf(".") + 1);
        if (seenActions.has(id)) { continue; }
        seenActions.set(id, {
            id: id,
            name: rule.name,
            activation: "action",
            cost: [],
            ...(options.includeText !== false && rule.summary ? { text: rule.summary } : {}),
            source: { package: resolved.package, entity: ruleId },
            available: true
        });
    }

    // Player-controlled states: declared by actions (Patient Defense) or by features (Rage).
    const toggles = new Map<string, ToggleView>();
    for (const ctx of contexts)
    {
        const e = ctx.effect;
        if ((e.kind !== "add-action") || !e.toggle || toggles.has(e.toggle.state)) { continue; }
        toggles.set(e.toggle.state, {
            state: e.toggle.state,
            name: e.name ?? ctx.feature.data.name,
            ...(e.toggle.expires ? { expires: e.toggle.expires } : {}),
            source: ctx.source
        });
    }
    for (const feature of collected.features)
    {
        const toggle = feature.data.toggle;
        if (!toggle || toggles.has(toggle.state)) { continue; }
        toggles.set(toggle.state, {
            state: toggle.state,
            name: feature.data.name,
            ...(toggle.expires ? { expires: toggle.expires } : {}),
            source: feature.source
        });
    }

    // What the play engine reads from the ruleset, evaluated for this character.
    const evaluateNumber = (formula: string, fallback: number): number =>
    {
        const parsed = parseFormula(formula);
        if (!parsed.ok) { return fallback; }
        try
        {
            const value = evaluateFormula(parsed.ast, graph.environment());

            return typeof value === "number" ? value : fallback;
        }
        catch { return fallback; }
    };
    const hitDicePools = new Map<number, number>();
    for (const cls of classes)
    {
        hitDicePools.set(cls.data.hitDie, (hitDicePools.get(cls.data.hitDie) ?? 0) + cls.levels);
    }
    const hitDice: HitDicePool[] = [...hitDicePools.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([die, total]) => ({ die: die, total: total }));
    const conditionRefs: ConditionRef[] = [];
    for (const resolved of set.entities.values())
    {
        if ((resolved.type !== "condition") || !resolved.active) { continue; }
        const condition = resolved.data as ConditionEntity;
        const levels = Object.keys(condition.levels ?? {}).map(Number);
        conditionRefs.push({
            id: condition.id,
            name: condition.name,
            ...(levels.length > 0 ? { maxLevel: Math.max(...levels) } : {}),
            ...(condition.cumulative !== undefined ? { cumulative: condition.cumulative } : {})
        });
    }
    conditionRefs.sort((a, b) => a.id.localeCompare(b.id));
    const rests = set.ruleset.rests;
    const play: PlayRules = {
        hitDice: hitDice,
        rests: {
            short: {
                hitDice: rests.short.hitDice ?? "spend",
                ...(rests.short.hours !== undefined ? { hours: rests.short.hours } : {})
            },
            long: {
                hitPoints: rests.long.hitPoints ?? "full",
                hitDiceRecovered: rests.long.hitDiceRecovered === undefined ?
                    0 :
                    Math.max(0, Math.floor(evaluateNumber(rests.long.hitDiceRecovered, 0))),
                ...(rests.long.hours !== undefined ? { hours: rests.long.hours } : {}),
                ...(rests.long.conditionLevelsRecovered !== undefined ?
                    { conditionLevelsRecovered: rests.long.conditionLevelsRecovered } :
                    {})
            }
        },
        ...(set.ruleset.concentration ? { concentration: { saveDc: set.ruleset.concentration.saveDc } } : {}),
        ...(set.ruleset.deathSaves ? { deathSaves: set.ruleset.deathSaves } : {}),
        conditions: conditionRefs
    };

    const values: Record<ValuePath, DerivedValue> = {};
    for (const path of graph.paths()) { values[path] = graph.get(path); }
    for (const path of Object.keys(values))
    {
        if (path.startsWith("sense.") && (values[path]!.value !== 0)) { sections.add("senses"); }
    }

    const features: FeatureView[] = collected.features.map((f) => ({
        id: f.id,
        name: f.data.name,
        ...(options.includeText !== false && f.data.text ? { text: f.data.text } : {}),
        origin: f.origin,
        owner: f.owner,
        ...(f.level !== undefined ? { level: f.level } : {}),
        source: f.source
    }));

    const sectionOrder = [
        "identity", "core", "abilities", "saves", "skills", "senses", "combat", "attacks", "actions", "resources",
        "spellcasting", "spells", "features", "equipment", "personality", "conditions", "notes", "credits"
    ];
    // Sections declared by packages sit in the middle band, after Features and before Equipment
    // (docs/08-dynamic-sheet.md), sorted by id; a declared section with no content is left out.
    const custom = [...sections].filter((s) => !sectionOrder.includes(s)).sort();
    const known = sectionOrder.filter((s) => sections.has(s));
    const middle = known.indexOf("equipment");
    const orderedSections = [...known.slice(0, middle), ...custom, ...known.slice(middle)];
    const customSections = custom
        .map((id) => declared.get(id))
        .filter((s) => s !== undefined);

    return {
        meta: {
            characterId: character.id,
            name: character.name,
            ruleset: set.rulesetPackage,
            packages: character.packages,
            formatVersion: 0,
            language: options.language ?? "en"
        },
        level: totalLevel(character),
        classes: (character.choices.classes ?? []).map((c) => ({
            class: c.class,
            ...(c.subclass ? { subclass: c.subclass } : {}),
            levels: c.levels
        })),
        values: values,
        features: features,
        proficiencies: [...col.proficiencies.values()]
            .sort((a, b) => `${a.type}:${a.item}`.localeCompare(`${b.type}:${b.item}`)),
        resources: resources,
        actions: [...seenActions.values()],
        attacks: attacks,
        rollModifiers: rollModifiers,
        defenses: defenses,
        spellcasting: spellcasting,
        spells: spells,
        toggles: [...toggles.values()],
        choices: col.choices,
        sections: orderedSections,
        ...(texts.length > 0 ? { texts: texts } : {}),
        ...(customSections.length > 0 ? { customSections: customSections } : {}),
        play: play,
        warnings: [...set.diagnostics.entries.filter((d) => d.severity !== "info"), ...dedupeExcluded(warnings)]
    };
}

export function explain(sheet: ComputedSheet, path: ValuePath): Provenance
{
    return sheet.values[path]?.provenance ?? [];
}

export type { LocalizedString };
