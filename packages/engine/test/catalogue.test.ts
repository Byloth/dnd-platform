/**
 * One observable test per effect kind of the catalogue (docs/phase-0/02-content-format.md),
 * on in-memory mini packages. A meta-test (coverage-of-vocabulary.test.ts)
 * checks that every kind of EFFECT_KINDS is exercised here.
 */

import { describe, expect, it } from "vitest";

import { derive, loadPackages } from "../src/index.js";
import type { ComputedSheet, PackageSource } from "../src/index.js";
import { MINI, character, cls, feature, item, miniPackage, spell } from "./helpers.js";
import type { CharacterOptions, MiniEntity } from "./helpers.js";

const FIGHTER = `${MINI}.class.fighter`;
const WIZARD = `${MINI}.class.wizard`;
const F = (name: string): string => `${MINI}.feature.fighter.${name}`;
const ANY = { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 8 };

interface SheetOptions
{
    readonly entities?: MiniEntity[];
    readonly character?: CharacterOptions;
    readonly ruleset?: Record<string, unknown>;
    readonly levels?: number;
    readonly extraFeatures?: unknown[];
}

/** Derive a level-N fighter (STR 16, DEX 14, CON 12, WIS 13) whose level-1 feature carries the given effects. */
function sheetWith(effects: unknown[], options: SheetOptions = {}): ComputedSheet
{
    const features = [feature(F("test"), effects), ...(options.extraFeatures ?? [])];
    const fighter = cls(FIGHTER, { 1: { features: features } });
    const source = miniPackage({
        entities: [fighter, ...(options.entities ?? [])],
        ...(options.ruleset ? { ruleset: options.ruleset } : {})
    });
    const set = loadPackages([source]);

    expect(set.diagnostics.entries.filter((d) => d.severity === "error")).toEqual([]);

    return derive(character({
        classes: [{ class: FIGHTER, levels: options.levels ?? 1 }],
        scores: ANY,
        ...(options.character ?? {})
    }), set);
}

const codes = (sheet: ComputedSheet): string[] => sheet.warnings.map((w) => w.code);
const modify = (target: string, op: string, value: unknown, extra: Record<string, unknown> = {}): unknown =>
    ({ kind: "modify", target: target, op: op, value: value, ...extra });

