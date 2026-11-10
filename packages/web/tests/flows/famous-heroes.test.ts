/**
 * The famous characters' extension (DEC-27, docs/phase-1/14-wizard-steps-revision.md): on by default, its twelve
 * heroes replace the SRD's ideas in step 1; each one reaches the review with nothing open on the SRD alone, with a
 * background of their own where the SRD has none for them; off, the SRD's ideas come back; the packages page
 * turns it off. With the owner's Player's Handbook (private), a hero takes the preferred subclass and background.
 */

import "fake-indexeddb/auto";

import { existsSync } from "node:fs";
import { join } from "node:path";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import type { Archetype } from "@byloth/dnd-platform-schema";

import { usePackageLoader } from "@/composables/packages";
import WizardPage from "@/pages/characters/new.vue";
import PackagesPage from "@/pages/packages/index.vue";

import { byName } from "../accessibility";
import { clearBrowserStorage, FAN_HEROES, PRIVATE, serveSite, zipOf } from "../helpers";

serveSite({ fanHeroes: true });

const HEROES = (FAN_HEROES?.entities ?? [])
    .filter((e) => e.type === "archetype")
    .map((e) => e.data as Archetype);
const BOOK = join(PRIVATE, "phb14");
const book = existsSync(join(BOOK, "package.yaml"));

let _mounted: VueWrapper | undefined;

async function until(ready: () => boolean): Promise<void>
{
    for (let i = 0; (i < 200) && !ready(); i += 1)
    {
        await flushPromises();
        await new Promise((done) => setTimeout(done, 10));
    }
}
async function settle(): Promise<void>
{
    await flushPromises();
    await new Promise((done) => setTimeout(done, 0));
    await flushPromises();
}
async function next(wrapper: VueWrapper): Promise<void>
{
    const before = useWizardStore().step;
    byName(wrapper, "Next")!.click();
    await until(() => useWizardStore().step !== before);
    await settle();
}
/** Every group of the step not yet full takes its first options that can still be chosen. */
async function answerEverything(wrapper: VueWrapper): Promise<void>
{
    const open = () => wrapper.findAll(".choice-group")
        .find((g) => !g.find(".choice-group__progress--done").exists());
    const available = () => open()?.findAll<HTMLInputElement>("input.choice-card__input")
        .find((o) => !o.element.checked && !o.element.disabled);
    for (let i = 0; i < 60; i += 1)
    {
        if (!open()) { return; }
        await until(() => !open() || (available() !== undefined));
        if (!open()) { return; }
        await available()!.setValue(true);
        await settle();
    }
    throw new Error("the step never filled up");
}
async function concept(): Promise<VueWrapper>
{
    _mounted = await mountSuspended(WizardPage, { route: "/characters/new?step=concept", attachTo: document.body });
    const wrapper = _mounted;
    await until(() => wrapper.find(".wizard-step").exists());
    await wrapper.find("input[value='sketched']").setValue(true);
    await settle();

    return wrapper;
}

