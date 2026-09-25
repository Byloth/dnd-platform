/**
 * The creation wizard's store (docs/phase-1/04-character-creation.md): an archetype prefills its
 * recommendations, every choice stays changeable and drops the answers of what it replaces, the draft derives,
 * and it saves itself in the browser so a reload resumes it.
 */

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DRAFT_KEY } from "@/stores/wizard";

import { clearBrowserStorage, serveSite } from "./helpers";

serveSite();

const SRD = "srd51";
const MONK = "srd51.archetype.open-hand-wanderer";

beforeEach(async () =>
{
    useContentStore().reset();
    await useWizardStore().discard();
    await useWizardStore().start();
});
afterEach(async () =>
{
    await clearBrowserStorage();
});

describe("the creation wizard's store", () =>
{
    it("starts an empty character on the site's base package", () =>
    {
        const { character, step } = useWizardStore();

        expect(step).toBe("content");
        expect(character?.ruleset.id).toBe(SRD);
        expect(character?.packages.map((p) => p.id)).toEqual([SRD]);
        expect(character?.choices).toEqual({});
    });

    it("prefills an archetype's recommendations, standard array included", () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype(MONK);
        const { choices } = wizard.character!;

        expect(choices.species).toBe("srd51.species.dwarf");
        expect(choices.subspecies).toBe("srd51.species.dwarf.hill-dwarf");
        expect(choices.classes).toEqual([{ class: "srd51.class.monk", levels: 1 }]);
        expect(choices.background).toBe("srd51.background.acolyte");
        expect(choices.abilityScores).toEqual({
            method: "standard-array",
            base: { dex: 15, wis: 14, con: 13, str: 12, int: 10, cha: 8 }
        });
        expect(choices.answers?.["srd51.class.monk#skills"]).toEqual(["acrobatics", "insight"]);
        expect(wizard.recommendation("class")?.value).toBe("srd51.class.monk");
        expect(wizard.recommendation("class")?.why).toMatch(/^Monks fight/);
    });

    it("leaves the choices alone when the player skips the archetypes", () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype(null);
        expect(wizard.archetype).toBeNull();

        expect(wizard.character?.choices).toEqual({});
        expect(wizard.recommendation("class")).toBeUndefined();
    });

    it("drops a subspecies and answers that belong to the species it replaces", () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype("srd51.archetype.oathbound-champion");
        expect(wizard.character?.choices.answers).toHaveProperty(
            ["srd51.feature.dragonborn.draconic-ancestry#draconic-ancestry"]
        );

        wizard.chooseSpecies("srd51.species.elf");
        const { choices } = wizard.character!;

        expect(choices.species).toBe("srd51.species.elf");
        expect(choices.subspecies).toBeUndefined();
        expect(choices.answers).not.toHaveProperty(["srd51.feature.dragonborn.draconic-ancestry#draconic-ancestry"]);
        expect(choices.answers).toHaveProperty(["srd51.class.paladin#skills"]);
    });

    it("drops the answers of the class it replaces", () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype(MONK);
        wizard.chooseClass("srd51.class.fighter");
        const { choices } = wizard.character!;

        expect(choices.classes).toEqual([{ class: "srd51.class.fighter", levels: 1 }]);
        expect(choices.answers ?? {}).not.toHaveProperty(["srd51.class.monk#skills"]);
    });

    it("gives back the archetype's subclass when its class comes back", () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype("srd51.archetype.steadfast-healer");
        wizard.chooseClass("srd51.class.wizard");
        wizard.chooseClass("srd51.class.cleric");

        expect(wizard.character?.choices.classes).toEqual([
            { class: "srd51.class.cleric", subclass: "srd51.subclass.cleric.life-domain", levels: 1 }
        ]);
    });

    it("derives the draft", () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype(MONK);
        const sheet = useEngine().sheet(wizard.character!, wizard.sources, { language: "en" }).sheet;

        expect(sheet.values["ability.dex"]?.value).toBe(15);
        expect(sheet.warnings.filter((w) => w.severity === "error")).toEqual([]);
    });

    it("saves itself in the browser and resumes after a reload", async () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype(MONK);
        wizard.goTo("class");
        await wizard.save();
        const id = wizard.character!.id;

        expect(await useBrowserStorage().meta.get(DRAFT_KEY)).toMatchObject({ step: "class", archetype: MONK });

        // A reload: the page forgets the draft, the browser keeps it.
        wizard.$patch({ character: undefined, step: "content" });
        expect(await wizard.resume()).toBe(true);
        expect(wizard.character?.id).toBe(id);
        expect(wizard.step).toBe("class");
        expect(wizard.character?.choices.classes?.[0]?.class).toBe("srd51.class.monk");

        await wizard.discard();
        expect(await wizard.stored()).toBeUndefined();
        expect(await wizard.resume()).toBe(false);
    });

    describe("step 5, ability scores", () =>
    {
        const scores = () => useWizardStore().character!.choices.abilityScores!;

        it("keeps a valid dealing across methods and deals again when it does not fit", () =>
        {
            const wizard = useWizardStore();
            wizard.chooseArchetype(MONK);
            const monk = { ...scores().base };

            wizard.chooseMethod("point-buy");
            expect(scores()).toEqual({ method: "point-buy", base: monk });

            wizard.buy("dex", 13);
            wizard.chooseMethod("standard-array");
            expect(scores().base).toEqual(monk);
        });

        it("swaps a value between two abilities", () =>
        {
            const wizard = useWizardStore();
            wizard.chooseArchetype(MONK);
            wizard.assign("str", 15);

            expect(scores().base["str"]).toBe(15);
            expect(scores().base["dex"]).toBe(12);
        });

        it("refuses a point buy beyond the budget or outside the costs", () =>
        {
            const wizard = useWizardStore();
            wizard.chooseArchetype(MONK);
            wizard.chooseMethod("point-buy");

            expect(wizard.buy("cha", 9)).toBe(false);
            expect(wizard.buy("dex", 16)).toBe(false);
            expect(wizard.buy("dex", 14)).toBe(true);
            expect(wizard.buy("cha", 10)).toBe(true);
        });

        it("deals the rolls once all six are valid, and keeps them in the draft", async () =>
        {
            const wizard = useWizardStore();
            wizard.chooseArchetype(MONK);
            wizard.chooseMethod("roll");
            wizard.setRolls([17, null, 12, 16, 11, 7]);
            expect(scores().base["dex"]).toBe(15);

            wizard.setRolls([17, 9, 12, 16, 11, 7]);
            expect(scores()).toMatchObject({
                method: "roll",
                base: { dex: 17, wis: 16, con: 12, str: 11, int: 9, cha: 7 }
            });

            await wizard.save();
            wizard.$patch({ rolls: [] });
            await wizard.resume();
            expect(wizard.rolls).toEqual([17, 9, 12, 16, 11, 7]);
        });

        it("writes an adjustment and forgets it at zero", () =>
        {
            const wizard = useWizardStore();
            wizard.chooseArchetype(MONK);
            wizard.adjust("str", 2);
            expect(scores().bonuses).toEqual({ str: 2 });

            wizard.adjust("str", 0);
            expect(scores()).not.toHaveProperty("bonuses");
        });

        it("orders by the class's primary abilities without an archetype", () =>
        {
            const wizard = useWizardStore();
            wizard.chooseArchetype(null);
            wizard.chooseClass("srd51.class.wizard");

            expect(wizard.recommendedOrder.slice(0, 2)).toEqual(["int", "str"]);
        });
    });

    it("answers a choice, and writes a subclass twice as the document carries it", () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype(null);
        wizard.chooseClass("srd51.class.cleric");
        wizard.answer("srd51.class.cleric#divine-domain", ["srd51.subclass.cleric.life-domain"], "subclass");

        expect(wizard.character?.choices.classes?.[0]?.subclass).toBe("srd51.subclass.cleric.life-domain");
        expect(wizard.character?.choices.answers?.["srd51.class.cleric#divine-domain"])
            .toEqual(["srd51.subclass.cleric.life-domain"]);

        wizard.answer("srd51.class.cleric#divine-domain", [], "subclass");
        expect(wizard.character?.choices.classes?.[0]).not.toHaveProperty("subclass");
        expect(wizard.character?.choices).not.toHaveProperty("answers");
    });

    it("writes the name, the alignment and the player's own texts, and forgets an emptied one", () =>
    {
        const wizard = useWizardStore();
        wizard.setName("Brother Alric");
        wizard.setAlignment("lawful-good");
        wizard.setPersonal("traits", "Nothing can shake my optimistic attitude.");
        wizard.setPersonal("notes", "Owes the temple a favour.");

        expect(wizard.character?.name).toBe("Brother Alric");
        expect(wizard.character?.choices).toMatchObject({
            alignment: "lawful-good",
            personality: { traits: { en: "Nothing can shake my optimistic attitude." } },
            notes: { en: "Owes the temple a favour." }
        });
        expect(stepDone("personality")).toBe(true);

        wizard.setPersonal("traits", " ");
        wizard.setAlignment(undefined);
        expect(wizard.character?.choices).not.toHaveProperty("personality");
        expect(wizard.character?.choices).not.toHaveProperty("alignment");
        wizard.setName("");
        expect(stepDone("personality")).toBe(false);
    });
});
