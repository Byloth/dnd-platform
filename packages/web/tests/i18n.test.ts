/**
 * Both interface catalogues carry the same keys: no string exists in one language only; every key has a translator
 * note in en.notes.json (docs/phase-1/06-localisation.md).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const LOCALES = resolve(import.meta.dirname, "..", "i18n", "locales");

function keys(value: unknown, prefix = ""): string[]
{
    if (typeof value !== "object" || value === null) { return [prefix]; }

    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("interface catalogues", () =>
{
    it("have the same keys in English and Italian", () =>
    {
        const english = JSON.parse(readFileSync(resolve(LOCALES, "en.json"), "utf8")) as unknown;
        const italian = JSON.parse(readFileSync(resolve(LOCALES, "it.json"), "utf8")) as unknown;

        expect(keys(italian).sort()).toEqual(keys(english).sort());
    });

    it("carry a translator note for every English key", () =>
    {
        const english = JSON.parse(readFileSync(resolve(LOCALES, "en.json"), "utf8")) as unknown;
        const notes = JSON.parse(readFileSync(resolve(LOCALES, "en.notes.json"), "utf8")) as unknown;

        expect(keys(notes).sort()).toEqual(keys(english).sort());
    });
});
