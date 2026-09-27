/**
 * The compendium's data (docs/phase-1/13-compendium.md, M1.Cb): the package set of everything the device has,
 * the creatures fetched only when asked; the index of every kind with the composer's wording; a search that
 * forgives case, accents and word order and knows the English names; the filters and the address round trip.
 */

import "fake-indexeddb/auto";

import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadPackages } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import {
    entriesOf, filter, filterOptions, fromQuery, normalize, search, toQuery, useCompendium
} from "@/composables/compendium";
import type { CompendiumEntry, CompendiumKind } from "@/composables/compendium";

import {
    bundleOf, clearBrowserStorage, CREATURES, CREATURES_IT, FIXTURES, serveSite, SRD, SRD_IT, zipOf
} from "./helpers";

const site = serveSite();

afterEach(async () =>
{
    await useNuxtApp().$i18n.setLocale("en");
    useContentStore().reset();
    // Package sets are remembered by id and version: the same fixture, public here and private there, is not.
    useEngine().clear();
    await clearBrowserStorage();
});

const english = loadPackages([SRD, CREATURES!]);
const italian = loadPackages([SRD, CREATURES!, SRD_IT!, CREATURES_IT!]);
const names = (entries: readonly CompendiumEntry[]): string[] => entries.map((e) => e.name);
const find = (kind: CompendiumKind, id: string, language = "en"): CompendiumEntry =>
    entriesOf(language === "en" ? english : italian, kind, language).find((e) => e.id === id)!;

