/**
 * `useEngine` (docs/phase-1/01-web-application.md): package sets memoised per versions and pins, sheets per
 * character document, versions and language; anything else recomputes.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";
import { beforeEach, describe, expect, it } from "vitest";

import type { Character } from "@byloth/dnd-platform-engine";
import type { PackageSource } from "@byloth/dnd-platform-loader";

import { useEngine } from "@/composables/engine";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const SRD = JSON.parse(readFileSync(resolve(ROOT, "build", "content", "srd51.json"), "utf8")) as PackageSource;
const CLERIC_PATH = resolve(ROOT, "fixtures", "characters", "cleric-l5", "character.yaml");
const CLERIC = parse(readFileSync(CLERIC_PATH, "utf8")) as Character;

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
});
