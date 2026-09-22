/**
 * Play engine (docs/phase-0/03-engine-contract.md, "Play algorithm"): one
 * describe per event type on an in-memory mini package that declares
 * resources, actions, toggles, spells, conditions and defenses, with a
 * ruleset carrying the play rules (concentration, death saves, rests).
 */

import { describe, expect, it } from "vitest";

import { apply, derive, loadPackages, undo } from "../src/index.js";
import type { ApplyResult, CharacterState, ComputedSheet, PlayEvent } from "../src/index.js";
import { MINI, character, cls, feature, miniPackage, spell } from "./helpers.js";
import type { CharacterOptions, MiniEntity } from "./helpers.js";

const FIGHTER = `${MINI}.class.fighter`;
const WIZARD = `${MINI}.class.wizard`;
const WARLOCK = `${MINI}.class.warlock`;
const STUNNED = `${MINI}.condition.stunned`;
const EXHAUSTION = `${MINI}.condition.exhaustion`;
const BLESS = `${MINI}.spell.bless`;
const CURE = `${MINI}.spell.cure`;
const LIGHT = `${MINI}.spell.light`;
const DARKNESS = `${MINI}.spell.darkness`;
const SCORES = { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 8 };

// ---- content ---------------------------------------------------------------------

const table = (id: string, rows: Record<string, unknown>): MiniEntity =>
    ({ type: "table", data: { id: id, name: { en: id }, by: "classLevel", rows: rows } });
const rule = (slug: string, name: string): MiniEntity =>
    ({
        type: "rule",
        data: { id: `${MINI}.rule.action.${slug}`, name: { en: name }, text: { en: "…" }, category: "action" }
    });
const condition = (id: string, extra: Record<string, unknown> = {}): MiniEntity =>
    ({ type: "condition", data: { id: id, name: { en: id.split(".").pop() }, text: { en: "…" }, ...extra } });

const fighterFeatures = [
    feature(`${MINI}.feature.fighter.ki`, [
        {
            kind: "declare-resource",
            resource: "ki",
            max: 3,
            recharge: [{ on: "short-rest", amount: "full" }, { on: "long-rest", amount: "full" }]
        },
        { kind: "declare-resource", resource: "luck", max: 3, recharge: [{ on: "dawn", amount: "1d4" }] },
        { kind: "declare-resource", resource: "focus", max: 4, recharge: [{ on: "short-rest", amount: 1 }] },
        {
            kind: "add-action",
            action: "flurry",
            activation: "bonus-action",
            cost: [{ resource: "ki", amount: 1 }],
            requires: { afterAction: "attack" }
        },
        {
            kind: "add-action",
            action: "patient-defense",
            activation: "bonus-action",
            cost: [{ resource: "ki", amount: 1 }],
            toggle: { state: "patient-defense", expires: { until: "next-turn-start" } }
        },
        { kind: "modify", target: "ac", op: "add", value: 2, when: { toggled: "patient-defense" } },
        {
            kind: "add-action",
            action: "second-wind",
            activation: "bonus-action",
            onUse: [{ kind: "heal", amount: "1d10 + classLevel(fighter)", target: "self" }]
        },
        { kind: "add-action", action: "rally", activation: "free", onUse: [{ kind: "tempHp", amount: "5" }] },
        {
            kind: "add-action",
            action: "stunning-strike",
            activation: "special",
            cost: [{ resource: "ki", amount: 1 }],
            onUse: [{ kind: "applyCondition", condition: STUNNED, target: "self", expires: { turns: 1 } }]
        },
        { kind: "add-action", action: "deflect", activation: "reaction" },
        { kind: "defense", defense: "resistance", to: ["fire"] },
        { kind: "defense", defense: "immunity", to: ["poison"] },
        { kind: "defense", defense: "vulnerability", to: ["cold"] }
    ]),
    feature(`${MINI}.feature.fighter.rage`, [], { toggle: { state: "raging", expires: { rounds: 2 } } })
];
const fighter = cls(FIGHTER, { 1: { features: fighterFeatures } });
const wizard = cls(WIZARD, {
    1: {
        features: [
            feature(`${MINI}.feature.wizard.spellcasting`, [
                {
                    kind: "grant-spellcasting",
                    ability: "int",
                    list: `${MINI}.spell-list.arcane`,
                    preparation: "prepared",
                    slots: { progression: "full" },
                    cantrips: { table: `${MINI}.table.cantrips` }
                },
                {
                    kind: "grant-spells",
                    spells: [DARKNESS],
                    as: "always-prepared",
                    uses: { count: 1, recharge: "long-rest" }
                }
            ])
        ]
    }

}, { casterWeight: 1 });
const warlock = cls(WARLOCK, {
    1: {
        features: [
            feature(`${MINI}.feature.warlock.pact`, [
                {
                    kind: "grant-spellcasting",
                    ability: "cha",
                    list: `${MINI}.spell-list.arcane`,
                    preparation: "known",
                    slots: { progression: "pact" },
                    known: { table: `${MINI}.table.known` }
                }
            ])
        ]
    }

}, { casterWeight: 0 });
const spells = [
    spell(LIGHT, 0),
    spell(BLESS, 1, {
        duration: { type: "timed", minutes: 1, concentration: true },
        effects: [{ kind: "modify", target: "ac", op: "add", value: 1 }]
    }),
    spell(CURE, 1, { onCast: [{ kind: "heal", amount: "5", target: "self" }] }),
    spell(DARKNESS, 2, { duration: { type: "timed", minutes: 10, concentration: true } })
];
const entities: MiniEntity[] = [
    fighter, wizard, warlock, ...spells,
    table(`${MINI}.table.slots.full`, { 1: [2], 3: [4, 2] }),
    table(`${MINI}.table.slots.pact`, { 1: [1, 1], 3: [2, 2] }),
    table(`${MINI}.table.cantrips`, { 1: 1 }),
    table(`${MINI}.table.known`, { 1: 2 }),
    {
        type: "spell-list",
        data: { id: `${MINI}.spell-list.arcane`, name: { en: "arcane" }, spells: [LIGHT, BLESS, CURE] }
    },
    rule("attack", "Attack"),
    rule("dodge", "Dodge"),
    condition(STUNNED),
    condition(`${MINI}.condition.prone`),
    condition(EXHAUSTION, {
        levels: { 1: { text: { en: "1" } }, 2: { text: { en: "2" } }, 3: { text: { en: "3" } } },
        cumulative: true
    })
];
const RULES = {
    rests: {
        short: { hitDice: "spend", hours: 1 },
        long: { hitPoints: "full", hitDiceRecovered: "max(1, floor(level / 2))", hours: 8, conditionLevelsRecovered: 1 }
    },
    concentration: { saveDc: "max(10, floor(damage / 2))" },
    deathSaves: {
        dc: 10,
        successes: 3,
        failures: 3,
        natural20: { hitPoints: 1 },
        natural1: { failures: 2 },
        damage: { failures: 1 }
    },
    spellSlots: { full: { table: `${MINI}.table.slots.full` }, pact: { table: `${MINI}.table.slots.pact` } },
    baseActions: [`${MINI}.rule.action.attack`, `${MINI}.rule.action.dodge`],
    conditions: [STUNNED, `${MINI}.condition.prone`, EXHAUSTION]
};

