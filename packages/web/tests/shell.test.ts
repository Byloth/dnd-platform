/**
 * The shell around every page: the page title "Page · D&D Platform" in the interface language, and the footer's
 * signature "Made with ♥ by Byloth" with the SRD attribution.
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import App from "@/app.vue";
import SiteFooter from "@/components/globals/SiteFooter.vue";

import { clearBrowserStorage, serveDemoCharacters, serveSite } from "./helpers";

serveSite();
serveDemoCharacters(["cleric-l5"]);

afterEach(async () =>
{
    usePreferencesStore().language = "en";
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

const signature = (wrapper: { find: (s: string) => { text: () => string } }): string =>
    wrapper.find(".site-footer__signature").text()
        .replace(/\s+/g, " ");

async function titleOf(route: string): Promise<string>
{
    const wrapper = await mountSuspended(App, { route: route });
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const title = document.title;
    wrapper.unmount();

    return title;
}

describe("the page title", () =>
{
    it("is the name alone on the characters page, and names the page elsewhere", async () =>
    {
        expect(await titleOf("/")).toBe("D&D Platform");
        expect(await titleOf("/characters/fixture-cleric-l5")).toBe("Stone Lantern · D&D Platform");
    });

    it("speaks the interface language", async () =>
    {
        usePreferencesStore().language = "it";
        await useNuxtApp().$i18n.setLocale("it");

        expect(await titleOf("/packages")).toBe("Pacchetti · D&D Platform");
    });
});

describe("the footer", () =>
{
    it("signs the site in both languages", async () =>
    {
        const english = await mountSuspended(SiteFooter);
        expect(signature(english)).toBe("Made with by Byloth");
        expect(english.find(".site-footer__attribution").text()).toContain("5.1 and 5.2");

        await useNuxtApp().$i18n.setLocale("it");
        const italian = await mountSuspended(SiteFooter);
        expect(signature(italian)).toBe("Fatto con da Byloth");
    });
});
