/**
 * Parser of the formula language (docs/phase-0/02-content-format.md).
 *
 * `parseFormula` turns a formula into an AST or an error; `checkFormula` is
 * the `formula` format used by the JSON Schemas (accept/reject, no
 * evaluation). The evaluator lives in the engine.
 *
 *   formula := expr
 *   expr    := term (("+" | "-") term)*
 *   term    := factor (("*" | "/") factor)*
 *   factor  := number | dice | variable | call | "(" expr ")" | "-" factor
 *   call    := name "(" (arg ("," arg)*)? ")"
 *   arg     := expr | identifier
 *   dice    := digits "d" digits ("+" digits)?
 */

export const FORMULA_VARIABLES = [
    "level",
    "proficiencyBonus",
    "hitDie",
    "hitDieCount",
    "slotLevel",
    "score",
    "classLevel",
    "casterWeight"

] as const;
export type FormulaVariable = (typeof FORMULA_VARIABLES)[number];

export const FORMULA_FUNCTIONS = [
    "mod",
    "score",
    "classLevel",
    "table",
    "max",
    "min",
    "floor",
    "ceil",
    "average",
    "sum"

] as const;
export type FormulaFunction = (typeof FORMULA_FUNCTIONS)[number];

export type BinaryOperator = "+" | "-" | "*" | "/";

export type FormulaNode =
    { readonly type: "number", readonly value: number } |
    { readonly type: "dice", readonly count: number, readonly sides: number, readonly bonus: number } |
    { readonly type: "variable", readonly name: FormulaVariable } |
    { readonly type: "identifier", readonly name: string } |
    { readonly type: "call", readonly name: FormulaFunction, readonly args: readonly FormulaNode[] } |
    { readonly type: "unary", readonly operand: FormulaNode } |
    { readonly type: "binary", readonly op: BinaryOperator, readonly left: FormulaNode, readonly right: FormulaNode };

export type FormulaParse =
    { readonly ok: true, readonly ast: FormulaNode } |
    { readonly ok: false, readonly message: string };
export type FormulaCheck = { readonly ok: true } | { readonly ok: false, readonly message: string };

type TokenType = "number" | "dice" | "identifier" | "operator" | "lparen" | "rparen" | "comma" | "end";
interface Token { readonly type: TokenType, readonly value: string, readonly at: number }

const DICE = /^(\d+)d(\d+)(?:\+(\d+))?/;
const NUMBER = /^\d+(?:\.\d+)?/;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*(?:[.-][A-Za-z0-9_]+)*/;

class FormulaError extends Error { }

function tokenize(source: string): Token[]
{
    const tokens: Token[] = [];
    let index = 0;

    while (index < source.length)
    {
        const rest = source.slice(index);
        const char = rest[0]!;

        if (/\s/.test(char))
        {
            index += 1;

            continue;
        }

        const dice = DICE.exec(rest);
        if (dice)
        {
            tokens.push({ type: "dice", value: dice[0], at: index });
            index += dice[0].length;

            continue;
        }
        const number = NUMBER.exec(rest);
        if (number)
        {
            tokens.push({ type: "number", value: number[0], at: index });
            index += number[0].length;

            continue;
        }
        const identifier = IDENTIFIER.exec(rest);
        if (identifier)
        {
            tokens.push({ type: "identifier", value: identifier[0], at: index });
            index += identifier[0].length;

            continue;
        }
        if ("+-*/".includes(char)) { tokens.push({ type: "operator", value: char, at: index }); }
        else if (char === "(") { tokens.push({ type: "lparen", value: char, at: index }); }
        else if (char === ")") { tokens.push({ type: "rparen", value: char, at: index }); }
        else if (char === ",") { tokens.push({ type: "comma", value: char, at: index }); }
        else { throw new FormulaError(`unexpected character "${char}" at ${index}`); }

        index += 1;
    }
    tokens.push({ type: "end", value: "", at: source.length });

    return tokens;
}

function parseDice(value: string): FormulaNode
{
    const match = DICE.exec(value)!;

    return { type: "dice", count: Number(match[1]), sides: Number(match[2]), bonus: Number(match[3] ?? 0) };
}

