/**
 * Step 7's equipment (docs/phase-1/04-character-creation.md): costs and coins, and the fighter's grant through
 * the wizard's store: the defaults, a swapped option, a swapped pack with nothing left behind, a pick, removed and
 * added items moving the suggested purse, the coins written, the selections kept in the draft.
 */

import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { coins, costInCopper } from "@/composables/equipment";

import { clearBrowserStorage, serveSite } from "./helpers";

serveSite();

const FIGHTER = "srd51.archetype.sword-and-shield";

beforeEach(async () =>
{
    useContentStore().reset();
    await useWizardStore().discard();
    await useWizardStore().start();
    useWizardStore().chooseArchetype(FIGHTER);
});
afterEach(async () =>
{
    await clearBrowserStorage();
});

const items = (): Record<string, number> =>
    Object.fromEntries((useWizardStore().character?.choices.equipment ?? [])
        .map((e) => [e.item.split(".").pop(), e.quantity ?? 1]));
const equipped = (item: string): boolean | undefined =>
    useWizardStore().character?.choices.equipment?.find((e) => e.item === `srd51.item.${item}`)?.equipped;

describe("costs and coins", () =>
{
    it("counts in copper and gives it back gold first", () =>
    {
        const item = (amount: number, currency: "gp" | "sp") =>
            ({ id: "x", name: { en: "x" }, type: "gear", cost: { amount: amount, currency: currency } }) as const;

        expect(costInCopper(item(75, "gp"))).toBe(7500);
        expect(costInCopper(item(2, "sp"))).toBe(20);
        expect(coins(9050)).toEqual({ gold: 90, silver: 5, copper: 0 });
    });
});

describe("the fighter's starting equipment", () =>
{
    it("starts from the first option of every group, packs unpacked, armor and weapons equipped", () =>
    {
        const now = items();

        expect(now["chain-mail"]).toBe(1);
        expect(now["shield"]).toBe(1);
        expect(now["battleaxe"]).toBe(1);
        expect(now["dungeoneers-pack"]).toBeUndefined();
        expect(now["torch"]).toBe(10);
        expect(now["amulet"]).toBe(1);
        expect(equipped("chain-mail")).toBe(true);
        expect(equipped("torch")).toBe(false);
    });

    it("swaps an option's items and a pack's contents with nothing left behind", () =>
    {
        const wizard = useWizardStore();
        wizard.chooseOption("class#0", 1);
        wizard.chooseOption("class#3", 1);
        const now = items();

        expect(now["chain-mail"]).toBeUndefined();
        expect(now["longbow"]).toBe(1);
        expect(now["arrow"]).toBe(20);
        expect(now["crowbar"]).toBeUndefined();
        expect(now["bedroll"]).toBe(1);
    });

    it("gives the picked item for a filter", () =>
    {
        useWizardStore().pick("class#1#0#0", "srd51.item.longsword");

        expect(items()["longsword"]).toBe(1);
        expect(items()["battleaxe"]).toBeUndefined();
    });

    it("moves the suggested purse with what is removed and added, and writes the coins", () =>
    {
        const wizard = useWizardStore();
        expect(wizard.suggestedCopper).toBe(1500);

        wizard.removeSlot("class#0#0#0", true);
        expect(items()["chain-mail"]).toBeUndefined();
        expect(wizard.suggestedCopper).toBe(1500 + 7500);

        wizard.addItem("srd51.item.crossbow-light");
        expect(wizard.suggestedCopper).toBe(1500 + 7500 - 2500);

        wizard.useSuggestedCoins();
        expect(wizard.character?.state.currency).toEqual({ gold: 65 });
    });

    it("keeps the selections in the draft", async () =>
    {
        const wizard = useWizardStore();
        wizard.chooseOption("class#3", 1);
        wizard.equip("srd51.item.torch", true);
        await wizard.save();
        wizard.$patch({ character: undefined });

        await wizard.resume();
        expect(wizard.equipment.options["class#3"]).toBe(1);
        expect(equipped("torch")).toBe(true);
    });
});
