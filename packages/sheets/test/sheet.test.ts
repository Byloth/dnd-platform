/**
 * The classic sheet as a PDF: its fields hold the values `sheetValues` computes (golden in the fixtures'
 * `sheet-values.json`), a blank sheet has every field empty, both page sizes, and every value fits its box.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { compose } from "@byloth/dnd-platform-composer";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";
import { loadPackages } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import { PAGE_SIZES, renderSheet, sheetValues } from "../src/index.js";
import type { Hand, SheetFonts, SheetInput } from "../src/index.js";

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const font = (file: string): Uint8Array => readFileSync(require.resolve(file));

function fonts(hand: string): SheetFonts
{
    return {
        display: font("@fontsource/cinzel/files/cinzel-latin-700-normal.woff"),
        text: font("@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff"),
        textBold: font("@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff"),
        textItalic: font("@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-italic.woff"),
        hand: font(hand)
    };
}
const PATRICK = "@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff";

function fixture(name: string, language = "en"): SheetInput
{
    const dir = join(ROOT, "fixtures", "characters", name);
    const file = parse(readFileSync(join(dir, "packages.yaml"), "utf8")) as { packages: readonly string[] };
    const character = parse(readFileSync(join(dir, "character.yaml"), "utf8")) as Character;
    const extra = language === "it" ? ["packages/content/srd51-it"] : [];
    const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
    const packages = loadPackages([...file.packages, ...extra].map((p) => readPackageSource(resolve(ROOT, p))),
        { pins: pins });
    const sheet = derive(character, packages, { language: language });

    return {
        language: language,
        tree: compose(sheet, { character: character, packages: packages, language: language }),
        character: character
    };
}

async function pages(bytes: Uint8Array): Promise<number>
{
    return (await PDFDocument.load(bytes)).getPageCount();
}

async function fields(bytes: Uint8Array): Promise<{ text: Record<string, string>, checks: Record<string, boolean> }>
{
    const form = (await PDFDocument.load(bytes)).getForm();
    const text: Record<string, string> = {};
    const checks: Record<string, boolean> = {};
    for (const field of form.getFields())
    {
        if (field instanceof PDFTextField) { text[field.getName()] = field.getText() ?? ""; }
        else if (field instanceof PDFCheckBox) { checks[field.getName()] = field.isChecked(); }
    }

    return { text: text, checks: checks };
}

describe("the classic sheet", { timeout: 60_000 }, () =>
{
    it("writes the fixture's values in its fields", async () =>
    {
        const input = fixture("monk-l3-base");
        const values = sheetValues(input);
        const sheet = await renderSheet(input, { fonts: fonts(PATRICK) });
        const { text, checks } = await fields(sheet.bytes);

        for (const [name, value] of Object.entries(values.text))
        {
            // The features box also says where each card is ("(p. 3)"): the names are the golden's.
            if (name === "features") { expect(text[name]!.replace(/ \(p\. \d+\)/g, "")).toBe(value); }
            else { expect(text[name], name).toBe(value); }
        }
        expect(text["attack-1-name"]).toBe("Shortbow");
        expect(text["attack-1-bonus"]).toBe("+5");
        expect(text["attack-1-damage"]).toBe("1d6 + 3 piercing");
        expect(text["ability-dex-modifier"]).toBe("+3");
        expect(text["ability-dex-score"]).toBe("17");
        expect(checks["save-dex-proficient"]).toBe(true);
        expect(checks["save-con-proficient"]).toBe(false);
        expect(checks["skill-stealth-proficient"]).toBe(true);
        expect(text["skill-stealth-bonus"]).toBe("+5");
        expect(text["player"]).toBe("");
        // Pages 1 and 2 only (no spells): every field is one the blank sheet has too.
        const blank = await fields((await renderSheet({ language: "en" }, { fonts: fonts(PATRICK) })).bytes);
        expect(Object.keys(text).every((name) => name in blank.text)).toBe(true);
        // No spells: no page 3 (its fields do not exist).
        expect(text["spell-0-1"]).toBeUndefined();
        expect(text["resource-1-name"]).toBe("Ki points");
        expect(checks["resource-1-pip-1"]).toBe(false);
        expect(text["name-2"]).toBe("Quiet Paw");
    });

    it("writes the spells on page 3: casters, slots, prepared spells", async () =>
    {
        const input = fixture("multiclass-caster");
        const sheet = await renderSheet(input, { fonts: fonts(PATRICK) });
        const { text, checks } = await fields(sheet.bytes);
        expect(text["name-3"]).toBe("Twin Candle");
        expect([text["caster-1-class"], text["caster-1-dc"], text["caster-1-attack"]]).toEqual(["Cleric", "15", "+7"]);
        expect(text["caster-2-class"]).toBe("Wizard");
        expect([1, 2, 3, 4, 5].map((level) => text[`slots-${level}-total`])).toEqual(["4", "3", "3", "3", "2"]);
        expect(text["slots-6-total"]).toBe("");
        expect(text["spell-0-1"]).toBe("Fire Bolt");
        expect(text["spell-1-1"]).toBe("Bless* ©");
        expect(checks["spell-1-1-prepared"]).toBe(true);
        expect(text["spell-3-8"]).toBe("");
    });

    it("prints blank without a character: the same fields, all empty", async () =>
    {
        const sheet = await renderSheet({ language: "en" }, { fonts: fonts(PATRICK), pageSize: "letter" });
        const { text, checks } = await fields(sheet.bytes);
        expect(Object.values(text).every((v) => v === "")).toBe(true);
        expect(Object.values(checks).every((v) => !v)).toBe(true);
        expect(Object.keys(text).filter((n) => n.startsWith("skill-") && n.endsWith("-bonus"))).toHaveLength(18);
        expect(await pages(sheet.bytes)).toBe(3);
        const page = (await PDFDocument.load(sheet.bytes)).getPage(0);
        expect([page.getWidth(), page.getHeight()]).toEqual([...PAGE_SIZES.letter]);
    });

    it("keeps the initiative in one field and the other speeds apart from the speed", async () =>
    {
        const sheet = await renderSheet(fixture("monk-l3-base"), { fonts: fonts(PATRICK) });
        const box = (name: string) => sheet.fields.find((f) => f.name === name)!;
        expect(sheet.fields.some((f) => f.name === "initiative-other")).toBe(false);
        const speed = box("speed");
        const other = box("speed-other");
        expect(speed.y + speed.height).toBeLessThanOrEqual(other.y);
        expect((await fields(sheet.bytes)).text["speed-other"]).toBe("climb 20 ft");
    });

    it("speaks Italian: the sheet's words and the character's", async () =>
    {
        const input = fixture("monk-l3-base", "it");
        const values = sheetValues(input);
        expect(values.abilities.map((a) => a.name)).toContain("Destrezza");
        expect(values.skills.map((s) => s.name)).toContain("Furtività");
        const blank = sheetValues({ language: "it" });
        expect(blank.skills[0]?.name).toBe("Acrobazia");
        expect(blank.abilities[0]?.abbreviation).toBe("FOR");
    });

    it.each(["a4", "letter"] as const)("keeps every field on the %s page, every value legible", async (size) =>
    {
        const hands: [Hand, string][] = [
            ["handwriting", PATRICK],
            ["print", "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff"]
        ];
        for (const [hand, file] of hands)
        {
            const options = { fonts: fonts(file), hand: hand, pageSize: size };
            for (const name of ["multiclass-caster", "cleric-l5"])
            {
                const sheet = await renderSheet(fixture(name), options);
                const [width, height] = PAGE_SIZES[size];
                for (const field of sheet.fields)
                {
                    const label = `${name} ${hand} ${field.name}`;
                    expect(field.x, label).toBeGreaterThanOrEqual(20);
                    expect(field.y, label).toBeGreaterThanOrEqual(20);
                    expect(field.x + field.width, label).toBeLessThanOrEqual(width - 20);
                    expect(field.y + field.height, label).toBeLessThanOrEqual(height - 20);
                    expect(field.size, label).toBeGreaterThanOrEqual(5);
                    expect(field.fits, label).toBe(true);
                }
            }
        }
    });
});
