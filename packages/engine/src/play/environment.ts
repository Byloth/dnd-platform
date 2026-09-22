/**
 * Formula evaluation at play time: the sheet is the only source of numbers
 * (`derive` already resolved every value), so the environment reads from
 * `sheet.values` and `sheet.classes`. Tables are not available: a formula
 * that needs one reports an error and the play engine leaves the state alone.
 */

import { parseFormula } from "@byloth/dnd-platform-schema";

import { FormulaEvaluationError, evaluateFormula, isDice } from "../formula/evaluate.js";
import type { FormulaEnvironment, FormulaValue } from "../formula/evaluate.js";
import type { ComputedSheet } from "../index.js";

export type Evaluated =
    { readonly ok: true, readonly value: FormulaValue } |
    { readonly ok: false, readonly message: string };

export function sheetEnvironment(sheet: ComputedSheet, extra: Readonly<Record<string, number>> = {}): FormulaEnvironment
{
    const number = (path: string): number | undefined =>
    {
        const value = sheet.values[path]?.value;

        return typeof value === "number" ? value : undefined;
    };

    return {
        variable: (name) =>
        {
            if (name in extra) { return extra[name]; }
            switch (name)
            {
                case "level": return sheet.level;
                case "proficiencyBonus": return number("proficiencyBonus");
                case "hitDie": return sheet.play.hitDice[0]?.die;
                case "hitDieCount": return sheet.level;
                default: return undefined;
            }
        },
        mod: (ability) => number(`mod.${ability}`) ?? 0,
        score: (ability) => number(`ability.${ability}`) ?? 10,
        classLevel: (name) =>
            sheet.classes.find((c) => (c.class === name) || c.class.endsWith(`.${name}`))?.levels ?? 0,
        table: (name) =>
        {
            throw new FormulaEvaluationError(`table "${name}" is not available during play`);
        }
    };
}

export function evaluateInPlay(
    formula: string,
    sheet: ComputedSheet,
    extra: Readonly<Record<string, number>> = {}
): Evaluated
{
    const parsed = parseFormula(formula);
    if (!parsed.ok) { return { ok: false, message: parsed.message }; }
    try
    {
        return { ok: true, value: evaluateFormula(parsed.ast, sheetEnvironment(sheet, extra)) };
    }
    catch (error)
    {
        return { ok: false, message: (error as Error).message };
    }
}

/** A number, or `undefined` when the formula is dice the caller has to roll. */
export function asNumber(value: FormulaValue): number | undefined
{
    return isDice(value) ? undefined : value;
}
