/**
 * Condition to words covers the whole condition language: every key of the condition schema has a sentence
 * in both languages (the composer's counterpart of the engine's vocabulary coverage test).
 */

import { describe, expect, it } from "vitest";

import { SCHEMAS } from "@byloth/dnd-platform-schema";
import type { Condition } from "@byloth/dnd-platform-engine";

import { CONDITION_KEYS, conditionWords, createTranslate } from "../src/index.js";
import type { WordingContext } from "../src/index.js";

function context(language: string): WordingContext
{
    const translate = createTranslate(language);

    return {
        t: (key, params, fallback) =>
        {
            const text = translate(`sheet.${key}`, params);

            return (text === `sheet.${key}` && fallback !== undefined) ? fallback : text;
        },
        name: (id) => id.split(".").pop() ?? id,
        label: () => "",
        abilityOf: () => undefined,
        score: () => 10,
        rule: () => undefined,
        condition: () => undefined,
        fromRuleset: () => false
    };
}

/** One sample value per key of the condition language. */
const SAMPLES: Record<string, Condition> = {
    level: { level: { min: 5 } },
    classLevel: { classLevel: { class: "srd51.class.monk", min: 3, max: 10 } },
    hasFeature: { hasFeature: "srd51.feature.monk.ki" },
    armorCategory: { armorCategory: "heavy" },
    shield: { shield: true },
    wielding: { wielding: { category: "martial", ranged: true } },
    wieldingOnly: { wieldingOnly: { monkWeapon: true, count: 1 } },
    armorStrengthUnmet: { armorStrengthUnmet: true },
    conditionActive: { conditionActive: "srd51.condition.prone" },
    toggled: { toggled: "rage" },
    resourceAtLeast: { resourceAtLeast: { resource: "ki", amount: 1 } },
    answer: { answer: { choice: "fighting-style", is: "srd51.option.defense" } },
    knowsSpell: { knowsSpell: "srd51.spell.shield" },
    ability: { ability: { ability: "str", min: 13 } },
    proficient: { proficient: { type: "armor", item: "heavy" } },
    species: { species: "srd51.species.elf" },
    class: { class: "srd51.class.wizard" },
    any: { any: [{ shield: true }, { armorCategory: "none" }] },
    all: { all: [{ level: { min: 2 } }, { toggled: "rage" }] },
    not: { not: { toggled: "rage" } }

} as Record<string, Condition>;

describe("condition to words", () =>
{
    it("knows every key of the condition schema", () =>
    {
        const schema = (SCHEMAS as Record<string, { properties?: Record<string, unknown> }>)["condition"];

        expect([...CONDITION_KEYS].sort()).toEqual(Object.keys(schema!.properties!).sort());
        expect(Object.keys(SAMPLES).sort()).toEqual([...CONDITION_KEYS].sort());
    });

    for (const language of ["en", "it"])
    {
        it(`has a sentence for every key in ${language}, never a raw key nor the fallback`, () =>
        {
            const ctx = context(language);
            for (const key of CONDITION_KEYS)
            {
                const text = conditionWords(SAMPLES[key]!, ctx);

                expect(text, key).not.toMatch(/sheet\.|when\./);
                expect(text, key).not.toBe(ctx.t("when.fallback", { condition: key }));
                expect(text.length, key).toBeGreaterThan(5);
            }
        });
    }

    it("reads the common negations directly", () =>
    {
        const ctx = context("en");

        expect(conditionWords({ not: { armorCategory: "none" } } as Condition, ctx)).toBe("you wear armor");
        expect(conditionWords({ not: { shield: true } } as Condition, ctx)).toBe("you carry no shield");
        expect(conditionWords({ level: { min: 5 }, shield: false } as Condition, ctx))
            .toBe("you are level 5 or higher and you carry no shield");
    });
});
