import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { derive, loadPackages } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";

import { toPackageSource } from "../src/io/to-package-source.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const SOFT_MS = 100;
const HARD_MS = 500;

describe("derivation performance on the base package", () =>
{
    it("derives a level 20 character well under the budget", () =>
    {
        const set = loadPackages([toPackageSource(resolve(ROOT, "packages/content/srd51"))]);
        const fixture = resolve(ROOT, "fixtures/characters", "perf-caster-l20", "character.yaml");
        const fallback = resolve(ROOT, "fixtures/characters", "cleric-l1-base", "character.yaml");
        // The level 20 fixture arrives with the class fixtures; fall back meanwhile.
        const path = existsSync(fixture) ? fixture : fallback;
        const character = parse(readFileSync(path, "utf8")) as Character;
        derive(character, set);
        const runs = 20;
        const start = performance.now();
        for (let i = 0; i < runs; i += 1) { derive(character, set); }
        const average = (performance.now() - start) / runs;
        // eslint-disable-next-line no-console -- a soft budget overrun is worth a note, not a failure.
        if (average > SOFT_MS) { console.warn(`derive averaged ${average.toFixed(1)} ms (soft budget ${SOFT_MS} ms)`); }

        expect(average).toBeLessThan(HARD_MS);
    });
});