const set = loadPackages([miniPackage({ entities: entities, ruleset: RULES })]);
expect(set.diagnostics.entries.filter((d) => d.severity === "error")).toEqual([]);

// ---- characters ------------------------------------------------------------------

/** Level 3 fighter (hit die d8, CON 12): 21 hit points, 3 Hit Dice, 3 ki. */
type Playground = [ComputedSheet, CharacterState];

function fighterSheet(state: Partial<CharacterState> = {}, options: Partial<CharacterOptions> = {}): Playground
{
    const c = character({
        classes: [{ class: FIGHTER, levels: 3 }],
        scores: SCORES,
        state: { hp: { current: 21, temporary: 0 }, ...state },
        ...options
    });

    return [derive(c, set), c.state];
}

/** Level 3 wizard: four level-1 and two level-2 slots, Bless and Cure prepared, Light, Darkness once per long rest. */
function wizardSheet(state: Partial<CharacterState> = {}): Playground
{
    const c = character({
        classes: [{ class: WIZARD, levels: 3 }],
        scores: SCORES,
        answers: { [`${WIZARD}#cantrips`]: [LIGHT], [`${WIZARD}#spells`]: [BLESS, CURE] },
        state: { hp: { current: 21, temporary: 0 }, ...state }
    });

    return [derive(c, set), c.state];
}

function warlockSheet(state: Partial<CharacterState> = {}): Playground
{
    const c = character({
        classes: [{ class: WARLOCK, levels: 3 }],
        scores: SCORES,
        answers: { [`${WARLOCK}#spells`]: [BLESS, CURE] },
        state: { hp: { current: 21, temporary: 0 }, ...state }
    });

    return [derive(c, set), c.state];
}

const codes = (result: ApplyResult): string[] => result.warnings.map((w) => w.code);
const expectCodes = (sheet: ComputedSheet, state: CharacterState, event: PlayEvent, ...expected: string[]): void =>
{
    expect(codes(apply(sheet, state, event))).toEqual(expected);
};
const rejected = (result: ApplyResult, before: CharacterState): void =>
{
    expect(result.state).toEqual(before);
    expect(result.entry.before).toEqual({});
    expect(result.entry.after).toEqual({});
    expect(result.warnings.some((w) => w.severity === "warning")).toBe(true);
};

/** Apply a sequence and return the final state (each step undoable). */
function run(sheet: ComputedSheet, state: CharacterState, events: readonly PlayEvent[]): CharacterState
{
    let current = state;
    events.forEach((event, index) => { current = apply(sheet, current, event, { id: `e${index}` }).state; });

    return current;
}

// ---- tests ----------------------------------------------------------------------