describe("modify", () =>
{
    it.each([
        ["add", { op: "add", value: 2 }, 14],
        ["set", { op: "set", value: 30 }, 30],
        ["set-formula", { op: "set-formula", formula: "10 + mod(dex) + mod(wis)" }, 13],
        ["mul", { op: "mul", value: 2 }, 24],
        ["min (at least)", { op: "min", value: 16 }, 16],
        ["min below the value keeps the value", { op: "min", value: 5 }, 12]
    ])("%s on ac", (_name, effect, expected) =>
    {
        const sheet = sheetWith([{ kind: "modify", target: "ac", ...effect }]);

        expect(sheet.values["ac"]?.value).toBe(expected);
    });

    it("max raises a sense that was lower (Darkvision 60 on 0)", () =>
    {
        const sheet = sheetWith([modify("sense.darkvision", "max", 60)]);

        expect(sheet.values["sense.darkvision"]?.value).toBe(60);
        expect(sheet.sections).toContain("senses");
    });

    // ENGINE BUG: values.ts applies `max` as Math.min in the first pass, so a 120-ft darkvision
    // is clamped down to 60 by a later `max: 60`; 02 says max(current, v).
    it("max keeps a higher existing value (Darkvision 120 then 60)", () =>
    {
        const sheet = sheetWith([modify("sense.darkvision", "set", 120), modify("sense.darkvision", "max", 60)]);

        expect(sheet.values["sense.darkvision"]?.value).toBe(120);
    });

    it("applies precedence set-formula → mul → add → min regardless of declaration order", () =>
    {
        const sheet = sheetWith([
            modify("speed.walk", "min", 100),
            modify("speed.walk", "add", 10),
            modify("speed.walk", "mul", 2),
            modify("speed.walk", "set", 20)
        ]);
        const kinds = sheet.values["speed.walk"]?.provenance.map((c) => c.kind);

        // set 20 → ×2 = 40 → +10 = 50 → at least 100 = 100
        expect(sheet.values["speed.walk"]?.value).toBe(100);
        expect(kinds).toEqual(["base", "set", "mul", "add", "min"]);
    });

    it("breaks ties between two sets by declaration order (the later wins)", () =>
    {
        const sheet = sheetWith([modify("ac", "set", 15), modify("ac", "set", 17)]);

        expect(sheet.values["ac"]?.value).toBe(17);
    });

    it("breaks ties across packages by load order (extension after base)", () =>
    {
        const fifteen = feature(F("base"), [modify("ac", "set", 15)]);
        const seventeen = feature("ext.feature.fighter.ext", [modify("ac", "set", 17)]);
        const base = miniPackage({ entities: [cls(FIGHTER, { 1: { features: [fifteen] } })] });
        const patch = { id: "ext.patch.fighter", target: FIGHTER, append: { "levels.1.features": [seventeen] } };
        const ext: PackageSource = miniPackage({
            id: "ext",
            kind: "extension",
            dependencies: [{ id: MINI, version: "^0.1.0" }],
            entities: [{ type: "patch", data: patch }]
        });
        const set = loadPackages([ext, base]);
        const sheet = derive(character({ classes: [{ class: FIGHTER, levels: 1 }] }), set);

        expect(set.order.map((m) => m.id)).toEqual([MINI, "ext"]);
        expect(sheet.values["ac"]?.value).toBe(17);
    });

    it("keeps a dice value symbolic in the sheet", () =>
    {
        const sheet = sheetWith([modify("save.all", "add", "1d4")]);

        expect(sheet.values["save.all"]?.value).toBe("1d4");
        // A dice bonus on save.all is not folded into the numeric saves (they stay numbers).
        expect(sheet.values["save.str"]?.value).toBe(3 + 2);
    });

    it("folds a numeric save.all into every saving throw", () =>
    {
        const sheet = sheetWith([modify("save.all", "add", 1)]);
        const labels = sheet.values["save.wis"]?.provenance.map((c) => c.label["en"]);

        expect(sheet.values["save.str"]?.value).toBe(3 + 2 + 1);
        expect(sheet.values["save.wis"]?.value).toBe(1 + 1);
        expect(labels).toContain("Bonus to all saving throws");
    });

    it("folds check.all into every ability check (Jack of All Trades, Stone of Good Luck)", () =>
    {
        const sheet = sheetWith([modify("check.all", "add", 1)]);
        const labels = sheet.values["check.int"]?.provenance.map((c) => c.label["en"]);

        expect(sheet.values["check.all"]?.value).toBe(1);
        expect(sheet.values["check.int"]?.value).toBe(1);
        expect(sheet.values["check.str"]?.value).toBe(3 + 1);
        expect(labels).toContain("Bonus to all ability checks");
    });

    it("accepts the unlimited literal on a resource maximum", () =>
    {
        const rage = {
            kind: "declare-resource", resource: "rage", max: 2, recharge: [{ on: "long-rest", amount: "full" }]
        };
        const sheet = sheetWith([rage, modify("resource.rage.max", "set", "unlimited")]);

        expect(sheet.resources[0]?.max.value).toBe(Number.POSITIVE_INFINITY);
    });

    it("scopes hp.perLevel to the owning class when it comes from a class feature", () =>
    {
        const tough = feature(`${MINI}.feature.wizard.tough`, [modify("hp.perLevel", "add", 1)]);
        const wizard = cls(WIZARD, { 1: { features: [tough] } }, { hitDie: 6 });
        const fighter = cls(FIGHTER, { 1: { features: [] } }, { hitDie: 10 });
        const set = loadPackages([miniPackage({ entities: [fighter, wizard] })]);
        const sheet = derive(character({
            classes: [{ class: FIGHTER, levels: 3 }, { class: WIZARD, levels: 2 }],
            scores: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 }
        }), set);
        const contribution = sheet.values["hp.max"]?.provenance.find((c) => c.label["en"] === "tough");

        // fighter: 10 + 2, then 2 × (6 + 2); wizard: 2 × (4 + 2); tough: +1 × 2 wizard levels
        expect(sheet.values["hp.max"]?.value).toBe(12 + 16 + 12 + 2);
        expect(contribution?.formula).toBe("1 × wizard level");
    });

    it("keeps an unapplied contribution in the provenance with applied: false", () =>
    {
        const sheet = sheetWith([modify("ac", "add", 5, { when: { level: { min: 20 } } })]);

        expect(sheet.values["ac"]?.value).toBe(12);
        expect(sheet.values["ac"]?.provenance.at(-1)).toMatchObject({ kind: "add", value: 5, applied: false });
    });
});

