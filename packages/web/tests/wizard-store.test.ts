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
});
