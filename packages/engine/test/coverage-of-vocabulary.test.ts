/**
 * Meta-test: every effect kind and every condition key of the format has a
 * unit test, so a new kind cannot be added to the schemas without one.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { EFFECT_KINDS, PLAY_EFFECT_KINDS } from "@byloth/dnd-platform-schema";

/** The keys of the condition language (docs/phase-0/02-content-format.md). */
const CONDITION_KEYS = [
    "level", "classLevel", "hasFeature", "armorCategory", "shield", "wielding", "wieldingOnly", "armorStrengthUnmet",
    "conditionActive", "toggled", "resourceAtLeast", "answer", "knowsSpell", "ability", "proficient", "species",
    "class",
    "any", "all", "not"
];

const read = (name: string): string => readFileSync(resolve(import.meta.dirname, name), "utf8");

describe("vocabulary coverage", () =>
{
    const catalogue = read("catalogue.test.ts");
    const conditions = read("conditions.test.ts");
    const effects = read("effects.test.ts");

    it.each([...EFFECT_KINDS])("effect kind %s is exercised by catalogue.test.ts", (kind) =>
    {
        expect(catalogue).toContain(`kind: "${kind}"`);
    });

    it.each(CONDITION_KEYS)("condition key %s is exercised by conditions.test.ts", (key) =>
    {
        expect(conditions).toMatch(new RegExp(`\\b${key}:`));
    });

    it("every play effect kind is dispatched exhaustively", () =>
    {
        expect(PLAY_EFFECT_KINDS.length).toBeGreaterThan(0);
        expect(effects).toContain("PLAY_EFFECT_KINDS");
    });

    it("the condition key list matches the schema", () =>
    {
        const path = resolve(import.meta.dirname, "..", "..", "schema", "schemas", "condition.schema.json");
        const schema = JSON.parse(readFileSync(path, "utf8")) as { properties: Record<string, unknown> };

        expect(Object.keys(schema.properties).sort()).toEqual([...CONDITION_KEYS].sort());
    });
});
