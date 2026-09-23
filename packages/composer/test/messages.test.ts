/** The sheet's interface strings: both languages carry the same keys; the built-in translator reads vue-i18n syntax. */

import { describe, expect, it } from "vitest";

import { compose, createTranslate, SHEET_MESSAGES } from "../src/index.js";
import { fixture } from "./helpers.js";

function keys(value: unknown, prefix = ""): string[]
{
    if (typeof value !== "object" || value === null) { return [prefix]; }

    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("sheet messages", () =>
{
    it("have the same keys in English and Italian", () =>
    {
        expect(keys(SHEET_MESSAGES["it"]).sort()).toEqual(keys(SHEET_MESSAGES["en"]).sort());
    });

    it("interpolate parameters, choose plural forms and fall back to English, then to the key", () =>
    {
        const t = createTranslate("it");

        expect(t("sheet.units.feet", { value: 30 })).toBe("30 ft");
        expect(t("sheet.core.ac")).toBe("Classe Armatura");
        expect(createTranslate("fr")("sheet.core.ac")).toBe("Armor Class");
        expect(t("sheet.nope")).toBe("sheet.nope");
    });

    it("compose in Italian with the built-in translator, and with a caller's translator", () =>
    {
        const { character, packages, sheet } = fixture("cleric-l5");

        const italian = compose(sheet, { character: character, packages: packages, language: "it" });
        const core = italian.sections.find((s) => s.id === "core")!;
        expect(core.title).toBe("Valori principali");
        expect(JSON.stringify(core)).toContain("Classe Armatura");

        const shouting = compose(sheet, {
            character: character,
            packages: packages,
            translate: (key, params) => createTranslate("en")(key, params).toUpperCase()
        });
        expect(shouting.sections.find((s) => s.id === "core")!.title).toBe("CORE");
    });
});
