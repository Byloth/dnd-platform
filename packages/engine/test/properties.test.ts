/**
 * Property-style tests of the engine's public API (docs/phase-0/04-testing-strategy.md, level 4).
 *
 * Package sources are read from the fixture directories by the loader; the
 * loading properties (patches, dependencies, duplicates, pins) are the
 * loader's tests, canonical JSON the schema package's.
 */

import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { Character } from "@byloth/dnd-platform-schema";

import { stableStringify } from "@byloth/dnd-platform-schema";
import { loadPackages } from "@byloth/dnd-platform-loader";
import { derive, explain } from "../src/index.js";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import { readPackage, seeded, shuffled } from "./helpers.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "packages");

// ---- fixtures ------------------------------------------------------------------

const srd51 = readPackage(join(FIXTURES, "srd51-excerpt"));
const feline = readPackage(join(FIXTURES, "homebrew-feline"));
const sources: readonly PackageSource[] = [srd51, feline];

const character: Character = {
    formatVersion: 0,
    id: "properties-monk",
    name: "Properties Monk",
    ruleset: { id: "srd51", version: srd51.manifest.version },
    packages: [
        { id: "srd51", version: srd51.manifest.version },
        { id: "homebrew.byloth", version: feline.manifest.version }
    ],
    choices: {
        species: "homebrew.byloth.species.feline",
        subspecies: "homebrew.byloth.species.feline.puma",
        classes: [{ class: "srd51.class.monk", levels: 3 }],
        abilityScores: { method: "manual", base: { str: 11, dex: 17, con: 14, int: 8, wis: 15, cha: 8 } },
        answers: { "srd51.class.monk#skills": ["stealth", "acrobatics"] }
    },
    state: {
        hp: { current: 24, temporary: 0 },
        hitDice: { spent: 0 },
        resources: { ki: 3 },
        conditions: [],
        deathSaves: { successes: 0, failures: 0 },
        inspiration: false
    }
};

function deriveCanonical(inputs: readonly PackageSource[]): string
{
    const set = loadPackages(inputs);

    expect(set.diagnostics.entries.filter((d) => d.severity === "error")).toEqual([]);

    return stableStringify(derive(character, set));
}

// ---- tests -----------------------------------------------------------------------

describe("engine properties", () =>
{
    it("derive is idempotent", () =>
    {
        expect(deriveCanonical(sources)).toBe(deriveCanonical(sources));
    });

    it("output does not depend on the order of sources or of their entities", () =>
    {
        const reference = deriveCanonical(sources);
        const random = seeded(42);
        const permutations: readonly (readonly PackageSource[])[] = [[srd51, feline], [feline, srd51]];

        for (const permutation of permutations)
        {
            for (let round = 0; round < 3; round += 1)
            {
                const reordered = permutation.map((source) => ({
                    ...source,
                    entities: shuffled(source.entities, random)
                }));

                expect(deriveCanonical(reordered)).toBe(reference);
            }
        }
    });

    it("explain returns the provenance stored in the sheet", () =>
    {
        const sheet = derive(character, loadPackages(sources));

        expect(explain(sheet, "ac")).toEqual(sheet.values["ac"]?.provenance);
        expect(sheet.values["ac"]?.provenance.length).toBeGreaterThan(0);
    });
});
