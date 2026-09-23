/**
 * The interface never invents a game term (docs/phase-1/06-localisation.md, docs/13-ux-and-accessibility.md):
 * every `terms.*` value, and every sheet label that names a game term, is the glossary's word in its language.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { SHEET_MESSAGES } from "@byloth/dnd-platform-composer";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const LOCALES = resolve(import.meta.dirname, "..", "i18n", "locales");

/** `Armor Class (AC)` → `armor class`: the comparison ignores abbreviations in brackets and case. */
const normal = (term: string): string => term.replace(/\([^)]*\)/g, "").trim()
    .toLowerCase();

/** The game terms of docs/03-glossary.md, per language, alternatives (`A / B`) split. */
function glossary(): { en: Set<string>, it: Set<string> }
{
    const text = readFileSync(resolve(ROOT, "docs", "03-glossary.md"), "utf8");
    const table = text.slice(text.indexOf("## Game terms"), text.indexOf("\n## ", text.indexOf("## Game terms") + 1));
    const en = new Set<string>();
    const italian = new Set<string>();
    for (const line of table.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| English")))
    {
        const [englishCell = "", italianCell = ""] = line.split("|").slice(1, 3);
        englishCell.split("/").forEach((t) => en.add(normal(t)));
        italianCell.split("/").forEach((t) => italian.add(normal(t)));
    }

    return { en: en, it: italian };
}

/** Sheet labels that are game terms: composer key → the term they must be. */
const SHEET_TERMS = ["core.ac", "core.hp", "core.hitDice", "core.initiative", "core.speed", "core.proficiency",
    "resources.shortRest", "resources.longRest"];

function lookup(messages: unknown, key: string): string
{
    return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], messages) as string;
}

describe("game terms", () =>
{
    const terms = glossary();

    for (const language of ["en", "it"] as const)
    {
        it(`in ${language} are the glossary's, in the interface catalogue and on the sheet`, () =>
        {
            const catalogue = JSON.parse(readFileSync(resolve(LOCALES, `${language}.json`), "utf8")) as {
                terms: Record<string, string>;
            };
            for (const [key, value] of Object.entries(catalogue.terms))
            {
                expect(terms[language].has(normal(value)), `terms.${key}: ${value}`).toBe(true);
            }
            for (const key of SHEET_TERMS)
            {
                const value = lookup(SHEET_MESSAGES[language]!.sheet, key);
                expect(terms[language].has(normal(value)), `sheet.${key}: ${value}`).toBe(true);
            }
        });
    }
});
