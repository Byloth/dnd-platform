/**
 * The options of step 6 by kind (docs/phase-1/04-character-creation.md): a wizard's cantrips are the level 0
 * spells of its list, its spells the level 1 ones at level 1; languages come from the ruleset without those the
 * character already speaks; tools are named by their items; inline options by the engine's details.
 */

import { describe, expect, it } from "vitest";

import type { ChoiceView, Character } from "@byloth/dnd-platform-engine";
import type { Spell } from "@byloth/dnd-platform-schema";

import { choiceKind, useChoiceOptions } from "@/composables/choice-options";

import { SRD } from "./helpers";

const STATE = {
    hp: { current: 0, temporary: 0 },
    hitDice: { spent: 0 },
    resources: {},
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    inspiration: false
};

function build(species: string, cls: string, subspecies?: string)
{
    const character: Character = {
        id: "test",
        name: "Test",
        ruleset: { id: "srd51", version: SRD.manifest.version },
        packages: [{ id: "srd51", version: SRD.manifest.version }],
        choices: {
            species: species,
            ...(subspecies ? { subspecies: subspecies } : {}),
            classes: [{ class: cls, levels: 1 }],
            background: "srd51.background.acolyte",
            abilityScores: { method: "standard-array", base: { str: 10, dex: 14, con: 12, int: 15, wis: 13, cha: 8 } }
        },
        state: STATE
    };
    const set = useEngine().packageSet([SRD], { srd51: SRD.manifest.version });
    const sheet = useEngine().sheet(character, [SRD], { language: "en" }).sheet;
    const { t } = useNuxtApp().$i18n;
    const naming = useChoiceOptions(set, sheet, "en", (key, params) => t(key, params ?? {}));
    const choice = (key: string): ChoiceView => sheet.choices.find((c) => c.key === key)!;

    return { set, naming, choice };
}

describe("the options of a choice", () =>
{
    it("gives a wizard the cantrips and level 1 spells of its list", () =>
    {
        const { set, naming, choice } = build("srd51.species.human", "srd51.class.wizard");
        const cantrips = naming.options(choice("srd51.class.wizard#cantrips"));
        const spells = naming.options(choice("srd51.class.wizard#spells"));
        const level = (id: string): number => (set.entities.get(id)!.data as Spell).level;

        expect(choiceKind(choice("srd51.class.wizard#cantrips"))).toBe("cantrip");
        expect(cantrips.map((o) => o.name)).toContain("Fire Bolt");
        expect(cantrips.every((o) => level(o.id) === 0)).toBe(true);
        expect(spells.map((o) => o.name)).toContain("Magic Missile");
        expect(spells.every((o) => level(o.id) === 1)).toBe(true);
        expect(spells.find((o) => o.name === "Magic Missile")?.facts).toEqual(["1st level · Evocation"]);
    });

    it("offers the ruleset's languages but those already spoken", () =>
    {
        const { naming, choice } = build("srd51.species.human", "srd51.class.fighter");
        const languages = naming.options(choice("srd51.species.human#languages"));

        expect(languages.map((l) => l.name)).not.toContain("Common");
        expect(languages.map((l) => l.name)).toContain("Dwarvish");
        expect(languages.find((l) => l.name === "Draconic")?.group).toBe("exotic");
    });

    it("names tools by their items and inline options by their details", () =>
    {
        const monk = build("srd51.species.human", "srd51.class.monk");
        expect(monk.naming.options(monk.choice("srd51.class.monk#tools")).map((o) => o.name)).toContain("Flute");

        const fighter = build("srd51.species.human", "srd51.class.fighter");
        const styles = fighter.naming.options(fighter.choice("srd51.feature.fighter.fighting-style#fighting-style"));
        expect(styles.find((o) => o.id === "defense")).toMatchObject({ name: "Defense" });
        expect(styles.find((o) => o.id === "defense")?.summary).toMatch(/armor/);
    });

    it("fills a choice a package leaves without options: abilities, feats, any skill, any tool", () =>
    {
        const { naming } = build("srd51.species.human", "srd51.class.fighter");
        const open = (of: string, choice = of): ChoiceView => ({
            key: `x.feature.y#${choice}`,
            owner: "x.feature.y",
            choice: choice,
            of: of,
            count: 1,
            options: [],
            answers: [],
            answered: false
        });

        expect(naming.options(open("ability")).map((o) => o.name))
            .toEqual(["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]);
        expect(naming.options(open("feat")).map((o) => o.name)).toContain("Grappler");
        expect(choiceKind(open("feat"))).toBe("feat");
        const skills = naming.options(open("skill")).map((o) => o.id);
        expect(skills).toContain("stealth");
        expect(skills).not.toContain("insight");
        expect(skills).toHaveLength(16);
        expect(naming.options(open("tool")).map((o) => o.name)).toContain("Thieves' tools");
        expect(naming.options(open("option"))).toEqual([]);
    });
});
