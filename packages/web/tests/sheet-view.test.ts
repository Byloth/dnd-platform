/**
 * The build-mode sheet screen (docs/phase-1/03-sheet-composer.md, 07-testing-accessibility-performance.md):
 * sections are landmarks named by their titles, every value has an accessible name "label, value", a tapped
 * number opens its explanation in words, pips say "n of m", pin and collapse are kept per character, and the
 * screen speaks the interface language without a raw key.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { flushPromises } from "@vue/test-utils";
import { parse } from "yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import type { HelpLevel } from "@byloth/dnd-platform-composer";
import type { Character } from "@byloth/dnd-platform-engine";

import SheetView from "@/components/sheet/SheetView.vue";

import { byName } from "./accessibility";
import { ROOT, SRD } from "./helpers";

function character(name: string): Character
{
    return parse(readFileSync(resolve(ROOT, "fixtures", "characters", name, "character.yaml"), "utf8")) as Character;
}

async function mountSheet(name: string, helpLevel: HelpLevel = "newcomer", language = "en")
{
    const c = character(name);
    const composed = useEngine().sheet(c, [SRD], { language: language, helpLevel: helpLevel });
    const wrapper = await mountSuspended(SheetView, {
        props: { character: c, composed: composed, helpLevel: helpLevel, language: language }
    });
    await flushPromises();

    return wrapper;
}

beforeEach(() =>
{
    localStorage.clear();
    usePreferencesStore().sheets = {};
});
afterEach(async () =>
{
    await useNuxtApp().$i18n.setLocale("en");
});

describe("the sheet screen", () =>
{
    it("makes every section a landmark named by its title, and every value 'label, value'", async () =>
    {
        const wrapper = await mountSheet("cleric-l5");

        for (const section of wrapper.findAll("section.section-block"))
        {
            const heading = wrapper.find(`#${section.attributes("aria-labelledby")}`);
            expect(heading.exists()).toBe(true);
            expect(heading.text().length).toBeGreaterThan(0);
        }
        expect(byName(wrapper, "Armor Class, 18")).toBeDefined();
        expect(byName(wrapper, "Stealth, +0")).toBeDefined();
        expect(wrapper.text()).not.toMatch(/sheetView\.|sheet\.[a-z]/);
    });

    it("opens the explanation of a tapped number, in words", async () =>
    {
        const wrapper = await mountSheet("cleric-l5");

        byName(wrapper, "Armor Class, 18")!.click();
        await flushPromises();

        const drawer = wrapper.find(".provenance-drawer");
        expect(drawer.text()).toContain("Chain mail sets the starting value at 16.");
        expect(drawer.text()).toContain("Shield adds +2.");

        await drawer.findAll("[role=tab]")[1]!.trigger("click");
        expect(drawer.find(".provenance-drawer__lines").text()).toContain("Chain mail");
    });

    it("says how many uses of a resource are left", async () =>
    {
        const wrapper = await mountSheet("barbarian-l5");

        expect(byName(wrapper, "3 of 3 Rages")).toBeDefined();
    });

    it("keeps pin and collapse per character in the preferences", async () =>
    {
        const wrapper = await mountSheet("cleric-l5");

        await wrapper.find("#section-spells .section-block__pin").trigger("click");
        await wrapper.find("#section-skills .section-block__toggle").trigger("click");
        await flushPromises();

        const layout = usePreferencesStore().sheets["fixture-cleric-l5"];
        expect(layout).toEqual({ pinned: ["spells"], collapsed: ["skills"] });
        expect(wrapper.find(".sheet-view__pinned #section-spells").exists()).toBe(true);
        expect(wrapper.find("#section-skills .section-block__toggle").attributes("aria-expanded")).toBe("false");
    });

    it("speaks Italian, the empty conditions included", async () =>
    {
        await useNuxtApp().$i18n.setLocale("it");
        const wrapper = await mountSheet("cleric-l5", "regular", "it");

        expect(wrapper.find("#title-abilities").text()).toBe("Caratteristiche");
        expect(wrapper.find("#section-conditions").text()).toContain("Niente ti sta influenzando.");
        expect(wrapper.text()).not.toMatch(/sheetView\.|sheet\.[a-z]/);
    });
});
