/**
 * The Italian content (docs/phase-1/11): with the interface in Italian the SRD's translation comes by itself,
 * never as a package to choose; entity names on the wizard and the sheet are Italian; English is unchanged.
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import CharacterPage from "@/pages/characters/[id]/index.vue";
import CreditsPage from "@/pages/credits.vue";
import WizardPage from "@/pages/characters/new.vue";

import { clearBrowserStorage, serveDemoCharacters, serveSite, SRD_IT } from "./helpers";

serveSite();
serveDemoCharacters(["cleric-l5"]);

let _mounted: VueWrapper | undefined;

async function until(ready: () => boolean): Promise<void>
{
    for (let i = 0; (i < 300) && !ready(); i += 1)
    {
        await flushPromises();
        await new Promise((done) => setTimeout(done, 10));
    }
}

async function speak(language: "en" | "it"): Promise<void>
{
    usePreferencesStore().language = language;
    await useNuxtApp().$i18n.setLocale(language);
}

afterEach(async () =>
{
    _mounted?.unmount();
    _mounted = undefined;
    document.body.innerHTML = "";
    await useWizardStore().discard();
    useContentStore().reset();
    await speak("en");
    await clearBrowserStorage();
});

describe.skipIf(!SRD_IT)("the Italian content", () =>
{
    it("adds the translation of the interface's language to a character's packages, and only that", async () =>
    {
        await speak("it");
        const italian = await useContentStore().sources(["srd51"]);
        expect(italian.map((s) => s.manifest.id)).toEqual(["srd51", "srd51-it"]);

        await speak("en");
        expect((await useContentStore().sources(["srd51"])).map((s) => s.manifest.id)).toEqual(["srd51"]);
    });

    it("never offers the translation as a package at step 0, and names the species in Italian", async () =>
    {
        await speak("it");
        _mounted = await mountSuspended(WizardPage, { route: "/characters/new?step=content", attachTo: document.body });
        await until(() => _mounted!.find(".choice-card").exists());
        expect(_mounted.findAll(".choice-card").map((c) => c.text())
            .join(" ")).not.toContain("italiano");

        useWizardStore().goTo("species");
        await until(() => _mounted!.text().includes("Nano"));
        expect(_mounted.text()).toContain("Nano");
        expect(_mounted.text()).toContain("Mezzelfo");
    });

    it("shows the sheet's classes and items in Italian", async () =>
    {
        await speak("it");
        _mounted = await mountSuspended(CharacterPage, { route: "/characters/fixture-cleric-l5" });
        await until(() => _mounted!.text().includes("Chierico"));

        expect(_mounted.text()).toContain("Chierico 5");
        expect(_mounted.text()).not.toContain("Cleric 5");
    });

    it("credits the Italian translation with its own attribution", async () =>
    {
        await speak("it");
        _mounted = await mountSuspended(CreditsPage);
        await until(() => _mounted!.text().includes("Questo lavoro include materiale"));

        expect(_mounted.text()).toContain("System Reference Document 5.1 (italiano)");
    });
});
