/**
 * Property tests of the play engine (docs/phase-0/04-testing-strategy.md, level 4):
 * for every event type, accepted or rejected, `undo(apply(s, e).state, entry)`
 * deep-equals `s`; `apply` never mutates its inputs; random event sequences
 * on the excerpt Monk undo back to the initial state. A meta-test checks that
 * every event type has a sample here and a unit test in play.test.ts.
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { Character } from "@byloth/dnd-platform-schema";

import { PLAY_EVENT_TYPES, apply, derive, loadPackages, stableStringify, undo } from "../src/index.js";
import type { CharacterState, ComputedSheet, PlayEvent } from "../src/index.js";
import { readPackage, seeded } from "./helpers.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "packages");

const srd51 = readPackage(join(FIXTURES, "srd51-excerpt"));
const feline = readPackage(join(FIXTURES, "homebrew-feline"));
const set = loadPackages([srd51, feline]);

const character: Character = {
    formatVersion: 0,
    id: "play-properties-monk",
    name: "Property Monk",
    ruleset: { id: "srd51", version: srd51.manifest.version },
    packages: [
        { id: "srd51", version: srd51.manifest.version },
        { id: "homebrew.byloth", version: feline.manifest.version }
    ],
    choices: {
        species: "homebrew.byloth.species.feline",
        subspecies: "homebrew.byloth.species.feline.puma",
        classes: [{ class: "srd51.class.monk", levels: 3, subclass: "srd51.subclass.monk.way-of-the-open-hand" }],
        abilityScores: { method: "manual", base: { str: 11, dex: 17, con: 14, int: 8, wis: 15, cha: 8 } },
        answers: { "srd51.class.monk#skills": ["stealth", "acrobatics"] }
    },
    state: {
        hp: { current: 24, temporary: 0 },
        hitDice: { spent: 0 },
        resources: { ki: 3 },
        conditions: [],
        deathSaves: { successes: 0, failures: 0 },
        inspiration: false
    }
};
const sheet: ComputedSheet = derive(character, set);
const STUNNED = "srd51.condition.stunned";
const EXHAUSTION = "srd51.condition.exhaustion";

/** A state that touches every optional key, so every event has something to change. */
const RICH: CharacterState = {
    hp: { current: 10, temporary: 3 },
    hitDice: { spent: 1 },
    resources: { ki: 2 },
    spellSlots: {},
    conditions: [{ condition: STUNNED, expires: { turns: 1 } }, { condition: EXHAUSTION, level: 2 }],
    deathSaves: { successes: 1, failures: 1 },
    inspiration: true,
    concentration: null,
    customEffects: [{ name: { en: "Wet" }, expires: { rest: "short-rest" } }],
    toggles: [{ state: "patient-defense", expires: { until: "next-turn-start" } }],
    activeSpells: [],
    turn: { used: ["action"], actionsTaken: ["attack"], movementUsed: 10, active: true }
};
const DYING: CharacterState = { ...character.state, hp: { current: 0, temporary: 0 } };

interface Sample
{
    /** An accepted event; it changes the state unless `noChange` is set. */
    readonly ok?: [CharacterState, PlayEvent];
    readonly noChange?: true;
    /** A rejected event: no change, at least one warning. */
    readonly bad?: [CharacterState, PlayEvent];
}

