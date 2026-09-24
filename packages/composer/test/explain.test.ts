/**
 * The three explain views of the same provenance (docs/phase-1/03-sheet-composer.md): newcomer sentences with
 * the "would apply if…" of inactive contributions, the regular lines of the CLI, the expert lines.
 */

import { describe, expect, it } from "vitest";

import { explain } from "../src/index.js";
import { fixture } from "./helpers.js";

describe("explain", () =>
{
    it("words a skill for a newcomer: ability, proficiency, and what would apply", () =>
    {
        const { character, packages, sheet } = fixture("ranger-l11");
        const stealth = explain(sheet, "skill.stealth", { character: character, packages: packages })!;

        expect(stealth.newcomer).toEqual(["Your Dexterity (20) gives +5.", "Your proficiency bonus gives +4."]);
        expect(stealth.notes).toEqual(["Hide in Plain Sight would apply if hide in plain sight is on."]);
        expect(stealth.regular.map((l) => l.label)).toEqual(["Dexterity modifier", "Proficiency bonus"]);
        expect(stealth.expert).toHaveLength(3);
    });

    it("quotes the rule of a formula and names a labelled starting value", () =>
    {
        const monk = fixture("monk-l3-base");
        const ac = explain(monk.sheet, "ac", { character: monk.character, packages: monk.packages })!;
        expect(ac.newcomer![0]).toBe("Everyone starts from 10.");
        expect(ac.newcomer![2]).toMatch(/^Unarmored Defense: .*\. → 15\.$/);

        const cleric = fixture("cleric-l5");
        const hp = explain(cleric.sheet, "hp.max", { character: cleric.character, packages: cleric.packages })!;
        expect(hp.newcomer![0]).toBe("Level 1 (Cleric) sets the starting value at 10.");
    });

    it("finds the condition of an option's effect, and speaks Italian", () =>
    {
        const { character, packages, sheet } = fixture("conditions-all");
        const ac = explain(sheet, "ac", { character: character, packages: packages, language: "it" })!;

        expect(ac.newcomer).toEqual(["Tutti partono da 10.", "La tua Destrezza (14) dà +2."]);
        expect(ac.notes).toEqual(["Defense si applicherebbe se indossi un'armatura."]);
    });

    it("words the player's own score and adjustment, in both languages", () =>
    {
        const { character, packages, sheet } = fixture("barbarian-l5");
        const context = { character: character, packages: packages };
        const str = explain(sheet, "ability.str", context)!;
        const italian = explain(sheet, "ability.str", { ...context, language: "it" })!;

        expect(str.newcomer).toEqual(expect.arrayContaining([
            "You chose a score of 15.", "Your own adjustment adds +2."
        ]));
        expect(italian.newcomer).toEqual(expect.arrayContaining([
            "Hai scelto un punteggio di 15.", "La tua correzione aggiunge +2."
        ]));
    });
});
