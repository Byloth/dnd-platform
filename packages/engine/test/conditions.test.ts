/** One test per key of the condition language (docs/phase-0/02-content-format.md). */

import { describe, expect, it } from "vitest";

import type { Condition } from "@byloth/dnd-platform-schema";

import { ConditionError, evaluateWhen } from "../src/conditions/evaluate.js";
import type { Facts, WieldedWeapon } from "../src/conditions/evaluate.js";

const dagger: WieldedWeapon = {
    id: "mini.item.dagger", properties: ["finesse", "light"], category: "simple", ranged: false, monkWeapon: true
};
const longsword: WieldedWeapon = {
    id: "mini.item.longsword", properties: ["versatile"], category: "martial", ranged: false, monkWeapon: false
};
const bow: WieldedWeapon = {
    id: "mini.item.bow", properties: ["two-handed"], category: "simple", ranged: true, monkWeapon: false
};
const ANCESTRY = "mini.feature.dragonborn.draconic-ancestry#draconic-ancestry";

function facts(overrides: Partial<Facts> = {}): Facts
{
    return {
        level: 5,
        classLevels: { "mini.class.monk": 3, "monk": 3, "mini.class.rogue": 2, "rogue": 2 },
        classes: ["mini.class.monk", "mini.class.rogue"],
        species: "mini.species.elf",
        subspecies: "mini.species.elf.high-elf",
        features: new Set(["mini.feature.monk.ki"]),
        abilities: { str: 8, dex: 17, con: 14, int: 10, wis: 15, cha: 8 },
        proficiencies: new Set(["skill:stealth", "weapon:simple", "save:dex"]),
        armorCategory: "none",
        armorStrengthUnmet: false,
        shield: false,
        weapons: [dagger],
        conditions: new Set(["mini.condition.prone"]),
        toggles: new Set(["raging"]),
        resources: { ki: 2 },
        answers: { [ANCESTRY]: ["red"], "mini.class.monk#skills": ["stealth"] },
        knownSpells: new Set(["mini.spell.eldritch-blast"]),
        ...overrides
    };
}

interface Case
{
    readonly name: string;
    readonly when: Condition;
    readonly facts?: Partial<Facts>;
    readonly expected: boolean;
}

const heavy = { armorCategory: "heavy" as const };
const two = { weapons: [dagger, longsword] };
const none = { weapons: [] };
const armed = { weapons: [dagger, bow] };
const unmet = { armorStrengthUnmet: true };
const count1 = { wieldingOnly: { melee: true, count: 1 } };
const onlyMonk = { wieldingOnly: { monkWeapon: true } };
const onlyUnarmed = { wieldingOnly: { unarmed: true } };