describe("sheet.play", () =>
{
    it("evaluates the rest rules and lists hit dice, conditions and base actions", () =>
    {
        const [sheet] = fighterSheet();

        expect(sheet.play.hitDice).toEqual([{ die: 8, total: 3 }]);
        expect(sheet.play.rests.long.hitDiceRecovered).toBe(1);
        expect(sheet.play.rests.long.conditionLevelsRecovered).toBe(1);
        expect(sheet.play.deathSaves?.dc).toBe(10);
        expect(sheet.play.conditions.map((c) => c.id)).toEqual([EXHAUSTION, `${MINI}.condition.prone`, STUNNED]);
        expect(sheet.play.conditions[0]).toMatchObject({ maxLevel: 3, cumulative: true });
        expect(sheet.actions.map((a) => a.id)).toContain("attack");
        expect(sheet.actions.find((a) => a.id === "attack")?.source.entity).toBe(`${MINI}.rule.action.attack`);
        expect(sheet.toggles.map((t) => t.state)).toEqual(["patient-defense", "raging"]);
        // Base actions alone do not activate the Actions section (docs/08): the wizard grants none.
        const [wizardOnly] = wizardSheet();
        expect(wizardOnly.actions.map((a) => a.id)).toEqual(["attack", "dodge"]);
        expect(wizardOnly.sections).not.toContain("actions");
    });
});

describe("damage", () =>
{
    it("takes temporary hit points first", () =>
    {
        const [sheet, state] = fighterSheet({ hp: { current: 21, temporary: 5 } });
        const result = apply(sheet, state, { type: "damage", amount: 8 });

        expect(result.state.hp).toEqual({ current: 18, temporary: 0 });
        expect(result.entry.before).toEqual({ hp: { current: 21, temporary: 5 } });
        expect(result.entry.after).toEqual({ hp: { current: 18, temporary: 0 } });
    });

    it.each([
        ["fire", 10, 16],
        ["poison", 10, 21],
        ["cold", 10, 1],
        ["slashing", 10, 11]
    ])("applies the defenses of the sheet (%s)", (type, amount, hp) =>
    {
        const [sheet, state] = fighterSheet();

        expect(apply(sheet, state, { type: "damage", amount: amount, damageType: type }).state.hp.current).toBe(hp);
    });

    it("warns with the concentration DC read from the ruleset", () =>
    {
        const [sheet, state] = wizardSheet({ hp: { current: 21, temporary: 10 }, concentration: { spell: BLESS } });
        const small = apply(sheet, state, { type: "damage", amount: 7 });
        const big = apply(sheet, state, { type: "damage", amount: 23 });

        expect(small.warnings).toEqual([
            expect.objectContaining({ code: "W_CONCENTRATION_CHECK", message: expect.stringContaining("DC 10") })
        ]);
        expect(big.warnings[0]?.message).toContain("DC 11");
        expect(big.state.concentration).toEqual({ spell: BLESS });
    });

    it("ends concentration and the concentrated spell when dropping to 0", () =>
    {
        const [sheet, state] = wizardSheet({
            concentration: { spell: BLESS },
            activeSpells: [{ spell: BLESS, expires: { minutes: 1 } }, { spell: DARKNESS, expires: { minutes: 10 } }]
        });
        const result = apply(sheet, state, { type: "damage", amount: 30 });

        expect(result.state.hp.current).toBe(0);
        expect(result.state.concentration).toBeNull();
        expect(result.state.activeSpells).toEqual([{ spell: DARKNESS, expires: { minutes: 10 } }]);
        expect(codes(result)).toEqual(["I_DOWN", "I_CONCENTRATION_ENDED"]);
    });

    it("counts a death save failure when hit at 0 hit points, and reports death", () =>
    {
        const [sheet, state] = fighterSheet({
            hp: { current: 0, temporary: 0 },
            deathSaves: { successes: 1, failures: 2 }
        });
        const result = apply(sheet, state, { type: "damage", amount: 3 });

        expect(result.state.deathSaves).toEqual({ successes: 1, failures: 3 });
        expect(codes(result)).toEqual(["W_DEAD"]);
    });
});

describe("heal and temporary hit points", () =>
{
    it("caps at hp.max and clears death saves", () =>
    {
        const [sheet, state] = fighterSheet({
            hp: { current: 0, temporary: 0 },
            deathSaves: { successes: 2, failures: 1 }
        });
        const result = apply(sheet, state, { type: "heal", amount: 50 });

        expect(result.state.hp.current).toBe(21);
        expect(result.state.deathSaves).toEqual({ successes: 0, failures: 0 });
    });

    it("replaces temporary hit points only when higher", () =>
    {
        const [sheet, state] = fighterSheet({ hp: { current: 21, temporary: 6 } });

        expect(apply(sheet, state, { type: "temp-hp", amount: 9 }).state.hp.temporary).toBe(9);
        const kept = apply(sheet, state, { type: "temp-hp", amount: 4 });
        expect(kept.state).toEqual(state);
        expect(codes(kept)).toEqual(["I_TEMP_HP_KEPT"]);
    });
});

