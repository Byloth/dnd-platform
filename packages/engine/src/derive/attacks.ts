/**
 * Attack rows: one per equipped weapon (plus the versatile two-handed row),
 * one unarmed strike, shaped by the `modify-attacks` effects that match.
 */

import type { LocalizedString, ModifyAttacks } from "@byloth/dnd-platform-schema";

import { formatValue, parseDiceString } from "../formula/evaluate.js";
import type { AttackView, Contribution, ContributionSource, DerivedValue, ExtraDamageView } from "../index.js";
import type { Equipment } from "./facts.js";
import type { ValueGraph } from "./values.js";

export interface AttackModifier
{
    readonly effect: ModifyAttacks;
    readonly applied: boolean;
    readonly source: ContributionSource;
    readonly label: LocalizedString;
    readonly ownerClass?: string;
}

interface Row
{
    readonly id: string;
    readonly name: LocalizedString;
    readonly item?: string;
    readonly unarmed: boolean;
    readonly ranged: boolean;
    readonly properties: readonly string[];
    readonly category?: "simple" | "martial";
    readonly monkWeapon: boolean;
    readonly dice: string;
    readonly damageType: string;
    readonly proficient: boolean;
}

const ABILITY_NAMES: Record<string, string> = {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Intelligence",
    wis: "Wisdom",
    cha: "Charisma"
};

function matches(row: Row, filter: ModifyAttacks["filter"]): boolean
{
    if (filter === undefined) { return true; }
    if ((filter.unarmed !== undefined) && (row.unarmed !== filter.unarmed)) { return false; }
    if ((filter.item !== undefined) && (row.item !== filter.item)) { return false; }
    if ((filter.property !== undefined) && !row.properties.includes(filter.property)) { return false; }
    if ((filter.category !== undefined) && (row.category !== filter.category)) { return false; }
    if ((filter.ranged !== undefined) && (row.ranged !== filter.ranged)) { return false; }
    if ((filter.melee !== undefined) && (row.ranged === filter.melee)) { return false; }
    if ((filter.monkWeapon !== undefined) && (row.monkWeapon !== filter.monkWeapon)) { return false; }

    return true;
}

function weaponRows(equipment: Equipment, proficiencies: ReadonlySet<string>): Row[]
{
    const rows: Row[] = [];
    for (const { id, item } of equipment.weapons)
    {
        const properties = item.properties ?? [];
        const category = (item.category === "simple") || (item.category === "martial") ? item.category : undefined;
        const shortId = id.split(".").pop() ?? id;
        const proficient = proficiencies.has(`weapon:${shortId}`) ||
            proficiencies.has(`weapon:${id}`) ||
            ((category !== undefined) && proficiencies.has(`weapon:${category}`));
        const base: Row = {
            id: shortId,
            name: item.name,
            item: id,
            unarmed: false,
            ranged: item.ranged === true,
            properties: properties,
            ...(category ? { category: category } : {}),
            monkWeapon: item.monkWeapon === true,
            dice: item.damage ?? "0d0",
            damageType: item.damageType ?? "bludgeoning",
            proficient: proficient
        };
        rows.push(base);
        if (item.versatile)
        {
            rows.push({
                ...base,
                id: `${base.id}-two-handed`,
                name: { en: `${item.name["en"] ?? base.id} (two-handed)` },
                dice: item.versatile
            });
        }
    }

    return rows;
}

const UNARMED: Row = {
    id: "unarmed-strike",
    name: { en: "Unarmed strike" },
    unarmed: true,
    ranged: false,
    properties: [],
    monkWeapon: false,
    dice: "1",
    damageType: "bludgeoning",
    proficient: true
};

function numeric(value: number | string | undefined): number
{
    if (value === undefined) { return 0; }
    if (typeof value === "number") { return value; }
    if (parseDiceString(value)) { return 0; }

    return Number(value) || 0;
}

function total(list: readonly Contribution[]): number
{
    return list
        .filter((c) => c.applied)
        .reduce((sum, c) => sum + (typeof c.value === "number" ? c.value : 0), 0);
}

function damageText(dice: string, bonus: number): string
{
    if (dice === "1") { return String(1 + bonus); }
    if (bonus === 0) { return dice; }

    return bonus > 0 ? `${dice} + ${bonus}` : `${dice} - ${-bonus}`;
}

function contribution(
    kind: "base" | "add",
    value: number,
    label: LocalizedString,
    source: ContributionSource,
    applied: boolean
): Contribution
{
    return { kind: kind, value: value, label: label, source: source, applied: applied };
}