const cases: readonly Case[] = [
    { name: "level in range", when: { level: { min: 3, max: 6 } }, expected: true },
    { name: "level below min", when: { level: { min: 6 } }, expected: false },
    { name: "level above max", when: { level: { max: 4 } }, expected: false },
    { name: "classLevel by full id", when: { classLevel: { class: "mini.class.monk", min: 3 } }, expected: true },
    { name: "classLevel by short name", when: { classLevel: { class: "monk", min: 4 } }, expected: false },
    { name: "classLevel of an absent class", when: { classLevel: { class: "wizard", min: 1 } }, expected: false },
    { name: "hasFeature present", when: { hasFeature: "mini.feature.monk.ki" }, expected: true },
    { name: "hasFeature absent", when: { hasFeature: "mini.feature.monk.nope" }, expected: false },
    { name: "armorCategory none", when: { armorCategory: "none" }, expected: true },
    { name: "armorCategory heavy while unarmoured", when: { armorCategory: "heavy" }, expected: false },
    { name: "armorCategory heavy while in plate", when: { armorCategory: "heavy" }, facts: heavy, expected: true },
    { name: "shield false", when: { shield: false }, expected: true },
    { name: "shield true", when: { shield: true }, facts: { shield: true }, expected: true },
    { name: "wielding a finesse weapon", when: { wielding: { property: "finesse" } }, expected: true },
    { name: "wielding a martial weapon (none)", when: { wielding: { category: "martial" } }, expected: false },
    { name: "wielding any among several", when: { wielding: { ranged: true } }, facts: armed, expected: true },
    { name: "wielding unarmed (no weapons)", when: { wielding: { unarmed: true } }, facts: none, expected: true },
    { name: "wielding unarmed while armed", when: { wielding: { unarmed: true } }, expected: false },
    { name: "wieldingOnly monk weapons", when: onlyMonk, expected: true },
    { name: "wieldingOnly fails with a non-monk weapon", when: onlyMonk, facts: two, expected: false },
    { name: "wieldingOnly with count 1 (Dueling)", when: count1, expected: true },
    { name: "wieldingOnly count 1 fails with two weapons", when: count1, facts: two, expected: false },
    { name: "wieldingOnly unarmed, no weapons", when: onlyUnarmed, facts: none, expected: true },
    // "Unarmed or wielding only X" (Martial Arts): nothing wielded satisfies any wieldingOnly filter.
    { name: "wieldingOnly filter, no weapons", when: { wieldingOnly: { melee: true } }, facts: none, expected: true },
    { name: "armorStrengthUnmet false", when: { armorStrengthUnmet: false }, expected: true },
    { name: "armorStrengthUnmet true", when: { armorStrengthUnmet: true }, facts: unmet, expected: true },
    { name: "conditionActive present", when: { conditionActive: "mini.condition.prone" }, expected: true },
    { name: "conditionActive absent", when: { conditionActive: "mini.condition.stunned" }, expected: false },
    { name: "toggled on", when: { toggled: "raging" }, expected: true },
    { name: "toggled off", when: { toggled: "frenzy" }, expected: false },
    { name: "resourceAtLeast met", when: { resourceAtLeast: { resource: "ki", amount: 2 } }, expected: true },
    { name: "resourceAtLeast unmet", when: { resourceAtLeast: { resource: "ki", amount: 3 } }, expected: false },
    { name: "resourceAtLeast unknown", when: { resourceAtLeast: { resource: "rage", amount: 1 } }, expected: false },
    { name: "answer by bare choice id", when: { answer: { choice: "draconic-ancestry", is: "red" } }, expected: true },
    { name: "answer by prefixed key", when: { answer: { choice: ANCESTRY, is: "red" } }, expected: true },
    { name: "answer another option", when: { answer: { choice: "draconic-ancestry", is: "blue" } }, expected: false },
    { name: "answer to an unknown choice", when: { answer: { choice: "nope", is: "red" } }, expected: false },
    { name: "knowsSpell known", when: { knowsSpell: "mini.spell.eldritch-blast" }, expected: true },
    { name: "knowsSpell unknown", when: { knowsSpell: "mini.spell.fireball" }, expected: false },
    { name: "ability at least", when: { ability: { ability: "dex", min: 13 } }, expected: true },
    { name: "ability below", when: { ability: { ability: "str", min: 13 } }, expected: false },
    { name: "proficient held", when: { proficient: { type: "skill", item: "stealth" } }, expected: true },
    { name: "proficient missing", when: { proficient: { type: "skill", item: "arcana" } }, expected: false },
    { name: "species matches the species", when: { species: "mini.species.elf" }, expected: true },
    { name: "species matches the subspecies", when: { species: "mini.species.elf.high-elf" }, expected: true },
    { name: "species other", when: { species: "mini.species.dwarf" }, expected: false },
    { name: "class present", when: { class: "mini.class.rogue" }, expected: true },
    { name: "class absent", when: { class: "mini.class.wizard" }, expected: false },
    { name: "any with one true branch", when: { any: [{ level: { min: 20 } }, { shield: false }] }, expected: true },
    { name: "any with no true branch", when: { any: [{ level: { min: 20 } }, { shield: true }] }, expected: false },
    { name: "all with every branch true", when: { all: [{ level: { min: 1 } }, { shield: false }] }, expected: true },
    { name: "all with one false branch", when: { all: [{ level: { min: 1 } }, { shield: true }] }, expected: false },
    { name: "not inverts", when: { not: { shield: true } }, expected: true },
    { name: "not of a true condition", when: { not: { shield: false } }, expected: false },
    { name: "keys are ANDed", when: { armorCategory: "none", shield: false, toggled: "raging" }, expected: true },
    { name: "several keys with one false", when: { armorCategory: "none", shield: true }, expected: false },
    { name: "undefined condition is true", when: undefined as unknown as Condition, expected: true },
    { name: "empty condition is true", when: {}, expected: true }
];

describe("condition language", () =>
{
    it.each(cases.map((c) => [c.name, c]))("%s", (_name, c) =>
    {
        expect(evaluateWhen(c.when, facts(c.facts))).toBe(c.expected);
    });

    it("rejects an unknown key", () =>
    {
        expect(() => evaluateWhen({ bogus: true } as unknown as Condition, facts())).toThrow(ConditionError);
    });

    it("ignores keys whose value is undefined", () =>
    {
        expect(evaluateWhen({ shield: undefined, level: { min: 1 } } as unknown as Condition, facts())).toBe(true);
    });
});
