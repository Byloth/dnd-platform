/**
 * Loading properties on the fixture packages (docs/phase-0/04-testing-strategy.md, level 4):
 * patches in dependency order, missing dependencies, two bases, duplicate ids, version pins.
 */

import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadPackages } from "../src/index.js";
import type { PackageSource } from "../src/index.js";
import { makeManifest, readPackage } from "./helpers.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "packages");

const srd51 = readPackage(join(FIXTURES, "srd51-excerpt"));
const feline = readPackage(join(FIXTURES, "homebrew-feline"));
const sources: readonly PackageSource[] = [srd51, feline];

describe("loader properties", () =>
{
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
});