function abilityOf(row: Row, graph: ValueGraph, applied: readonly AttackModifier[]): string
{
    let ability = row.ranged ? "dex" : "str";
    const finesse = row.properties.includes("finesse");
    if (finesse && (graph.number("mod.dex") > graph.number("mod.str"))) { ability = "dex"; }
    for (const m of applied)
    {
        if (m.effect.set.ability) { ability = m.effect.set.ability; }
    }

    return ability;
}

function resolvedDie(die: string, graph: ValueGraph, ownerClass: string | undefined): string
{
    const parsed = parseDiceString(die);
    if (parsed) { return formatValue(parsed) as string; }
    try
    {
        return String(formatValue(graph.evaluate(die, ownerClass)));
    }
    catch
    {
        return die;
    }
}

function assembleRow(
    row: Row,
    graph: ValueGraph,
    modifiers: readonly AttackModifier[],
    rulesetSource: ContributionSource
): AttackView
{
    const applicable = modifiers.filter((m) => matches(row, m.effect.filter));
    const applied = applicable.filter((m) => m.applied);
    const ability = abilityOf(row, graph, applied);
    const mod = graph.number(`mod.${ability}`);
    const prof = graph.number("proficiencyBonus");
    const kind = row.ranged ? "ranged" : "melee";
    const modLabel: LocalizedString = { en: `${ABILITY_NAMES[ability] ?? ability} modifier` };
    const attack: Contribution[] = [
        contribution("base", mod, modLabel, rulesetSource, true),
        contribution("add", prof, { en: "Proficiency bonus" }, rulesetSource, row.proficient)
    ];
    const damage: Contribution[] = [contribution("base", mod, modLabel, rulesetSource, true)];
    const globalAttack = graph.number(`attack.${kind}.bonus`);
    const globalDamage = graph.number(`damage.${kind}.bonus`);
    if (globalAttack !== 0)
    {
        attack.push(contribution("add", globalAttack, { en: `Bonus to ${kind} attacks` }, rulesetSource, true));
    }
    if (globalDamage !== 0)
    {
        damage.push(contribution("add", globalDamage, { en: `Bonus to ${kind} damage` }, rulesetSource, true));
    }

    let dice = row.dice;
    let damageType = row.damageType;
    let magical = false;
    let critRange = 20;
    const extraDamage: ExtraDamageView[] = [];
    for (const m of applicable)
    {
        const set = m.effect.set;
        if (set.attackBonus !== undefined)
        {
            attack.push(contribution("add", numeric(set.attackBonus), m.label, m.source, m.applied));
        }
        if (set.damageBonus !== undefined)
        {
            damage.push(contribution("add", numeric(set.damageBonus), m.label, m.source, m.applied));
        }
        if (!m.applied) { continue; }
        if (set.damageDie !== undefined) { dice = resolvedDie(set.damageDie, graph, m.ownerClass); }
        if (set.damageType !== undefined) { damageType = set.damageType; }
        if (set.magical) { magical = true; }
        if (set.critRange !== undefined) { critRange = Math.min(critRange, set.critRange); }
        if (set.extraDamage)
        {
            extraDamage.push({
                ...(set.extraDamage.dice ? { dice: set.extraDamage.dice } : {}),
                ...(set.extraDamage.formula ? { formula: set.extraDamage.formula } : {}),
                ...(set.extraDamage.damageType ? { damageType: set.extraDamage.damageType } : {}),
                source: m.source
            });
        }
    }
    const attackBonus: DerivedValue = { value: total(attack), provenance: attack };
    const damageBonus: DerivedValue = { value: total(damage), provenance: damage };

    return {
        id: row.id,
        name: row.name,
        ...(row.item ? { item: row.item } : {}),
        unarmed: row.unarmed,
        ranged: row.ranged,
        ability: ability,
        proficient: row.proficient,
        attackBonus: attackBonus,
        damage: damageText(dice, damageBonus.value as number),
        damageDice: dice,
        damageBonus: damageBonus,
        damageType: damageType,
        magical: magical,
        critRange: critRange,
        extraDamage: extraDamage
    };
}

export function assembleAttacks(
    equipment: Equipment,
    proficiencies: ReadonlySet<string>,
    graph: ValueGraph,
    modifiers: readonly AttackModifier[],
    rulesetSource: ContributionSource
): AttackView[]
{
    const rows: Row[] = [...weaponRows(equipment, proficiencies), UNARMED];

    return rows.map((row) => assembleRow(row, graph, modifiers, rulesetSource));
}