describe("modify-attacks", () =>
{
    const longsword = item(`${MINI}.item.longsword`, {
        type: "weapon",
        category: "martial",
        damage: "1d8",
        damageType: "slashing",
        properties: ["versatile"],
        versatile: "1d10"
    });
    const dagger = item(`${MINI}.item.dagger`, {
        type: "weapon",
        category: "simple",
        damage: "1d4",
        damageType: "piercing",
        properties: ["finesse", "light"],
        monkWeapon: true
    });
    const shortbow = item(`${MINI}.item.shortbow`, {
        type: "weapon",
        category: "simple",
        damage: "1d6",
        damageType: "piercing",
        ranged: true,
        range: { normal: 80, long: 320 }
    });
    const equipped: SheetOptions = {
        entities: [longsword, dagger, shortbow],
        character: {
            equipment: [
                { item: `${MINI}.item.longsword`, equipped: true },
                { item: `${MINI}.item.dagger`, equipped: true },
                { item: `${MINI}.item.shortbow`, equipped: true }
            ]
        }
    };
    type Row = ComputedSheet["attacks"][number];
    const ids = (sheet: ComputedSheet, predicate: (a: Row) => boolean): string[] =>
        sheet.attacks.filter(predicate).map((a) => a.id);
    const attacks = (filter: unknown, set: unknown, extra: Record<string, unknown> = {}): unknown =>
        ({ kind: "modify-attacks", ...(filter ? { filter: filter } : {}), set: set, ...extra });

    it.each([
        ["unarmed", { unarmed: true }, ["unarmed-strike"]],
        ["item", { item: `${MINI}.item.dagger` }, ["dagger"]],
        ["property", { property: "finesse" }, ["dagger"]],
        ["category", { category: "martial" }, ["longsword", "longsword-two-handed"]],
        ["ranged", { ranged: true }, ["shortbow"]],
        ["melee", { melee: true }, ["longsword", "longsword-two-handed", "dagger", "unarmed-strike"]],
        ["monkWeapon", { monkWeapon: true }, ["dagger"]]
    ])("filter %s selects the matching rows", (_name, filter, expected) =>
    {
        const sheet = sheetWith([attacks(filter, { magical: true })], equipped);

        expect(ids(sheet, (a) => a.magical)).toEqual(expected);
    });

    it("without a filter changes every row", () =>
    {
        const sheet = sheetWith([attacks(undefined, { attackBonus: 1 })], equipped);
        const bonus = (row: Row): boolean => row.attackBonus.provenance.some((c) => c.value === 1 && c.applied);

        expect(sheet.attacks.every(bonus)).toBe(true);
    });

    it("sets ability, damage die, damage type, crit range and bonuses", () =>
    {
        const set = {
            ability: "dex",
            damageDie: "1d4",
            damageType: "slashing",
            magical: true,
            critRange: 19,
            attackBonus: 1,
            damageBonus: 2
        };
        const sheet = sheetWith([attacks({ unarmed: true }, set)], equipped);
        const unarmed = sheet.attacks.find((a) => a.id === "unarmed-strike")!;

        // DEX 14 → +2, proficiency +2, attackBonus +1
        expect(unarmed).toMatchObject({ ability: "dex", damageDice: "1d4", damageType: "slashing", magical: true });
        expect(unarmed.critRange).toBe(19);
        expect(unarmed.attackBonus.value).toBe(2 + 2 + 1);
        expect(unarmed.damage).toBe("1d4 + 4");
    });

    it("keeps the lowest crit range of several modifiers", () =>
    {
        const effects = [attacks(undefined, { critRange: 19 }), attacks(undefined, { critRange: 18 })];
        const sheet = sheetWith(effects, equipped);

        expect(sheet.attacks[0]?.critRange).toBe(18);
    });

    it("resolves a table formula as the damage die (a feature's define-table is addressed by its bare name)", () =>
    {
        const table = {
            kind: "define-table", table: "martial-arts", by: "classLevel", rows: { 1: "1d4", 5: "1d6" }
        };
        const effects = [attacks({ unarmed: true }, { damageDie: "table(martial-arts)" })];
        const sheet = sheetWith(effects, { ...equipped, extraFeatures: [feature(F("table"), [table])], levels: 5 });

        expect(sheet.attacks.find((a) => a.id === "unarmed-strike")?.damageDice).toBe("1d6");
    });

    it("collects extra damage", () =>
    {
        const extraDamage = { dice: "2d6", damageType: "fire" };
        const fire = attacks({ item: `${MINI}.item.longsword` }, { extraDamage: extraDamage });
        const sheet = sheetWith([fire], equipped);
        const extra = sheet.attacks.find((a) => a.id === "longsword")?.extraDamage;

        expect(extra).toEqual([expect.objectContaining({ dice: "2d6", damageType: "fire" })]);
        expect(sheet.attacks.find((a) => a.id === "dagger")?.extraDamage).toEqual([]);
    });

    it("keeps an unapplied modifier's bonus in the provenance with applied: false", () =>
    {
        const gated = attacks(undefined, { attackBonus: 3, magical: true }, { when: { level: { min: 10 } } });
        const sheet = sheetWith([gated], equipped);
        const row = sheet.attacks.find((a) => a.id === "unarmed-strike")!;

        expect(row.magical).toBe(false);
        expect(row.attackBonus.provenance.find((c) => c.label["en"] === "test")?.applied).toBe(false);
        expect(row.attackBonus.value).toBe(3 + 2);
    });
});

