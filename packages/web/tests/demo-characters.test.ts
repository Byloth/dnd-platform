/**
 * The demo characters in the interface's language (owner, 2026-09-29): the site's index gives each one's name and
 * classes per language; the characters page lists them in Italian when the interface is Italian, and their sheet
 * takes the same name. From the player's second character of their own, they fold into a closed disclosure with
 * their count (owner, 2026-10-07).
 */

import "fake-indexeddb/auto";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { flushPromises } from "@vue/test-utils";
import { parse } from "yaml";
import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";

import CharactersPage from "@/pages/index.vue";
import CharacterPage from "@/pages/characters/[id]/index.vue";

import { clearBrowserStorage, ROOT, serveSite } from "./helpers";

serveSite();

const cleric = parse(readFileSync(resolve(ROOT, "fixtures", "characters", "cleric-l5", "character.yaml"), "utf8")) as
    { id: string };
registerEndpoint("/dnd-platform/content/characters/index.json", () => [{
    id: cleric.id,
    name: { en: "Stone Lantern", it: "Lanterna di Pietra" },
    summary: { en: "Cleric 5", it: "Chierico 5" }
}]);
registerEndpoint(`/dnd-platform/content/characters/${cleric.id}.json`, () => cleric);

afterEach(async () =>
{
    usePreferencesStore().language = "en";
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

describe("the demo characters", () =>
{
    it("are listed with their names and classes in the interface's language", async () =>
    {
        const page = await mountSuspended(CharactersPage);
        await flushPromises();
        expect(page.find(".character-card__name").text()).toBe("Stone Lantern");
        expect(page.find(".character-card__summary").text()).toBe("Cleric 5");

        await useNuxtApp().$i18n.setLocale("it");
        await flushPromises();
        await flushPromises();
        expect(page.find(".character-card__name").text()).toBe("Lanterna di Pietra");
        expect(page.find(".character-card__summary").text()).toBe("Chierico 5");
        page.unmount();
    });

    it("keep that name on their sheet", async () =>
    {
        usePreferencesStore().language = "it";
        await useNuxtApp().$i18n.setLocale("it");
        const sheet = await mountSuspended(CharacterPage, { route: `/characters/${cleric.id}` });
        await flushPromises();

        expect(sheet.find("h1").text()).toBe("Lanterna di Pietra");
        sheet.unmount();
    });

    it.each([[0, false], [1, false], [2, true]] as const)(
        "with %i characters of the player's own, are folded: %s",
        async (count, folded) =>
        {
            const fighter = parse(readFileSync(
                resolve(ROOT, "fixtures", "characters", "plain-fighter-l1", "character.yaml"), "utf8"
            )) as Record<string, unknown>;
            for (let i = 0; i < count; i += 1)
            {
                await useBrowserStorage().characters.put({ ...fighter, id: `mine-${i}`, name: `Mine ${i}` } as never);
            }
            clearNuxtData("characters");

            const page = await mountSuspended(CharactersPage);
            await flushPromises();
            const demo = page.find("section[aria-labelledby='characters-demo-heading']");

            expect(demo.find("details").exists()).toBe(folded);
            if (folded)
            {
                expect(demo.find("details").attributes("open")).toBeUndefined();
                expect(demo.find("summary h2").text()).toBe("Demo characters (1)");
            }
            else { expect(demo.find("h2").text()).toBe("Demo characters"); }
            page.unmount();
        }
    );
});
