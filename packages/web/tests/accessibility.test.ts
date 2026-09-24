/**
 * Every screen of the site so far, in both languages, through axe and the keyboard check
 * (docs/phase-1/07-testing-accessibility-performance.md): the characters page, a character's sheet with its
 * explanation drawer open, the packages page and the site's bar and footer. The accessible tree of the sheet is
 * asserted on its key elements.
 */

import "fake-indexeddb/auto";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { parse } from "yaml";
import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import type { Character } from "@byloth/dnd-platform-engine";

import NavigationBar from "@/components/globals/NavigationBar.vue";
import SiteFooter from "@/components/globals/SiteFooter.vue";
import SheetView from "@/components/sheet/SheetView.vue";
import type { Language } from "@/stores/preferences";
import CharactersPage from "@/pages/index.vue";
import CharacterPage from "@/pages/characters/[id]/index.vue";
import PackagesPage from "@/pages/packages/index.vue";

import { accessibleTree, expectKeyboardOperable, expectNoAxeViolations } from "./accessibility";
import { clearBrowserStorage, ROOT, serveDemoCharacters, serveSite, SRD } from "./helpers";

serveSite();
serveDemoCharacters(["cleric-l5", "monk-l20"]);

const LANGUAGES: readonly Language[] = ["en", "it"];

let _mounted: VueWrapper | undefined;

async function render(component: Parameters<typeof mountSuspended>[0], options: Record<string, unknown> = {})
{
    _mounted = await mountSuspended(component, { ...options, attachTo: document.body });
    await flushPromises();

    return _mounted;
}

async function speak(language: Language): Promise<void>
{
    usePreferencesStore().language = language;
    await useNuxtApp().$i18n.setLocale(language);
}

async function expectAccessible(wrapper: VueWrapper): Promise<void>
{
    await expectNoAxeViolations(wrapper);
    expectKeyboardOperable(wrapper);
}

function character(name: string): Character
{
    return parse(readFileSync(resolve(ROOT, "fixtures", "characters", name, "character.yaml"), "utf8")) as Character;
}

afterEach(async () =>
{
    _mounted?.unmount();
    _mounted = undefined;
    document.body.innerHTML = "";

    localStorage.clear();
    usePreferencesStore().$patch({ language: "en", helpLevel: "newcomer" });
    usePreferencesStore().sheets = {};
    useContentStore().reset();
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

describe.each(LANGUAGES)("accessibility, in %s", (language) =>
{
    it("the characters page", async () =>
    {
        await speak(language);
        await expectAccessible(await render(CharactersPage));
    });

    it.each(["fixture-cleric-l5", "fixture-monk-l20"])("the sheet page of %s", async (id) =>
    {
        await speak(language);
        await expectAccessible(await render(CharacterPage, { route: `/characters/${id}` }));
    });

    it("the level 20 caster's sheet with the explanation drawer open, at every help level", async () =>
    {
        await speak(language);
        for (const helpLevel of ["newcomer", "regular", "expert"] as const)
        {
            const c = character("perf-caster-l20");
            const composed = useEngine().sheet(c, [SRD], { language: language, helpLevel: helpLevel });
            const wrapper = await render(SheetView, {
                props: { character: c, composed: composed, helpLevel: helpLevel, language: language }
            });
            await expectAccessible(wrapper);

            await wrapper.find(".value-tile").trigger("click");
            await flushPromises();
            expect(wrapper.find(".provenance-drawer").exists()).toBe(true);
            await expectAccessible(wrapper);

            wrapper.unmount();
            document.body.innerHTML = "";
        }
        _mounted = undefined;
    });

    it("the packages page", async () =>
    {
        await speak(language);
        await expectAccessible(await render(PackagesPage));
    });

    it("the navigation bar and the footer", async () =>
    {
        await speak(language);
        await expectAccessible(await render(NavigationBar));
        _mounted!.unmount();
        await expectAccessible(await render(SiteFooter));
    });
});

describe("the sheet's accessible tree", () =>
{
    it("names its sections and values, and starts from the character's name", async () =>
    {
        const wrapper = await render(CharacterPage, { route: "/characters/fixture-cleric-l5" });
        const tree = accessibleTree(wrapper);

        expect(tree.find((n) => n.role === "heading")).toEqual({ role: "heading", name: "Stone Lantern" });
        expect(tree.filter((n) => n.role === "region").length).toBeGreaterThan(3);
        expect(tree.filter((n) => n.role === "region").every((n) => n.name.length > 0)).toBe(true);
        expect(tree).toContainEqual({ role: "button", name: "Armor Class, 18" });
        expect(tree.filter((n) => n.role === "button").every((n) => n.name.length > 0)).toBe(true);
    });
});
