/**
 * Content selection (DEC-20) seen from the engine: a character using excluded content keeps
 * computing and is flagged. The selection itself is the loader's (packages/loader/test/selection.test.ts).
 */

import { describe, expect, it } from "vitest";

import { CANTRIP, ELF, HIGH_ELF, KEEN, load } from "../../loader/test/selection-world.js";
import { derive } from "../src/index.js";
import { character } from "./helpers.js";

describe("content selection (DEC-20) in the engine", () =>
{
    it("a character using excluded content keeps computing and is flagged once per entity", () =>
    {
        const set = load({ exclude: [{ ids: [ELF] }] });
        const sheet = derive(character({ species: ELF, subspecies: HIGH_ELF }), set);
        const excluded = sheet.warnings.filter((w) => w.code === "W_EXCLUDED_CONTENT").map((w) => w.entity);

        expect(excluded).toEqual([ELF, KEEN, HIGH_ELF, CANTRIP]);
        expect(sheet.features.map((f) => f.id)).toContain(KEEN);
        expect(sheet.warnings.filter((w) => w.severity === "info")).toEqual([]);
    });
});
