/**
 * The derived-value graph: base computations from the ruleset and the
 * character, contributions from effects, lazy evaluation with memoisation,
 * cycle detection, and provenance for every value.
 */

import { parseFormula } from "@byloth/dnd-platform-schema";
import type { Class, Item, LocalizedString, Ruleset, Species, TableDef } from "@byloth/dnd-platform-schema";

import { averageOf, evaluateFormula, formatValue, isDice, parseDiceString } from "../formula/evaluate.js";
import type { DiceExpression, FormulaEnvironment, FormulaValue } from "../formula/evaluate.js";
import type { Contribution, ContributionSource, DerivedValue, Diagnostic, ValuePath } from "../index.js";
import type { Equipment } from "./facts.js";

const ABILITY_NAMES: Record<string, string> = {
    str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma"
};

export interface TableEntry
{
    readonly by: TableDef["by"];
    readonly rows: Readonly<Record<string, number | string | number[] | undefined>>;
    /** Class whose level keys the table when `by` is `classLevel`. */
    readonly ownerClass?: string;
}

export interface PendingContribution
{
    readonly target: ValuePath;
    readonly op: "add" | "set" | "set-formula" | "min" | "max" | "mul";
    readonly value?: number | string;
    readonly formula?: string;
    readonly label: LocalizedString;
    readonly source: ContributionSource;
    readonly applied: boolean;
    /** Class owning the effect, for bare `classLevel` and class tables in its formula. */
    readonly ownerClass?: string;
}

export interface GraphInput
{
    readonly ruleset: Ruleset;
    readonly level: number;
    readonly classLevels: Readonly<Record<string, number>>;
    readonly classes: readonly { readonly id: string, readonly data: Class, readonly levels: number }[];
    readonly baseScores: Readonly<Record<string, number>>;
    /** The player's own adjustment of each score (`choices.abilityScores.bonuses`), already in `baseScores`. */
    readonly abilityAdjustments: Readonly<Record<string, number | undefined>>;
    readonly species?: Species;
    readonly subspecies?: { readonly speed?: Species["speed"], readonly size?: Species["size"] };
    readonly equipment: Equipment;
    readonly proficiencies: ReadonlySet<string>;
    readonly tables: ReadonlyMap<string, TableEntry>;
    readonly contributions: readonly PendingContribution[];
    readonly warnings: Diagnostic[];
    readonly rulesetPackage: string;
}

function label(text: string): LocalizedString
{
    return { en: text };
}

/** Step function: the row with the highest key ≤ `key`; string rows are dice or formulas. */
function stepLookup(entry: TableEntry, key: number, env: FormulaEnvironment): FormulaValue
{
    const keys = Object.keys(entry.rows).map(Number)
        .filter((k) => !Number.isNaN(k) && (k <= key))
        .sort((a, b) => b - a);
    const best = keys[0];
    const raw = best === undefined ? undefined : entry.rows[String(best)];
    if ((raw === undefined) || Array.isArray(raw)) { return 0; }
    if (typeof raw === "number") { return raw; }
    const dice = parseDiceString(raw);
    if (dice) { return dice; }
    const parsed = parseFormula(raw);
    if (!parsed.ok) { throw new Error(`table row "${raw}": ${parsed.message}`); }

    return evaluateFormula(parsed.ast, env);
}

/** Dice results become their average (hit points use averages on the sheet); numbers pass through. */
function toNumber(value: FormulaValue): number
{
    return isDice(value) ? averageOf(value) : value;
}

interface BaseResult { value: FormulaValue | string, contributions: Contribution[] }

export class ValueGraph
{
    private readonly _values = new Map<ValuePath, DerivedValue>();
    private readonly _computing = new Set<ValuePath>();
    private readonly _byTarget = new Map<ValuePath, PendingContribution[]>();

    public constructor(private readonly _input: GraphInput)
    {
        for (const c of _input.contributions)
        {
            this._byTarget.set(c.target, [...(this._byTarget.get(c.target) ?? []), c]);
        }
    }