describe("spend-resource and restore-resource", () =>
{
    it("spends and restores within the sheet's maximum; a missing entry means full", () =>
    {
        const [sheet, state] = fighterSheet();
        const spent = apply(sheet, state, { type: "spend-resource", resource: "ki", amount: 2 });
        expect(spent.state.resources).toEqual({ ki: 1 });
        const restored = apply(sheet, spent.state, { type: "restore-resource", resource: "ki", amount: 5 });
        expect(restored.state.resources).toEqual({ ki: 3 });
    });

    it("rejects unknown resources and overspending unless forced", () =>
    {
        const [sheet, state] = fighterSheet({ resources: { ki: 1 } });
        rejected(apply(sheet, state, { type: "spend-resource", resource: "rage", amount: 1 }), state);
        const over = apply(sheet, state, { type: "spend-resource", resource: "ki", amount: 2 });
        rejected(over, state);
        expect(codes(over)).toEqual(["W_INSUFFICIENT_RESOURCE"]);
        const forced = apply(sheet, state, { type: "spend-resource", resource: "ki", amount: 2, force: true });
        expect(forced.state.resources).toEqual({ ki: 0 });
    });

    it("addresses spell slots as spell-slot-<level>", () =>
    {
        const [sheet, state] = wizardSheet();
        const spent = apply(sheet, state, { type: "spend-resource", resource: "spell-slot-2", amount: 1 });
        expect(spent.state.spellSlots).toEqual({ 2: 1 });
        expect(spent.entry.before).toEqual({});
        expect(undo(spent.state, spent.entry)).toEqual(state);
        rejected(apply(sheet, state, { type: "spend-resource", resource: "spell-slot-5", amount: 1 }), state);
    });
});

describe("cast-spell", () =>
{
    it("spends a slot, starts concentration and tracks the duration", () =>
    {
        const [sheet, state] = wizardSheet();
        const result = apply(sheet, state, { type: "cast-spell", spell: BLESS }, { id: "log-7" });

        expect(result.state.spellSlots).toEqual({ 1: 3 });
        expect(result.state.concentration).toEqual({ spell: BLESS, since: "log-7" });
        expect(result.state.activeSpells).toEqual([{ spell: BLESS, expires: { minutes: 1 } }]);
        expect(derive(character({
            classes: [{ class: WIZARD, levels: 3 }],
            scores: SCORES,
            answers: { [`${WIZARD}#spells`]: [BLESS] },
            state: result.state
        }), set).values["ac"]?.value).toBe(13);
    });

    it("upcasts with a higher slot and replaces the running concentration", () =>
    {
        const [sheet, state] = wizardSheet({
            concentration: { spell: DARKNESS },
            activeSpells: [{ spell: DARKNESS, expires: { minutes: 10 } }]
        });
        const result = apply(sheet, state, { type: "cast-spell", spell: BLESS, slotLevel: 2 });

        expect(result.state.spellSlots).toEqual({ 2: 1 });
        expect(result.state.concentration?.spell).toBe(BLESS);
        expect(result.state.activeSpells).toEqual([{ spell: BLESS, slotLevel: 2, expires: { minutes: 1 } }]);
        expect(codes(result)).toEqual(["I_CONCENTRATION_REPLACED"]);
    });

    it("runs onCast play effects and casts cantrips for free", () =>
    {
        const [sheet, state] = wizardSheet({ hp: { current: 10, temporary: 0 } });
        const cure = apply(sheet, state, { type: "cast-spell", spell: CURE });
        expect(cure.state.hp.current).toBe(15);
        expect(cure.state.activeSpells).toBeUndefined();
        const light = apply(sheet, state, { type: "cast-spell", spell: LIGHT });
        expect(light.state).toEqual(state);
        expect(light.warnings).toEqual([]);
    });

    it("tracks limited uses as a resource and rejects when exhausted", () =>
    {
        const [sheet, state] = wizardSheet();
        const first = apply(sheet, state, { type: "cast-spell", spell: DARKNESS });
        expect(first.state.resources).toEqual({ "spell-uses-mini-spell-darkness": 0 });
        const second = apply(sheet, first.state, { type: "cast-spell", spell: DARKNESS });
        rejected(second, first.state);
        const rested = apply(sheet, first.state, { type: "long-rest" });
        expect(rested.state.resources).toEqual({});
    });

    it("rejects unknown spells, slots too low and missing slots", () =>
    {
        const [sheet, state] = wizardSheet({ spellSlots: { 1: 0, 2: 0 } });
        expectCodes(sheet, state, { type: "cast-spell", spell: `${MINI}.spell.wish` }, "W_UNKNOWN_SPELL");
        expectCodes(sheet, state, { type: "cast-spell", spell: BLESS, slotLevel: 0 }, "W_NO_SLOT");
        expectCodes(sheet, state, { type: "cast-spell", spell: BLESS }, "W_INSUFFICIENT_RESOURCE");
        expectCodes(sheet, state, { type: "cast-spell", spell: BLESS, slotLevel: 5 }, "W_NO_SLOT");
    });

    it("pays with Pact Magic slots when the caster has only those", () =>
    {
        const [sheet, state] = warlockSheet();
        const result = apply(sheet, state, { type: "cast-spell", spell: BLESS });

        expect(result.state.spellSlots).toEqual({ pact: 1 });
        const none = apply(sheet, { ...state, spellSlots: { pact: 0 } }, { type: "cast-spell", spell: BLESS });
        expect(codes(none)).toEqual(["W_INSUFFICIENT_RESOURCE"]);
    });
});

