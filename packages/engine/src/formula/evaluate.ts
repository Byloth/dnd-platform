/**
 * Evaluation of formula ASTs (parsed by the schema package).
 *
 * Numbers are exact; dice stay symbolic (`1d4 + 2` is `{ dice: [{1,4}], bonus: 2 }`)
 * so the sheet can print them and play mode can roll them.
 */

import { FORMULA_VARIABLES, parseFormula } from "@byloth/dnd-platform-schema";
import type { FormulaNode, FormulaVariable } from "@byloth/dnd-platform-schema";

export interface DiceTerm { readonly count: number, readonly sides: number }
export interface DiceExpression { readonly dice: readonly DiceTerm[], readonly bonus: number }
export type FormulaValue = number | DiceExpression;

export interface FormulaEnvironment
{
    variable(name: FormulaVariable): number | undefined;
    mod(ability: string): number;
    score(ability: string): number;
    classLevel(className: string): number;
    /** Step-function lookup; `key` defaults to the table's own `by` value. */
    table(name: string, key?: number): FormulaValue;
}

export class FormulaEvaluationError extends Error { }

export function isDice(value: FormulaValue): value is DiceExpression
{
    return typeof value !== "number";
}

export function formatValue(value: FormulaValue): string | number
{
    if (!isDice(value)) { return value; }
    const dice = value.dice.map((d) => `${d.count}d${d.sides}`).join(" + ");
    if (value.bonus === 0) { return dice; }

    return value.bonus > 0 ? `${dice} + ${value.bonus}` : `${dice} - ${-value.bonus}`;
}

export function parseDiceString(text: string): DiceExpression | undefined
{
    const match = /^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/.exec(text.trim());
    if (!match) { return undefined; }

    return { dice: [{ count: Number(match[1]), sides: Number(match[2]) }], bonus: Number(match[3] ?? 0) };
}

function add(a: FormulaValue, b: FormulaValue): FormulaValue
{
    if (!isDice(a) && !isDice(b)) { return a + b; }
    const left = isDice(a) ? a : { dice: [], bonus: a };
    const right = isDice(b) ? b : { dice: [], bonus: b };

    return { dice: [...left.dice, ...right.dice], bonus: left.bonus + right.bonus };
}
function negate(a: FormulaValue): FormulaValue
{
    if (!isDice(a)) { return -a; }

    throw new FormulaEvaluationError("dice cannot be negated");
}
function multiply(a: FormulaValue, b: FormulaValue): FormulaValue
{
    if (!isDice(a) && !isDice(b)) { return a * b; }
    if (isDice(a) && isDice(b)) { throw new FormulaEvaluationError("dice cannot be multiplied together"); }
    const dice = isDice(a) ? a : (b as DiceExpression);
    const factor = isDice(a) ? (b as number) : a;
    if (!Number.isInteger(factor) || (factor < 0))
    {
        throw new FormulaEvaluationError("dice can only be multiplied by a non-negative integer");
    }

    return { dice: dice.dice.map((d) => ({ count: d.count * factor, sides: d.sides })), bonus: dice.bonus * factor };
}
function divide(a: FormulaValue, b: FormulaValue): FormulaValue
{
    if (isDice(a) || isDice(b)) { throw new FormulaEvaluationError("dice cannot be divided"); }
    if (b === 0) { throw new FormulaEvaluationError("division by zero"); }

    return a / b;
}
function numeric(value: FormulaValue, context: string): number
{
    if (isDice(value)) { throw new FormulaEvaluationError(`${context} needs a number, got dice`); }

    return value;
}

/**
 * Average of a dice expression, rounded up per die as the rules do for hit
 * points (d8 → 5). A plain number is read as a die size: `average(hitDie)`.
 */
export function averageOf(value: FormulaValue): number
{
    if (!isDice(value)) { return Math.ceil((value + 1) / 2); }

    return value.dice.reduce((sum, d) => sum + d.count * Math.ceil((d.sides + 1) / 2), 0) + value.bonus;
}

function identifierName(node: FormulaNode, context: string): string
{
    if (node.type === "identifier") { return node.name; }
    if (node.type === "variable") { return node.name; }

    throw new FormulaEvaluationError(`${context} expects a name`);
}