class Parser
{
    private _position = 0;

    public constructor(private readonly _tokens: readonly Token[]) { }

    public parse(): FormulaNode
    {
        const ast = this._expr();
        if (this._peek().type !== "end")
        {
            throw new FormulaError(`unexpected "${this._peek().value}" at ${this._peek().at}`);
        }

        return ast;
    }

    private _peek(offset = 0): Token
    {
        return this._tokens[Math.min(this._position + offset, this._tokens.length - 1)]!;
    }
    private _next(): Token
    {
        const token = this._peek();
        this._position += 1;

        return token;
    }
    private _expect(type: TokenType, value?: string): Token
    {
        const token = this._next();
        if ((token.type !== type) || ((value !== undefined) && (token.value !== value)))
        {
            const shown = token.type === "end" ? "end of formula" : `"${token.value}"`;

            throw new FormulaError(`expected ${value ?? type} but found ${shown} at ${token.at}`);
        }

        return token;
    }

    private _expr(): FormulaNode
    {
        let left = this._term();
        while ((this._peek().type === "operator") && ((this._peek().value === "+") || (this._peek().value === "-")))
        {
            const op = this._next().value as BinaryOperator;
            left = { type: "binary", op: op, left: left, right: this._term() };
        }

        return left;
    }
    private _term(): FormulaNode
    {
        let left = this._factor();
        while ((this._peek().type === "operator") && ((this._peek().value === "*") || (this._peek().value === "/")))
        {
            const op = this._next().value as BinaryOperator;
            left = { type: "binary", op: op, left: left, right: this._factor() };
        }

        return left;
    }
    private _factor(): FormulaNode
    {
        const token = this._peek();
        switch (token.type)
        {
            case "number":
                this._next();

                return { type: "number", value: Number(token.value) };

            case "dice":
                this._next();

                return parseDice(token.value);

            case "lparen":
            {
                this._next();
                const inner = this._expr();
                this._expect("rparen");

                return inner;
            }

            case "operator":
                if (token.value === "-")
                {
                    this._next();

                    return { type: "unary", operand: this._factor() };
                }
                break;

            case "identifier":
                this._next();
                if (this._peek().type === "lparen") { return this._call(token); }
                if (!(FORMULA_VARIABLES as readonly string[]).includes(token.value))
                {
                    throw new FormulaError(`unknown variable "${token.value}" at ${token.at}`);
                }

                return { type: "variable", name: token.value as FormulaVariable };

            default:
                break;
        }

        const shown = token.type === "end" ? "end of formula" : `"${token.value}"`;

        throw new FormulaError(`expected a value but found ${shown} at ${token.at}`);
    }
    private _call(name: Token): FormulaNode
    {
        if (!(FORMULA_FUNCTIONS as readonly string[]).includes(name.value))
        {
            throw new FormulaError(`unknown function "${name.value}" at ${name.at}`);
        }
        this._expect("lparen");
        const args: FormulaNode[] = [];
        if (this._peek().type !== "rparen")
        {
            args.push(this._arg());
            while (this._peek().type === "comma")
            {
                this._next();
                args.push(this._arg());
            }
        }
        this._expect("rparen");

        return { type: "call", name: name.value as FormulaFunction, args: args };
    }
    private _arg(): FormulaNode
    {
        // A bare identifier (ability, class or table name) is an argument on its own.
        const token = this._peek();
        const following = this._peek(1).type;
        const closes = (following === "comma") || (following === "rparen") || (following === "end");
        if ((token.type === "identifier") && closes)
        {
            this._next();

            return { type: "identifier", name: token.value };
        }

        return this._expr();
    }
}

export function parseFormula(source: string): FormulaParse
{
    try
    {
        return { ok: true, ast: new Parser(tokenize(source)).parse() };
    }
    catch (error)
    {
        if (error instanceof FormulaError) { return { ok: false, message: error.message }; }

        throw error;
    }
}

export function checkFormula(source: string): FormulaCheck
{
    const parsed = parseFormula(source);

    return parsed.ok ? { ok: true } : parsed;
}
