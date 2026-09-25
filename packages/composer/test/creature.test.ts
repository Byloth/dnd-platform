import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadPackages } from "@byloth/dnd-platform-loader";

import { composeCreature } from "../src/index.js";
import { ROOT, readPackage } from "./helpers.js";

const packages = loadPackages(["srd51", "srd51-creatures"]
    .map((p) => readPackage(resolve(ROOT, "packages/content", p))));
const line = (lines: readonly { label: string, value: string }[], label: string): string | undefined =>
    lines.find((l) => l.label === label)?.value;

describe("composeCreature", () =>
{
    it("writes an SRD stat block as the manual prints it", () =>
    {
        const block = composeCreature("srd51-creatures.creature.adult-red-dragon", { packages: packages })!;

        expect(block.header).toBe("Huge dragon, chaotic evil");
        expect(line(block.core, "Hit Points")).toBe("256 (19d12 + 133)");
        expect(line(block.core, "Speed")).toBe("40 ft, climb 40 ft, fly 80 ft");
        expect(block.abilities.map((a) => `${a.score} (${a.modifier})`)[0]).toBe("27 (+8)");
        expect(line(block.details, "Saving Throws")).toBe("Dex +6, Con +13, Wis +7, Cha +11");
        expect(line(block.details, "Senses")).toBe("blindsight 60 ft, darkvision 120 ft, passive Perception 23");
        expect(line(block.details, "Challenge")).toBe("17 (18,000 XP)");
        const breath = block.sections.find((s) => s.id === "actions")!.entries
            .find((e) => e.name.startsWith("Fire Breath"))!;

        expect(breath.name).toBe("Fire Breath (Recharge 5–6)");
        expect(breath.save).toBe("DC 21 Dexterity");
        expect(breath.damage).toEqual(["18d6 fire"]);
        expect(block.sections.find((s) => s.id === "legendary")!.entries.at(-1)!.name)
            .toBe("Wing Attack (Costs 2 Actions)");
    });

    it("writes the Italian labels, sizes that agree with the type, and metres", () =>
    {
        const options = { packages: packages, language: "it", units: "metric" as const };
        const dragon = composeCreature("srd51-creatures.creature.adult-red-dragon", options)!;
        const swarm = composeCreature("srd51-creatures.creature.swarm-of-rats", options)!;
        const bear = composeCreature("srd51-creatures.creature.brown-bear", options)!;

        expect(dragon.header.startsWith("Drago Enorme")).toBe(true);
        expect(line(dragon.core, "Velocità")).toBe("12 m, scalare 12 m, volare 24 m");
        expect(line(dragon.details, "Tiri Salvezza")).toBe("Des +6, Cos +13, Sag +7, Car +11");
        expect(line(dragon.details, "Sensi")).toBe("Percezione passiva 23, vista cieca 18 m, scurovisione 36 m");
        expect(line(dragon.details, "Sfida")).toBe("17 (18.000 PE)");
        expect(swarm.header.startsWith("Sciame Medio di bestie Minuscole")).toBe(true);
        expect(bear.header.startsWith("Bestia Grande")).toBe(true);
    });

    it("gives a shapechanger's other forms their armour class", () =>
    {
        const block = composeCreature("srd51-creatures.creature.werewolf", { packages: packages })!;

        expect(line(block.core, "Armor Class"))
            .toBe("11; 12 (natural armor) in Hybrid form; 12 (natural armor) in Wolf form");
        expect(block.sections.find((s) => s.id === "actions")!.entries.map((e) => e.name))
            .toEqual([
                "Multiattack (Humanoid or Hybrid Form Only)",
                "Bite (Wolf or Hybrid Form Only)",
                "Claws (Hybrid Form Only)",
                "Spear (Humanoid Form Only)"
            ]);
    });

    it("is undefined for an id that is not a creature", () =>
    {
        expect(composeCreature("srd51.spell.fireball", { packages: packages })).toBeUndefined();
    });
});
