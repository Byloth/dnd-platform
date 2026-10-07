/**
 * The settings page and the bar's quick switches (docs/phase-1/09-interface-revisions.md, owner 2026-10-07): every
 * setting on its own page, a card per option, each changing its preference; the statistics give or withdraw the
 * consent; units follow the language until chosen. The bar has four links and no settings panel; its two
 * dropdowns close on Escape (focus back on the button), on a choice and when the other opens, and the arrow keys
 * move between their choices. The click outside is checked in a real browser (`pnpm web:a11y`), where the pointer
 * events are the browser's own.
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import NavigationBar from "@/components/globals/NavigationBar.vue";
import { preferredUnits } from "@/composables/sheet";
import SettingsPage from "@/pages/settings.vue";

import { clearBrowserStorage, serveSite } from "./helpers";

serveSite();

let _mounted: VueWrapper | undefined;
async function render(component: Parameters<typeof mountSuspended>[0]): Promise<VueWrapper>
{
    _mounted = await mountSuspended(component, { attachTo: document.body });
    await flushPromises();

    return _mounted;
}

afterEach(async () =>
{
    _mounted?.unmount();
    _mounted = undefined;
    const preferences = usePreferencesStore();
    preferences.theme = "system";
    preferences.units = "auto";
    preferences.language = "en";
    await useNuxtApp().$i18n.setLocale("en");
    useConsentStore().reset();
    await clearBrowserStorage();
});

const choose = async (wrapper: VueWrapper, name: string, value: string): Promise<void> =>
{
    await wrapper.find(`input[name="settings-${name}"][value="${value}"]`).setValue(true);
    await flushPromises();
};

describe("the settings page", () =>
{
    it("shows every setting, each a group of cards with a heading", async () =>
    {
        const wrapper = await render(SettingsPage);

        expect(wrapper.findAll("legend h2").map((h) => h.text())).toEqual([
            "Language", "Help level", "Theme", "Contrast", "Units of measure", "PDF paper", "PDF writing",
            "Usage statistics"
        ]);
        expect(wrapper.find("input[name='settings-helpLevel'][value='newcomer']").element)
            .toHaveProperty("checked", true);
    });

    it("changes each preference from its card", async () =>
    {
        const wrapper = await render(SettingsPage);
        const preferences = usePreferencesStore();

        await choose(wrapper, "helpLevel", "expert");
        await choose(wrapper, "theme", "dark");
        await choose(wrapper, "contrast", "more");
        await choose(wrapper, "units", "metric");
        await choose(wrapper, "pageSize", "letter");
        await choose(wrapper, "hand", "print");

        expect([
            preferences.helpLevel, preferences.theme, preferences.contrast, preferences.units, preferences.pageSize,
            preferences.hand
        ]).toEqual(["expert", "dark", "more", "metric", "letter", "print"]);
        preferences.helpLevel = "newcomer";
        preferences.contrast = "system";
        preferences.pageSize = "a4";
        preferences.hand = "handwriting";
    });

    it("gives and withdraws the consent to the statistics", async () =>
    {
        const wrapper = await render(SettingsPage);
        const consent = useConsentStore();
        expect(wrapper.findAll("input[name='settings-statistics']:checked")).toHaveLength(0);

        await choose(wrapper, "statistics", "on");
        expect(consent.analytics).toBe("granted");
        await choose(wrapper, "statistics", "off");
        expect(consent.analytics).toBe("denied");
    });
});

describe("the units of measure", () =>
{
    it("follow the language until the player chooses", () =>
    {
        const preferences = usePreferencesStore();
        expect([preferredUnits("en"), preferredUnits("it")]).toEqual(["imperial", "metric"]);

        preferences.units = "metric";
        expect(preferredUnits("en")).toBe("metric");
        preferences.units = "imperial";
        expect(preferredUnits("it")).toBe("imperial");
    });
});

describe("the navigation bar", () =>
{
    it("has four links and the two quick switches, no settings panel", async () =>
    {
        const wrapper = await render(NavigationBar);

        expect(wrapper.findAll(".navigation-bar__link").map((l) => l.text()))
            .toEqual(["Characters", "Compendium", "Packages", "Settings"]);
        expect(wrapper.find("details").exists()).toBe(false);
        expect(wrapper.findAll(".dropdown-menu__button").map((b) => b.attributes("aria-label")))
            .toEqual(["Theme: Like the device", "Language: English"]);
    });

    it("switches the theme and the language from the dropdowns", async () =>
    {
        const wrapper = await render(NavigationBar);
        const [theme, language] = wrapper.findAll(".dropdown-menu");

        await theme!.find(".dropdown-menu__button").trigger("click");
        expect(theme!.find(".dropdown-menu__button").attributes("aria-expanded")).toBe("true");
        await theme!.findAll(".dropdown-menu__item")[2]!.trigger("click");
        expect(usePreferencesStore().theme).toBe("dark");
        expect(theme!.find(".dropdown-menu__list").isVisible()).toBe(false);

        await language!.find(".dropdown-menu__button").trigger("click");
        await language!.findAll(".dropdown-menu__item")[1]!.trigger("click");
        await flushPromises();
        expect(usePreferencesStore().language).toBe("it");
    });

    it("closes on Escape with focus back, and when the other opens", async () =>
    {
        const wrapper = await render(NavigationBar);
        const [theme, language] = wrapper.findAll(".dropdown-menu");
        const button = theme!.find(".dropdown-menu__button");
        const expanded = (): string | undefined => button.attributes("aria-expanded");

        await button.trigger("click");
        await theme!.find(".dropdown-menu__item").trigger("keydown", { key: "Escape" });
        expect(expanded()).toBe("false");
        expect(document.activeElement).toBe(button.element);

        await button.trigger("click");
        await language!.find(".dropdown-menu__button").trigger("click");
        expect(expanded()).toBe("false");
        expect(language!.find(".dropdown-menu__button").attributes("aria-expanded")).toBe("true");
    });

    it("moves between the choices with the arrow keys, Home and End", async () =>
    {
        const wrapper = await render(NavigationBar);
        const theme = wrapper.find(".dropdown-menu");

        await theme.find(".dropdown-menu__button").trigger("keydown", { key: "ArrowDown" });
        await flushPromises();
        const items = theme.findAll(".dropdown-menu__item").map((i) => i.element);
        expect(document.activeElement).toBe(items[0]);

        await theme.find(".dropdown-menu__list").trigger("keydown", { key: "ArrowDown" });
        expect(document.activeElement).toBe(items[1]);
        await theme.find(".dropdown-menu__list").trigger("keydown", { key: "End" });
        expect(document.activeElement).toBe(items[2]);
        await theme.find(".dropdown-menu__list").trigger("keydown", { key: "ArrowDown" });
        expect(document.activeElement).toBe(items[0]);
        await theme.find(".dropdown-menu__list").trigger("keydown", { key: "Home" });
        expect(document.activeElement).toBe(items[0]);
    });
});
