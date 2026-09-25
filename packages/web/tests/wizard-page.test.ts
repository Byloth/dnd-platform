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

        byName(wrapper, "9. Personality")!.click();
        await settle();
        expect(wrapper.find(".step-personality").exists()).toBe(true);
        expect(byName(wrapper, "9. Personality, done")).toBeUndefined();
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

    describe("step 6, the remaining choices", () =>
    {
        async function choices(archetype: string): Promise<VueWrapper>
        {
            await useWizardStore().start();
            useWizardStore().chooseArchetype(`srd51.archetype.${archetype}`);

            return open("choices");
        }

        const group = (wrapper: VueWrapper, eyebrow: string, title: string) =>
            wrapper.findAll(".choice-group").find((g) => g.find(".choice-group__eyebrow").text() === eyebrow &&
                g.find(".choice-group__title").text() === title)!;

        it("counts the Acolyte's two languages and holds the others once both are chosen", async () =>
        {
            const wrapper = await choices("raging-defender");
            const languages = group(wrapper, "Acolyte", "Languages");
            expect(languages.find(".choice-group__progress").text()).toBe("Choose 2 · 0 of 2 chosen");

            await languages.find("input[value='dwarvish']").setValue(true);
            await languages.find("input[value='giant']").setValue(true);
            await settle();

            const after = group(wrapper, "Acolyte", "Languages");
            expect(after.find(".choice-group__progress").text()).toBe("Choose 2 · 2 of 2 chosen");
            expect(after.find<HTMLInputElement>("input[value='goblin']").element.disabled).toBe(true);
            expect(after.text()).toContain("remove one to choose another");
            expect(useWizardStore().character?.choices.answers?.["srd51.background.acolyte#languages"])
                .toEqual(["dwarvish", "giant"]);
        });

        it("searches an evoker's cantrips and names the fighter's fighting styles", async () =>
        {
            const wrapper = await choices("evoker");
            const cantrips = group(wrapper, "Wizard", "Cantrips");
            await cantrips.find("input[type='search']").setValue("fire");
            await settle();
            expect(group(wrapper, "Wizard", "Cantrips").findAll(".choice-card__title")
                .map((c) => c.text()))
                .toEqual(["Fire Bolt"]);

            wrapper.unmount();
            _mounted = undefined;
            const fighter = await choices("sword-and-shield");
            const styles = group(fighter, "Fighter", "Fighting Style");
            expect(styles.text()).toContain("Defense");
            expect(styles.text()).toContain("While you are wearing armor");
        });

        it("marks the step done once every choice is answered", async () =>
        {
            const wrapper = await choices("oathbound-champion");
            expect(stepDone("choices")).toBe(false);

            const languages = group(wrapper, "Acolyte", "Languages");
            await languages.find("input[value='dwarvish']").setValue(true);
            await languages.find("input[value='giant']").setValue(true);
            await settle();

            expect(stepDone("choices")).toBe(true);
            expect(byName(wrapper, "7. Other choices, done")).toBeDefined();
        });

        it("speaks Italian", async () =>
        {
            usePreferencesStore().language = "it";
            await useNuxtApp().$i18n.setLocale("it");
            const wrapper = await choices("evoker");

            expect(wrapper.find("h1").text()).toBe("Altre scelte");
            expect(wrapper.text()).toContain("Scegline 3");
            expect(wrapper.text()).toContain("Invocazione");
            expect(wrapper.text()).not.toMatch(/wizard\.|sheet\.[a-z]/);
        });
    });

    describe("step 7, equipment", () =>
    {
        async function equipment(archetype: string): Promise<VueWrapper>
        {
            await useWizardStore().start();
            useWizardStore().chooseArchetype(`srd51.archetype.${archetype}`);

            return open("equipment");
        }

        it("offers the class's options, a holy symbol to pick and the pack's contents", async () =>
        {
            const wrapper = await equipment("steadfast-healer");

            expect(wrapper.find("h1").text()).toBe("Equipment");
            expect(wrapper.text()).toContain("A holy symbol");
            const symbols = wrapper.findAll(".step-equipment__row select").at(-1)!;
            expect(symbols.findAll("option").map((o) => o.text())).toEqual(["Amulet", "Emblem", "Reliquary"]);
            expect(wrapper.text()).toContain("Priest's Pack:");
            expect(wrapper.text()).toContain("10 × Candle");
        });

        it("fills the coins with the suggestion and moves it when an item is removed", async () =>
        {
            const wrapper = await equipment("sword-and-shield");
            await settle();

            expect(useWizardStore().character?.state.currency).toEqual({ gold: 15 });
            expect(wrapper.find(".step-equipment__suggested").text()).toBe("Suggested: 15 gp");

            byName(wrapper, "Remove Pouch")!.click();
            await settle();
            expect(wrapper.find(".step-equipment__suggested").text()).toBe("Suggested: 15 gp, 5 sp");
            byName(wrapper, "Use the suggestion")!.click();
            await settle();
            expect(useWizardStore().character?.state.currency).toEqual({ gold: 15, silver: 5 });
            expect(stepDone("equipment")).toBe(true);
        });

        it("adds an item from the shop and lets it be unequipped", async () =>
        {
            const wrapper = await equipment("sword-and-shield");
            await wrapper.find(".step-equipment__search input").setValue("dagg");
            await settle();
            byName(wrapper, "Add Dagger")!.click();
            await settle();

            expect(useWizardStore().equipment.added).toEqual([{ item: "srd51.item.dagger", quantity: 1 }]);
            const toggle = wrapper.findAll(".step-equipment__equip")
                .find((l) => l.text().includes("Chain mail"))!.find("input");
            await toggle.setValue(false);
            await settle();
            const carried = useWizardStore().character?.choices.equipment ?? [];
            expect(carried.find((e) => e.item === "srd51.item.chain-mail")?.equipped).toBe(false);
        });

        it("speaks Italian", async () =>
        {
            usePreferencesStore().language = "it";
            await useNuxtApp().$i18n.setLocale("it");
            const wrapper = await equipment("sword-and-shield");
            await settle();

            expect(wrapper.find("h1").text()).toBe("Equipaggiamento");
            expect(wrapper.text()).toContain("Un'arma da guerra a scelta");
            expect(wrapper.find(".step-equipment__suggested").text()).toBe("Suggerite: 15 mo");
            expect(wrapper.text()).not.toMatch(/wizard\.|sheet\.[a-z]/);
        });
    });

    describe("step 8, personality", () =>
    {
        it("fills a field from the background's suggestions, and adds a line with a second one", async () =>
        {
            await useWizardStore().start();
            useWizardStore().chooseArchetype("srd51.archetype.steadfast-healer");
            const wrapper = await open("personality");

            expect(wrapper.find("h1").text()).toBe("Personality");
            const optimist = "Nothing can shake my optimistic attitude.";
            byName(wrapper, `Use for Personality traits: ${optimist}`)!.click();
            await settle();
            const charity = "Charity. I always try to help those in need, no matter what the personal cost.";
            byName(wrapper, `Use for Ideals: ${charity}`)!.click();
            await settle();

            const personality = useWizardStore().character?.choices.personality;
            expect(personality?.traits).toEqual({ en: optimist });
            expect(personality?.ideals).toEqual({ en: charity });
            expect(byName(wrapper, `Use for Personality traits: ${optimist}`)!.hasAttribute("disabled")).toBe(true);

            const quoter = "I quote (or misquote) sacred texts and proverbs in almost every situation.";
            byName(wrapper, `Use for Personality traits: ${quoter}`)!.click();
            await settle();
            expect(useWizardStore().character?.choices.personality?.traits?.["en"]?.split("\n")).toHaveLength(2);
        });

        it("names the ruleset's alignments and says what the chosen one means", async () =>
        {
            await useWizardStore().start();
            const wrapper = await open("personality");

            const menu = wrapper.find(".step-personality__section select");
            expect(menu.findAll("option").map((o) => o.text())).toContain("Chaotic Good");
            await menu.setValue("neutral");
            await settle();

            expect(useWizardStore().character?.choices.alignment).toBe("neutral");
            expect(wrapper.text()).toContain("Neutral (N) is the alignment of those who prefer to steer clear");
            expect(stepDone("personality")).toBe(false);
            await wrapper.find(".step-personality__section input").setValue("Mira");
            await settle();
            expect(stepDone("personality")).toBe(true);
        });

        it("speaks Italian", async () =>
        {
            usePreferencesStore().language = "it";
            await useNuxtApp().$i18n.setLocale("it");
            await useWizardStore().start();
            useWizardStore().chooseArchetype("srd51.archetype.steadfast-healer");
            const wrapper = await open("personality");

            expect(wrapper.find("h1").text()).toBe("Personalità");
            expect(wrapper.text()).toContain("Suggerimenti dal tuo background");
            expect(wrapper.text()).not.toMatch(/wizard\.|sheet\.[a-z]/);
        });
    });

    describe("step 9, review", () =>
    {
        it("lists what is still open with the step that fixes it, and saves only with a name", async () =>
        {
            await useWizardStore().start();
            useWizardStore().chooseArchetype(null);
            const wrapper = await open("review");
            await settle();

            expect(wrapper.find("h1").text()).toBe("Review");
            const issues = wrapper.findAll(".step-review__issue-text").map((i) => i.text());
            expect(issues[0]).toBe("Your character has no name yet.");
            expect(issues).toContain("Species: this step is not done yet.");
            expect(wrapper.find(".sheet-view h2.sheet-view__name").exists()).toBe(true);
            expect(wrapper.find(".sheet-view .warning-list").exists()).toBe(false);
            expect(byName(wrapper, "Save the character")!.hasAttribute("disabled")).toBe(true);

            byName(wrapper, "Go to Species")!.click();
            await settle();
            expect(wrapper.find("h1").text()).toBe("Species");
        });

        it("names an open choice by where it comes from", async () =>
        {
            await useWizardStore().start();
            useWizardStore().chooseArchetype(null);
            useWizardStore().chooseClass("srd51.class.cleric");
            const wrapper = await open("review");
            await settle();

            expect(wrapper.findAll(".step-review__issue-text").map((i) => i.text()))
                .toContain("Cleric, Skills: 2 more to choose.");
        });

        it("stores the character and opens its sheet", async () =>
        {
            await useWizardStore().start();
            useWizardStore().chooseArchetype("srd51.archetype.steadfast-healer");
            useWizardStore().setName("Brother Alric");
            const wrapper = await open("review");
            await settle();

            byName(wrapper, "Save the character")!.click();
            await until(() => useRouter().currentRoute.value.name === "characters-id");

            const stored = await useBrowserStorage().characters.list();
            expect(stored.map((c) => c.name)).toEqual(["Brother Alric"]);
            expect(useRouter().currentRoute.value.params["id"]).toBe(stored[0]!.id);
            expect(await useWizardStore().stored()).toBeUndefined();
        });

        it("speaks Italian", async () =>
        {
            usePreferencesStore().language = "it";
            await useNuxtApp().$i18n.setLocale("it");
            await useWizardStore().start();
            useWizardStore().chooseArchetype(null);
            const wrapper = await open("review");
            await settle();

            expect(wrapper.find("h1").text()).toBe("Riepilogo");
            expect(wrapper.text()).toContain("Il tuo personaggio non ha ancora un nome.");
            expect(wrapper.text()).not.toMatch(/wizard\.|sheet\.[a-z]/);
        });
    });
});