describe("end-concentration and end-spell", () =>
{
    it("ends concentration together with the spell's active entry", () =>
    {
        const [sheet, state] = wizardSheet({
            concentration: { spell: BLESS },
            activeSpells: [{ spell: BLESS, expires: { minutes: 1 } }]
        });
        const result = apply(sheet, state, { type: "end-concentration" });

        expect(result.state.concentration).toBeNull();
        expect(result.state.activeSpells).toEqual([]);
        rejected(apply(sheet, result.state, { type: "end-concentration" }), result.state);
    });

    it("ends a spell, and concentration when it was the concentrated one", () =>
    {
        const [sheet, state] = wizardSheet({
            concentration: { spell: BLESS },
            activeSpells: [{ spell: BLESS, expires: { minutes: 1 } }]
        });
        const result = apply(sheet, state, { type: "end-spell", spell: BLESS });

        expect(result.state).toMatchObject({ concentration: null, activeSpells: [] });
        rejected(apply(sheet, result.state, { type: "end-spell", spell: BLESS }), result.state);
    });
});

describe("toggle", () =>
{
    it("switches declared states on and off with their expiry", () =>
    {
        const [sheet, state] = fighterSheet();
        const on = apply(sheet, state, { type: "toggle", state: "raging", on: true });
        expect(on.state.toggles).toEqual([{ state: "raging", expires: { rounds: 2 } }]);
        expectCodes(sheet, on.state, { type: "toggle", state: "raging", on: true }, "W_ALREADY_ACTIVE");
        const off = apply(sheet, on.state, { type: "toggle", state: "raging", on: false });
        expect(off.state.toggles).toEqual([]);
        expectCodes(sheet, off.state, { type: "toggle", state: "raging", on: false }, "W_NOT_ACTIVE");
        expectCodes(sheet, state, { type: "toggle", state: "hidden", on: true }, "W_UNKNOWN_TOGGLE");
        const forced = apply(sheet, state, { type: "toggle", state: "hidden", on: true, force: true });
        expect(forced.state.toggles).toEqual([{ state: "hidden" }]);
    });
});

describe("apply-condition and remove-condition", () =>
{
    it("validates against the loaded conditions and their levels", () =>
    {
        const [sheet, state] = fighterSheet();
        const dazed = `${MINI}.condition.dazed`;
        expectCodes(sheet, state, { type: "apply-condition", condition: dazed }, "W_UNKNOWN_CONDITION");
        const one = apply(sheet, state, { type: "apply-condition", condition: EXHAUSTION });
        expect(one.state.conditions).toEqual([{ condition: EXHAUSTION, level: 1 }]);
        expectCodes(sheet, one.state, { type: "apply-condition", condition: EXHAUSTION }, "W_CONDITION_PRESENT");
        const three = apply(sheet, one.state, { type: "apply-condition", condition: EXHAUSTION, level: 3 });
        expect(three.state.conditions).toEqual([{ condition: EXHAUSTION, level: 3 }]);
        const four: PlayEvent = { type: "apply-condition", condition: EXHAUSTION, level: 4 };
        expectCodes(sheet, one.state, four, "W_CONDITION_LEVEL");
    });

    it("stores the expiry and removes on request", () =>
    {
        const [sheet, state] = fighterSheet();
        const on = apply(sheet, state, {
            type: "apply-condition", condition: STUNNED, expires: { until: "next-turn-end" }
        });
        expect(on.state.conditions).toEqual([{ condition: STUNNED, expires: { turns: 1 } }]);
        const off = apply(sheet, on.state, { type: "remove-condition", condition: STUNNED });
        expect(off.state.conditions).toEqual([]);
        expectCodes(sheet, off.state, { type: "remove-condition", condition: STUNNED }, "W_CONDITION_ABSENT");
    });
});

