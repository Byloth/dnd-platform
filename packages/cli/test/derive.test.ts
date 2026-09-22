/**
 * `dnd derive`: package resolution (sibling packages.yaml, discovery by id,
 * explicit directories), the canonical JSON equal to the fixture snapshot,
 * the readable sheet equal to the golden sheet.txt, and --explain.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { parse } from "yaml";
import { afterAll, describe, expect, it } from "vitest";

import { derive, loadPackages, stableStringify } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";

import { ResolveError, resolvePackages } from "../src/io/resolve-packages.js";
import { renderExplanation, renderSheet } from "../src/render/text.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "characters");
const GOLDEN = ["monk-l3-base", "cleric-l5", "multiclass-caster"];
const ESC = String.fromCharCode(27);
const stripAnsi = (text: string): string => text.replace(new RegExp(`${ESC}\\[[0-9;]*m`, "g"), "");

const characterOf = (name: string): [string, Character] =>
{
    const path = join(FIXTURES, name, "character.yaml");

    return [path, parse(readFileSync(path, "utf8")) as Character];
};

describe("package resolution", () =>
{
    const scratch = mkdtempSync(join(tmpdir(), "dnd-derive-"));
    afterAll(() => { rmSync(scratch, { recursive: true, force: true }); });

    it("uses the packages.yaml next to the character", () =>
    {
        const [path, character] = characterOf("monk-l3-base");
        const resolved = resolvePackages(path, character, { repoRoot: ROOT });

        expect(resolved.sources.map((s) => s.manifest.id)).toEqual(["srd51", "homebrew.byloth"]);
        expect(resolved.directories[0]).toBe(resolve(ROOT, "packages/content/srd51"));
    });

    it("resolves ids through the content roots when there is no packages.yaml", () =>
    {
        const [, character] = characterOf("cleric-l5");
        const alone = join(scratch, "cleric.yaml");
        writeFileSync(alone, stableStringify(character));
        const resolved = resolvePackages(alone, character, { repoRoot: ROOT });

        expect(resolved.sources.map((s) => s.manifest.id)).toEqual(["srd51"]);
        expect(resolved.directories[0]).toBe(resolve(ROOT, "packages/content/srd51"));
    });

    it("takes explicit directories for ids the roots do not know", () =>
    {
        const [, character] = characterOf("monk-l3-base");
        const alone = join(scratch, "monk.yaml");
        writeFileSync(alone, stableStringify(character));
        expect(() => resolvePackages(alone, character, { repoRoot: ROOT })).toThrow(ResolveError);
        expect(() => resolvePackages(alone, character, { repoRoot: ROOT })).toThrow(/homebrew\.byloth/);
        const resolved = resolvePackages(alone, character, {
            repoRoot: ROOT, extra: [resolve(ROOT, "fixtures/packages/homebrew-feline")]
        });

        expect(resolved.sources.map((s) => s.manifest.id)).toEqual(["srd51", "homebrew.byloth"]);
    });

    it("turns a missing required package into an error", () =>
    {
        const dir = join(scratch, "requires");
        const [, character] = characterOf("cleric-l5");
        mkdirSync(dir);
        writeFileSync(join(dir, "character.yaml"), stableStringify(character));
        writeFileSync(join(dir, "packages.yaml"), "packages: [packages/content/srd51]\nrequires: [phb14]\n");

        expect(() => resolvePackages(join(dir, "character.yaml"), character, { repoRoot: ROOT })).toThrow(/phb14/);
    });
});

describe("dnd derive output", () =>
{
    for (const name of GOLDEN)
    {
        it(`${name}: --json is the snapshot, --text is sheet.txt`, () =>
        {
            const [path, character] = characterOf(name);
            const resolved = resolvePackages(path, character, { repoRoot: ROOT });
            const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
            const set = loadPackages(resolved.sources, { pins: pins });
            const sheet = derive(character, set);

            expect(`${stableStringify(sheet)}\n`).toBe(readFileSync(join(FIXTURES, name, "snapshot.json"), "utf8"));
            expect(existsSync(join(FIXTURES, name, "sheet.txt"))).toBe(true);
            const text = renderSheet(sheet, { character: character, packages: set, color: false });
            expect(text).toBe(readFileSync(join(FIXTURES, name, "sheet.txt"), "utf8"));
            expect(text.split("\n").every((line) => line.length <= 100)).toBe(true);
            expect(text.includes(ESC)).toBe(false);
        });
    }

    it("colours only when asked, without changing the layout", () =>
    {
        const [path, character] = characterOf("monk-l3-base");
        const resolved = resolvePackages(path, character, { repoRoot: ROOT });
        const set = loadPackages(resolved.sources);
        const sheet = derive(character, set);
        const coloured = renderSheet(sheet, { character: character, packages: set, color: true });
        const plain = renderSheet(sheet, { character: character, packages: set, color: false });

        expect(coloured.includes(ESC)).toBe(true);
        expect(stripAnsi(coloured)).toBe(plain);
    });

    it("explains one value with every contribution, and lists the paths for an unknown one", () =>
    {
        const [path, character] = characterOf("monk-l3-base");
        const resolved = resolvePackages(path, character, { repoRoot: ROOT });
        const set = loadPackages(resolved.sources);
        const sheet = derive(character, set);
        const options = { character: character, packages: set, color: false };
        const ac = renderExplanation(sheet, "ac", options);

        expect(ac).toContain("ac = 15");
        expect(ac).toContain("Unarmored Defense");
        expect(ac).toContain("= 10 + mod(dex) + mod(wis)");
        expect(ac).toContain("← srd51 · monk.unarmored-defense");
        const unknown = renderExplanation(sheet, "skill.nope", options);
        expect(unknown).toContain("no value at");
        expect(unknown).toContain("skill.stealth");
    });
});
