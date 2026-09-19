/**
 * `derive`: character + packages → computed sheet with provenance.
 * See docs/phase-0/03-engine-contract.md for the algorithm.
 */

import { parseFormula } from "@byloth/dnd-platform-schema";
import type {
    Background, Character, Class, Effect, LocalizedString, ProficiencyGrants, Species, Table
} from "@byloth/dnd-platform-schema";

import { evaluateWhen, ConditionError } from "../conditions/evaluate.js";
import type { Facts } from "../conditions/evaluate.js";
import { evaluateFormula, formatValue } from "../formula/evaluate.js";
import type {
    ActionView, ChoiceView, ComputedSheet, ContributionSource, DefenseView, DeriveOptions, DerivedValue, Diagnostic,
    FeatureView, PackageSet, ProficiencyView, Provenance, ResolvedRoll, ResourceView, RollModifierView, ValuePath
} from "../index.js";
import { baseAbilityScores, buildFacts, classLevelsOf, equippedItems, totalLevel } from "./facts.js";
import { collectFeatures } from "./features.js";
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

interface EffectContext
{
    readonly feature: ActiveFeature;
    readonly index: number;
    readonly effect: Effect;
    readonly applied: boolean;
    readonly source: ContributionSource;
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
    for (const cls of classes)
    {
        const source = { package: cls.package, entity: cls.id };
        for (const save of cls.data.savingThrows) { addProficiency(col, "save", save, source); }
        grantsOf(cls.id, cls.data.proficiencies, source, col, answers);
    }
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
    for (const feature of collected.features)
    {
        (feature.data.effects ?? []).forEach((effect) =>
        {
            if (effect.kind !== "grant-proficiency") { return; }
            for (const item of effect.items ?? [])
            {
                const name = item === "self" ? feature.owner : item;
                addProficiency(col, effect.type, name, feature.source, effect.expertise === true);
            }
            if (effect.choose)
            {
                const chosen = registerChoice(col, answers, {
                    key: `${feature.id}#${effect.type}`,
                    owner: feature.id,
                    choice: effect.type,
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
    const baseScores = baseAbilityScores(character);
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
        if ((ctx.effect.kind !== "open-choice") || !ctx.effect.options) { continue; }
        const key = `${ctx.feature.id}#${ctx.effect.choice}`;
        const chosen = registerChoice(col, answers, {
            key: key,
            owner: ctx.feature.id,
            choice: ctx.effect.choice,
            of: ctx.effect.of,
            count: ctx.effect.count ?? 1,
            options: ctx.effect.options.map((o) => o.id)
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
    for (const ctx of contexts)
    {
        if ((ctx.effect.kind === "open-choice") && !ctx.effect.options)
        {
            registerChoice(col, answers, {
                key: `${ctx.feature.id}#${ctx.effect.choice}`,
                owner: ctx.feature.id,
                choice: ctx.effect.choice,
                of: ctx.effect.of,
                count: ctx.effect.count ?? 1,
                options: ctx.effect.from ?? []
            });
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
    const rollModifiers: RollModifierView[] = [];
    const defenses: DefenseView[] = [];
    const sections = new Set<string>(ALWAYS_SECTIONS);
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
                    recharge: e.recharge.map((r) => ({ on: r.on, amount: r.amount })),
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
                if (ctx.applied) { sections.add(e.section); }
                break;
            case "add-section":
                if (ctx.applied) { sections.add(e.section); }
                break;
            case "grant-spellcasting":
                sections.add("spellcasting");
                sections.add("spells");
                break;
            case "grant-spells":
                sections.add("spells");
                break;
            default:
                break;
        }
    }
    if (facts.weapons.length > 0) { sections.add("attacks"); }

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
    const known = sectionOrder.filter((s) => sections.has(s));
    const custom = [...sections].filter((s) => !sectionOrder.includes(s)).sort();
    const orderedSections = [...known, ...custom];

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
        actions: actions,
        rollModifiers: rollModifiers,
        defenses: defenses,
        choices: col.choices,
        sections: orderedSections,
        warnings: [...set.diagnostics.entries.filter((d) => d.severity !== "info"), ...warnings]
    };
}

export function explain(sheet: ComputedSheet, path: ValuePath): Provenance
{
    return sheet.values[path]?.provenance ?? [];
}

export type { LocalizedString };