describe("custom-effect", () =>
{
    it("adds a player-written effect that derive applies, and removes it by name", () =>
    {
        const [sheet, state] = fighterSheet();
        const event: PlayEvent = {
            type: "custom-effect",
            name: { en: "Bruised lung" },
            effects: [{ kind: "modify", target: "ac", op: "add", value: -1 }],
            expires: { rest: "long-rest" }
        };
        const on = apply(sheet, state, event);
        expect(on.state.customEffects).toEqual([
            { name: { en: "Bruised lung" }, effects: event.effects, expires: { rest: "long-rest" } }
        ]);
        const resheet = derive(
            character({ classes: [{ class: FIGHTER, levels: 3 }], scores: SCORES, state: on.state }),
            set
        );
        expect(resheet.values["ac"]?.value).toBe(sheet.values["ac"]!.value as number - 1);
        expect(resheet.features.find((f) => f.origin === "custom")?.id).toBe("custom.bruised-lung-1");
        const off = apply(sheet, on.state, { type: "end-custom-effect", name: { en: "Bruised lung" } });
        expect(off.state.customEffects).toEqual([]);
        expectCodes(sheet, off.state, { type: "end-custom-effect", name: { en: "Bruised lung" } }, "W_NOT_ACTIVE");
    });
});

describe("short-rest", () =>
{
    it("spends Hit Dice with the Constitution modifier, restores short-rest resources and expires rest effects", () =>
    {
        const [sheet, state] = fighterSheet({
            hp: { current: 5, temporary: 0 },
            resources: { ki: 0, focus: 1 },
            conditions: [{ condition: STUNNED, expires: { rest: "short-rest" } }],
            activeSpells: [{ spell: BLESS, expires: { minutes: 1 } }, { spell: DARKNESS, expires: { hours: 8 } }],
            turn: { used: ["action"], actionsTaken: ["attack"] }
        });
        const result = apply(sheet, state, { type: "short-rest", hitDice: [{ die: 8, rolls: [6, 1] }] });

        expect(result.state.hp.current).toBe(5 + 7 + 2);
        expect(result.state.hitDice).toEqual({ spent: 2 });
        expect(result.state.resources).toEqual({ ki: 3, focus: 2 });
        expect(result.state.conditions).toEqual([]);
        expect(result.state.activeSpells).toEqual([{ spell: DARKNESS, expires: { hours: 8 } }]);
        expect(result.state.turn).toEqual({ used: [], actionsTaken: [], movementUsed: 0, active: false });
    });

    it("rejects more Hit Dice than available or of the wrong size", () =>
    {
        const [sheet, state] = fighterSheet({ hitDice: { spent: 2 } });
        expectCodes(sheet, state, { type: "short-rest", hitDice: [{ die: 8, rolls: [3, 4] }] }, "W_HIT_DICE");
        expectCodes(sheet, state, { type: "short-rest", hitDice: [{ die: 10, rolls: [3] }] }, "W_HIT_DICE");
        const one = apply(sheet, state, { type: "short-rest", hitDice: [{ die: 8, rolls: [3] }] });
        expect(one.state.hitDice).toEqual({ spent: 3 });
    });
});

describe("long-rest", () =>
{
    it("restores everything the ruleset says and reduces levelled conditions", () =>
    {
        const [sheet, state] = wizardSheet({
            hp: { current: 3, temporary: 4 },
            hitDice: { spent: 3 },
            spellSlots: { 1: 0, 2: 1 },
            deathSaves: { successes: 1, failures: 1 },
            concentration: { spell: BLESS },
            conditions: [
                { condition: EXHAUSTION, level: 2 },
                { condition: STUNNED, expires: { turns: 3 } },
                { condition: `${MINI}.condition.prone` }
            ],
            activeSpells: [{ spell: BLESS, expires: { minutes: 1 } }],
            toggles: [{ state: "raging", expires: { manual: true } }]
        });
        const result = apply(sheet, state, { type: "long-rest" });

        expect(result.state).toMatchObject({
            hp: { current: 21, temporary: 0 },
            hitDice: { spent: 2 },
            spellSlots: {},
            deathSaves: { successes: 0, failures: 0 },
            concentration: null,
            conditions: [{ condition: EXHAUSTION, level: 1 }, { condition: `${MINI}.condition.prone` }],
            activeSpells: [],
            toggles: [{ state: "raging", expires: { manual: true } }]
        });
        expect(undo(result.state, result.entry)).toEqual(state);
    });
});

describe("dawn", () =>
{
    it("needs the caller's roll for dice recharges", () =>
    {
        const [sheet, state] = fighterSheet({ resources: { luck: 0 } });
        const asked = apply(sheet, state, { type: "dawn" });
        expect(asked.state).toEqual(state);
        expect(codes(asked)).toEqual(["I_ROLL_NEEDED"]);
        const rolled = apply(sheet, state, { type: "dawn", rolled: { luck: 2 } });
        expect(rolled.state.resources).toEqual({ luck: 2 });
        expect(apply(sheet, state, { type: "dawn", rolled: { luck: 9 } }).state.resources).toEqual({ luck: 3 });
    });
});

