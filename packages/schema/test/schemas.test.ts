import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import {
    ABILITIES, ACTIVATION_TYPES, DAMAGE_TYPES, EFFECT_KINDS, ENTITY_TYPES, FORMAT_VERSION, PLAY_EFFECT_KINDS,
    PROFICIENCY_TYPES, SCHEMA_FOR_DIRECTORY, SCHEMA_NAMES, SECTIONS, SKILLS
} from "../src/index.js";
import { createAjv, readSchema, schemaFiles, validatorFor } from "./helpers.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

describe("schema files", () =>
{
    it("pins the format version", () =>
    {
        expect(FORMAT_VERSION).toBe(0);
    });

    it("lists exactly the schema files on disk", () =>
    {
        expect([...SCHEMA_NAMES].sort()).toEqual(schemaFiles());
    });

    it("every schema compiles with Ajv 2020 in strict mode", () =>
    {
        const ajv = createAjv();
        for (const name of schemaFiles()) { expect(() => validatorFor(ajv, name), name).not.toThrow(); }
    });

    it("maps every content directory to an existing schema", () =>
    {
        for (const schema of Object.values(SCHEMA_FOR_DIRECTORY)) { expect(SCHEMA_NAMES).toContain(schema); }
    });
});

describe("enumerations match common.schema.json", () =>
{
    const defs = readSchema("common")["$defs"] as Record<string, { enum?: string[] }>;
    const cases: [string, readonly string[]][] = [
        ["ability", ABILITIES],
        ["skill", SKILLS],
        ["damageType", DAMAGE_TYPES],
        ["activation", ACTIVATION_TYPES],
        ["proficiencyType", PROFICIENCY_TYPES],
        ["section", SECTIONS],
        ["entityType", ENTITY_TYPES],
        ["effectKind", EFFECT_KINDS],
        ["playEffectKind", PLAY_EFFECT_KINDS]
    ];

    it.each(cases)("%s", (def, constants) =>
    {
        expect(defs[def]?.enum).toEqual([...constants]);
    });

    it("declares one effect definition per kind", () =>
    {
        const effect = readSchema("effect")["$defs"] as Record<string, unknown>;

        expect(Object.keys(effect).sort()).toEqual([...EFFECT_KINDS].sort());
    });

    it("declares one play-effect definition per kind", () =>
    {
        const playEffect = readSchema("play-effect")["$defs"] as Record<string, unknown>;

        expect(Object.keys(playEffect).sort()).toEqual([...PLAY_EFFECT_KINDS].sort());
    });
});

describe("additive v0 extensions of M1.4 (docs/phase-1/04-character-creation.md)", () =>
{
    const ajv = createAjv();
    const read = (path: string): Record<string, unknown> =>
        parse(readFileSync(resolve(ROOT, path), "utf8")) as Record<string, unknown>;
    const ruleset = read("packages/content/srd51/ruleset.yaml");
    const pack = read("packages/content/srd51/items/explorers-pack.yaml");
    const character = read("fixtures/characters/cleric-l5/character.yaml");
    const state = character["state"] as Record<string, unknown>;

    it("a ruleset declares the standard array and point buy", () =>
    {
        const validate = validatorFor(ajv, "ruleset");
        const pointBuy = { budget: 27, costs: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 } };

        expect(validate({ ...ruleset, abilityScores: { standardArray: [15, 14, 13, 12, 10, 8], pointBuy: pointBuy } }))
            .toBe(true);
        expect(validate({ ...ruleset, abilityScores: { pointBuy: { budget: 27, costs: { eight: 0 } } } })).toBe(false);
    });

    it("an item lists what a pack holds", () =>
    {
        const validate = validatorFor(ajv, "item");

        const contents = [{ item: "srd51.item.backpack" }, { item: "srd51.item.torch", quantity: 10 }];

        expect(validate({ ...pack, contents: contents })).toBe(true);
        expect(validate({ ...pack, contents: [{ item: "srd51.item.torch", quantity: 0 }] })).toBe(false);
    });

    it("a character carries coins by their full names", () =>
    {
        const validate = validatorFor(ajv, "character");

        expect(validate({ ...character, state: { ...state, currency: { gold: 15, silver: 4 } } })).toBe(true);
        expect(validate({ ...character, state: { ...state, currency: { gp: 15 } } })).toBe(false);
    });
});