describe("grant-proficiency", () =>
{
    const grant = (type: string, extra: Record<string, unknown>): unknown =>
        ({ kind: "grant-proficiency", type: type, ...extra });

    it("adds fixed proficiencies and applies them to saves and skills", () =>
    {
        const sheet = sheetWith([
            grant("skill", { items: ["stealth"] }),
            grant("save", { items: ["wis"] }),
            grant("language", { items: ["elvish"] })
        ]);

        expect(sheet.values["skill.stealth"]?.value).toBe(2 + 2);
        expect(sheet.values["save.wis"]?.value).toBe(1 + 2);
        expect(sheet.proficiencies.map((p) => `${p.type}:${p.item}`)).toContain("language:elvish");
    });

    it("registers a choice, warns when unanswered and applies the answer", () =>
    {
        const effects = [grant("skill", { choose: { count: 1, from: ["stealth", "perception"] } })];
        const unanswered = sheetWith(effects);
        const answered = sheetWith(effects, { character: { answers: { [`${F("test")}#skill`]: ["perception"] } } });

        expect(codes(unanswered)).toContain("W_UNANSWERED_CHOICE");
        expect(unanswered.choices.find((c) => c.key === `${F("test")}#skill`)?.answered).toBe(false);
        expect(codes(answered)).not.toContain("W_UNANSWERED_CHOICE");
        expect(answered.values["skill.perception"]?.value).toBe(1 + 2);
    });

    it("keys a named choice by choose.id and doubles proficiency with expertise", () =>
    {
        const choose = { id: "expertise-1", count: 1, from: ["stealth"] };
        const expertise = grant("skill", { choose: choose, expertise: true });
        const answers = { [`${F("test")}#expertise-1`]: ["stealth"] };
        const effects = [grant("skill", { items: ["stealth"] }), expertise];
        const sheet = sheetWith(effects, { character: { answers: answers } });

        expect(sheet.values["skill.stealth"]?.value).toBe(2 + 4);
        expect(sheet.values["skill.stealth"]?.provenance.map((c) => c.label["en"])).toContain("Expertise");
    });

    it("resolves items: [self] to the owning item on an item feature", () =>
    {
        const training = feature(`${MINI}.feature.item.elven-bow.training`, [grant("weapon", { items: ["self"] })]);
        const bow = item(`${MINI}.item.elven-bow`, {
            type: "weapon",
            category: "martial",
            damage: "1d8",
            damageType: "piercing",
            ranged: true,
            features: [training]
        });
        const equipment = [{ item: `${MINI}.item.elven-bow`, equipped: true }];
        const sheet = sheetWith([], { entities: [bow], character: { equipment: equipment } });

        expect(sheet.proficiencies.map((p) => `${p.type}:${p.item}`)).toContain(`weapon:${MINI}.item.elven-bow`);
        expect(sheet.attacks.find((a) => a.id === "elven-bow")?.proficient).toBe(true);
    });
});

