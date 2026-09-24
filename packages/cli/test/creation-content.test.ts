/**
 * The content the creation wizard reads from the base package (docs/phase-1/04-character-creation.md): one
 * archetype per class whose recommendations build a level 1 character the engine derives cleanly, whose answers
 * fit the choices the engine opens, and whose first ability is one of the class's primary abilities; the ruleset's
 * standard array and point buy; packs that are data.
 */

import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadPackages } from "@byloth/dnd-platform-loader";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";
import type { Archetype, Class, Item } from "@byloth/dnd-platform-schema";

import { readPackageSource } from "@byloth/dnd-platform-loader/node";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const SOURCE = readPackageSource(resolve(ROOT, "packages", "content", "srd51"));
const SET = loadPackages([SOURCE]);

function entities<T>(type: string): { id: string, data: T }[]
{
    return [...SET.entities.values()]
        .filter((e) => (e.type === type) && (e.inline === undefined))
        .map((e) => ({ id: e.id, data: e.data as T }));
}

const archetypes = entities<Archetype>("archetype");
const classes = entities<Class>("class");

/** The level 1 character an archetype recommends, with the standard array in its ability order. */
function characterOf(archetype: Archetype): Character
{
    const { recommends } = archetype;
    const array = SET.ruleset.abilityScores!.standardArray!;
    const order = [...recommends.abilityPriority!, ...SET.ruleset.abilities]
        .filter((a, i, all) => all.indexOf(a) === i);
    const version = SOURCE.manifest.version;

    return {
        id: `archetype-${archetype.id}`,
        name: archetype.id,
        ruleset: { id: "srd51", version: version },
        packages: [{ id: "srd51", version: version }],
        choices: {
            species: recommends.species!,
            ...(recommends.subspecies ? { subspecies: recommends.subspecies } : {}),
            classes: [{
                class: recommends.class!,
                ...(recommends.subclass ? { subclass: recommends.subclass } : {}),
                levels: 1
            }],
            background: recommends.background!,
            abilityScores: {
                method: "standard-array",
                base: Object.fromEntries(order.map((ability, i) => [ability, array[i]!]))
            },
            answers: { ...recommends.answers }
        },
        state: {
            hp: { current: 0, temporary: 0 },
            hitDice: { spent: 0 },
            resources: {},
            conditions: [],
            deathSaves: { successes: 0, failures: 0 },
            inspiration: false
        }
    };
}

describe("the base package's creation content", () =>
{
    it("offers the standard array and point buy", () =>
    {
        const { abilityScores } = SET.ruleset;

        expect(abilityScores?.standardArray).toEqual([15, 14, 13, 12, 10, 8]);
        expect(abilityScores?.pointBuy?.budget).toBe(27);
        expect(Object.keys(abilityScores?.pointBuy?.costs ?? {}).map(Number)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    });

    it("gives every class its primary abilities and at least one archetype", () =>
    {
        expect(classes).toHaveLength(12);
        for (const { id, data } of classes)
        {
            expect(data.primaryAbilities?.length, id).toBeGreaterThan(0);
            expect(archetypes.some((a) => a.data.recommends.class === id), id).toBe(true);
        }
    });

    it.each(archetypes.map((a) => [a.id, a.data] as const))("%s builds a clean level 1 character", (_, archetype) =>
    {
        const cls = classes.find((c) => c.id === archetype.recommends.class)!;
        expect(cls.data.primaryAbilities).toContain(archetype.recommends.abilityPriority![0]);
        for (const key of ["class", "species", "abilityPriority", "background"])
        {
            expect(archetype.why?.[key], key).toBeDefined();
        }

        const sheet = derive(characterOf(archetype), SET);
        const problems = sheet.warnings.filter((w) => w.severity === "error" || w.code !== "W_UNANSWERED_CHOICE");
        expect(problems).toEqual([]);

        // Every recommended answer fits a choice the engine opens, among its options when it lists them.
        for (const [key, answers] of Object.entries(archetype.recommends.answers ?? {}))
        {
            const choice = sheet.choices.find((c) => c.key === key);
            expect(choice, key).toBeDefined();
            expect(choice!.answered, key).toBe(true);
            if (choice!.options.length) { expect(choice!.options).toEqual(expect.arrayContaining(answers)); }
        }
    });

    it("describes every pack by the items it holds", () =>
    {
        const packs = entities<Item>("item").filter((i) => i.data.tags?.includes("equipment-packs"));

        expect(packs).toHaveLength(7);
        for (const { id, data } of packs)
        {
            expect(data.contents?.length, id).toBeGreaterThan(0);
            for (const entry of data.contents ?? []) { expect(SET.entities.has(entry.item), entry.item).toBe(true); }
        }
    });
});