describe("death-save and stabilise", () =>
{
    const dying = (saves = { successes: 0, failures: 0 }): [ComputedSheet, CharacterState] =>
        fighterSheet({ hp: { current: 0, temporary: 0 }, deathSaves: saves });

    it("is rejected above 0 hit points", () =>
    {
        const [sheet, state] = fighterSheet();
        expectCodes(sheet, state, { type: "death-save", roll: 15 }, "W_NOT_DYING");
        expectCodes(sheet, state, { type: "stabilise" }, "W_NOT_DYING");
    });

    it.each([
        [15, { successes: 1, failures: 0 }, []],
        [9, { successes: 0, failures: 1 }, []],
        [1, { successes: 0, failures: 2 }, []],
        [20, { successes: 0, failures: 0 }, ["I_STABILISED"]]
    ])("roll %i", (roll, saves, expected) =>
    {
        const [sheet, state] = dying();
        const result = apply(sheet, state, { type: "death-save", roll: roll });

        expect(result.state.deathSaves).toEqual(saves);
        expect(codes(result)).toEqual(expected);
        expect(result.state.hp.current).toBe(roll === 20 ? 1 : 0);
    });

    it("stabilises at three successes and dies at three failures", () =>
    {
        const [sheet, twoUp] = dying({ successes: 2, failures: 0 });
        const stable = apply(sheet, twoUp, { type: "death-save", roll: 10 });
        expect(stable.state.deathSaves).toEqual({ successes: 0, failures: 0 });
        expect(codes(stable)).toEqual(["I_STABILISED"]);
        const [, twoDown] = dying({ successes: 0, failures: 2 });
        const dead = apply(sheet, twoDown, { type: "death-save", roll: 1 });
        expect(dead.state.deathSaves).toEqual({ successes: 0, failures: 3 });
        expect(codes(dead)).toEqual(["W_DEAD"]);
        expect(apply(sheet, twoDown, { type: "stabilise" }).state.deathSaves).toEqual({ successes: 0, failures: 0 });
    });

    it("reads the thresholds from the ruleset, not from the engine", () =>
    {
        const other = loadPackages([miniPackage({
            entities: entities,
            ruleset: { ...RULES, deathSaves: { dc: 12, successes: 2, failures: 4 } }
        })]);
        const c = character({
            classes: [{ class: FIGHTER, levels: 3 }], scores: SCORES, state: { hp: { current: 0, temporary: 0 } }
        });
        const sheet = derive(c, other);
        const one = apply(sheet, c.state, { type: "death-save", roll: 11 });
        expect(one.state.deathSaves).toEqual({ successes: 0, failures: 1 });
        const oneUp = { ...c.state, deathSaves: { successes: 1, failures: 0 } };
        const two = apply(sheet, oneUp, { type: "death-save", roll: 12 });
        expect(codes(two)).toEqual(["I_STABILISED"]);
        const natural = apply(sheet, c.state, { type: "death-save", roll: 20 });
        expect(natural.state.deathSaves).toEqual({ successes: 1, failures: 0 });
        expect(natural.state.hp.current).toBe(0);
    });

    it("is rejected when the ruleset defines no death saves", () =>
    {
        const bare = loadPackages([miniPackage({ entities: entities })]);
        const c = character({
            classes: [{ class: FIGHTER, levels: 3 }], scores: SCORES, state: { hp: { current: 0, temporary: 0 } }
        });

        expectCodes(derive(c, bare), c.state, { type: "death-save", roll: 15 }, "W_RULE_UNDEFINED");
    });
});

describe("inspiration and note", () =>
{
    it("sets inspiration; a note changes nothing", () =>
    {
        const [sheet, state] = fighterSheet();
        const on = apply(sheet, state, { type: "inspiration", value: true });
        expect(on.state.inspiration).toBe(true);
        expect(on.entry).toEqual({
            id: "log-entry",
            event: { type: "inspiration", value: true },
            before: { inspiration: false },
            after: { inspiration: true }
        });
        const note = apply(sheet, state, { type: "note", text: "Rolled a 1" });
        expect(note.state).toEqual(state);
        expect(note.entry.after).toEqual({});
    });
});

