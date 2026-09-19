/**
 * Property-style tests of the engine's public API (docs/phase-0/04-testing-strategy.md, level 4).
 *
 * Package sources are built from the fixture directories with a local reader
 * that mirrors packages/cli/src/io/read-package.ts, so the engine package
 * keeps zero runtime dependencies while its tests read the disk.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { ENTITY_TYPE_FOR_DIRECTORY } from "@byloth/dnd-platform-schema";
import type { Character, EntityType, PackageManifest, Ruleset } from "@byloth/dnd-platform-schema";

import { canonicalize, derive, explain, loadPackages, stableStringify } from "../src/index.js";
import type { PackageSource, SourceEntity } from "../src/index.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "packages");

// ---- helpers -------------------------------------------------------------------

function* walk(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* walk(path); }
        else if (/\.ya?ml$/.test(entry)) { yield path; }
    }
}

function readYaml(path: string): unknown
{
    return parse(readFileSync(path, "utf8")) as unknown;
}

function readPackage(dir: string): PackageSource
{
    const manifest = readYaml(join(dir, "package.yaml")) as PackageManifest;
    const rulesetPath = join(dir, "ruleset.yaml");
    const entities: SourceEntity[] = [];

    for (const directory of readdirSync(dir).sort())
    {
        const path = join(dir, directory);
        if (!statSync(path).isDirectory()) { continue; }

        if (directory === "translations")
        {
            for (const file of walk(path))
            {
                const [language] = relative(path, file).split("/");
                const id = basename(file).replace(/\.ya?ml$/, "");
                entities.push({
                    type: "translation",
                    id: id,
                    data: { language: language, strings: readYaml(file) },
                    file: relative(dir, file)
                });
            }

            continue;
        }

        const type = (ENTITY_TYPE_FOR_DIRECTORY as Record<string, EntityType | undefined>)[directory];
        if (type === undefined) { continue; }

        for (const file of walk(path))
        {
            const data = readYaml(file) as { id: string };
            entities.push({ type: type, id: data.id, data: data, file: relative(dir, file) });
        }
    }

    return {
        manifest: manifest,
        ...(existsSync(rulesetPath) ? { ruleset: readYaml(rulesetPath) as Ruleset } : {}),
        entities: entities
    };
}

/** Deterministic pseudo-random generator (mulberry32), so shuffles are reproducible. */
function seeded(seed: number): () => number
{
    let state = seed >>> 0;

    return () =>
    {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffled<T>(items: readonly T[], random: () => number): T[]
{
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1)
    {
        const other = Math.floor(random() * (index + 1));
        [copy[index], copy[other]] = [copy[other]!, copy[index]!];
    }

    return copy;
}

interface Dependency { readonly id: string, readonly version: string }

function makeManifest(id: string, kind: "base" | "extension", dependencies: readonly Dependency[]): PackageManifest
{
    return {
        formatVersion: 0,
        id: id,
        name: { en: id },
        version: "0.1.0",
        kind: kind,
        defaultLanguage: "en",
        languages: ["en"],
        visibility: "public",
        redistributable: true,
        dependencies: [...dependencies],
        sources: [{ id: id, title: id, license: "CC0", attribution: "test" }]

    } as PackageManifest;
}

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

    it("canonicalize sorts object keys recursively and keeps array order", () =>
    {
        const value = { b: [3, { z: 1, a: 2 }, 1], a: { y: null, x: "s" } };

        const expected = "{\"a\":{\"x\":\"s\",\"y\":null},\"b\":[3,{\"a\":2,\"z\":1},1]}";

        expect(JSON.stringify(canonicalize(value))).toBe(expected);
        expect(stableStringify(value)).toBe(stableStringify({ a: { x: "s", y: null }, b: [3, { a: 2, z: 1 }, 1] }));
    });

    it("patches are applied in dependency order and recorded in patchedBy", () =>
    {
        const patch: PackageSource = {
            manifest: makeManifest("patchtest", "extension", [{ id: "srd51", version: "^0.1.0" }]),
            entities: [{
                type: "patch",
                id: "patchtest.patch.monk-text",
                data: { id: "patchtest.patch.monk-text", target: "srd51.class.monk", set: { "text.en": "Patched." } }
            }]
        };
        const set = loadPackages([...sources, patch]);
        const monk = set.entities.get("srd51.class.monk");

        expect(set.diagnostics.entries.filter((d) => d.severity === "error")).toEqual([]);
        expect(monk?.patchedBy).toContain("patchtest.patch.monk-text");
        expect((monk?.data as { text: { en: string } }).text.en).toBe("Patched.");
    });

    it("reports a missing dependency", () =>
    {
        const orphan: PackageSource = {
            manifest: makeManifest("orphan", "extension", [{ id: "nope", version: "^1.0.0" }]),
            entities: []
        };
        const set = loadPackages([srd51, orphan]);

        expect(set.diagnostics.entries.map((d) => d.code)).toContain("E_MISSING_DEPENDENCY");
    });

    it("reports two base packages", () =>
    {
        const second: PackageSource = {
            manifest: makeManifest("otherbase", "base", []),
            ruleset: srd51.ruleset!,
            entities: []
        };
        const set = loadPackages([srd51, second]);

        expect(set.diagnostics.entries.map((d) => d.code)).toContain("E_MULTIPLE_BASE");
    });

    it("reports a duplicate entity id across packages", () =>
    {
        const shortsword = srd51.entities.find((entity) => entity.id === "srd51.item.shortsword")!;
        const duplicate: PackageSource = {
            manifest: makeManifest("dup", "extension", [{ id: "srd51", version: "^0.1.0" }]),
            entities: [{ ...shortsword }]
        };
        const set = loadPackages([srd51, duplicate]);

        expect(set.diagnostics.entries.map((d) => d.code)).toContain("E_DUPLICATE_ID");
    });

    it("warns on a version pin mismatch", () =>
    {
        const set = loadPackages(sources, { pins: { srd51: "9.9.9" } });

        expect(set.diagnostics.entries.map((d) => d.code)).toContain("W_VERSION_MISMATCH");
        expect(set.diagnostics.ok).toBe(true);
    });

    it("explain returns the provenance stored in the sheet", () =>
    {
        const sheet = derive(character, loadPackages(sources));

        expect(explain(sheet, "ac")).toEqual(sheet.values["ac"]?.provenance);
        expect(sheet.values["ac"]?.provenance.length).toBeGreaterThan(0);
    });
});
