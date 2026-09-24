/**
 * `useEngine` (docs/phase-1/01-web-application.md): package sets memoised per versions and pins, sheets per
 * character document, versions and language; anything else recomputes. A derivation leaves its performance
 * measure (docs/phase-1/07-testing-accessibility-performance.md).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";
import { beforeEach, describe, expect, it } from "vitest";

import type { Character } from "@byloth/dnd-platform-engine";
import type { PackageSource } from "@byloth/dnd-platform-loader";

import { DERIVE_MEASURE, useEngine } from "@/composables/engine";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const SRD = JSON.parse(readFileSync(resolve(ROOT, "build", "content", "srd51.json"), "utf8")) as PackageSource;
const CLERIC_PATH = resolve(ROOT, "fixtures", "characters", "cleric-l5", "character.yaml");
const CLERIC = parse(readFileSync(CLERIC_PATH, "utf8")) as Character;
const CASTER_PATH = resolve(ROOT, "fixtures", "characters", "perf-caster-l20", "character.yaml");
const CASTER = parse(readFileSync(CASTER_PATH, "utf8")) as Character;

// On a laptop; the reference phone is Lighthouse's job. A soft overrun is worth a note, not a failure,
// as in packages/cli/test/performance.test.ts.
const SOFT_MS = 100;
const HARD_MS = 500;

beforeEach(() =>
{
    useEngine().clear();
});

describe("useEngine", () =>
{
    it("serves the same sheet for the same character, versions and language", () =>
    {
        const engine = useEngine();
        const first = engine.sheet(CLERIC, [SRD], { language: "en" });

        expect(engine.sheet(structuredClone(CLERIC), [SRD], { language: "en" })).toBe(first);
        expect(engine.stats()).toEqual({ packageSets: 1, sheets: 1 });
    });

    it("recomputes the sheet, not the package set, when the character or the language changes", () =>
    {
        const engine = useEngine();
        const first = engine.sheet(CLERIC, [SRD], { language: "en" });

        const renamed = engine.sheet({ ...CLERIC, name: "Another cleric" }, [SRD], { language: "en" });
        const italian = engine.sheet(CLERIC, [SRD], { language: "it" });

        expect(renamed).not.toBe(first);
        expect(renamed.sheet.meta.name).toBe("Another cleric");
        expect(italian).not.toBe(first);
        expect(engine.stats()).toEqual({ packageSets: 1, sheets: 3 });
    });

    it("recomputes the sheet, not the package set, when the help level changes", () =>
    {
        const engine = useEngine();
        const regular = engine.sheet(CLERIC, [SRD], { language: "en", helpLevel: "regular" });
        const newcomer = engine.sheet(CLERIC, [SRD], { language: "en", helpLevel: "newcomer" });

        expect(newcomer).not.toBe(regular);
        expect(engine.stats()).toEqual({ packageSets: 1, sheets: 2 });
    });

    it("recomputes both when a package version changes", () =>
    {
        const engine = useEngine();
        engine.sheet(CLERIC, [SRD], { language: "en" });

        const newer = { ...SRD, manifest: { ...SRD.manifest, version: "0.1.1" } };
        engine.sheet(CLERIC, [newer], { language: "en" });

        expect(engine.stats()).toEqual({ packageSets: 2, sheets: 2 });
    });

    it("measures a derivation, and keeps only the last measure", () =>
    {
        const engine = useEngine();
        engine.packageSet([SRD], {});
        engine.sheet(CLERIC, [SRD], { language: "en" });
        engine.sheet(CASTER, [SRD], { language: "en", helpLevel: "newcomer" });

        const measures = performance.getEntriesByName(DERIVE_MEASURE, "measure");
        expect(measures).toHaveLength(1);

        const { duration } = measures[0]!;
        // eslint-disable-next-line no-console -- a soft budget overrun is worth a note, not a failure.
        if (duration > SOFT_MS) { console.warn(`derive took ${duration.toFixed(1)} ms (soft budget ${SOFT_MS} ms)`); }

        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThan(HARD_MS);
    });
});
