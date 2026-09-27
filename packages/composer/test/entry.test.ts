import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadPackages } from "@byloth/dnd-platform-loader";

import { composeEntry } from "../src/index.js";
import type { EntryView } from "../src/index.js";
import { ROOT, readPackage } from "./helpers.js";

const content = (ids: readonly string[]): ReturnType<typeof readPackage>[] =>
    ids.map((p) => readPackage(resolve(ROOT, "packages/content", p)));
const english = loadPackages(content(["srd51"]));
const italian = loadPackages(content(["srd51", "srd51-it"]), { language: "it" });

const en = (id: string): EntryView => composeEntry(id, { packages: english })!;
const it_ = (id: string): EntryView => composeEntry(id, { packages: italian, language: "it", units: "metric" })!;
const line = (view: EntryView, label: string): string | undefined =>
    view.lines.find((l) => l.label === label)?.value;

describe("composeEntry: spells", () =>
{
    it("writes a spell's header and lines as the manual prints them", () =>
    {
        const fireball = en("srd51.spell.fireball");

        expect(fireball.kind).toBe("spell");
        expect(fireball.subtitle).toBe("3rd-level evocation");
        expect(line(fireball, "Casting Time")).toBe("1 action");
        expect(line(fireball, "Range")).toBe("150 feet (20-foot-radius sphere)");
        expect(line(fireball, "Components")).toBe("V, S, M (a tiny ball of bat guano and sulfur)");
        expect(line(fireball, "Duration")).toBe("Instantaneous");
        expect(fireball.classes).toEqual(["Sorcerer", "Wizard"]);
        expect(fireball.sections[0]!.title).toBe("At Higher Levels");
        expect(fireball.text.startsWith("A bright streak")).toBe(true);
    });

    it("writes a cantrip, a reaction with its trigger, a ritual and concentration", () =>
    {
        expect(en("srd51.spell.fire-bolt").subtitle).toBe("Evocation cantrip");
        expect(line(en("srd51.spell.shield"), "Casting Time"))
            .toBe("1 reaction, which you take when you are hit by an attack or targeted by the magic missile spell");
        expect(line(en("srd51.spell.shield"), "Range")).toBe("Self");
        expect(en("srd51.spell.detect-magic").subtitle).toBe("1st-level divination (ritual)");
        expect(line(en("srd51.spell.bless"), "Duration")).toBe("Concentration, up to 1 minute");
        expect(line(en("srd51.spell.cone-of-cold"), "Range")).toBe("Self (60-foot cone)");
    });

    it("writes the Italian header, labels and metres, with the Italian texts", () =>
    {
        const fireball = it_("srd51.spell.fireball");

        expect(fireball.name).toBe("Palla di fuoco");
        expect(fireball.subtitle).toBe("Invocazione di 3° livello");
        expect(line(fireball, "Gittata")).toBe("45 metri (sfera del raggio di 6 metri)");
        expect(line(fireball, "Componenti")).toBe("V, S, M (una pallina di guano di pipistrello e zolfo)");
        expect(line(fireball, "Classi")).toBe("Mago, Stregone");
        expect(fireball.sections[0]!.title).toBe("Ai livelli superiori");
        expect(it_("srd51.spell.fire-bolt").subtitle).toBe("Trucchetto di invocazione");
        expect(it_("srd51.spell.detect-magic").subtitle).toBe("Divinazione di 1° livello (rituale)");
        expect(line(it_("srd51.spell.bless"), "Durata")).toBe("Concentrazione, fino a 1 minuto");
    });
});

describe("composeEntry: items and conditions", () =>
{
    it("writes weapons with their damage and properties", () =>
    {
        const longsword = en("srd51.item.longsword");

        expect(longsword.subtitle).toBe("Martial weapon");
        expect(line(longsword, "Cost")).toBe("15 gp");
        expect(line(longsword, "Damage")).toBe("1d8 slashing");
        expect(line(longsword, "Properties")).toBe("versatile (1d10)");
        expect(line(en("srd51.item.handaxe"), "Properties")).toBe("light, thrown (range 20/60 ft)");
        expect(line(it_("srd51.item.longbow"), "Proprietà")).toBe("munizioni (gittata 45/180 m), pesante, a due mani");
        expect(line(it_("srd51.item.longsword"), "Peso")).toBe("1,5 kg");
    });

    it("writes armour and shields with their class, strength and stealth", () =>
    {
        const mail = en("srd51.item.chain-mail");

        expect(mail.subtitle).toBe("Heavy armor");
        expect(line(mail, "Armor Class")).toBe("16");
        expect(line(mail, "Strength")).toBe("Str 13");
        expect(line(mail, "Stealth")).toBe("Disadvantage");
        expect(line(en("srd51.item.studded-leather-armor"), "Armor Class")).toBe("12 + Dex modifier");
        expect(line(en("srd51.item.half-plate"), "Armor Class")).toBe("15 + Dex modifier (max 2)");
        expect(line(en("srd51.item.shield"), "Armor Class")).toBe("+2");
        expect(line(it_("srd51.item.chain-mail"), "Forza")).toBe("For 13");
    });

    it("lists a pack's contents in place of its text", () =>
    {
        const pack = en("srd51.item.explorers-pack");

        expect(pack.text).toBe("");
        expect(pack.sections[0]!.title).toBe("Contents");
        expect(pack.sections[0]!.text.split("\n")).toContain("- 10 × Torch");
        expect(it_("srd51.item.explorers-pack").sections[0]!.text.split("\n")).toContain("- 10 × Torcia");
    });

    it("takes a magic item's type line from its text, in both languages", () =>
    {
        const tongue = en("srd51.item.flame-tongue");

        expect(tongue.subtitle).toBe("Weapon (any sword), rare (requires attunement)");
        expect(tongue.text.startsWith("You can use a bonus action")).toBe(true);
        expect(it_("srd51.item.flame-tongue").subtitle).toBe("Arma (qualsiasi spada), rara (richiede sintonia)");
        expect(en("srd51.item.cloak-of-protection").subtitle).toBe("Wondrous item, uncommon (requires attunement)");
    });

    it("writes a condition with its text, the levels included", () =>
    {
        const exhaustion = en("srd51.condition.exhaustion");

        expect(exhaustion.subtitle).toBe("Condition");
        expect(exhaustion.text).toContain("| 6 | Death |");
        expect(it_("srd51.condition.exhaustion").subtitle).toBe("Condizione");
    });

    it("returns nothing for another kind or an unknown id", () =>
    {
        expect(composeEntry("srd51.class.wizard", { packages: english })).toBeUndefined();
        expect(composeEntry("srd51.spell.nothing", { packages: english })).toBeUndefined();
    });
});

describe("composeEntry over the whole SRD", () =>
{
    const kinds = new Set(["spell", "item", "condition"]);
    const ids = [...english.entities.values()]
        .filter((e) => kinds.has(e.type) && (e.inline === undefined))
        .map((e) => e.id);

    it("covers the SRD's spells, items and conditions", () =>
    {
        expect(ids.length).toBeGreaterThan(800);
    });

    for (const [language, compose] of [["en", en], ["it", it_]] as const)
    {
        it(`writes every one in ${language} with no raw key, no undefined and no NaN`, () =>
        {
            for (const id of ids)
            {
                const view = compose(id);
                const shown = JSON.stringify(view);

                expect(view.name, id).not.toBe("");
                expect(view.subtitle, id).not.toBe("");
                expect(shown, id).not.toMatch(/sheet\.|undefined|NaN/);
            }
        });
    }
});
