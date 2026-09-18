/**
 * Grammar check of the formula language (docs/phase-0/02-content-format.md).
 *
 * This is the `formula` format used by the JSON Schemas: it accepts or
 * rejects a formula without evaluating it. The evaluator lives in the engine.
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

export type FormulaCheck = { readonly ok: true } | { readonly ok: false, readonly message: string };

type TokenType = "number" | "dice" | "identifier" | "operator" | "lparen" | "rparen" | "comma" | "end";
interface Token { readonly type: TokenType, readonly value: string, readonly at: number }

const DICE = /^\d+d\d+(?:\+\d+)?/;
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

class Parser
{
    private _position = 0;

    public constructor(private readonly _tokens: readonly Token[]) { }

    public parse(): void
    {
        this._expr();
        if (this._peek().type !== "end")
        {
            throw new FormulaError(`unexpected "${this._peek().value}" at ${this._peek().at}`);
        }
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

    private _expr(): void
    {
        this._term();
        while ((this._peek().type === "operator") && ((this._peek().value === "+") || (this._peek().value === "-")))
        {
            this._next();
            this._term();
        }
    }
    private _term(): void
    {
        this._factor();
        while ((this._peek().type === "operator") && ((this._peek().value === "*") || (this._peek().value === "/")))
        {
            this._next();
            this._factor();
        }
    }
    private _factor(): void
    {
        const token = this._peek();
        switch (token.type)
        {
            case "number":
            case "dice":
                this._next();

                return;

            case "lparen":
                this._next();
                this._expr();
                this._expect("rparen");

                return;

            case "operator":
                if (token.value === "-")
                {
                    this._next();
                    this._factor();

                    return;
                }
                break;

            case "identifier":
                this._next();
                if (this._peek().type === "lparen")
                {
                    this._call(token);

                    return;
                }
                if (!(FORMULA_VARIABLES as readonly string[]).includes(token.value))
                {
                    throw new FormulaError(`unknown variable "${token.value}" at ${token.at}`);
                }

                return;

            default:
                break;
        }

        const shown = token.type === "end" ? "end of formula" : `"${token.value}"`;

        throw new FormulaError(`expected a value but found ${shown} at ${token.at}`);
    }
    private _call(name: Token): void
    {
        if (!(FORMULA_FUNCTIONS as readonly string[]).includes(name.value))
        {
            throw new FormulaError(`unknown function "${name.value}" at ${name.at}`);
        }
        this._expect("lparen");
        if (this._peek().type !== "rparen")
        {
            this._arg();
            while (this._peek().type === "comma")
            {
                this._next();
                this._arg();
            }
        }
        this._expect("rparen");
    }
    private _arg(): void
    {
        // A bare identifier (ability, class or table name) is an argument on its own.
        const token = this._peek();
        const following = this._peek(1).type;
        const closes = (following === "comma") || (following === "rparen") || (following === "end");
        if ((token.type === "identifier") && closes)
        {
            this._next();

            return;
        }
        this._expr();
    }
}

export function checkFormula(source: string): FormulaCheck
{
    try
    {
        new Parser(tokenize(source)).parse();

        return { ok: true };
    }
    catch (error)
    {
        if (error instanceof FormulaError) { return { ok: false, message: error.message }; }

        throw error;
    }
}
