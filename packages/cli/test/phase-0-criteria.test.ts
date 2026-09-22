/**
 * Phase 0 done criteria (docs/16-roadmap.md) that the public repository can
 * check by itself: every SRD class has at least two public golden fixtures
 * whose sheet derives without a single warning (the fixtures themselves are
 * run by fixtures.test.ts). The other criteria are verified in
 * docs/phase-0/00-README.md with their evidence.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "characters");
const SRD_CLASSES = [
    "barbarian", "bard", "cleric", "druid", "fighter", "monk",
    "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"
];

interface Snapshot
{
    readonly classes: readonly { readonly class: string }[];
    readonly warnings: readonly unknown[];
}

describe("Phase 0 done criteria", () =>
{
    const snapshots = readdirSync(FIXTURES).filter((name) => existsSync(join(FIXTURES, name, "snapshot.json")))
        .map((name) =>
        {
            const snapshot = JSON.parse(readFileSync(join(FIXTURES, name, "snapshot.json"), "utf8")) as Snapshot;

            return { name: name, snapshot: snapshot };
        });

    it.each(SRD_CLASSES)("at least two public characters of the %s class compute without warnings", (cls) =>
    {
        const clean = snapshots
            .filter(({ snapshot }) => snapshot.classes.some((c) => c.class === `srd51.class.${cls}`))
            .filter(({ snapshot }) => snapshot.warnings.length === 0)
            .map(({ name }) => name);

        expect(clean.length, `warning-free fixtures of ${cls}: ${clean.join(", ")}`).toBeGreaterThanOrEqual(2);
    });
});