describe("declare-resource", () =>
{
    const ki = {
        kind: "declare-resource",
        resource: "ki",
        name: { en: "Ki" },
        max: "classLevel",
        recharge: [{ on: "short-rest", amount: "full" }, { on: "long-rest", amount: "full" }],
        display: "pips"
    };

    it("computes the maximum from a formula and reads the current value from the state", () =>
    {
        const sheet = sheetWith([ki], { levels: 4, character: { state: { resources: { ki: 1 } } } });
        const resource = sheet.resources.find((r) => r.id === "ki")!;

        expect(resource.max.value).toBe(4);
        expect(resource.current).toBe(1);
        expect(resource.recharge.map((r) => r.on)).toEqual(["short-rest", "long-rest"]);
        expect(resource.display).toBe("pips");
        expect(sheet.sections).toContain("resources");
    });

    it("reports null when the state has no entry yet", () =>
    {
        expect(sheetWith([ki]).resources[0]?.current).toBeNull();
    });

    it("lets modify resource.<id>.recharge override the recharge (a short rest implies the long one)", () =>
    {
        const inspiration = {
            kind: "declare-resource",
            resource: "inspiration",
            max: 3,
            recharge: [{ on: "long-rest", amount: "full" }]
        };
        const sheet = sheetWith([inspiration, modify("resource.inspiration.recharge", "set", "short-rest")]);

        expect(sheet.resources[0]?.recharge).toEqual([
            { on: "short-rest", amount: "full" },
            { on: "long-rest", amount: "full" }
        ]);
    });
});

describe("add-action", () =>
{
    const strike = {
        kind: "add-action",
        action: "stunning-strike",
        name: { en: "Stunning Strike" },
        activation: "special",
        cost: [{ resource: "ki", amount: 1 }],
        dc: "8 + proficiencyBonus + mod(wis)",
        rolls: [
            { type: "attack", ability: "str", proficient: true },
            { type: "damage", dice: "1d4", ability: "str", damageType: "bludgeoning" }
        ],
        requires: { afterAction: "attack" },
        toggle: { state: "stunning", expires: { turns: 1 } }
    };
    const dodge = (activation: string): unknown =>
        ({ kind: "add-action", action: "uncanny-dodge", name: { en: "Uncanny Dodge" }, activation: activation });

    it("exposes cost, DC, rolls, requirement and toggle", () =>
    {
        const sheet = sheetWith([strike]);
        const action = sheet.actions.find((a) => a.id === "stunning-strike")!;

        expect(action.cost).toEqual([{ resource: "ki", amount: 1 }]);
        expect(action.dc?.value).toBe(8 + 2 + 1);
        expect(action.rolls?.[0]?.bonus?.value).toBe(3 + 2);
        expect(action.rolls?.[1]?.bonus?.value).toBe(3);
        expect(action.requires).toEqual({ afterAction: "attack" });
        expect(action.toggle).toBe("stunning");
        expect(action.available).toBe(true);
        expect(sheet.sections).toEqual(expect.arrayContaining(["actions", "attacks"]));
    });

    it("lists an action whose when fails as unavailable", () =>
    {
        const sheet = sheetWith([{ ...strike, when: { level: { min: 5 } } }]);

        expect(sheet.actions[0]?.available).toBe(false);
    });

    it("collapses identical duplicate actions into one row", () =>
    {
        const twin = feature(F("twin"), [dodge("reaction")]);
        const sheet = sheetWith([dodge("reaction")], { extraFeatures: [twin] });

        expect(sheet.actions.filter((a) => a.id === "uncanny-dodge")).toHaveLength(1);
        expect(codes(sheet)).not.toContain("W_DUPLICATE_ACTION");
    });

    it("warns on duplicate actions with different content and keeps the first", () =>
    {
        const twin = feature(F("twin"), [dodge("bonus-action")]);
        const sheet = sheetWith([dodge("reaction")], { extraFeatures: [twin] });

        expect(codes(sheet)).toContain("W_DUPLICATE_ACTION");
        expect(sheet.actions.find((a) => a.id === "uncanny-dodge")?.activation).toBe("reaction");
    });
});

