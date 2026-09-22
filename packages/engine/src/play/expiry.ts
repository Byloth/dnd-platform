/**
 * Expiry of temporary things in the character state (conditions, toggles,
 * active spells, custom effects). One representation, one clock:
 *
 * - `turns: n` counts the character's end-turn events; `until: next-turn-end`
 *   is stored as `turns: 1`. Something gained during the character's own
 *   turn gets one more, so that it survives the current end-turn
 *   ("until the end of your next turn").
 * - `rounds: n` counts start-turn events: "1 round" ends when the
 *   character's next turn begins.
 * - `until: next-turn-start` ends at the next start-turn, `until: dawn` at
 *   the next dawn event.
 * - `minutes` and `hours` elapse only through rests, and only when the
 *   ruleset says how long a rest is (`rests.<kind>.hours`); a long rest also
 *   ends every turn-based expiry.
 * - `rest` ends with that rest (a long rest also ends short-rest expiries).
 * - `manual` never expires by itself.
 */

import type { Expiry } from "../index.js";

export type Clock = "start-turn" | "end-turn" | "short-rest" | "long-rest" | "dawn";

export interface Expiring { readonly expires?: Expiry }

export interface Ticked<T extends Expiring>
{
    readonly kept: T[];
    readonly expired: T[];
    /** True when at least one item was changed or removed. */
    readonly changed: boolean;
}

/** Store an expiry: `until: next-turn-end` becomes a turn counter, relative to whether it is the character's turn. */
export function normalizeExpiry(expiry: Expiry | undefined, duringOwnTurn: boolean): Expiry | undefined
{
    if (expiry === undefined) { return undefined; }
    if ("until" in expiry && expiry.until === "next-turn-end") { return { turns: duringOwnTurn ? 2 : 1 }; }
    if ("turns" in expiry) { return { turns: duringOwnTurn ? expiry.turns + 1 : expiry.turns }; }

    return expiry;
}

function elapsesInHours(expiry: Expiry, hours: number | undefined): boolean
{
    if (hours === undefined) { return false; }
    if ("minutes" in expiry) { return expiry.minutes <= hours * 60; }
    if ("hours" in expiry) { return expiry.hours <= hours; }

    return false;
}

/** The expiry after one tick of the clock: unchanged, decremented, or `null` when it has run out. */
function advance(expiry: Expiry, clock: Clock, hours: number | undefined): Expiry | null
{
    switch (clock)
    {
        case "end-turn":
            if ("turns" in expiry) { return expiry.turns > 1 ? { turns: expiry.turns - 1 } : null; }
            if ("until" in expiry && expiry.until === "next-turn-end") { return null; }

            return expiry;
        case "start-turn":
            if ("rounds" in expiry) { return expiry.rounds > 1 ? { rounds: expiry.rounds - 1 } : null; }
            if ("until" in expiry && expiry.until === "next-turn-start") { return null; }

            return expiry;
        case "short-rest":
            if ("rest" in expiry && expiry.rest === "short-rest") { return null; }

            return elapsesInHours(expiry, hours) ? null : expiry;
        case "long-rest":
            if ("rest" in expiry) { return null; }
            if (("turns" in expiry) || ("rounds" in expiry)) { return null; }
            if ("until" in expiry && expiry.until !== "dawn") { return null; }

            return elapsesInHours(expiry, hours) ? null : expiry;
        case "dawn":
            if ("until" in expiry && expiry.until === "dawn") { return null; }

            return expiry;
        default:
            return expiry;
    }
}

export function tick<T extends Expiring>(items: readonly T[], clock: Clock, hours?: number): Ticked<T>
{
    const kept: T[] = [];
    const expired: T[] = [];
    let changed = false;
    for (const item of items)
    {
        if (item.expires === undefined)
        {
            kept.push(item);

            continue;
        }
        const next = advance(item.expires, clock, hours);
        if (next === null)
        {
            expired.push(item);
            changed = true;
        }
        else if (next === item.expires)
        {
            kept.push(item);
        }
        else
        {
            kept.push({ ...item, expires: next });
            changed = true;
        }
    }

    return { kept: kept, expired: expired, changed: changed };
}