export function evaluateFormula(ast: FormulaNode, env: FormulaEnvironment): FormulaValue
{
    switch (ast.type)
    {
        case "number": return ast.value;
        case "dice": return { dice: [{ count: ast.count, sides: ast.sides }], bonus: ast.bonus };
        case "variable":
        {
            const value = env.variable(ast.name);
            if (value === undefined)
            {
                throw new FormulaEvaluationError(`variable "${ast.name}" is not available here`);
            }

            return value;
        }
        case "identifier": throw new FormulaEvaluationError(`unexpected name "${ast.name}"`);
        case "unary": return negate(evaluateFormula(ast.operand, env));
        case "binary":
        {
            const left = evaluateFormula(ast.left, env);
            const right = evaluateFormula(ast.right, env);
            switch (ast.op)
            {
                case "+": return add(left, right);
                case "-": return add(left, negate(right));
                case "*": return multiply(left, right);
                case "/": return divide(left, right);
                default: return ast.op satisfies never;
            }
        }
        case "call": return evaluateCall(ast.name, ast.args, env);
        default: return ast satisfies never;
    }
}

/** A bare identifier that names a variable (`average(hitDie)`) is that variable. */
function asValue(node: FormulaNode, env: FormulaEnvironment): FormulaValue
{
    if ((node.type === "identifier") && (FORMULA_VARIABLES as readonly string[]).includes(node.name))
    {
        return evaluateFormula({ type: "variable", name: node.name as FormulaVariable }, env);
    }

    return evaluateFormula(node, env);
}

function evaluateCall(name: string, args: readonly FormulaNode[], env: FormulaEnvironment): FormulaValue
{
    const values = (): FormulaValue[] => args.map((a) => asValue(a, env));
    switch (name)
    {
        case "mod": return env.mod(identifierName(args[0]!, "mod"));
        case "score": return env.score(identifierName(args[0]!, "score"));
        case "classLevel": return env.classLevel(identifierName(args[0]!, "classLevel"));
        case "table":
        {
            const tableName = identifierName(args[0]!, "table");
            const key = args[1] === undefined ? undefined : numeric(evaluateFormula(args[1], env), "table key");

            return env.table(tableName, key);
        }
        case "max": return Math.max(...values().map((v) => numeric(v, "max")));
        case "min": return Math.min(...values().map((v) => numeric(v, "min")));
        case "floor": return Math.floor(numeric(values()[0]!, "floor"));
        case "ceil": return Math.ceil(numeric(values()[0]!, "ceil"));
        case "average": return averageOf(values()[0]!);
        case "sum": return values().reduce<FormulaValue>((acc, v) => add(acc, v), 0);
        default: throw new FormulaEvaluationError(`unknown function "${name}"`);
    }
}

export interface FormulaReferences
{
    readonly abilities: readonly string[];
    readonly classes: readonly string[];
    readonly tables: readonly string[];
    readonly variables: readonly FormulaVariable[];
}

/** What a formula reads: used to build the dependency graph of derived values. */
export function formulaReferences(ast: FormulaNode): FormulaReferences
{
    const abilities = new Set<string>();
    const classes = new Set<string>();
    const tables = new Set<string>();
    const variables = new Set<FormulaVariable>();
    const visit = (node: FormulaNode): void =>
    {
        switch (node.type)
        {
            case "variable":
                variables.add(node.name);
                break;
            case "unary":
                visit(node.operand);
                break;
            case "binary":
                visit(node.left);
                visit(node.right);
                break;
            case "call":
            {
                const first = node.args[0];
                if (first !== undefined)
                {
                    const isAbility = (node.name === "mod") || (node.name === "score");
                    if (isAbility) { abilities.add(identifierName(first, node.name)); }
                    else if (node.name === "classLevel") { classes.add(identifierName(first, node.name)); }
                    else if (node.name === "table") { tables.add(identifierName(first, node.name)); }
                }
                for (const arg of node.args)
                {
                    if (arg.type !== "identifier") { visit(arg); }
                }
                break;
            }
            default: break;
        }
    };
    visit(ast);

    return { abilities: [...abilities], classes: [...classes], tables: [...tables], variables: [...variables] };
}

export function evaluateSource(source: string, env: FormulaEnvironment): FormulaValue
{
    const parsed = parseFormula(source);
    if (!parsed.ok) { throw new FormulaEvaluationError(parsed.message); }

    return evaluateFormula(parsed.ast, env);
}