/** Samples of every event type on the excerpt Monk (no spells: cast-spell only has a rejected sample). */
const SAMPLES: Record<PlayEvent["type"], Sample> = {
    "damage": { ok: [RICH, { type: "damage", amount: 7, damageType: "fire" }] },
    "heal": { ok: [DYING, { type: "heal", amount: 5 }] },
    "temp-hp": { ok: [RICH, { type: "temp-hp", amount: 8 }], bad: [RICH, { type: "temp-hp", amount: 1 }] },
    "spend-resource": {
        ok: [RICH, { type: "spend-resource", resource: "ki", amount: 1 }],
        bad: [RICH, { type: "spend-resource", resource: "ki", amount: 9 }]
    },
    "restore-resource": {
        ok: [RICH, { type: "restore-resource", resource: "ki", amount: 1 }],
        bad: [RICH, { type: "restore-resource", resource: "rage", amount: 1 }]
    },
    "cast-spell": { bad: [RICH, { type: "cast-spell", spell: "srd51.spell.fireball" }] },
    "end-concentration": {
        ok: [{ ...RICH, concentration: { spell: "srd51.spell.darkness" } }, { type: "end-concentration" }],
        bad: [RICH, { type: "end-concentration" }]
    },
    "end-spell": {
        ok: [
            { ...RICH, activeSpells: [{ spell: "srd51.spell.darkness", expires: { minutes: 10 } }] },
            { type: "end-spell", spell: "srd51.spell.darkness" }
        ],
        bad: [RICH, { type: "end-spell", spell: "srd51.spell.darkness" }]
    },
    "toggle": {
        ok: [RICH, { type: "toggle", state: "step-of-the-wind", on: true }],
        bad: [RICH, { type: "toggle", state: "raging", on: true }]
    },
    "apply-condition": {
        ok: [RICH, { type: "apply-condition", condition: "srd51.condition.prone", expires: { turns: 1 } }],
        bad: [RICH, { type: "apply-condition", condition: STUNNED }]
    },
    "remove-condition": {
        ok: [RICH, { type: "remove-condition", condition: STUNNED }],
        bad: [RICH, { type: "remove-condition", condition: "srd51.condition.prone" }]
    },
    "custom-effect": {
        ok: [character.state, { type: "custom-effect", name: { en: "Dazzled" }, expires: { turns: 1 } }]
    },
    "end-custom-effect": {
        ok: [RICH, { type: "end-custom-effect", name: { en: "Wet" } }],
        bad: [RICH, { type: "end-custom-effect", name: { en: "Dry" } }]
    },
    "short-rest": {
        ok: [RICH, { type: "short-rest", hitDice: [{ die: 8, rolls: [5] }] }],
        bad: [RICH, { type: "short-rest", hitDice: [{ die: 8, rolls: [5, 5, 5] }] }]
    },
    "long-rest": { ok: [RICH, { type: "long-rest" }] },
    "dawn": {
        ok: [{ ...RICH, toggles: [{ state: "step-of-the-wind", expires: { until: "dawn" } }] }, { type: "dawn" }]
    },
    "death-save": { ok: [DYING, { type: "death-save", roll: 14 }], bad: [RICH, { type: "death-save", roll: 14 }] },
    "stabilise": {
        ok: [{ ...DYING, deathSaves: { successes: 0, failures: 2 } }, { type: "stabilise" }],
        bad: [RICH, { type: "stabilise" }]
    },
    "inspiration": { ok: [RICH, { type: "inspiration", value: false }] },
    "use-action": {
        ok: [RICH, { type: "use-action", action: "flurry-of-blows" }],
        bad: [RICH, { type: "use-action", action: "attack" }]
    },
    "start-turn": { ok: [RICH, { type: "start-turn" }] },
    "end-turn": { ok: [RICH, { type: "end-turn" }] },
    "note": { ok: [RICH, { type: "note", text: "…" }], noChange: true }
};

function deepFreeze<T>(value: T): T
{
    if ((typeof value === "object") && (value !== null) && !Object.isFrozen(value))
    {
        Object.freeze(value);
        for (const inner of Object.values(value)) { deepFreeze(inner); }
    }

    return value;
}

describe("play engine properties", () =>
{
    it.each([...PLAY_EVENT_TYPES])("undo(apply()) is the identity for %s", (type) =>
    {
        const sample = SAMPLES[type];
        const cases = [...(sample.ok ? [sample.ok] : []), ...(sample.bad ? [sample.bad] : [])];
        expect(cases.length).toBeGreaterThan(0);
        for (const [state, event] of cases)
        {
            const frozen = deepFreeze(structuredClone(state));
            const result = apply(sheet, frozen, deepFreeze(structuredClone(event)), { id: `t-${type}` });

            expect(stableStringify(frozen)).toBe(stableStringify(state));
            expect(undo(result.state, result.entry)).toEqual(state);
        }
        // The accepted sample changes something, the rejected one nothing.
        if (sample.ok)
        {
            const ok = apply(sheet, sample.ok[0], sample.ok[1]);
            expect(ok.warnings.filter((w) => w.severity === "warning")).toEqual([]);
            if (!sample.noChange) { expect(ok.entry.after).not.toEqual({}); }
        }
        if (sample.bad)
        {
            const bad = apply(sheet, sample.bad[0], sample.bad[1]);
            expect(bad.entry.after).toEqual({});
            expect(bad.warnings.length).toBeGreaterThan(0);
        }
    });

    it("a random sequence undoes back to the initial state, step by step", () =>
    {
        const random = seeded(7);
        const events = Object.values(SAMPLES)
            .flatMap((s) => [...(s.ok ? [s.ok[1]] : []), ...(s.bad ? [s.bad[1]] : [])]);
        for (let round = 0; round < 5; round += 1)
        {
            const initial = round % 2 === 0 ? character.state : RICH;
            const log: { state: CharacterState, entry: ReturnType<typeof apply>["entry"] }[] = [];
            let current = initial;
            for (let step = 0; step < 60; step += 1)
            {
                const event = events[Math.floor(random() * events.length)]!;
                const result = apply(sheet, current, event, { id: `s${step}` });
                log.push({ state: current, entry: result.entry });
                current = result.state;
            }
            for (const { state, entry } of [...log].reverse())
            {
                current = undo(current, entry);
                expect(current).toEqual(state);
            }
            expect(current).toEqual(initial);
        }
    });

    it("every event type has a unit test in play.test.ts", () =>
    {
        const unit = readFileSync(resolve(import.meta.dirname, "play.test.ts"), "utf8");
        for (const type of PLAY_EVENT_TYPES) { expect(unit).toContain(`type: "${type}"`); }
    });
});
