/**
 * The creation wizard's page (docs/phase-1/04-character-creation.md): an archetype and "Next" alone reach the
 * background with its recommendations chosen; the reasons follow the help level; the steps are reachable from
 * the dots in any order; a stored draft is offered back; both languages without a raw key.
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import WizardPage from "@/pages/characters/new.vue";

import { byName } from "./accessibility";
import { clearBrowserStorage, serveSite } from "./helpers";

serveSite();

const MONK = "srd51.archetype.open-hand-wanderer";

let _mounted: VueWrapper | undefined;

async function open(step?: string): Promise<VueWrapper>
{
    _mounted = await mountSuspended(WizardPage, {
        route: step ? `/characters/new?step=${step}` : "/characters/new",
        attachTo: document.body
    });
    await until(() => _mounted!.find(".wizard-step, .wizard-page__resume").exists());

    return _mounted;
}

/** Waits for the page's asynchronous loading (the site's packages, the stored draft). */
async function until(ready: () => boolean): Promise<void>
{
    for (let i = 0; (i < 50) && !ready(); i += 1)
    {
        await flushPromises();
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

async function settle(): Promise<void>
{
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushPromises();
}

async function next(wrapper: VueWrapper): Promise<void>
{
    byName(wrapper, useNuxtApp().$i18n.t("wizard.next"))!.click();
    await settle();
}

beforeEach(async () =>
{
    useContentStore().reset();
    await useWizardStore().discard();
});
afterEach(async () =>
{
    _mounted?.unmount();
    _mounted = undefined;
    document.body.innerHTML = "";
    usePreferencesStore().$patch({ language: "en", helpLevel: "newcomer" });
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

describe("the creation wizard", () =>
{
    it("reaches the background with an archetype and Next alone", async () =>
    {
        const wrapper = await open();
        expect(wrapper.find("h1").text()).toBe("Content");

        await next(wrapper);
        expect(wrapper.find("h1").text()).toBe("Concept");
        const monk = wrapper.find<HTMLInputElement>(`input[value="${MONK}"]`);
        await monk.setValue(true);
        await settle();

        await next(wrapper);
        expect(wrapper.find("h1").text()).toBe("Species");
        expect(wrapper.find<HTMLInputElement>("input[value='srd51.species.dwarf']").element.checked).toBe(true);
        expect(wrapper.find<HTMLInputElement>("input[value='srd51.species.dwarf.hill-dwarf']").element.checked)
            .toBe(true);

        await next(wrapper);
        expect(wrapper.find("h1").text()).toBe("Class");
        const card = wrapper.find(".choice-card--checked");
        expect(card.text()).toContain("Monk");
        expect(card.text()).toContain("Recommended");
        expect(card.text()).toContain("Monks fight with their hands and feet");
        expect(card.text()).toContain("Primary abilities: Dexterity, Wisdom");

        await next(wrapper);
        expect(wrapper.find("h1").text()).toBe("Background");
        expect(useWizardStore().character?.choices.background).toBe("srd51.background.acolyte");
        await until(() => useRoute().query["step"] === "background");
        expect(useRoute().query["step"]).toBe("background");
    });

    it("shows the reasons inline for a newcomer, behind Why? for a regular player, not for an expert", async () =>
    {
        await useWizardStore().start();
        useWizardStore().chooseArchetype(MONK);
        const wrapper = await open("class");
        const card = (): string => wrapper.find(".choice-card--checked").text();

        expect(wrapper.find(".choice-card--checked .choice-card__more").exists()).toBe(false);
        expect(card()).toContain("Monks fight");

        usePreferencesStore().helpLevel = "regular";
        await settle();
        expect(wrapper.find(".choice-card--checked .choice-card__more summary").text()).toBe("Why?");
        expect(wrapper.find(".wizard-step__consequence").exists()).toBe(false);

        usePreferencesStore().helpLevel = "expert";
        await settle();
        expect(card()).not.toContain("Monks fight");
        expect(card()).not.toContain("Recommended");
        expect(wrapper.find(".wizard-step__purpose").exists()).toBe(false);
    });

    it("moves to any step from its dot, and says which steps are done", async () =>
    {
        const wrapper = await open();
        byName(wrapper, "5. Background")!.click();
        await settle();

        expect(wrapper.find("h1").text()).toBe("Background");
        expect(byName(wrapper, "1. Content, done")).toBeDefined();
        expect(wrapper.find("[aria-current='step']").text()).toContain("5");

        byName(wrapper, "8. Equipment")!.click();
        await settle();
        expect(wrapper.find(".wizard-pending").exists()).toBe(true);
    });

    it("offers a stored draft back, and starts again when asked", async () =>
    {
        await useWizardStore().start();
        useWizardStore().chooseArchetype(MONK);
        useWizardStore().goTo("class");
        await useWizardStore().save();
        useWizardStore().$patch({ character: undefined });

        const wrapper = await open();
        expect(wrapper.find("h1").text()).toBe("You have a character in progress");

        byName(wrapper, "Resume")!.click();
        await until(() => wrapper.find(".wizard-step").exists());
        expect(wrapper.find("h1").text()).toBe("Class");

        _mounted!.unmount();
        useWizardStore().$patch({ character: undefined });
        const again = await open();
        byName(again, "Start again")!.click();
        await until(() => again.find(".wizard-step").exists());
        expect(again.find("h1").text()).toBe("Content");
        expect(useWizardStore().character?.choices).toEqual({});
    });

    it("speaks Italian without a raw key", async () =>
    {
        usePreferencesStore().language = "it";
        await useNuxtApp().$i18n.setLocale("it");
        const wrapper = await open("class");

        expect(wrapper.find("h1").text()).toBe("Classe");
        expect(wrapper.text()).toContain("Caratteristiche primarie");
        expect(wrapper.text()).not.toMatch(/wizard\.|terms\.|sheet\.[a-z]/);
    });

    describe("step 5, ability scores", () =>
    {
        async function abilities(): Promise<VueWrapper>
        {
            await useWizardStore().start();
            useWizardStore().chooseArchetype(MONK);

            return open("abilities");
        }

        const row = (wrapper: VueWrapper, name: string) =>
            wrapper.findAll(".step-abilities__row").find((r) => r.find("th").text()
                .startsWith(name))!;
        const total = (wrapper: VueWrapper, name: string): string =>
            row(wrapper, name).find(".step-abilities__total")
                .text()
                .replace(/\s+/g, " ");

        it("shows the dealt array with the species bonuses and the totals", async () =>
        {
            const wrapper = await abilities();

            expect(wrapper.find("h1").text()).toBe("Ability scores");
            expect(row(wrapper, "Dexterity").find("select").element.value).toBe("15");
            expect(row(wrapper, "Dexterity").text()).toContain("primary ability");
            expect(total(wrapper, "Constitution")).toBe("15 (+2)");
            expect(row(wrapper, "Constitution").find(".step-abilities__bonus")
                .text()).toBe("+2");
        });

        it("swaps two scores from one menu", async () =>
        {
            const wrapper = await abilities();
            await row(wrapper, "Strength").find("select")
                .setValue("15");
            await settle();

            expect(row(wrapper, "Strength").find("select").element.value).toBe("15");
            expect(row(wrapper, "Dexterity").find("select").element.value).toBe("12");
        });

        it("buys with points and says how many are left", async () =>
        {
            const wrapper = await abilities();
            await wrapper.find("input[value='point-buy']").setValue(true);
            await settle();

            expect(wrapper.find(".step-abilities__points").text()).toBe("Points left: 0 of 27");
            byName(wrapper, "Lower Dexterity")!.click();
            await settle();
            expect(wrapper.find(".step-abilities__points").text()).toBe("Points left: 2 of 27");
            expect(total(wrapper, "Dexterity")).toBe("14 (+2)");
        });

        it("places six typed rolls, highest in the recommended order", async () =>
        {
            const wrapper = await abilities();
            await wrapper.find("input[value='roll']").setValue(true);
            await settle();
            const inputs = wrapper.findAll(".step-abilities__roll-input");
            for (const [i, value] of ["14", "9", "17", "12", "11", "15"].entries())
            {
                await inputs[i]!.setValue(value);
                await inputs[i]!.trigger("change");
            }
            await settle();

            expect(row(wrapper, "Dexterity").find("select").element.value).toBe("17");
            expect(row(wrapper, "Wisdom").find("select").element.value).toBe("15");
        });

        it("keeps adjustments closed for a newcomer, open for an expert, and adds them to the total", async () =>
        {
            const wrapper = await abilities();
            const details = (): HTMLDetailsElement =>
                wrapper.find<HTMLDetailsElement>(".step-abilities__adjustments").element;
            expect(details().open).toBe(false);

            usePreferencesStore().helpLevel = "expert";
            await settle();
            expect(details().open).toBe(true);

            const strength = wrapper.findAll(".step-abilities__adjust")
                .find((a) => a.text().startsWith("Strength"))!.find("input");
            await strength.setValue("2");
            await strength.trigger("change");
            await settle();
            expect(total(wrapper, "Strength")).toBe("14 (+2)");
        });

        it("speaks Italian", async () =>
        {
            usePreferencesStore().language = "it";
            await useNuxtApp().$i18n.setLocale("it");
            const wrapper = await abilities();

            expect(wrapper.find("h1").text()).toBe("Caratteristiche");
            expect(wrapper.text()).toContain("Serie standard");
            expect(wrapper.text()).not.toMatch(/wizard\.|sheet\.[a-z]/);
        });
    });
});