beforeEach(async () =>
{
    useContentStore().reset();
    await useWizardStore().discard();
    usePreferencesStore().$patch({ language: "en", helpLevel: "newcomer", fanHeroes: true });
});
afterEach(async () =>
{
    _mounted?.unmount();
    _mounted = undefined;
    document.body.innerHTML = "";
    usePreferencesStore().$patch({ fanHeroes: true });
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

describe.skipIf(!FAN_HEROES)("the famous characters' extension", () =>
{
    it("has twelve heroes, one per class, that replace the SRD's ideas", async () =>
    {
        expect(new Set(HEROES.map((h) => h.recommends.class)).size).toBe(12);

        const wrapper = await concept();
        const ideas = wrapper.findAll("input[name='archetype']").map((i) => i.attributes("value"));
        expect(ideas).toHaveLength(12);
        expect(ideas.every((id) => id?.startsWith("fan-heroes."))).toBe(true);
        expect(useWizardStore().steps).not.toContain("content");
        expect(wrapper.text()).toContain("Geralt of Rivia");
    });

    for (const hero of HEROES)
    {
        it(`${hero.name["en"]}: created with Next alone on the SRD, nothing open at the review`, async () =>
        {
            const wrapper = await concept();
            await wrapper.find(`input[value='${hero.id}']`).setValue(true);
            await settle();
            while (useWizardStore().step !== "personality")
            {
                if (wrapper.find(".choice-group").exists()) { await answerEverything(wrapper); }
                await next(wrapper);
            }
            await wrapper.find(".step-personality__input").setValue(hero.name["en"]!);
            await until(() => useWizardStore().character?.name === hero.name["en"]);
            await next(wrapper);
            await until(() => wrapper.find(".step-review__status").exists());

            expect(wrapper.findAll(".step-review__issue-text").map((i) => i.text())).toEqual([]);
            const choices = useWizardStore().character!.choices;
            // The SRD has no background for them but the Acolyte: one of their own, by name.
            if (hero.recommends.customBackground)
            {
                expect(choices.customBackground?.name).toBe(hero.recommends.customBackground.name["en"]);
                expect(choices.background).toBeUndefined();
            }
            else { expect(choices.background).toBe(hero.recommends.background); }
        });
    }

    it("speaks Italian: the names, the sagas and the backgrounds of their own", async () =>
    {
        usePreferencesStore().language = "it";
        await useNuxtApp().$i18n.setLocale("it");
        const wrapper = await concept();

        expect(wrapper.text()).toContain("Geralt di Rivia");
        expect(wrapper.text()).toContain("Ken il guerriero");
        expect(wrapper.text()).not.toMatch(/wizard\.|sheet\.[a-z]/);
        await wrapper.find("input[value='fan-heroes.archetype.lupin']").setValue(true);
        await settle();
        expect(useWizardStore().character?.choices.customBackground?.name).toBe("Ladro gentiluomo");
    });

    it("gives the SRD's ideas back when it is off", async () =>
    {
        usePreferencesStore().fanHeroes = false;
        const wrapper = await concept();
        const ideas = wrapper.findAll("input[name='archetype']").map((i) => i.attributes("value"));

        expect(ideas.length).toBe(12);
        expect(ideas.every((id) => id?.startsWith("srd51."))).toBe(true);
    });

    it("is turned off from the packages page, in its own section, never as a package", async () =>
    {
        _mounted = await mountSuspended(PackagesPage, { route: "/packages", attachTo: document.body });
        const wrapper = _mounted;
        await until(() => wrapper.find("#packages-extensions-heading").exists());

        expect(wrapper.find("#packages-extensions-heading").text()).toBe("Extensions");
        expect(wrapper.find(".packages-page__extensions").text()).toContain("Famous heroes");
        expect(wrapper.findAll(".package-card").map((c) => c.text())
            .join(" ")).not.toContain("Famous heroes");

        await wrapper.find("input[value='fan-heroes']").setValue(false);
        await settle();
        expect(usePreferencesStore().fanHeroes).toBe(false);
    });
});

describe.skipIf(!FAN_HEROES || !book)("the famous characters with the Player's Handbook (private)", () =>
{
    it("takes the preferred subclass and background when the book is in the draft", async () =>
    {
        const { load } = usePackageLoader();
        const phb14 = await load(zipOf(BOOK, "phb14"));
        const wizard = useWizardStore();
        await wizard.start();
        await wizard.choosePackages([{ id: "phb14", version: phb14.record.source.manifest.version }]);

        wizard.chooseArchetype("fan-heroes.archetype.shadowheart");
        expect(wizard.character?.choices.classes?.[0]?.subclass).toBe("phb14.subclass.cleric.trickery-domain");
        expect(wizard.character?.choices.answers?.["srd51.class.cleric#divine-domain"])
            .toEqual(["phb14.subclass.cleric.trickery-domain"]);

        wizard.chooseArchetype("fan-heroes.archetype.geralt");
        expect(wizard.character?.choices.background).toBe("phb14.background.outlander");
        expect(wizard.character?.choices.customBackground).toBeUndefined();
        // The Eldritch Knight comes at level 3: a level 1 fighter has no subclass yet.
        expect(wizard.character?.choices.classes?.[0]?.subclass).toBeUndefined();

    }, 60_000);
});