describe("grant-spellcasting", () =>
{
    const table = (id: string, rows: Record<string, unknown>): MiniEntity =>
        ({ type: "table", data: { id: id, name: { en: id }, by: "classLevel", rows: rows } });
    const full = table(`${MINI}.table.slots.full`, {
        1: [2], 2: [3], 3: [4, 2], 5: [4, 3, 2], 10: [4, 3, 3, 3, 2]
    });
    const half = table(`${MINI}.table.slots.half`, { 1: [0], 2: [2], 5: [4, 2] });
    const third = table(`${MINI}.table.slots.third`, { 3: [2], 4: [3] });
    const pact = table(`${MINI}.table.slots.pact`, { 1: [1, 1], 2: [2, 1], 3: [2, 2] });
    const cantrips = table(`${MINI}.table.cantrips`, { 1: 3, 4: 4 });
    const known = table(`${MINI}.table.known`, { 1: 2, 2: 3 });
    const ruleset = {
        spellSlots: {
            full: { table: `${MINI}.table.slots.full` },
            half: { table: `${MINI}.table.slots.half` },
            third: { table: `${MINI}.table.slots.third` },
            pact: { table: `${MINI}.table.slots.pact` },
            multiclass: { table: `${MINI}.table.slots.full`, casterLevel: "sum(classLevel * casterWeight)" }
        }
    };
    const spells = [spell(`${MINI}.spell.light`, 0), spell(`${MINI}.spell.bless`, 1), spell(`${MINI}.spell.aid`, 2)];
    const list: MiniEntity = {
        type: "spell-list",
        data: { id: `${MINI}.spell-list.wizard`, name: { en: "w" }, spells: spells.map((s) => s.data["id"]) }
    };
    const entities = [full, half, third, pact, cantrips, known, list, ...spells];
    const casting = (progression: string, extra: Record<string, unknown> = {}): unknown => ({
        kind: "grant-spellcasting",
        ability: "wis",
        list: `${MINI}.spell-list.wizard`,
        preparation: "prepared",
        slots: { progression: progression },
        cantrips: { table: `${MINI}.table.cantrips` },
        ritual: true,
        ...extra
    });
    const withTables = (levels: number, extra: Partial<SheetOptions> = {}): SheetOptions =>
        ({ entities: entities, ruleset: ruleset, levels: levels, ...extra });

    it.each([
        ["full", 5, [4, 3, 2]],
        ["half", 5, [4, 2]],
        ["third", 4, [3]]
    ])("%s progression reads the ruleset table at class level %i", (progression, level, expected) =>
    {
        const sheet = sheetWith([casting(progression)], withTables(level));
        const view = sheet.spellcasting[0]!;
        const proficiency = level >= 5 ? 3 : 2;

        expect(view.slots.map((s) => s.max)).toEqual(expected);
        expect(view.dc.value).toBe(8 + proficiency + 1);
        expect(view.attackBonus.value).toBe(proficiency + 1);
        expect(view.ritual).toBe(true);
        expect(sheet.sections).toEqual(expect.arrayContaining(["spellcasting", "spells"]));
    });

    it("pact progression exposes shared slots at one level", () =>
    {
        const state = { spellSlots: { pact: 1 } };
        const sheet = sheetWith([casting("pact")], withTables(3, { character: { state: state } }));

        expect(sheet.spellcasting[0]?.pact).toEqual({ slots: 2, level: 2, current: 1 });
        expect(sheet.spellcasting[0]?.slots).toEqual([]);
    });

    it("uses the multiclass table with the weighted caster level when two classes cast", () =>
    {
        const fighterCast = feature(F("cast"), [casting("full")]);
        const fighter = cls(FIGHTER, { 1: { features: [fighterCast] } }, { casterWeight: 1 });
        const wizardCast = feature(`${MINI}.feature.wizard.cast`, [casting("half")]);
        const wizard = cls(WIZARD, { 1: { features: [wizardCast] } }, { casterWeight: 0.5 });
        const set = loadPackages([miniPackage({ entities: [fighter, wizard, ...entities], ruleset: ruleset })]);
        const classes = [{ class: FIGHTER, levels: 3 }, { class: WIZARD, levels: 4 }];
        const sheet = derive(character({ classes: classes }), set);

        // caster level floor(3 × 1 + 4 × 0.5) = 5 → full table row 5
        expect(sheet.spellcasting).toHaveLength(2);
        expect(sheet.spellcasting[0]?.slots.map((s) => s.max)).toEqual([4, 3, 2]);
        expect(sheet.spellcasting[1]?.slots.map((s) => s.max)).toEqual([4, 3, 2]);
    });

    it("reads cantrips and spells known from tables and counts prepared spells as level + modifier", () =>
    {
        const knownCaster = casting("full", { preparation: "known", known: { table: `${MINI}.table.known` } });
        const withKnown = sheetWith([knownCaster], withTables(2));
        const prepared = sheetWith([casting("full")], withTables(3));

        expect(withKnown.spellcasting[0]?.cantripsKnown).toBe(3);
        expect(withKnown.spellcasting[0]?.spellsKnown).toBe(3);
        expect(withKnown.choices.find((c) => c.key === `${FIGHTER}#spells`)?.count).toBe(3);
        // prepared: level 3 + WIS modifier 1
        expect(prepared.choices.find((c) => c.key === `${FIGHTER}#spells`)?.count).toBe(4);
        expect(prepared.choices.find((c) => c.key === `${FIGHTER}#cantrips`)?.count).toBe(3);
    });

    it("turns the answers into free cantrips and slot-paid spells", () =>
    {
        const answers = {
            [`${FIGHTER}#cantrips`]: [`${MINI}.spell.light`],
            [`${FIGHTER}#spells`]: [`${MINI}.spell.bless`, `${MINI}.spell.aid`]
        };
        const sheet = sheetWith([casting("full")], withTables(1, { character: { answers: answers } }));

        expect(sheet.spells.map((s) => [s.id.split(".").pop(), s.as, s.paidWith])).toEqual([
            ["light", "cantrip", { free: true }],
            ["bless", "prepared", { slot: true }],
            ["aid", "prepared", { slot: true }]
        ]);
    });

    it("reads slots from an explicit table when slots.table is given", () =>
    {
        const explicit = casting("full", { slots: { table: `${MINI}.table.slots.half` } });
        const sheet = sheetWith([explicit], withTables(5));

        expect(sheet.spellcasting[0]?.slots.map((s) => s.max)).toEqual([4, 2]);
    });

    describe("grant-spells", () =>
    {
        it.each([
            ["a slot", {}, { slot: true }],
            ["a resource", { cost: [{ resource: "ki", amount: 2 }] }, { resource: "ki", amount: 2 }],
            ["limited uses", { uses: { count: 1, recharge: "long-rest" } }, { uses: 1, recharge: "long-rest" }]
        ])("pays with %s", (_name, extra, expected) =>
        {
            const grant = {
                kind: "grant-spells", spells: [`${MINI}.spell.bless`], as: "always-prepared", ability: "cha", ...extra
            };
            const sheet = sheetWith([grant], { entities: entities });

            expect(sheet.spells[0]).toMatchObject({ as: "always-prepared", ability: "cha", paidWith: expected });
            expect(sheet.sections).toContain("spells");
            expect(sheet.sections).not.toContain("spellcasting");
        });

        it("makes a granted cantrip free and warns on a missing spell", () =>
        {
            const spellIds = [`${MINI}.spell.light`, `${MINI}.spell.nope`];
            const grant = { kind: "grant-spells", spells: spellIds, as: "known" };
            const sheet = sheetWith([grant], { entities: entities });

            expect(sheet.spells).toHaveLength(1);
            expect(sheet.spells[0]).toMatchObject({ as: "cantrip", paidWith: { free: true } });
            expect(codes(sheet)).toContain("W_MISSING_ENTITY");
        });
    });

    it("extend-spell-list is accepted without changing the sheet (engine no-op in M0.5)", () =>
    {
        const extend = {
            kind: "extend-spell-list", list: `${MINI}.spell-list.wizard`, spells: [`${MINI}.spell.aid`]
        };
        const sheet = sheetWith([extend], { entities: entities });

        expect(sheet.spells).toEqual([]);
        expect(codes(sheet)).toEqual([]);
    });
});

