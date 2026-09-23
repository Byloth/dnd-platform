/**
 * Shared helpers of the engine tests: the loader's (fixture packages, mini
 * packages) and a character builder.
 */

import type { Character } from "@byloth/dnd-platform-schema";

import { MINI } from "../../loader/test/helpers.js";

// Fixture packages, shuffling and mini packages are the loader's test helpers.
export * from "../../loader/test/helpers.js";

// ---- character -----------------------------------------------------------------------

export interface CharacterOptions
{
    readonly id?: string;
    readonly ruleset?: string;
    readonly classes?: { class: string, levels: number, subclass?: string }[];
    readonly scores?: Record<string, number>;
    readonly answers?: Record<string, string[]>;
    readonly equipment?: { item: string, quantity?: number, equipped?: boolean, attuned?: boolean }[];
    readonly species?: string;
    readonly subspecies?: string;
    readonly background?: string;
    readonly state?: Partial<Character["state"]>;
}

export function character(options: CharacterOptions = {}): Character
{
    const ruleset = options.ruleset ?? MINI;
    const classes = options.classes ?? [{ class: `${MINI}.class.fighter`, levels: 1 }];
    const base = options.scores ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

    return {
        formatVersion: 0,
        id: options.id ?? "test-character",
        name: "Test Character",
        ruleset: { id: ruleset, version: "0.1.0" },
        packages: [{ id: ruleset, version: "0.1.0" }],
        choices: {
            ...(options.species ? { species: options.species } : {}),
            ...(options.subspecies ? { subspecies: options.subspecies } : {}),
            ...(options.background ? { background: options.background } : {}),
            classes: classes as Character["choices"]["classes"],
            abilityScores: { method: "manual", base: base },
            answers: options.answers ?? {},
            ...(options.equipment ? { equipment: options.equipment } : {})
        },
        state: {
            hp: { current: 10, temporary: 0 },
            hitDice: { spent: 0 },
            resources: {},
            conditions: [],
            deathSaves: { successes: 0, failures: 0 },
            inspiration: false,
            ...(options.state ?? {})
        }
    };
}
