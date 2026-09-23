/**
 * Content reminders (`add-text`) close the section they belong to, with the name of what adds them; a section
 * a package declares takes its localised name and layout, its reminders as content.
 */

import { describe, expect, it } from "vitest";

import type { ComputedSheet } from "@byloth/dnd-platform-engine";

import { compose } from "../src/index.js";
import type { RemindersBlock } from "../src/index.js";
import { fixture } from "./helpers.js";

describe("reminders", () =>
{
    it("close the section they belong to, named after their source", () =>
    {
        const { character, packages, sheet } = fixture("cleric-l5");
        const features = compose(sheet, { character: character, packages: packages })
            .sections.find((s) => s.id === "features")!;
        const reminders = features.blocks.at(-1) as RemindersBlock;

        expect(reminders.kind).toBe("reminders");
        expect(reminders.items).toContainEqual({
            text: "You and your companions can expect free healing and care at temples of your faith.",
            source: "Shelter of the Faithful"
        });
    });

    it("fill a declared section, titled in the sheet's language and with its layout", () =>
    {
        const { character, packages, sheet } = fixture("cleric-l5");
        const at = sheet.sections.indexOf("equipment");
        const declared: ComputedSheet = {
            ...sheet,
            sections: [...sheet.sections.slice(0, at), "prayer-log", ...sheet.sections.slice(at)],
            customSections: [{
                id: "prayer-log",
                name: { en: "Prayer log", it: "Registro delle preghiere" },
                layout: "list",
                source: { package: "srd51" }
            }],
            texts: [{ section: "prayer-log", text: { en: "One line per dawn." }, source: { package: "srd51" } }]
        };

        const section = compose(declared, { character: character, packages: packages, language: "it" })
            .sections.find((s) => s.id === "prayer-log")!;

        expect(section.title).toBe("Registro delle preghiere");
        expect(section.layout).toBe("list");
        expect(section.blocks).toEqual([
            { kind: "reminders", items: [{ text: "One line per dawn.", source: "srd51" }] }
        ]);
    });
});
