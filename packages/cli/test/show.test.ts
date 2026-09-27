/**
 * `dnd show`: the compendium's entries (docs/phase-1/13-compendium.md) printed as the goldens of
 * fixtures/entries, in English and in Italian with metric units; an id of another kind is refused.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { loadPackages } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";
import { composeEntry } from "@byloth/dnd-platform-composer";

import { renderEntry, runShow } from "../src/commands/show.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const GOLDEN = resolve(ROOT, "fixtures", "entries");
const content = (ids: readonly string[]): ReturnType<typeof readPackageSource>[] =>
    ids.map((p) => readPackageSource(resolve(ROOT, "packages", "content", p)));
const english = loadPackages(content(["srd51"]));
const italian = loadPackages(content(["srd51", "srd51-it"]), { language: "it" });

const ENTRIES = [
    "spell.fire-bolt",
    "spell.fireball",
    "item.longsword",
    "item.chain-mail",
    "item.flame-tongue",
    "item.explorers-pack",
    "condition.exhaustion"
];

describe("dnd show, the compendium's entries", () =>
{
    for (const entry of ENTRIES)
    {
        const name = entry.split(".")[1]!;

        it(`prints ${name} as its goldens, in English and in Italian`, () =>
        {
            const en = composeEntry(`srd51.${entry}`, { packages: english })!;
            const it_ = composeEntry(`srd51.${entry}`, { packages: italian, language: "it", units: "metric" })!;

            expect(renderEntry(en)).toBe(readFileSync(resolve(GOLDEN, `${name}.en.txt`), "utf8"));
            expect(renderEntry(it_)).toBe(readFileSync(resolve(GOLDEN, `${name}.it.txt`), "utf8"));
        });
    }

    it("refuses an entity it cannot show", () =>
    {
        const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

        expect(runShow(["srd51.class.wizard"])).toBe(1);
        expect(String(stderr.mock.calls[0]![0])).toContain("is not a loaded creature, spell, item or condition");
        stderr.mockRestore();
    });
});