describe("the compendium's package set", () =>
{
    it("has the site's and the stored packages, and never fetches the creatures unasked", async () =>
    {
        await useContentStore().loadFiles([zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline")]);
        const { packages, skipped } = await useCompendium().set({ creatures: false });

        expect(packages.order.map((m) => m.id)).toEqual(expect.arrayContaining(["srd51", "homebrew.byloth"]));
        expect([...packages.entities.values()].some((e) => e.type === "creature")).toBe(false);
        expect(skipped).toEqual([]);
        expect(site.creatureFetches()).toBe(0);
    });

    it("fetches the creatures once when the bestiary asks, with their Italian in Italian", async () =>
    {
        const first = await useCompendium().set({ creatures: true });
        await useCompendium().set({ creatures: true });

        expect(first.packages.entities.has("srd51-creatures.creature.goblin")).toBe(true);
        expect(site.creatureFetches()).toBe(1);

        await useNuxtApp().$i18n.setLocale("it");
        const { packages } = await useCompendium().set({ creatures: true });

        expect(packages.order.map((m) => m.id)).toEqual(expect.arrayContaining(["srd51-it", "srd51-creatures-it"]));
        expect(entriesOf(packages, "creatures", "it").find((e) => e.id.endsWith(".adult-red-dragon"))!.name)
            .toBe("Drago rosso adulto");
    });

    it("leaves out a stored package that cannot load with the rest, and says which", async () =>
    {
        await useContentStore().loadFiles([
            zipOf(join(FIXTURES, "mini-ruleset-b"), "mini-ruleset-b"),
            zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline")
        ]);
        const { packages, skipped } = await useCompendium().set({ creatures: false });

        expect(skipped).toEqual(["minib"]);
        expect(packages.diagnostics.ok).toBe(true);
        expect(packages.order.map((m) => m.id)).toEqual(expect.arrayContaining(["srd51", "homebrew.byloth"]));
    });

    it("flags the entries of a private package", async () =>
    {
        const feline = readPackageSource(join(FIXTURES, "homebrew-feline"));
        const locked = { ...feline, manifest: { ...feline.manifest, visibility: "private", redistributable: false } };
        await useContentStore().loadFiles([bundleOf(locked as typeof feline, "feline.json")]);
        expect(useContentStore().loads[0]!.status).toBe("done");
        const { packages } = await useCompendium().set({ creatures: false });
        const conditions = entriesOf(packages, "conditions", "en");

        expect(conditions.some((e) => e.private)).toBe(true);
        expect(conditions.filter((e) => e.private).every((e) => e.facets.packageId === feline.manifest.id)).toBe(true);
        expect(conditions.filter((e) => e.facets.packageId === "srd51").some((e) => e.private)).toBe(false);
    });
});

describe("the index", () =>
{
    it("lists every kind of the SRD, in the kind's order", () =>
    {
        expect(entriesOf(english, "spells", "en").length).toBe(319);
        expect(entriesOf(english, "creatures", "en").length).toBe(322);
        expect(entriesOf(english, "conditions", "en").length).toBe(15);
        expect(entriesOf(english, "items", "en").length).toBeGreaterThan(450);
        expect(entriesOf(english, "spells", "en")[0]!.facets.level).toBe(0);
        expect(entriesOf(english, "creatures", "en")[0]!.facets.challenge).toBe(0);
        expect(entriesOf(english, "spells", "en")).toBe(entriesOf(english, "spells", "en"));
    });

    it("takes the wording from the composer", () =>
    {
        const fireball = find("spells", "srd51.spell.fireball");

        expect(fireball.subtitle).toBe("3rd-level evocation");
        expect(fireball.summary).toBe("A bright streak flashes from your pointing finger to a point you choose " +
            "within range and then blossoms with a low roar into an explosion of flame.");
        expect(fireball.facets.classes).toEqual(["srd51.class.sorcerer", "srd51.class.wizard"]);
        expect(find("items", "srd51.item.flame-tongue").subtitle)
            .toBe("Weapon (any sword), rare (requires attunement)");
        expect(find("creatures", "srd51-creatures.creature.adult-red-dragon").subtitle)
            .toBe("Huge dragon, chaotic evil");
        expect(find("spells", "srd51.spell.fireball", "it").subtitle).toBe("Invocazione di 3° livello");
    });
});

describe("the search", () =>
{
    const spellsIt = entriesOf(italian, "spells", "it");

    it("forgets case, accents and punctuation", () =>
    {
        expect(normalize("Palla di Fuòco!")).toBe("palla di fuoco");
        expect(normalize("Explorer's Pack")).toBe("explorer s pack");
        expect(names(search(spellsIt, "PALLA DI FUÒCO"))[0]).toBe("Palla di fuoco");
    });

    it("finds an Italian name by its start, and by its English name", () =>
    {
        expect(names(search(spellsIt, "palla"))[0]).toBe("Palla di fuoco");
        expect(names(search(spellsIt, "fireball"))[0]).toBe("Palla di fuoco");
        expect(names(search(spellsIt, "fuoco palla"))).toContain("Palla di fuoco");
    });

    it("ranks the whole name, then its start, then a word, then anywhere", () =>
    {
        const spells = entriesOf(english, "spells", "en");
        const found = names(search(spells, "fire"));

        expect(found.indexOf("Fire Bolt")).toBeLessThan(found.indexOf("Delayed Blast Fireball"));
        expect(found.indexOf("Delayed Blast Fireball")).toBeLessThan(found.indexOf("Wall of Fire") + 1000);
        expect(names(search(spells, "shield"))[0]).toBe("Shield");
        expect(search(spells, "")).toEqual(spells);
        expect(search(spells, "zzzz")).toEqual([]);
    });
});

describe("the filters and the address", () =>
{
    const spells = entriesOf(english, "spells", "en");
    const items = entriesOf(english, "items", "en");
    const creatures = entriesOf(english, "creatures", "en");

    it("filters spells by level, school, class, ritual and concentration", () =>
    {
        const evocations = filter(spells, "spells", { level: "3", school: "evocation", class: "srd51.class.wizard" });

        expect(names(evocations)).toContain("Fireball");
        expect(evocations.every((e) => (e.facets.level === 3) && (e.facets.school === "evocation"))).toBe(true);
        expect(names(filter(spells, "spells", { ritual: "yes" }))).toContain("Detect Magic");
        expect(filter(spells, "spells", { concentration: "yes" }).every((e) => e.facets.concentration)).toBe(true);
    });

    it("filters items by rarity and attunement, creatures by challenge, type and source", () =>
    {
        const rare = filter(items, "items", { rarity: "rare", attunement: "yes" });

        expect(names(rare)).toContain("Flame Tongue");
        expect(rare.every((e) => (e.facets.rarity === "rare") && e.facets.attunement)).toBe(true);
        const beasts = filter(creatures, "creatures", { crMin: "1/4", crMax: "2", type: "beast" });

        expect(beasts.length).toBeGreaterThan(10);
        expect(beasts.every((e) => (e.facets.challenge! >= 0.25) && (e.facets.challenge! <= 2))).toBe(true);
        expect(filter(creatures, "creatures", { source: "srd51" })).toEqual([]);
    });

    it("reads the address, drops what it does not know, and writes it back", () =>
    {
        const state = fromQuery("spells", { q: " palla ", level: "3", school: "evocation", junk: "1", ritual: "no" });

        expect(state).toEqual({ q: "palla", filters: { level: "3", school: "evocation" } });
        expect(fromQuery("spells", { level: "x" }).filters).toEqual({});
        expect(fromQuery("spells", toQuery(state))).toEqual(state);
        expect(toQuery({ q: "", filters: { school: "", level: "0" } })).toEqual({ level: "0" });
        expect(fromQuery("creatures", { crMin: "1/4", crMax: "31" }).filters).toEqual({ crMin: "1/4" });
    });

    it("offers only the values present", () =>
    {
        const options = filterOptions(spells);

        expect(options["level"]).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
        expect(options["school"]).toContain("evocation");
        expect(filterOptions(creatures)["type"]).toContain("dragon");
    });
});
