/**
 * Help levels (docs/phase-1/03-sheet-composer.md): regular is the golden tree, with no newcomer wording;
 * newcomer explains every value in words and summarises every item; expert adds the raw contributions.
 */

import { describe, expect, it } from "vitest";

import { compose } from "../src/index.js";
import type { Block, SectionTree, ValueItem } from "../src/index.js";
import { fixture } from "./helpers.js";

function blocks(tree: SectionTree): Block[]
{
    return tree.sections.flatMap((s) => [...s.blocks]);
}

function values(tree: SectionTree): ValueItem[]
{
    return blocks(tree).flatMap((b) => (b.kind === "values" ? [...b.items] : []));
}

describe("help levels", () =>
{
    const { character, packages, sheet } = fixture("cleric-l5");
    const options = { character: character, packages: packages };

    it("regular is the default and carries no newcomer wording", () =>
    {
        const regular = compose(sheet, { ...options, helpLevel: "regular" });

        expect(regular).toEqual(compose(sheet, options));
        expect(JSON.stringify(regular)).not.toContain("\"newcomer\"");
        expect(JSON.stringify(regular)).not.toContain("\"summary\"");
    });

    it("newcomer explains every value in words and summarises features, actions and spells", () =>
    {
        const tree = compose(sheet, { ...options, helpLevel: "newcomer" });

        for (const item of values(tree).filter((v) => v.value !== undefined))
        {
            expect(item.explain?.newcomer?.length, item.id).toBeGreaterThan(0);
        }
        const features = blocks(tree)
            .flatMap((b) => (b.kind === "features" ? b.groups.flatMap((g) => [...g.items]) : []));
        expect(features.filter((f) => f.text !== "").every((f) => f.summary !== undefined)).toBe(true);
        const spells = blocks(tree).flatMap((b) => (b.kind === "spells" ? b.levels.flatMap((l) => [...l.items]) : []));
        expect(spells.some((s) => s.summary !== undefined)).toBe(true);
    });

    it("expert adds the raw contributions to every explained value", () =>
    {
        const tree = compose(sheet, { ...options, helpLevel: "expert" });
        const ac = values(tree).find((v) => v.id === "ac")!;

        expect(ac.raw).toBe("16 Chain mail, +2 Shield");
        expect(JSON.stringify(tree)).not.toContain("\"summary\"");
    });
});
