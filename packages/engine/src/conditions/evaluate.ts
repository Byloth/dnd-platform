/**
 * Evaluation of the condition language (`when`, `prerequisites`) against
 * the facts of a character. Facts are built by `derive`.
 */

import type { Condition } from "@byloth/dnd-platform-schema";

export interface WieldedWeapon
{
    readonly id: string;
    readonly properties: readonly string[];
    readonly category?: "simple" | "martial";
    readonly ranged: boolean;
    readonly monkWeapon: boolean;
}

export interface Facts
{
    readonly level: number;
    readonly classLevels: Readonly<Record<string, number>>;
    readonly classes: readonly string[];
    readonly species?: string;
    readonly subspecies?: string;
    readonly features: ReadonlySet<string>;
    readonly abilities: Readonly<Record<string, number>>;
    /** `"<type>:<item>"` entries, e.g. `skill:stealth`. */
    readonly proficiencies: ReadonlySet<string>;
    readonly armorCategory: "none" | "light" | "medium" | "heavy";
    readonly armorStrengthUnmet: boolean;
    readonly shield: boolean;
    readonly weapons: readonly WieldedWeapon[];
    readonly conditions: ReadonlySet<string>;
    readonly toggles: ReadonlySet<string>;
    readonly resources: Readonly<Record<string, number>>;
    readonly answers: Readonly<Record<string, readonly string[]>>;
    readonly knownSpells: ReadonlySet<string>;
}

export class ConditionError extends Error { }

interface WeaponFilter {
    readonly property?: string;
    readonly category?: string;
    readonly twoHanded?: boolean;
    readonly unarmed?: boolean;
    readonly monkWeapon?: boolean;
    readonly ranged?: boolean;
    readonly melee?: boolean;
    readonly count?: number;
}

function weaponMatches(weapon: WieldedWeapon, filter: WeaponFilter): boolean
{
    if ((filter.property !== undefined) && !weapon.properties.includes(filter.property)) { return false; }
    if ((filter.category !== undefined) && (weapon.category !== filter.category)) { return false; }
    if ((filter.twoHanded !== undefined) && (weapon.properties.includes("two-handed") !== filter.twoHanded))
    {
        return false;
    }
    if ((filter.monkWeapon !== undefined) && (weapon.monkWeapon !== filter.monkWeapon)) { return false; }
    if ((filter.ranged !== undefined) && (weapon.ranged !== filter.ranged)) { return false; }
    if ((filter.melee !== undefined) && (weapon.ranged === filter.melee)) { return false; }

    return true;
}

function evaluateKey(key: string, value: unknown, facts: Facts): boolean
{
    switch (key)
    {
        case "any": return (value as Condition[]).some((c) => evaluateWhen(c, facts));
        case "all": return (value as Condition[]).every((c) => evaluateWhen(c, facts));
        case "not": return !evaluateWhen(value as Condition, facts);
        case "level":
        {
            const { min, max } = value as { min?: number, max?: number };

            return ((min === undefined) || (facts.level >= min)) && ((max === undefined) || (facts.level <= max));
        }
        case "classLevel":
        {
            const { class: cls, min, max } = value as { class: string, min?: number, max?: number };
            const level = facts.classLevels[cls] ?? facts.classLevels[cls.split(".").pop() ?? cls] ?? 0;

            return ((min === undefined) || (level >= min)) && ((max === undefined) || (level <= max));
        }
        case "hasFeature": return facts.features.has(value as string);
        case "armorCategory": return facts.armorCategory === value;
        case "shield": return facts.shield === value;
        case "wielding":
        {
            const filter = value as WeaponFilter;
            if (filter.unarmed) { return facts.weapons.length === 0; }

            return facts.weapons.some((w) => weaponMatches(w, filter));
        }
        case "wieldingOnly":
        {
            const filter = value as WeaponFilter;
            const wielded = facts.weapons;
            if (filter.unarmed && (wielded.length === 0)) { return true; }
            if (wielded.length === 0) { return false; }
            if ((filter.count !== undefined) && (wielded.length !== filter.count)) { return false; }

            return wielded.every((w) => weaponMatches(w, filter));
        }
        case "armorStrengthUnmet": return facts.armorStrengthUnmet === value;
        case "conditionActive": return facts.conditions.has(value as string);
        case "toggled": return facts.toggles.has(value as string);
        case "resourceAtLeast":
        {
            const { resource, amount } = value as { resource: string, amount: number };

            return (facts.resources[resource] ?? 0) >= amount;
        }
        case "answer":
        {
            const { choice, is } = value as { choice: string, is: string };
            const byKey = Object.entries(facts.answers).find(([k]) => k.endsWith(`#${choice}`))?.[1];
            const answers = facts.answers[choice] ?? byKey ?? [];

            return answers.includes(is);
        }
        case "knowsSpell": return facts.knownSpells.has(value as string);
        case "ability":
        {
            const { ability, min } = value as { ability: string, min: number };

            return (facts.abilities[ability] ?? 0) >= min;
        }
        case "proficient":
        {
            const { type, item } = value as { type: string, item: string };

            return facts.proficiencies.has(`${type}:${item}`);
        }
        case "species": return (facts.species === value) || (facts.subspecies === value);
        case "class": return facts.classes.includes(value as string);
        default: throw new ConditionError(`unknown condition key "${key}"`);
    }
}

/** All keys of the object must hold (AND); `any`, `all` and `not` compose. */
export function evaluateWhen(when: Condition | undefined, facts: Facts): boolean
{
    if (when === undefined) { return true; }

    return Object.entries(when).every(([key, value]) => (value === undefined) || evaluateKey(key, value, facts));
}
