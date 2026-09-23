/**
 * A character's sheet page: derived in the interface language at the preferences' help level; an unknown id and
 * a package installed nowhere are explained, never a crash (docs/13-ux-and-accessibility.md).
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";

import CharacterPage from "@/pages/characters/[id]/index.vue";

import { clearBrowserStorage, serveDemoCharacters, serveSite } from "./helpers";

serveSite();
serveDemoCharacters(["cleric-l5"]);

// A character that uses a package the site does not publish and the browser does not have.
registerEndpoint("/dnd-platform/content/characters/index.json", () => [
    { id: "fixture-cleric-l5", name: "Stone Lantern", summary: "" },
    { id: "needs-a-book", name: "Needs a book", summary: "" }
]);
registerEndpoint("/dnd-platform/content/characters/needs-a-book.json", () => ({
    id: "needs-a-book", name: "Needs a book", packages: [{ id: "phb14", version: "0.1.0" }]
}));

afterEach(async () =>
{
    usePreferencesStore().$patch({ language: "en", helpLevel: "newcomer" });
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

async function open(id: string)
{
    const wrapper = await mountSuspended(CharacterPage, { route: `/characters/${id}` });
    await flushPromises();

    return wrapper;
}

describe("the character page", () =>
{
    it("shows the sheet in words for a newcomer, and without them at the regular level", async () =>
    {
        const wrapper = await open("fixture-cleric-l5");

        expect(wrapper.find("h1").text()).toBe("Stone Lantern");
        expect(wrapper.find("#section-core .explain").text()).toContain("Chain mail sets the starting value at 16.");
        expect(wrapper.findAll(".summary").length).toBeGreaterThan(0);

        usePreferencesStore().helpLevel = "regular";
        await flushPromises();
        expect(wrapper.findAll(".summary").length).toBe(0);
        expect(wrapper.find("#section-core .explain").text()).toContain("Chain mail");
        expect(wrapper.find("#section-core .explain").text()).not.toContain("sets the starting value");
    });

    it("speaks Italian when the interface does", async () =>
    {
        await useNuxtApp().$i18n.setLocale("it");
        const wrapper = await open("fixture-cleric-l5");

        expect(wrapper.find("#section-core h2").text()).toBe("Valori principali");
        expect(wrapper.text()).toContain("Classe Armatura");
    });

    it("explains an unknown character and a package installed nowhere", async () =>
    {
        const unknown = await open("nobody");
        expect(unknown.find("[role=alert] h1").text()).toBe("Character not found");

        const missing = await open("needs-a-book");
        expect(missing.find("[role=alert]").text()).toContain("the package phb14");
        expect(missing.find("[role=alert] a").attributes("href")).toContain("/packages");
    });
});
