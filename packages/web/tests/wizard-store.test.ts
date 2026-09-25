/**
 * The creation wizard's store (docs/phase-1/04-character-creation.md): an archetype prefills its
 * recommendations, every choice stays changeable and drops the answers of what it replaces, the draft derives,
 * and it saves itself in the browser so a reload resumes it.
 */

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAjv, validatorFor } from "@byloth/dnd-platform-schema/validate";

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

    it("stays discarded when a save was still on its way", async () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype(MONK);
        const saving = wizard.save();
        await wizard.discard();
        await saving;

        expect(await wizard.stored()).toBeUndefined();
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

    it("stores a named character at full hit points with its choices as created, and forgets the draft", async () =>
    {
        const wizard = useWizardStore();
        wizard.chooseArchetype("srd51.archetype.steadfast-healer");
        await wizard.save();
        expect(await wizard.finish()).toBeUndefined();

        wizard.setName("  Brother Alric ");
        const max = useEngine().sheet(wizard.character!, wizard.sources, { language: "en" }).sheet.values["hp.max"];
        const id = await wizard.finish();

        const stored = await useBrowserStorage().characters.get(id!);
        expect(stored?.name).toBe("Brother Alric");
        expect(max?.value).toBeGreaterThan(8);
        expect(stored?.state.hp).toEqual({ current: max?.value, temporary: 0 });
        expect(stored?.snapshots).toEqual([expect.objectContaining({ level: 1, label: "as created" })]);
        expect(stored?.snapshots?.[0]?.choices).toEqual(stored?.choices);
        expect(validatorFor(createAjv(), "character")(stored)).toBe(true);
        expect(wizard.character).toBeUndefined();
        expect(await wizard.stored()).toBeUndefined();
        expect((await useCharacters().list())[0]).toMatchObject({ id: id, origin: "stored", summary: "Cleric 1" });
    });

    describe("editing a stored character", () =>
    {
        async function stored(): Promise<string>
        {
            const wizard = useWizardStore();
            wizard.chooseArchetype("srd51.archetype.steadfast-healer");
            wizard.setName("Brother Alric");

            return (await wizard.finish())!;
        }

        it("opens it without the concept step and keeps the creation draft apart", async () =>
        {
            const id = await stored();
            const wizard = useWizardStore();
            await wizard.start();
            wizard.setName("Someone new");
            await wizard.save();

            expect(await wizard.edit(id, "class")).toBe(true);
            expect(wizard.editing).toBe(id);
            expect(wizard.step).toBe("class");
            expect(wizard.steps).not.toContain("concept");
            expect(wizard.character?.name).toBe("Brother Alric");
            expect((await wizard.stored())?.character.name).toBe("Someone new");
            expect((await wizard.stored(id))?.editing).toBe(id);
            expect(await wizard.edit("nobody")).toBe(false);
        });

        it("replaces the stored document, with no new snapshot and no more hit points than the maximum", async () =>
        {
            const id = await stored();
            const wizard = useWizardStore();
            const before = await useBrowserStorage().characters.get(id);
            const hurt = { ...before!.state, hp: { current: 99, temporary: 3 } };
            await useBrowserStorage().characters.put({ ...before!, state: hurt });

            await wizard.edit(id);
            wizard.setAlignment("neutral-good");
            expect(await wizard.finish()).toBe(id);

            const after = await useBrowserStorage().characters.get(id);
            expect(after?.choices.alignment).toBe("neutral-good");
            expect(after?.snapshots).toEqual(before?.snapshots);
            expect(after?.state.hp).toEqual({ current: before?.state.hp.current, temporary: 3 });
            expect(await useBrowserStorage().characters.list()).toHaveLength(1);
            expect(await wizard.stored(id)).toBeUndefined();
        });

        it("keeps the levels and the owned items through a class change, until chosen again", async () =>
        {
            const id = await stored();
            const doc = await useBrowserStorage().characters.get(id);
            type Classes = NonNullable<typeof doc>["choices"]["classes"];
            const classes: Classes = [{ ...doc!.choices.classes![0]!, levels: 3 }];
            await useBrowserStorage().characters.put({ ...doc!, choices: { ...doc!.choices, classes: classes } });
            const wizard = useWizardStore();
            await wizard.edit(id);
            const owned = wizard.character?.choices.equipment;

            wizard.chooseClass("srd51.class.fighter");
            expect(wizard.character?.choices.classes?.[0]).toMatchObject({ class: "srd51.class.fighter", levels: 3 });
            expect(wizard.character?.choices.equipment).toEqual(owned);

            wizard.addItem("srd51.item.dagger");
            expect(wizard.character?.choices.equipment?.at(-1)).toEqual({ item: "srd51.item.dagger", quantity: 1 });

            wizard.chooseEquipmentAgain();
            expect(wizard.keptEquipment).toBe(false);
            expect(wizard.character?.choices.equipment?.some((e) => e.item === "srd51.item.chain-mail")).toBe(true);
        });
    });
});
