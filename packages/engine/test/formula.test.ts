/** Evaluation of formula ASTs with symbolic dice, tables and class context. */

import { describe, expect, it } from "vitest";

import { parseFormula } from "@byloth/dnd-platform-schema";
import type { FormulaNode } from "@byloth/dnd-platform-schema";

import {
    FormulaEvaluationError, averageOf, evaluateFormula, evaluateSource, formatValue, formulaReferences, parseDiceString
} from "../src/formula/evaluate.js";
import type { FormulaEnvironment, FormulaValue } from "../src/formula/evaluate.js";

function ast(source: string): FormulaNode
{
    const parsed = parseFormula(source);
    if (!parsed.ok) { throw new Error(parsed.message); }

    return parsed.ast;
}

const env: FormulaEnvironment = {
    variable: (name) =>
    {
        const variables: Record<string, number | undefined> = {
            level: 5, proficiencyBonus: 3, hitDie: 8, classLevel: 3, score: 16
        };

        return variables[name];
    },
    mod: (ability) => ({ str: 3, dex: 2, con: 1 }[ability] ?? 0),
    score: (ability) => ({ str: 16, dex: 14 }[ability] ?? 10),
    classLevel: (name) => ({ monk: 3, rogue: 2 }[name] ?? 0),
    table: (name, key) =>
    {
        if (name === "monk.martial-arts") { return { dice: [{ count: 1, sides: (key ?? 3) >= 5 ? 6 : 4 }], bonus: 0 }; }
        if (name === "numbers") { return (key ?? 3) * 10; }
        throw new Error(`table "${name}" is not defined`);
    }
};

const show = (v: FormulaValue): string | number => formatValue(v);

describe("evaluateFormula", () =>
{
    it.each([
        ["1 + 2 * 3", 7],
        ["(1 + 2) * 3", 9],
        ["10 - 4 - 3", 3],
        ["-mod(str)", -3],
        ["7 / 2", 3.5],
        ["floor(7 / 2)", 3],
        ["ceil(7 / 2)", 4],
        ["max(1, mod(str), mod(dex))", 3],
        ["min(level, proficiencyBonus)", 3],
        ["sum(1, 2, 3)", 6],
        ["10 + mod(dex) + mod(con)", 13],
        ["2 * score(str)", 32],
        ["classLevel(monk) + classLevel(rogue)", 5],
        ["classLevel", 3],
        ["level * casterWeight + 0", undefined],
        ["average(hitDie)", 5],
        ["average(2d6)", 8],
        ["average(1d8 + 2)", 7],
        ["table(numbers, 2)", 20],
        ["table(numbers)", 30]
    ])("%s", (source, expected) =>
    {
        if (expected === undefined)
        {
            expect(() => evaluateFormula(ast(source), env)).toThrow(FormulaEvaluationError);

            return;
        }
        expect(evaluateFormula(ast(source), env)).toBe(expected);
    });

    it.each([
        ["1d4", "1d4"],
        ["1d4 + 2", "1d4 + 2"],
        ["1d4 + mod(str)", "1d4 + 3"],
        ["1d6 + 1d4", "1d6 + 1d4"],
        ["2 * 1d4", "2d4"],
        ["1d4 * 3 + 1", "3d4 + 1"],
        ["1d8 - 1", "1d8 - 1"],
        ["table(monk.martial-arts)", "1d4"],
        ["table(monk.martial-arts, 11)", "1d6"],
        ["table(monk.martial-arts) + mod(dex)", "1d4 + 2"]
    ])("%s stays symbolic as %s", (source, expected) =>
    {
        expect(show(evaluateFormula(ast(source), env))).toBe(expected);
    });

    it.each([
        ["1d4 / 2", "divided"],
        ["1d4 * 1d6", "multiplied together"],
        ["1d4 * 1.5", "non-negative integer"],
        ["-1d4", "negated"],
        ["5 / 0", "division by zero"],
        ["floor(1d4)", "needs a number"],
        ["slotLevel + 1", "not available"],
        ["table(nope)", "not defined"]
    ])("%s fails with %s", (source, message) =>
    {
        expect(() => evaluateFormula(ast(source), env)).toThrow(message);
    });

    it("reads an identifier argument as a variable when it names one", () =>
    {
        expect(evaluateFormula(ast("average(hitDie)"), env)).toBe(5);
        expect(evaluateFormula(ast("max(level)"), env)).toBe(5);
    });

    it("evaluateSource parses then evaluates and rejects a broken formula", () =>
    {
        expect(evaluateSource("1 + 1", env)).toBe(2);
        expect(() => evaluateSource("1 +", env)).toThrow(FormulaEvaluationError);
    });
});

describe("dice helpers", () =>
{
    it("parses dice strings and formats expressions", () =>
    {
        expect(parseDiceString("2d6+3")).toEqual({ dice: [{ count: 2, sides: 6 }], bonus: 3 });
        expect(parseDiceString(" 1d8 + 1 ")).toEqual({ dice: [{ count: 1, sides: 8 }], bonus: 1 });
        expect(parseDiceString("d8")).toBeUndefined();
        expect(parseDiceString("8")).toBeUndefined();
        expect(formatValue({ dice: [{ count: 1, sides: 10 }], bonus: -2 })).toBe("1d10 - 2");
        expect(formatValue(4)).toBe(4);
    });

    it("averages round each die up and read a plain number as a die size", () =>
    {
        expect(averageOf({ dice: [{ count: 1, sides: 8 }], bonus: 0 })).toBe(5);
        expect(averageOf({ dice: [{ count: 2, sides: 6 }], bonus: 1 })).toBe(9);
        expect(averageOf(10)).toBe(6);
        expect(averageOf(12)).toBe(7);
    });
});

describe("formulaReferences", () =>
{
    it("lists abilities, classes, tables and variables a formula reads", () =>
    {
        const source = "proficiencyBonus + mod(dex) + score(str) + classLevel(monk) +" +
            " table(monk.ki-points, level + 0) + max(hitDie + 0, 1)";
        const refs = formulaReferences(ast(source));

        expect(refs.abilities.sort()).toEqual(["dex", "str"]);
        expect(refs.classes).toEqual(["monk"]);
        expect(refs.tables).toEqual(["monk.ki-points"]);
        expect(refs.variables.sort()).toEqual(["hitDie", "level", "proficiencyBonus"]);
    });

    // ENGINE BUG: a bare variable used as a call argument (`max(hitDie, 1)`, `table(t, level)`) is parsed as an
    // identifier node; the evaluator reads it as a variable but formulaReferences does not list it.
    it("lists bare variables used as call arguments", () =>
    {
        expect(formulaReferences(ast("max(hitDie, 1)")).variables).toEqual(["hitDie"]);
    });

    it("returns empty lists for a constant", () =>
    {
        expect(formulaReferences(ast("2 + 2"))).toEqual({ abilities: [], classes: [], tables: [], variables: [] });
    });
});