    /** Every path that has a base computation or a contribution. */
    public paths(): ValuePath[]
    {
        const paths = new Set<ValuePath>([...this._byTarget.keys()]);
        for (const a of this._input.ruleset.abilities)
        {
            for (const prefix of ["ability", "mod", "save", "check"]) { paths.add(`${prefix}.${a}`); }
        }
        for (const s of this._input.ruleset.skills)
        {
            paths.add(`skill.${s.id}`);
            paths.add(`passive.${s.id}`);
        }
        const fixed = [
            "proficiencyBonus", "ac", "hp.max", "initiative", "speed.walk", "attacks.perAction", "jump.long",
            "jump.high", "carry.capacity"
        ];
        for (const p of fixed) { paths.add(p); }
        for (const s of ["climb", "fly", "swim", "burrow"])
        {
            if (this._speedBase(s) !== undefined) { paths.add(`speed.${s}`); }
        }

        return [...paths].filter((p) => !p.startsWith("hp.perLevel")).sort();
    }

    public get(path: ValuePath): DerivedValue
    {
        const cached = this._values.get(path);
        if (cached) { return cached; }
        if (this._computing.has(path))
        {
            this._input.warnings.push({
                severity: "error",
                code: "E_VALUE_CYCLE",
                path: path,
                message: `derived value "${path}" depends on itself`
            });

            return { value: 0, provenance: [] };
        }
        this._computing.add(path);
        const value = this._compute(path);
        this._computing.delete(path);
        this._values.set(path, value);

        return value;
    }

    public number(path: ValuePath): number
    {
        const v = this.get(path).value;

        return typeof v === "number" ? v : 0;
    }

    public environment(ownerClass?: string, extra: Readonly<Record<string, number>> = {}): FormulaEnvironment
    {
        const input = this._input;
        const number = (path: ValuePath): number => this.number(path);
        const environment = (cls?: string): FormulaEnvironment => this.environment(cls);

        return {
            variable: (name) =>
            {
                if (name in extra) { return extra[name]; }
                switch (name)
                {
                    case "level": return input.level;
                    case "proficiencyBonus": return number("proficiencyBonus");
                    case "classLevel": return ownerClass === undefined ? undefined : input.classLevels[ownerClass];
                    case "casterWeight":
                    {
                        if (ownerClass === undefined) { return undefined; }

                        return input.classes.find((c) => c.id === ownerClass)?.data.casterWeight ?? 0;
                    }
                    case "hitDie":
                    {
                        const owner = ownerClass === undefined ?
                            input.classes[0] :
                            input.classes.find((c) => c.id === ownerClass);

                        return owner?.data.hitDie;
                    }
                    case "hitDieCount": return input.level;
                    default: return undefined;
                }
            },
            mod: (ability) => number(`mod.${ability}`),
            score: (ability) => number(`ability.${ability}`),
            classLevel: (name) => input.classLevels[name] ?? 0,
            table: (name, key) =>
            {
                const scoped = ownerClass ? input.tables.get(`${ownerClass.split(".").pop()}.${name}`) : undefined;
                const entry = input.tables.get(name) ?? scoped;
                if (entry === undefined) { throw new Error(`table "${name}" is not defined`); }
                const tableClass = entry.ownerClass ?? ownerClass;
                const byClass = entry.by === "classLevel";
                const lookup = key ?? (byClass ? (input.classLevels[tableClass ?? ""] ?? 0) : input.level);

                return stepLookup(entry, lookup, environment(tableClass));
            }
        };
    }

    private _speedBase(kind: string): number | undefined
    {
        const sub = this._input.subspecies?.speed as Record<string, number | undefined> | undefined;
        const species = this._input.species?.speed as Record<string, number | undefined> | undefined;

        return sub?.[kind] ?? species?.[kind];
    }

