/**
 * The derive-all probe in Italian (docs/phase-1/06-localisation.md): no text of a translated sheet is still the
 * English one, for every fixture character whose packages have an Italian translation.
 */

import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { probeLanguage } from "../src/commands/probe.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

describe("the Italian probe", () =>
{
    it("finds no English left in the Italian sheets", { timeout: 60_000 }, () =>
    {
        expect(probeLanguage({ repoRoot: ROOT, language: "it" })).toEqual([]);
    });
});