describe("roll modifiers and defenses", () =>
{
    it("roll-advantage and roll-disadvantage become views that keep the applied flag", () =>
    {
        const sheet = sheetWith([
            { kind: "roll-advantage", on: { type: "save", against: ["poison"] }, note: { en: "vs poison" } },
            { kind: "roll-disadvantage", on: { type: "check", skill: "stealth" }, when: { level: { min: 9 } } }
        ]);

        expect(sheet.rollModifiers).toEqual([
            expect.objectContaining({ kind: "advantage", on: { type: "save", against: ["poison"] }, applied: true }),
            expect.objectContaining({ kind: "disadvantage", on: { type: "check", skill: "stealth" }, applied: false })
        ]);
        expect(sheet.rollModifiers[0]?.note).toEqual({ en: "vs poison" });
    });

    it("defense lists resistances only while applied", () =>
    {
        const sheet = sheetWith([
            { kind: "defense", defense: "resistance", to: ["poison"] },
            { kind: "defense", defense: "condition-immunity", to: ["magical-sleep"], when: { level: { min: 9 } } }
        ]);

        expect(sheet.defenses).toEqual([expect.objectContaining({ defense: "resistance", to: ["poison"] })]);
    });
});

describe("sections", () =>
{
    it("add-text activates its section and add-section adds a custom one, ordered last", () =>
    {
        const sheet = sheetWith([
            { kind: "add-text", section: "senses", text: { en: "You hear well." } },
            { kind: "add-section", section: "ki-log", name: { en: "Ki log" } }
        ]);

        expect(sheet.sections).toContain("senses");
        expect(sheet.sections.at(-1)).toBe("ki-log");
        expect(sheet.sections.indexOf("senses")).toBeLessThan(sheet.sections.indexOf("combat"));
    });
});