    private _base(path: ValuePath): BaseResult
    {
        const rulesetSource: ContributionSource = {
            package: this._input.rulesetPackage,
            entity: this._input.ruleset.id
        };
        const base = (
            value: FormulaValue | string,
            text: string,
            source: ContributionSource = rulesetSource,
            formula?: string
        ): BaseResult => ({
            value: value,
            contributions: [{
                kind: "base",
                value: typeof value === "string" ? value : formatValue(value),
                ...(formula ? { formula: formula } : {}),
                label: label(text),
                source: source,
                applied: true
            }]
        });
        const [head, tail, third] = path.split(".");

        if ((head === "ability") && tail && (third === undefined))
        {
            const total = this._input.baseScores[tail] ?? 10;
            const adjustment = this._input.abilityAdjustments[tail] ?? 0;
            const result = base(total - adjustment, "Base score", { package: "" });
            if (adjustment !== 0)
            {
                result.contributions.push({
                    kind: "add", value: adjustment, label: label("Adjustment"), source: { package: "" }, applied: true
                });
                result.value = total;
            }

            return result;
        }
        if ((head === "ability") && tail && (third === "max")) { return base(20, "Score cap"); }
        if ((head === "mod") && tail)
        {
            const formula = this._input.ruleset.abilityModifier;
            const env = this.environment(undefined, { score: this.number(`ability.${tail}`) });
            const value = this._evaluate(formula, env);

            return base(value, `${ABILITY_NAMES[tail] ?? tail} modifier`, rulesetSource, formula);
        }
        if (path === "proficiencyBonus")
        {
            const entry = this._input.tables.get(this._input.ruleset.proficiencyBonus.table);

            const bonus = entry ? stepLookup(entry, this._input.level, this.environment()) : 2;

            return base(bonus, "Proficiency bonus by level");
        }
        if ((head === "save") && tail && (tail !== "all"))
        {
            const result = base(this.number(`mod.${tail}`), `${ABILITY_NAMES[tail] ?? tail} modifier`);
            if (this._input.proficiencies.has(`save:${tail}`))
            {
                result.contributions.push({
                    kind: "add",
                    value: this.number("proficiencyBonus"),
                    label: label("Proficiency bonus"),
                    source: rulesetSource,
                    applied: true
                });
                result.value = (result.value as number) + this.number("proficiencyBonus");
            }
            const all = this.number("save.all");
            if (all !== 0)
            {
                result.contributions.push({
                    kind: "add",
                    value: all,
                    label: label("Bonus to all saving throws"),
                    source: rulesetSource,
                    applied: true
                });
                result.value = (result.value as number) + all;
            }

            return result;
        }
        if ((head === "skill") && tail)
        {
            const ability = this._input.ruleset.skills.find((s) => s.id === tail)?.ability ?? "dex";
            const result = base(this.number(`mod.${ability}`), `${ABILITY_NAMES[ability] ?? ability} modifier`);
            const expertise = this._input.proficiencies.has(`skill:${tail}:expertise`);
            if (expertise || this._input.proficiencies.has(`skill:${tail}`))
            {
                const bonus = this.number("proficiencyBonus") * (expertise ? 2 : 1);
                result.contributions.push({
                    kind: "add",
                    value: bonus,
                    label: label(expertise ? "Expertise" : "Proficiency bonus"),
                    source: rulesetSource,
                    applied: true
                });
                result.value = (result.value as number) + bonus;
            }

            return result;
        }
        if ((head === "check") && tail && (tail !== "all"))
        {
            const result = base(this.number(`mod.${tail}`), `${ABILITY_NAMES[tail] ?? tail} modifier`);
            const all = this.number("check.all");
            if (all !== 0)
            {
                result.contributions.push({
                    kind: "add",
                    value: all,
                    label: label("Bonus to all ability checks"),
                    source: rulesetSource,
                    applied: true
                });
                result.value = (result.value as number) + all;
            }

            return result;
        }
        if ((head === "passive") && tail)
        {
            const result = base(10, "Base");
            result.contributions.push({
                kind: "add",
                value: this.number(`skill.${tail}`),
                label: label(`${tail} bonus`),
                source: rulesetSource,
                applied: true
            });
            result.value = 10 + this.number(`skill.${tail}`);

            return result;
        }
        if (path === "initiative")
        {
            const result = base(this.number("mod.dex"), "Dexterity modifier");
            const all = this.number("check.all");
            if (all !== 0)
            {
                result.contributions.push({
                    kind: "add",
                    value: all,
                    label: label("Bonus to all ability checks"),
                    source: rulesetSource,
                    applied: true
                });
                result.value = (result.value as number) + all;
            }

            return result;
        }
        if (path === "ac") { return this._armorClass(rulesetSource); }
        if (path === "hp.max") { return this._hitPoints(rulesetSource); }
        if ((head === "speed") && tail)
        {
            const speed = this._speedBase(tail);
            if (speed !== undefined)
            {
                const species = this._input.species;

                return base(speed, "Species speed", { package: "", ...(species ? { entity: species.id } : {}) });
            }

            return base(tail === "walk" ? 30 : 0, tail === "walk" ? "Default speed" : "None");
        }
        if (path === "attacks.perAction") { return base(1, "One attack per Attack action"); }
        if (path === "jump.long") { return base(this.number("ability.str"), "Strength score in feet"); }
        if (path === "jump.high") { return base(3 + this.number("mod.str"), "3 + Strength modifier"); }
        if (path === "carry.capacity") { return base(this.number("ability.str") * 15, "Strength score × 15"); }
        if (path === "size")
        {
            const size = this._input.subspecies?.size ?? this._input.species?.size ?? "medium";

            return base(size, "Species size", { package: "" });
        }

        return base(0, "None");
    }

