/**
 * The composer's strings through the interface's vue-i18n (docs/phase-1/06-localisation.md): the web merges
 * SHEET_MESSAGES and hands its translation to the composer, plural forms included.
 */

import { afterEach, describe, expect, it } from "vitest";

import { sheetTranslate } from "@/composables/sheet";
import type { VueI18nTranslate } from "@/composables/sheet";

const translate = () => sheetTranslate(useNuxtApp().$i18n.t as VueI18nTranslate);

afterEach(async () =>
{
    await useNuxtApp().$i18n.setLocale("en");
});

describe("the sheet's translation", () =>
{
    it("speaks the interface language, with parameters and plural forms", async () =>
    {
        await useNuxtApp().$i18n.setLocale("it");
        expect(translate()("sheet.core.ac")).toBe("Classe Armatura");
        expect(translate()("sheet.units.feet", { value: 30 })).toBe("30 ft");
        expect(translate()("sheet.spellcasting.cantrips", { count: 4 })).toBe("4 trucchetti");
    });

    it("returns the key for a string it does not know, so the composer can fall back", () =>
    {
        expect(translate()("sheet.skills.underwater-basket-weaving")).toBe("sheet.skills.underwater-basket-weaving");
    });
});
