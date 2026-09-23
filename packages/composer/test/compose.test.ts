/**
 * The composer over the fixture characters: deterministic, independent of
 * the order of the package sources, equal to the golden section trees, and
 * shaped as the sheet's sections say.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { stableStringify } from "@byloth/dnd-platform-schema";
import { loadPackages } from "@byloth/dnd-platform-loader";
import { derive } from "@byloth/dnd-platform-engine";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import type { Character } from "@byloth/dnd-platform-engine";

import { compose, explain } from "../src/index.js";
import { readPackage } from "./helpers.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "characters");
const GOLDEN = ["monk-l3-base", "cleric-l5", "multiclass-caster"];

interface PackagesFile { readonly packages: readonly string[] }

function load(name: string): { character: Character, sources: PackageSource[] }
{
    const dir = join(FIXTURES, name);
    const file = parse(readFileSync(join(dir, "packages.yaml"), "utf8")) as PackagesFile;
    const sources = file.packages.map((p) => readPackage(resolve(ROOT, p)));
    const character = parse(readFileSync(join(dir, "character.yaml"), "utf8")) as Character;

    return { character: character, sources: sources };
}

describe("compose", () =>
{
    for (const name of GOLDEN)
    {
        it(`${name}: equals its golden section tree`, () =>
        {
            const { character, sources } = load(name);
            const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
            const set = loadPackages(sources, { pins: pins });
            const sheet = derive(character, set);
            const tree = compose(sheet, { character: character, packages: set });

            expect(existsSync(join(FIXTURES, name, "section-tree.json"))).toBe(true);
            expect(stableStringify(tree)).toBe(readFileSync(join(FIXTURES, name, "section-tree.json"), "utf8"));
            expect(tree.sections.map((s) => s.id)).toEqual([...sheet.sections]);
            const again = compose(sheet, { character: character, packages: set });
            expect(stableStringify(again)).toBe(stableStringify(tree));
        });
    }

    it("does not depend on the order of the package sources", () =>
    {
        const { character, sources } = load("monk-l3-base");
        const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
        const forward = loadPackages(sources, { pins: pins });
        const backward = loadPackages([...sources].reverse(), { pins: pins });
        const options = (set: typeof forward): { character: Character, packages: typeof forward } =>
            ({ character: character, packages: set });

        expect(stableStringify(compose(derive(character, backward), options(backward))))
            .toBe(stableStringify(compose(derive(character, forward), options(forward))));
    });

    it("keeps empty sections with no blocks and explains multi-contribution values", () =>
    {
        const { character, sources } = load("monk-l3-base");
        const set = loadPackages(sources);
        const sheet = derive(character, set);
        const tree = compose(sheet, { character: character, packages: set });
        const personality = tree.sections.find((s) => s.id === "personality");
        expect(personality?.blocks).toEqual([]);
        expect(tree.sections.some((s) => s.id === "spellcasting")).toBe(false);
        const core = tree.sections.find((s) => s.id === "core")?.blocks[0];
        expect(core?.kind).toBe("values");
        if (core?.kind !== "values") { return; }
        const ac = core.items.find((i) => i.id === "ac");
        expect(ac?.shown).toBe("15");
        expect(ac?.explain?.regular.map((l) => l.shown)).toEqual(["10", "+3", "=15"]);
        expect(ac?.explain?.regular[2]?.source).toBe("srd51 · monk.unarmored-defense");
        expect(core.items.find((i) => i.id === "proficiency")?.explain).toBeUndefined();
    });

    it("explains one value path, inactive contributions included", () =>
    {
        const { character, sources } = load("monk-l3-base");
        const set = loadPackages(sources);
        const sheet = derive(character, set);
        const ac = explain(sheet, "ac", { character: character, packages: set });

        expect(ac?.expert.map((l) => l.shown)).toEqual(["10", "+3", "set-formula 15"]);
        expect(ac?.expert[2]?.formula).toBe("10 + mod(dex) + mod(wis)");
        expect(explain(sheet, "nope", { character: character, packages: set })).toBeUndefined();
    });
});
