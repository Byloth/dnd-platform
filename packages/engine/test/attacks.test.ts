/** Attack rows from equipped weapons and the unarmed strike. */

import { describe, expect, it } from "vitest";

import { loadPackages } from "@byloth/dnd-platform-loader";
import { derive } from "../src/index.js";
import type { ComputedSheet } from "../src/index.js";
import { MINI, character, cls, feature, item, miniPackage } from "./helpers.js";

const FIGHTER = `${MINI}.class.fighter`;
const weapons = [
    item(`${MINI}.item.rapier`, {
        type: "weapon", category: "martial", damage: "1d8", damageType: "piercing", properties: ["finesse"]
    }),
    item(`${MINI}.item.longsword`, {
        type: "weapon",
        category: "martial",
        damage: "1d8",
        damageType: "slashing",
        properties: ["versatile"],
        versatile: "1d10"
    }),
    item(`${MINI}.item.longbow`, {
        type: "weapon",
        category: "martial",
        damage: "1d8",
        damageType: "piercing",
        ranged: true,
        range: { normal: 150, long: 600 }
    }),
    item(`${MINI}.item.club`, { type: "weapon", category: "simple", damage: "1d4", damageType: "bludgeoning" })
];

type Scores = Record<string, number>;

function sheet(scores: Scores, equipped: string[], proficiencies: Record<string, unknown> = {}): ComputedSheet
{
    const fighter = cls(FIGHTER, { 1: { features: [] } }, { proficiencies: proficiencies });
    const set = loadPackages([miniPackage({ entities: [fighter, ...weapons] })]);

    return derive(character({
        classes: [{ class: FIGHTER, levels: 1 }],
        scores: scores,
        equipment: equipped.map((id) => ({ item: `${MINI}.item.${id}`, equipped: true }))
    }), set);
}

const row = (s: ComputedSheet, id: string): ComputedSheet["attacks"][number] => s.attacks.find((a) => a.id === id)!;

describe("attack rows", () =>
{
    it("always includes an unarmed strike of 1 + STR", () =>
    {
        const s = sheet({ str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, []);

        expect(s.attacks.map((a) => a.id)).toEqual(["unarmed-strike"]);
        expect(row(s, "unarmed-strike")).toMatchObject({
            unarmed: true, ability: "str", proficient: true, damage: "3", damageType: "bludgeoning"
        });
        expect(row(s, "unarmed-strike").attackBonus.value).toBe(2 + 2);
        expect(s.sections).toContain("attacks");
    });

    it("uses STR for melee, DEX for ranged, and the better of the two for finesse", () =>
    {
        const martial = { weapons: ["martial"] };
        const agile = { str: 8, dex: 18, con: 10, int: 10, wis: 10, cha: 10 };
        const dexterous = sheet(agile, ["rapier", "longsword", "longbow"], martial);
        const strong = sheet({ str: 18, dex: 8, con: 10, int: 10, wis: 10, cha: 10 }, ["rapier"], martial);

        expect(row(dexterous, "rapier")).toMatchObject({ ability: "dex", damage: "1d8 + 4" });
        expect(row(dexterous, "longsword")).toMatchObject({ ability: "str", damage: "1d8 - 1" });
        expect(row(dexterous, "longbow")).toMatchObject({ ability: "dex", ranged: true, damage: "1d8 + 4" });
        expect(row(strong, "rapier")).toMatchObject({ ability: "str", damage: "1d8 + 4" });
    });

    it("adds a two-handed row for versatile weapons", () =>
    {
        const s = sheet({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, ["longsword"]);

        expect(row(s, "longsword").damage).toBe("1d8");
        expect(row(s, "longsword-two-handed")).toMatchObject({
            damageDice: "1d10", damage: "1d10", item: `${MINI}.item.longsword`
        });
    });

    it("keeps the better die and ability an effect offers instead (Martial Arts, Tavern Brawler)", () =>
    {
        const offer = feature(`${MINI}.feature.fighter.offer`, [{
            kind: "modify-attacks",
            filter: { melee: true },
            set: { ability: "dex", damageDie: "1d6" }
        }]);
        const build = (scores: Scores): ComputedSheet =>
        {
            const proficiencies = { proficiencies: { weapons: ["martial", "simple"] } };
            const fighter = cls(FIGHTER, { 1: { features: [offer] } }, proficiencies);
            const set = loadPackages([miniPackage({ entities: [fighter, ...weapons] })]);

            return derive(character({
                classes: [{ class: FIGHTER, levels: 1 }],
                scores: scores,
                equipment: ["club", "longsword"].map((id) => ({ item: `${MINI}.item.${id}`, equipped: true }))
            }), set);
        };
        const agile = build({ str: 8, dex: 16, con: 10, int: 10, wis: 10, cha: 10 });
        const strong = build({ str: 16, dex: 8, con: 10, int: 10, wis: 10, cha: 10 });

        expect(row(agile, "club")).toMatchObject({ ability: "dex", damageDice: "1d6" });
        expect(row(agile, "longsword")).toMatchObject({ damageDice: "1d8" });
        expect(row(agile, "longsword-two-handed")).toMatchObject({ damageDice: "1d10" });
        expect(row(strong, "club")).toMatchObject({ ability: "str", damageDice: "1d6" });
    });

    it("applies proficiency by weapon category or by item, not otherwise", () =>
    {
        const plain = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
        const byCategory = sheet(plain, ["club", "rapier"], { weapons: ["simple"] });
        const byItem = sheet(plain, ["rapier"], { weapons: ["rapier"] });

        expect(row(byCategory, "club")).toMatchObject({ proficient: true });
        expect(row(byCategory, "club").attackBonus.value).toBe(2);
        expect(row(byCategory, "rapier")).toMatchObject({ proficient: false });
        expect(row(byCategory, "rapier").attackBonus.value).toBe(0);
        const provenance = row(byCategory, "rapier").attackBonus.provenance;
        const proficiency = provenance.find((c) => c.label["en"] === "Proficiency bonus");

        expect(proficiency?.applied).toBe(false);
        expect(row(byItem, "rapier").proficient).toBe(true);
    });

    it("formats damage as dice plus or minus the bonus", () =>
    {
        const s = sheet({ str: 8, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, ["club"]);

        expect(row(s, "club").damage).toBe("1d4 - 1");
        expect(row(s, "unarmed-strike").damage).toBe("0");
    });

    it("carries the global melee and ranged bonuses with provenance", () =>
    {
        const bonuses = feature(`${MINI}.feature.fighter.b`, [
            { kind: "modify", target: "attack.ranged.bonus", op: "add", value: 2 },
            { kind: "modify", target: "damage.melee.bonus", op: "add", value: 1 }
        ]);
        const fighter = cls(FIGHTER, { 1: { features: [bonuses] } }, { proficiencies: { weapons: ["martial"] } });
        const set = loadPackages([miniPackage({ entities: [fighter, ...weapons] })]);
        const equipment = ["longbow", "club"].map((id) => ({ item: `${MINI}.item.${id}`, equipped: true }));
        const s = derive(character({ classes: [{ class: FIGHTER, levels: 1 }], equipment: equipment }), set);

        expect(row(s, "longbow").attackBonus.value).toBe(2 + 2);
        expect(row(s, "longbow").attackBonus.provenance.map((c) => c.label["en"])).toContain("Bonus to ranged attacks");
        expect(row(s, "club").damage).toBe("1d4 + 1");
    });
});
