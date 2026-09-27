/**
 * The arithmetic of step 5 of the creation wizard (docs/phase-1/04-character-creation.md), kept pure: the cost of
 * a point-buy assignment, whether scores are a dealing of given values, dealing values in an order, and the swap
 * that makes the per-ability menus unable to repeat a value; and "Roll for me", 4d6 with the lowest die dropped.
 */

export type Scores = Readonly<Record<string, number>>;

/** The points an assignment costs, or undefined when a score is not one point buy allows. */
export function pointBuyCost(base: Scores, costs: Readonly<Record<string, number | undefined>>): number | undefined
{
    let total = 0;
    for (const score of Object.values(base))
    {
        const cost = costs[String(score)];
        if (cost === undefined) { return undefined; }
        total += cost;
    }

    return total;
}

/** Whether the scores of the abilities are exactly the given values, in any order. */
export function isPermutation(base: Scores, abilities: readonly string[], values: readonly number[]): boolean
{
    if (abilities.length !== values.length) { return false; }
    const given = abilities.map((a) => base[a]);
    if (given.some((v) => v === undefined)) { return false; }

    const sort = (list: readonly number[]): number[] => [...list].sort((a, b) => b - a);

    return sort(given as number[]).join(",") === sort(values).join(",");
}

/** The values, highest first, to the abilities in the order given (the first ability gets the highest). */
export function deal(values: readonly number[], order: readonly string[]): Record<string, number>
{
    const sorted = [...values].sort((a, b) => b - a);

    return Object.fromEntries(order.map((ability, i) => [ability, sorted[i]!]));
}

/** An ability takes a value; the ability that held it takes the old value, so no value is ever repeated. */
export function swap(base: Scores, ability: string, value: number): Record<string, number>
{
    const out = { ...base };
    const holder = Object.keys(out).find((a) => (a !== ability) && (out[a] === value));
    if (holder !== undefined && out[ability] !== undefined) { out[holder] = out[ability]; }
    out[ability] = value;

    return out;
}

/** One ability score rolled: the four dice as they fell, which one was dropped, and the total of the others. */
export interface RolledScore
{
    dice: number[];
    dropped: number;
    total: number;
}

/** A die from 1 to `sides`, from the browser's cryptographic source, without the bias of a plain modulo. */
export function cryptoDie(sides: number): number
{
    const limit = Math.floor(0x1_0000_0000 / sides) * sides;
    const buffer = new Uint32Array(1);
    do { crypto.getRandomValues(buffer); } while (buffer[0]! >= limit);

    return (buffer[0]! % sides) + 1;
}

/** 4d6, the lowest dropped (the first of equal lowest ones). The die is injectable, for the tests. */
export function rollAbilityScore(die: (sides: number) => number = cryptoDie): RolledScore
{
    const dice = Array.from({ length: 4 }, () => die(6));
    const dropped = dice.indexOf(Math.min(...dice));

    return { dice: dice, dropped: dropped, total: dice.reduce((sum, d) => sum + d, 0) - dice[dropped]! };
}
