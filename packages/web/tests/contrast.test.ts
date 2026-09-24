/**
 * The contrast of the theme tokens (docs/13-ux-and-accessibility.md, point 1;
 * docs/phase-1/07-testing-accessibility-performance.md), computed from assets/scss/_tokens.scss for the four
 * looks: light, dark and the high-contrast variant of each. Text at least 4.5:1 on every surface it is set on;
 * marks, pips, borders that carry meaning and the focus ring at least 3:1. The pairs are the ones the components
 * use; a new pairing in a component adds its line here. `border` and `border-strong` are decoration only (card
 * edges, the score box, the drop zone of a control named by its text) and stay out of the 3:1 list: a boundary
 * that identifies a control must use a mark colour instead.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const TOKENS = readFileSync(resolve(import.meta.dirname, "..", "assets", "scss", "_tokens.scss"), "utf8");

interface Look { readonly name: string, readonly dark: boolean, readonly more: boolean }

const LOOKS: readonly Look[] = [
    { name: "light", dark: false, more: false },
    { name: "dark", dark: true, more: false },
    { name: "light, more contrast", dark: false, more: true },
    { name: "dark, more contrast", dark: true, more: true }
];

/** The colour tokens of a look: the `:root` blocks it matches, in source order, as the cascade applies them. */
function colours(look: Look): Record<string, string>
{
    const result: Record<string, string> = {};
    for (const [, selector, body] of TOKENS.matchAll(/^(:root[^\n{]*)\n\{([^}]*)\}/gm))
    {
        if (selector!.includes("data-theme=\"dark\"") && !look.dark) { continue; }
        if (selector!.includes("data-contrast=\"more\"") && !look.more) { continue; }
        for (const [, name, value] of body!.matchAll(/--(color-[a-z-]+):\s*(#[0-9A-Fa-f]{6});/g))
        {
            result[name!] = value!;
        }
    }

    return result;
}

function luminance(hex: string): number
{
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(a: string, b: string): number
{
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);

    return (light! + 0.05) / (dark! + 0.05);
}

const SURFACES = ["surface", "surface-sunken", "surface-raised"];
const TEXT_ON_SURFACES = [
    "ink", "ink-muted", "accent", "brass", "resource", "damage", "healing", "warning", "unavailable"
];
const MARKS_ON_SURFACES = ["accent", "resource", "damage", "brass", "focus"];

/** [foreground, background, minimum ratio]. */
const PAIRS: readonly (readonly [string, string, number])[] = [
    ...TEXT_ON_SURFACES.flatMap((text) => SURFACES.map((surface) => [text, surface, 4.5] as const)),
    ...MARKS_ON_SURFACES.flatMap((mark) => SURFACES.map((surface) => [mark, surface, 3] as const)),
    ["accent-ink", "accent", 4.5],
    ["accent", "accent-soft", 4.5],
    ["ink", "accent-soft", 4.5],
    ["brass", "brass-soft", 4.5],
    ["ink", "brass-soft", 4.5],
    ["resource", "resource-soft", 4.5],
    ["ink", "resource-soft", 4.5],
    ["healing", "healing-soft", 4.5],
    ["ink", "healing-soft", 4.5],
    ["warning", "warning-soft", 4.5],
    ["ink", "warning-soft", 4.5]
];

describe.each(LOOKS)("the $name look", (look) =>
{
    const tokens = colours(look);

    it("defines every colour a pair uses", () =>
    {
        for (const [foreground, background] of PAIRS)
        {
            expect(tokens[`color-${foreground}`], foreground).toBeDefined();
            expect(tokens[`color-${background}`], background).toBeDefined();
        }
    });

    it("keeps text at 4.5:1 and meaningful marks at 3:1", () =>
    {
        const failures = PAIRS
            .map(([foreground, background, minimum]) => ({
                pair: `${foreground} on ${background}`,
                ratio: contrast(tokens[`color-${foreground}`]!, tokens[`color-${background}`]!),
                minimum: minimum
            }))
            .filter(({ ratio, minimum }) => ratio < minimum)
            .map(({ pair, ratio, minimum }) => `${pair}: ${ratio.toFixed(2)} < ${minimum}`);

        expect(failures).toEqual([]);
    });
});
