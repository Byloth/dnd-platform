/**
 * The Roadmap and Credits pages (owner, 2026-09-25): plain words in both languages; the author first with the
 * support link, counted only with consent (DEC-22); the game content credited from the packages' manifests.
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import CreditsPage from "@/pages/credits.vue";
import RoadmapPage from "@/pages/roadmap.vue";

import { clearBrowserStorage, serveSite } from "./helpers";

serveSite();

let _mounted: VueWrapper | undefined;

async function open(page: Parameters<typeof mountSuspended>[0]): Promise<VueWrapper>
{
    _mounted = await mountSuspended(page);
    for (let i = 0; i < 10; i += 1)
    {
        await flushPromises();
        await new Promise((done) => setTimeout(done, 5));
    }

    return _mounted;
}

afterEach(async () =>
{
    _mounted?.unmount();
    _mounted = undefined;
    delete (globalThis as { umami?: unknown }).umami;
    useConsentStore().reset();
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

describe("the roadmap page", () =>
{
    it("lists what exists, what comes next and what comes later, in both languages", async () =>
    {
        const wrapper = await open(RoadmapPage);
        expect(wrapper.findAll("h2").map((h) => h.text())).toEqual(["Available now", "Coming next", "Later"]);
        expect(wrapper.text()).toContain("A sheet that explains itself");

        await useNuxtApp().$i18n.setLocale("it");
        await flushPromises();
        expect(wrapper.findAll("h2").map((h) => h.text())).toEqual(["Disponibile ora", "In arrivo", "Più avanti"]);
        expect(wrapper.text()).not.toMatch(/roadmapPage\./);
    });
});

describe("the credits page", () =>
{
    it("names the author first and credits the SRD from its manifest", async () =>
    {
        const wrapper = await open(CreditsPage);

        expect(wrapper.find("h2").text()).toContain("Matteo Bilotta");
        expect(wrapper.text()).toContain("System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC");
        expect(wrapper.text()).toContain("System Reference Document 5.2");
        expect(wrapper.text()).toContain("trademarks of Wizards of the Coast");
        expect(wrapper.text()).not.toMatch(/creditsPage\./);
    });

    it("counts a click on the beer only with consent", async () =>
    {
        const track = vi.fn();
        (globalThis as { umami?: unknown }).umami = { track: track };
        const wrapper = await open(CreditsPage);
        const beer = wrapper.find<HTMLAnchorElement>(".credits-page__beer");
        expect(beer.attributes("href")).toBe("https://buymeacoffee.com/byloth");
        beer.element.addEventListener("click", (event) => event.preventDefault());

        await beer.trigger("click");
        expect(track).not.toHaveBeenCalled();

        useConsentStore().grant();
        await beer.trigger("click");
        expect(track).toHaveBeenCalledWith("support-click", { from: "credits" });
    });

    it("speaks Italian", async () =>
    {
        await useNuxtApp().$i18n.setLocale("it");
        const wrapper = await open(CreditsPage);

        expect(wrapper.find("h1").text()).toBe("Riconoscimenti");
        expect(wrapper.find(".credits-page__beer").text()).toBe("Offrimi una birra");
    });
});