describe("use-action", () =>
{
    it("marks the activation, pays the cost and remembers the action", () =>
    {
        const [sheet, state] = fighterSheet();
        const attack = apply(sheet, state, { type: "use-action", action: "attack" });
        expect(attack.state.turn).toEqual({
            used: ["action"], actionsTaken: ["attack"], movementUsed: 0, active: false
        });
        const flurry = apply(sheet, attack.state, { type: "use-action", action: "flurry" });
        expect(flurry.state.resources).toEqual({ ki: 2 });
        expect(flurry.state.turn?.used).toEqual(["action", "bonus-action"]);
        expectCodes(sheet, flurry.state, { type: "use-action", action: "second-wind" }, "W_ACTIVATION_USED");
        expectCodes(sheet, flurry.state, { type: "use-action", action: "attack" }, "W_ACTIVATION_USED");
    });

    it("enforces prerequisites and costs", () =>
    {
        const [sheet, state] = fighterSheet({ resources: { ki: 0 } });
        expectCodes(sheet, state, { type: "use-action", action: "flurry" }, "W_REQUIRES_ACTION");
        const attacked = apply(sheet, state, { type: "use-action", action: "attack" });
        expectCodes(sheet, attacked.state, { type: "use-action", action: "flurry" }, "W_INSUFFICIENT_RESOURCE");
        expectCodes(sheet, state, { type: "use-action", action: "fly" }, "W_UNKNOWN_ACTION");
    });

    it("switches the action's toggle on with its expiry", () =>
    {
        const [sheet, state] = fighterSheet();
        const result = apply(sheet, state, { type: "use-action", action: "patient-defense" });

        expect(result.state.toggles).toEqual([{ state: "patient-defense", expires: { until: "next-turn-start" } }]);
        expect(result.state.resources).toEqual({ ki: 2 });
    });

    it("runs onUse play effects, asking for dice results when needed", () =>
    {
        const [sheet, state] = fighterSheet({ hp: { current: 5, temporary: 0 } });
        const asked = apply(sheet, state, { type: "use-action", action: "second-wind" });
        expect(asked.state.hp.current).toBe(5);
        expect(codes(asked)).toEqual(["I_ROLL_NEEDED"]);
        expect(asked.warnings[0]?.message).toContain("1d10 + 3");
        const rolled = apply(sheet, state, { type: "use-action", action: "second-wind", rolled: 9 });
        expect(rolled.state.hp.current).toBe(14);
        const rally = apply(sheet, state, { type: "use-action", action: "rally" });
        expect(rally.state.hp.temporary).toBe(5);
        expect(rally.state.turn?.used).toEqual(["free"]);
    });

    it("special actions spend no activation and can apply conditions to self", () =>
    {
        const [sheet, state] = fighterSheet({
            turn: { used: ["action", "bonus-action"], actionsTaken: ["attack"], active: true }
        });
        const result = apply(sheet, state, { type: "use-action", action: "stunning-strike" });

        expect(result.state.turn?.used).toEqual(["action", "bonus-action"]);
        expect(result.state.turn?.actionsTaken).toEqual(["attack", "stunning-strike"]);
        expect(result.state.resources).toEqual({ ki: 2 });
        // An authored turn counter is stored as is: it ends with the current turn.
        expect(result.state.conditions).toEqual([{ condition: STUNNED, expires: { turns: 1 } }]);
    });
});

describe("start-turn and end-turn", () =>
{
    it("resets the economy at the end of the turn, the reaction at the start of the next", () =>
    {
        const [sheet, state] = fighterSheet();
        const busy = run(sheet, state, [
            { type: "start-turn" },
            { type: "use-action", action: "attack" },
            { type: "use-action", action: "deflect" },
            { type: "end-turn" }
        ]);
        expect(busy.turn).toEqual({ used: ["reaction"], actionsTaken: [], movementUsed: 0, active: false });
        const next = apply(sheet, busy, { type: "start-turn" });
        expect(next.state.turn).toEqual({ used: [], actionsTaken: [], movementUsed: 0, active: true });
    });

    it("counts turns on end-turn, rounds and next-turn-start on start-turn", () =>
    {
        const [sheet, state] = fighterSheet({
            conditions: [{ condition: STUNNED, expires: { turns: 2 } }],
            toggles: [
                { state: "patient-defense", expires: { until: "next-turn-start" } },
                { state: "raging", expires: { rounds: 1 } }
            ],
            activeSpells: [{ spell: BLESS, expires: { rounds: 2 } }],
            concentration: { spell: BLESS }
        });
        const afterEnd = apply(sheet, state, { type: "end-turn" });
        expect(afterEnd.state.conditions).toEqual([{ condition: STUNNED, expires: { turns: 1 } }]);
        expect(afterEnd.state.toggles).toHaveLength(2);
        const afterStart = apply(sheet, afterEnd.state, { type: "start-turn" });
        expect(afterStart.state.toggles).toEqual([]);
        expect(afterStart.state.activeSpells).toEqual([{ spell: BLESS, expires: { rounds: 1 } }]);
        expect(codes(afterStart)).toEqual(["I_EXPIRED", "I_EXPIRED"]);
        const secondEnd = apply(sheet, afterStart.state, { type: "end-turn" });
        expect(secondEnd.state.conditions).toEqual([]);
        const secondStart = apply(sheet, secondEnd.state, { type: "start-turn" });
        expect(secondStart.state.activeSpells).toEqual([]);
        expect(secondStart.state.concentration).toBeNull();
    });
});

describe("undo", () =>
{
    it("restores the previous state exactly, including keys the event created", () =>
    {
        const [sheet, state] = wizardSheet();
        const events: PlayEvent[] = [
            { type: "cast-spell", spell: BLESS },
            { type: "damage", amount: 9 },
            { type: "use-action", action: "attack" },
            { type: "custom-effect", name: { en: "x" } },
            { type: "long-rest" }
        ];
        const log: ApplyResult[] = [];
        let current = state;
        for (const event of events)
        {
            const result = apply(sheet, current, event);
            log.push(result);
            current = result.state;
        }
        for (const result of [...log].reverse()) { current = undo(current, result.entry); }

        expect(current).toEqual(state);
    });
});
