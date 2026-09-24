/** The arithmetic of the wizard's step 5: point-buy cost, permutation, dealing, swapping. */

import { describe, expect, it } from "vitest";

import { deal, isPermutation, pointBuyCost, swap } from "@/composables/ability-scores";

const COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

describe("ability-score arithmetic", () =>
{
    it("costs the standard array exactly 27 points, and refuses a score point buy lacks", () =>
    {
        expect(pointBuyCost({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }, COSTS)).toBe(27);
        expect(pointBuyCost({ str: 16, dex: 8 }, COSTS)).toBeUndefined();
    });

    it("tells a dealing of the values from anything else", () =>
    {
        const array = [15, 14, 13, 12, 10, 8];

        expect(isPermutation({ str: 8, dex: 15, con: 14, int: 13, wis: 12, cha: 10 }, ABILITIES, array)).toBe(true);
        expect(isPermutation({ str: 15, dex: 15, con: 13, int: 12, wis: 10, cha: 8 }, ABILITIES, array)).toBe(false);
        expect(isPermutation({ str: 15 }, ABILITIES, array)).toBe(false);
    });

    it("deals the highest value to the first ability", () =>
    {
        expect(deal([10, 15, 8, 14, 13, 12], ["dex", "wis", "con", "str", "int", "cha"]))
            .toEqual({ dex: 15, wis: 14, con: 13, str: 12, int: 10, cha: 8 });
    });

    it("swaps a value with the ability that held it", () =>
    {
        expect(swap({ str: 12, dex: 15 }, "str", 15)).toEqual({ str: 15, dex: 12 });
        expect(swap({ str: 12, dex: 15 }, "str", 9)).toEqual({ str: 9, dex: 15 });
    });
});
