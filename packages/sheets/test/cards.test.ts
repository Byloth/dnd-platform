/**
 * Part 3 and the credits: a card for every feature and spell, in order, with its activation, cost and this
 * character's numbers; spells with the compendium's facts; long cards broken, short ones whole; page 1 saying where
 * each card is; the credits last. And the acceptance of print: the page counts of the public fixtures, the contrast
 * of every text colour, the reference Monk's checklist (private).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PDFDocument, rgb } from "pdf-lib";
import type { RGB } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { layoutCards } from "../src/classic/cards-pages.js";
import { renderSheet, sheetCards, sheetLabels } from "../src/index.js";
import type { Card, PageSize } from "../src/index.js";
import { ACCENT, BRASS, INK, INK_MUTED, PAPER, PEN, TINT, TINT_STRONG } from "../src/pen.js";

import { composed, FONTS, pageTexts, PRIVATE_MONK, ROOT } from "./helpers.js";

const PAGE_COUNTS = join(ROOT, "fixtures", "print", "page-counts.json");
const UPDATE = process.env["UPDATE_PRINT_FIXTURES"] === "1";

describe("the cards", { timeout: 120_000 }, () =>
{
    it("follow the features' order, with their activation, cost and numbers", () =>
    {
        const cards = sheetCards(composed("monk-l3-base"));
        expect(cards.map((c) => c.name)).toEqual([
            "Claws", "Darkvision", "Cat's Grace", "Pounce", "Martial Arts", "Unarmored Defense", "Ki",
            "Unarmored Movement", "Deflect Missiles", "Monastic Tradition"
        ]);
        const card = (name: string): Card => cards.find((c) => c.name === name)!;
        expect([card("Ki").activation, card("Ki").cost]).toEqual(["bonus-action", "1 ki"]);
        expect(card("Ki").forYou).toHaveLength(3);
        expect(card("Ki").forYou[0]).toContain("Flurry of Blows");
        expect(card("Deflect Missiles").activation).toBe("reaction");
        expect(card("Darkvision").activation).toBe("passive");
        expect(card("Claws").source).toBe("Byloth's homebrew");
    });

    it("give a spell the compendium's facts and text", () =>
    {
        const fireball = sheetCards(composed("multiclass-caster")).find((c) => c.name === "Fireball")!;
        expect(fireball.kind).toBe("spell");
        expect(fireball.level).toBe(3);
        expect(fireball.facts.map((f) => f.label)).toEqual(["Casting Time", "Range", "Components", "Duration"]);
        expect(fireball.text).toContain("A bright streak flashes");
        expect(fireball.sections).toHaveLength(1);
        expect(fireball.subtitle).toBe("3rd-level evocation");
    });

    it("keep a card that fits a column whole, and break a longer one", async () =>
    {
        const doc = await PDFDocument.create();
        doc.registerFontkit((await import("@pdf-lib/fontkit")).default);
        const fonts = {
            regular: await doc.embedFont(FONTS.text, { subset: true }),
            bold: await doc.embedFont(FONTS.textBold, { subset: true }),
            italic: await doc.embedFont(FONTS.textItalic, { subset: true })
        };
        const base = sheetCards(composed("monk-l3-base"));
        const long: Card = { ...base[0]!, id: "long", name: "Long", text: "Word ".repeat(2500) };
        const pages = layoutCards([...base, long], sheetLabels("en"), fonts, 595.28, 841.89);
        const parts = pages.flatMap((p) => p.placed).filter((p) => p.card.id === "long");
        expect(parts.length).toBeGreaterThan(1);
        expect(parts.slice(1).every((p) => p.continued)).toBe(true);
        for (const placed of pages.flatMap((p) => p.placed).filter((p) => p.card.id !== "long"))
        {
            expect(placed.continued, placed.card.name).toBe(false);
            expect(placed.y + placed.height, placed.card.name).toBeLessThanOrEqual(841.89 - 24 - 26);
        }
    });

    it("are where page 1 says, and the credits come last", async () =>
    {
        const sheet = await renderSheet(composed("monk-l3-base"), { fonts: FONTS });
        const pages = await pageTexts(sheet.bytes);
        const form = (await PDFDocument.load(sheet.bytes)).getForm();
        const features = form.getTextField("features").getText() ?? "";
        for (const [, name, page] of features.matchAll(/• (.+?) \(p\. (\d+)\)/g))
        {
            expect(pages[Number(page) - 1], name).toContain(name!);
        }
        expect(features).toContain("• Ki (p. ");
        expect(pages.at(-1)).toContain("System Reference Document 5.1");
        expect(pages.at(-1)).toContain("Byloth's homebrew");
    });
});

describe("the acceptance of print", { timeout: 300_000 }, () =>
{
    it("keeps the page counts of the three public characters, A4 and Letter", async () =>
    {
        const counts: Record<string, Record<PageSize, number>> = {};
        for (const name of ["monk-l3-base", "cleric-l5", "multiclass-caster"])
        {
            counts[name] = { a4: 0, letter: 0 };
            for (const size of ["a4", "letter"] as const)
            {
                const sheet = await renderSheet(composed(name), { fonts: FONTS, pageSize: size });
                counts[name]![size] = (await PDFDocument.load(sheet.bytes)).getPageCount();
            }
        }
        if (UPDATE) { writeFileSync(PAGE_COUNTS, `${JSON.stringify(counts, null, 2)}\n`); }
        expect(counts).toEqual(JSON.parse(readFileSync(PAGE_COUNTS, "utf8")));
    });

    it("keeps every text colour at 4.5:1 on every ground, in grey as in colour", () =>
    {
        const luminance = (c: RGB): number =>
        {
            const channel = (v: number): number => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

            return (0.2126 * channel(c.red)) + (0.7152 * channel(c.green)) + (0.0722 * channel(c.blue));
        };
        const contrast = (a: RGB, b: RGB): number =>
        {
            const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];

            return (x + 0.05) / (y + 0.05);
        };
        const texts = { ink: INK, muted: INK_MUTED, accent: ACCENT, brass: BRASS, pen: PEN } as Record<string, RGB>;
        const grounds = {
            paper: PAPER, tint: TINT, tintStrong: TINT_STRONG, white: rgb(1, 1, 1)

        } as Record<string, RGB>;
        for (const [text, colour] of Object.entries(texts))
        {
            for (const [ground, behind] of Object.entries(grounds))
            {
                expect(contrast(colour, behind), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
            }
        }
    });

    it.skipIf(!existsSync(PRIVATE_MONK))("has every item of the reference Monk's checklist, once", async () =>
    {
        const checklist = parse(readFileSync(join(PRIVATE_MONK, "print-checklist.yaml"), "utf8")) as {
            fields: string[]; cards: string[]; credits: string[]; absent: string[];
        };
        const sheet = await renderSheet(composed(PRIVATE_MONK), { fonts: FONTS });
        const form = (await PDFDocument.load(sheet.bytes)).getForm();
        for (const field of checklist.fields)
        {
            expect(form.getTextField(field).getText() ?? "", field).not.toBe("");
        }
        const pages = await pageTexts(sheet.bytes);
        const all = pages.flat();
        for (const card of new Set(checklist.cards))
        {
            const expected = checklist.cards.filter((c) => c === card).length;
            expect(all.filter((s) => s === card), card).toHaveLength(expected);
        }
        const credits = pages.at(-1)!;
        for (const item of checklist.credits) { expect(credits.filter((s) => s === item), item).toHaveLength(1); }
        const text = all.join("\n") + form.getFields().map((f) => ("getText" in f ? String(f.getText() ?? "") : ""))
            .join("\n");
        for (const item of checklist.absent) { expect(text, item).not.toContain(item); }
    });
});
