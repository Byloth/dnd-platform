import { describe, expect, it } from "vitest";

import {
    ABILITIES, ACTIVATION_TYPES, DAMAGE_TYPES, EFFECT_KINDS, ENTITY_TYPES, FORMAT_VERSION, PLAY_EFFECT_KINDS,
    PROFICIENCY_TYPES, SCHEMA_FOR_DIRECTORY, SCHEMA_NAMES, SECTIONS, SKILLS
} from "../src/index.js";
import { createAjv, readSchema, schemaFiles, validatorFor } from "./helpers.js";

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
