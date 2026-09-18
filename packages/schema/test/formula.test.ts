import { describe, expect, it } from "vitest";

import { checkFormula } from "../src/formula.js";

const VALID = [
    "10 + mod(dex) + mod(wis)",
    "classLevel(monk)",
    "table(monk.martial-arts)",
    "table(srd51.table.proficiency-bonus, level)",
    "max(1, floor(level / 2))",
    "2 * score(str)",
    "1d10 + mod(dex) + classLevel(monk)",
    "floor((score - 10) / 2)",
    "hitDie + mod(con)",
    "average(hitDie) + mod(con)",
    "sum(classLevel * casterWeight)",
    "-mod(str)",
    "ceil(classLevel(wizard)/2)",
    "8 + proficiencyBonus + mod(wis)",
    "1d4"
];

const INVALID: [string, RegExp][] = [
    ["foo(1)", /unknown function "foo"/],
    ["mod(dex", /expected rparen/],
    ["level +", /expected a value/],
    ["x", /unknown variable "x"/],
    ["", /expected a value/],
    ["1 2", /unexpected "2"/],
    ["mod(dex) )", /unexpected "\)"/],
    ["level $ 2", /unexpected character/],
    ["max(,)", /expected a value/]
];

describe("formula grammar", () =>
{
    it.each(VALID)("accepts %s", (source) =>
    {
        expect(checkFormula(source)).toEqual({ ok: true });
    });

    it.each(INVALID)("rejects %s", (source, message) =>
    {
        const result = checkFormula(source);

        expect(result.ok).toBe(false);
        if (!result.ok) { expect(result.message).toMatch(message); }
    });
});