describe("open-choice", () =>
{
    it("registers a choice with explicit options", () =>
    {
        const choice = {
            kind: "open-choice", choice: "style", of: "fighting-style", count: 1, from: ["archery", "defense"]
        };
        const sheet = sheetWith([choice]);
        const view = sheet.choices.find((c) => c.key === `${F("test")}#style`)!;

        expect(view).toMatchObject({ of: "fighting-style", count: 1, answered: false });
        expect(view.options).toEqual(["archery", "defense"]);
        expect(codes(sheet)).toContain("W_UNANSWERED_CHOICE");
    });

    it("applies the effects of chosen inline options only", () =>
    {
        const archery = { id: "archery", name: { en: "Archery" }, effects: [modify("attack.ranged.bonus", "add", 2)] };
        const defense = { id: "defense", name: { en: "Defense" }, effects: [modify("ac", "add", 1)] };
        const choice = { kind: "open-choice", choice: "style", of: "option", count: 1, options: [archery, defense] };
        const sheet = sheetWith([choice], { character: { answers: { [`${F("test")}#style`]: ["defense"] } } });
        const chosen = sheet.values["ac"]?.provenance.find((c) => c.label["en"] === "Defense");

        expect(sheet.values["ac"]?.value).toBe(13);
        expect(sheet.values["attack.ranged.bonus"]?.value ?? 0).toBe(0);
        expect(chosen?.source.feature).toBe("defense");
    });

    it("accepts a filter with no listed options", () =>
    {
        const choice = {
            kind: "open-choice", choice: "cantrip", of: "spell", count: 1, filter: { type: "spell", level: 0 }
        };
        const sheet = sheetWith([choice]);

        expect(sheet.choices.find((c) => c.key === `${F("test")}#cantrip`)?.options).toEqual([]);
    });
});

describe("define-table", () =>
{
    const sneak = {
        kind: "define-table",
        table: "sneak-attack",
        by: "classLevel",
        rows: { 1: "1d6", 3: "2d6", 5: "classLevel" }
    };

    it("looks tables up as step functions, including formula rows", () =>
    {
        const lookup = modify("attack.melee.bonus", "set-formula", undefined, { formula: "table(sneak-attack)" });
        const at = (levels: number): number | string | undefined =>
            sheetWith([sneak, lookup], { levels: levels }).values["attack.melee.bonus"]?.value;

        expect(at(1)).toBe("1d6");
        expect(at(4)).toBe("2d6");
        expect(at(6)).toBe(6);
    });

    // ENGINE BUG: a dice-valued `set`/`set-formula` keeps the numeric base of the target
    // (attacks.perAction base 1 → "2d6 + 1"); 02 says set-formula replaces the base computation.
    it("a dice-valued set-formula replaces a numeric base", () =>
    {
        const lookup = modify("attacks.perAction", "set-formula", undefined, { formula: "table(sneak-attack)" });
        const sheet = sheetWith([sneak, lookup], { levels: 4 });

        expect(sheet.values["attacks.perAction"]?.value).toBe("2d6");
    });

    it("resolves class tables through table(<class>.<name>) with bare classLevel rows", () =>
    {
        const recharge = [{ on: "short-rest", amount: "full" }];
        const declare = {
            kind: "declare-resource", resource: "ki", max: "table(fighter.ki-points)", recharge: recharge
        };
        const ki = feature(F("ki"), [declare]);
        const tables = { "ki-points": { by: "classLevel", rows: { 1: 0, 2: "classLevel" } } };
        const fighter = cls(FIGHTER, { 1: { features: [ki] } }, { tables: tables });
        const set = loadPackages([miniPackage({ entities: [fighter] })]);
        const at = (levels: number): number | string =>
            derive(character({ classes: [{ class: FIGHTER, levels: levels }] }), set).resources[0]!.max.value;

        expect(at(1)).toBe(0);
        expect(at(6)).toBe(6);
    });
});
