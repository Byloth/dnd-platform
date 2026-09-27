/**
 * The compendium's screens (docs/phase-1/13-compendium.md, M1.Cc): the front page with its sections and a search
 * over everything, a section's list with the search and the filters in the address, and an entry with its
 * source; the creatures fetched only by the bestiary or a search; both languages; the navigation's link.
 */

import "fake-indexeddb/auto";

import { join } from "node:path";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import NavigationBar from "@/components/globals/NavigationBar.vue";
import CompendiumPage from "@/pages/compendium/index.vue";
import KindPage from "@/pages/compendium/[kind]/index.vue";
import EntryPage from "@/pages/compendium/[kind]/[id].vue";

import { bundleOf, clearBrowserStorage, FIXTURES, serveSite } from "./helpers";

const site = serveSite();

let _mounted: VueWrapper[] = [];

afterEach(async () =>
{
    for (const wrapper of _mounted) { wrapper.unmount(); }
    _mounted = [];
    useContentStore().reset();
    useEngine().clear();
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

async function open(component: Parameters<typeof mountSuspended>[0], route: string): Promise<VueWrapper>
{
    const wrapper = await mountSuspended(component, { route: route });
    _mounted.push(wrapper);
    await flushPromises();

    return wrapper;
}

const names = (wrapper: VueWrapper): string[] =>
    wrapper.findAll(".compendium-list__name").map((n) => n.text());

describe("the compendium's front page", () =>
{
    it("shows the four sections, and fetches the creatures only once a search starts", async () =>
    {
        const wrapper = await open(CompendiumPage, "/compendium");
        const cards = wrapper.findAll(".compendium-home__card");

        expect(wrapper.find("h1").text()).toBe("Compendium");
        expect(cards.map((c) => c.find(".compendium-home__name").text()))
            .toEqual(["Spells", "Items", "Bestiary", "Conditions"]);
        expect(cards[0]!.text()).toContain("319 spells");
        expect(cards[2]!.find(".compendium-home__count").exists()).toBe(false);
        expect(site.creatureFetches()).toBe(0);

        await useRouter().replace({ query: { q: "fire" } });
        await vi.waitFor(async () =>
        {
            await flushPromises();
            expect(site.creatureFetches()).toBe(1);
            expect(wrapper.findAll(".compendium-home__group").length).toBeGreaterThan(1);
        });
        const groups = wrapper.findAll(".compendium-home__group-title").map((g) => g.text());

        expect(groups).toContain("Spells");
        expect(groups).toContain("Items");
        expect(wrapper.find(".compendium-home__all").text()).toMatch(/^See all \d+$/);
    });

    it("speaks Italian", async () =>
    {
        await useNuxtApp().$i18n.setLocale("it");
        const wrapper = await open(CompendiumPage, "/compendium");

        expect(wrapper.find("h1").text()).toBe("Compendio");
        expect(wrapper.findAll(".compendium-home__name").map((n) => n.text()))
            .toEqual(["Incantesimi", "Oggetti", "Bestiario", "Condizioni"]);
    });
});

describe("a section's list", () =>
{
    it("reads its filters from the address and counts what it finds", async () =>
    {
        const wrapper = await open(KindPage, "/compendium/spells?level=3&school=evocation");

        expect(wrapper.find("h1").text()).toBe("Spells");
        expect(names(wrapper)).toContain("Fireball");
        expect(wrapper.find(".compendium-list__count").text()).toMatch(/^\d+ spells$/);
    });

    it("writes a changed filter back to the address", async () =>
    {
        const wrapper = await open(KindPage, "/compendium/spells");
        const level = wrapper.findAll(".compendium-filters__field")
            .find((f) => f.find(".compendium-filters__label").text() === "Level")!.find("select");

        await level.setValue("9");
        await vi.waitFor(async () =>
        {
            await flushPromises();
            expect(useRouter().currentRoute.value.query).toEqual({ level: "9" });
        });
        expect(names(wrapper)).toContain("Wish");
    });

    it("shows sixty entries, then sixty more", async () =>
    {
        const wrapper = await open(KindPage, "/compendium/items");

        expect(names(wrapper).length).toBe(60);
        await wrapper.find(".compendium-list__more").trigger("click");
        expect(names(wrapper).length).toBe(120);
    });

    it("searches in Italian, the English name too", async () =>
    {
        await useNuxtApp().$i18n.setLocale("it");
        const wrapper = await open(KindPage, "/compendium/spells?q=palla");

        expect(names(wrapper)[0]).toBe("Palla di fuoco");
        await useRouter().replace({ query: { q: "fireball" } });
        await flushPromises();
        expect(names(wrapper)[0]).toBe("Palla di fuoco");
    });

    it("flags the entries of a private package", async () =>
    {
        const feline = readPackageSource(join(FIXTURES, "homebrew-feline"));
        const locked = { ...feline, manifest: { ...feline.manifest, visibility: "private", redistributable: false } };
        await useContentStore().loadFiles([bundleOf(locked as typeof feline, "feline.json")]);
        const wrapper = await open(KindPage, "/compendium/conditions?q=bruised");

        expect(names(wrapper)).toEqual(["Bruised lung"]);
        expect(wrapper.find(".compendium-list__private").text()).toBe("Private, on this device");
    });

    it("says when the section does not exist", async () =>
    {
        const wrapper = await open(KindPage, "/compendium/dragons");

        expect(wrapper.find("h1").text()).toBe("Section not found");
    });
});

describe("an entry", () =>
{
    it("shows a spell with its lines, its higher levels and its source", async () =>
    {
        const wrapper = await open(EntryPage, "/compendium/spells/srd51.spell.fireball");
        const lines = wrapper.findAll(".entry-card__line")
            .map((l) => `${l.find("dt").text()} ${l.find("dd").text()}`);

        expect(wrapper.find("h1").text()).toBe("Fireball");
        expect(wrapper.find(".entry-card__subtitle").text()).toBe("3rd-level evocation");
        expect(lines).toContain("Range 150 feet (20-foot-radius sphere)");
        expect(wrapper.find(".entry-card__section-title").text()).toBe("At Higher Levels");
        expect(wrapper.find(".entry-source").text()).toContain("System Reference Document 5.1");
    });

    it("shows it in Italian, in metres", async () =>
    {
        await useNuxtApp().$i18n.setLocale("it");
        const wrapper = await open(EntryPage, "/compendium/spells/srd51.spell.fireball");

        expect(wrapper.find("h1").text()).toBe("Palla di fuoco");
        expect(wrapper.findAll(".entry-card__line").map((l) => `${l.find("dt").text()} ${l.find("dd").text()}`))
            .toContain("Gittata 45 metri (sfera del raggio di 6 metri)");
    });

    it("shows a creature's stat block", async () =>
    {
        const wrapper = await open(EntryPage, "/compendium/creatures/srd51-creatures.creature.adult-red-dragon");

        expect(wrapper.find("h1").text()).toBe("Adult Red Dragon");
        expect(wrapper.find(".stat-block__kind").text()).toBe("Huge dragon, chaotic evil");
        expect(wrapper.findAll(".stat-block__abilities th").map((th) => th.text()))
            .toEqual(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
        expect(wrapper.findAll(".stat-block__section-title").map((h) => h.text()))
            .toEqual(["Actions", "Legendary Actions"]);
    });

    it("says when the entry is not on this device, or not in this section", async () =>
    {
        const missing = await open(EntryPage, "/compendium/spells/phb14.spell.nothing");
        expect(missing.find("h1").text()).toBe("Entry not found");

        const elsewhere = await open(EntryPage, "/compendium/items/srd51.spell.fireball");
        expect(elsewhere.find("h1").text()).toBe("Entry not found");
    });
});

describe("the navigation", () =>
{
    it("links to the compendium, in both languages", async () =>
    {
        const bar = await mountSuspended(NavigationBar);
        _mounted.push(bar);

        expect(bar.findAll(".navigation-bar__link").map((l) => l.text())).toContain("Compendium");
        await useNuxtApp().$i18n.setLocale("it");
        await flushPromises();
        expect(bar.findAll(".navigation-bar__link").map((l) => l.text())).toContain("Compendio");
    });
});