    private _armorClass(rulesetSource: ContributionSource): BaseResult
    {
        const contributions: Contribution[] = [];
        const armor = this._input.equipment.armor;
        let value: number;
        if (armor?.item.ac?.base !== undefined)
        {
            const item: Item = armor.item;
            value = item.ac?.base ?? 10;
            contributions.push({
                kind: "base", value: value, label: item.name, source: { package: "", entity: armor.id }, applied: true
            });
            if (item.ac?.addDex !== false)
            {
                const dex = Math.min(this.number("mod.dex"), item.ac?.dexMax ?? Number.POSITIVE_INFINITY);
                contributions.push({
                    kind: "add", value: dex, label: label("Dexterity modifier"), source: rulesetSource, applied: true
                });
                value += dex;
            }
        }
        else
        {
            value = 10 + this.number("mod.dex");
            contributions.push({ kind: "base", value: 10, label: label("Base"), source: rulesetSource, applied: true });
            contributions.push({
                kind: "add",
                value: this.number("mod.dex"),
                label: label("Dexterity modifier"),
                source: rulesetSource,
                applied: true
            });
        }
        const shield = this._input.equipment.shield;
        if (shield?.item.ac?.bonus !== undefined)
        {
            contributions.push({
                kind: "add",
                value: shield.item.ac.bonus,
                label: shield.item.name,
                source: { package: "", entity: shield.id },
                applied: true
            });
            value += shield.item.ac.bonus;
        }

        return { value: value, contributions: contributions };
    }

    private _hitPoints(rulesetSource: ContributionSource): BaseResult
    {
        const contributions: Contribution[] = [];
        let total = 0;
        this._input.classes.forEach((cls, index) =>
        {
            const env = this.environment(cls.id);
            const perLevel = toNumber(this._evaluate(this._input.ruleset.hitPoints.perLevel, env));
            const levels = index === 0 ? cls.levels - 1 : cls.levels;
            if (index === 0)
            {
                const first = toNumber(this._evaluate(this._input.ruleset.hitPoints.firstLevel, env));
                contributions.push({
                    kind: "base",
                    value: first,
                    formula: this._input.ruleset.hitPoints.firstLevel,
                    label: label(`Level 1 (${cls.data.name["en"] ?? cls.id})`),
                    source: rulesetSource,
                    applied: true
                });
                total += first;
            }
            if (levels > 0)
            {
                const plural = levels > 1 ? "s" : "";
                contributions.push({
                    kind: "add",
                    value: perLevel * levels,
                    formula: `${levels} × (${this._input.ruleset.hitPoints.perLevel})`,
                    label: label(`${levels} more level${plural} (${cls.data.name["en"] ?? cls.id})`),
                    source: rulesetSource,
                    applied: true
                });
                total += perLevel * levels;
            }
        });
        for (const c of this._byTarget.get("hp.perLevel") ?? [])
        {
            const per = typeof c.value === "number" ? c.value : 0;
            const classLevels = c.ownerClass !== undefined ? this._input.classLevels[c.ownerClass] : undefined;
            const levels = classLevels ?? this._input.level;
            const scope = c.ownerClass !== undefined ? `${c.ownerClass.split(".").pop()} level` : "level";
            const value = per * levels;
            contributions.push({
                kind: "add",
                value: value,
                formula: `${per} × ${scope}`,
                label: c.label,
                source: c.source,
                applied: c.applied
            });
            if (c.applied) { total += value; }
        }

        return { value: total, contributions: contributions };
    }

    /** Evaluate a formula in the context of a class (for tables and bare classLevel). */
    public evaluate(formula: string, ownerClass?: string): FormulaValue
    {
        return this._evaluate(formula, this.environment(ownerClass));
    }

    private _evaluate(formula: string, env: FormulaEnvironment): FormulaValue
    {
        const parsed = parseFormula(formula);
        if (!parsed.ok)
        {
            this._input.warnings.push({
                severity: "error", code: "E_FORMULA", message: `${formula}: ${parsed.message}`
            });

            return 0;
        }
        try
        {
            return evaluateFormula(parsed.ast, env);
        }
        catch (error)
        {
            this._input.warnings.push({
                severity: "error", code: "E_FORMULA", message: `${formula}: ${(error as Error).message}`
            });

            return 0;
        }
    }

    private _compute(path: ValuePath): DerivedValue
    {
        const { value: baseValue, contributions } = this._base(path);
        const pending = (this._byTarget.get(path) ?? []).filter((c) => c.op !== undefined);
        const order = { "set-formula": 0, "set": 0, "mul": 1, "add": 2, "min": 3, "max": 3 } as const;
        const sorted = [...pending]
            .map((c, i) => ({ c, i }))
            .sort((a, b) => (order[a.c.op] - order[b.c.op]) || (a.i - b.i));

        let numeric: number | undefined = typeof baseValue === "number" ? baseValue : undefined;
        const baseDice = (typeof baseValue !== "string") && isDice(baseValue);
        let dice: DiceExpression | undefined = baseDice ? baseValue : undefined;
        let text: string | undefined = typeof baseValue === "string" ? baseValue : undefined;

        for (const { c } of sorted)
        {
            let v: FormulaValue | string | undefined;
            if (c.formula !== undefined) { v = this._evaluate(c.formula, this.environment(c.ownerClass)); }
            else if (typeof c.value === "string")
            {
                v = c.value === "unlimited" ? Number.POSITIVE_INFINITY : (parseDiceString(c.value) ?? c.value);
            }
            else { v = c.value; }
            const shown: number | string = (v === undefined) ? 0 : (typeof v === "string" ? v : formatValue(v));
            contributions.push({
                kind: c.op,
                value: shown,
                ...(c.formula ? { formula: c.formula } : {}),
                label: c.label,
                source: c.source,
                applied: c.applied
            });
            if (!c.applied || (v === undefined)) { continue; }
            if (typeof v === "string")
            {
                text = v;

                continue;
            }
            if (isDice(v))
            {
                if ((c.op === "add") || (c.op === "set") || (c.op === "set-formula"))
                {
                    const previous = (c.op === "add") ? dice : undefined;
                    dice = previous ? { dice: [...previous.dice, ...v.dice], bonus: previous.bonus + v.bonus } : v;
                    if (c.op !== "add") { numeric = 0; }
                }

                continue;
            }
            switch (c.op)
            {
                case "set":
                case "set-formula": numeric = v; break;
                case "mul": numeric = (numeric ?? 0) * v; break;
                case "add": numeric = (numeric ?? 0) + v; break;
                case "min": numeric = Math.max(numeric ?? 0, v); break; // "at least v"
                default: break;
            }
        }
        // `min`: the value is at least v (Barkskin "AC can't be less than 16"); `max`: the value is at most… is unused;
        // per 02, `max` clamps upward for senses (Darkvision 60 vs 120): value = max(current, v).
        for (const { c } of sorted)
        {
            if (!c.applied || (c.op !== "max") || (typeof c.value !== "number")) { continue; }
            numeric = Math.max(numeric ?? 0, c.value);
        }

        let value: number | string;
        if (text !== undefined) { value = text; }
        else if (dice)
        {
            const total = { dice: dice.dice, bonus: dice.bonus + (numeric ?? 0) };
            value = formatValue(total);
        }
        else { value = numeric ?? 0; }

        return { value: value, provenance: contributions };
    }
}
