/**
 * Sheet templates (docs/phase-1/05-print-and-export.md, DEC-26): a character's section tree and state → a PDF
 * drawn from scratch, with form fields that stay editable. Without a character the same template prints blank.
 *
 * Pure: no I/O. The caller brings the font files (the browser downloads them, Node reads them), so the same code
 * runs in the site and in the tests.
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";

import { pageOne } from "./classic/page-one.js";
import { sheetLabels } from "./labels.js";
import { Pen } from "./pen.js";
import type { FieldBox, Fonts } from "./pen.js";
import { sheetValues } from "./values.js";
import type { SheetInput } from "./values.js";

export { sheetLabels } from "./labels.js";
export type { SheetLabels } from "./labels.js";
export type { FieldBox } from "./pen.js";
export { sheetValues } from "./values.js";
export type { AbilityValues, AttackValues, SheetInput, SheetValues, SkillValues } from "./values.js";

export type PageSize = "a4" | "letter";
export const PAGE_SIZES: Readonly<Record<PageSize, readonly [number, number]>> = {
    a4: [595.28, 841.89],
    letter: [612, 792]
};

const LATIN_1 = Array.from({ length: 0x7F - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join("") +
    Array.from({ length: 0x100 - 0xA1 }, (_, i) => String.fromCharCode(0xA1 + i)).join("") + "€’“”–—…•×";

/** The hands a sheet can be written in: three handwriting fonts and a print one (Atkinson Hyperlegible). */
export type Hand = "patrick-hand" | "kalam" | "caveat" | "print";
/** How much larger each hand is set than print, so that they look the same size on the page. */
export const HAND_SCALE: Readonly<Record<Hand, number>> = {
    "patrick-hand": 1.12,
    "kalam": 0.98,
    "caveat": 1.3,
    "print": 1
};

/** The font files, as bytes (WOFF, TTF or OTF). */
export interface SheetFonts
{
    /** Cinzel 700. */
    readonly display: Uint8Array | ArrayBuffer;
    /** Atkinson Hyperlegible 400. */
    readonly text: Uint8Array | ArrayBuffer;
    /** Atkinson Hyperlegible 700. */
    readonly textBold: Uint8Array | ArrayBuffer;
    /** The hand's font; for `print`, Atkinson Hyperlegible 400 again. */
    readonly hand: Uint8Array | ArrayBuffer;
}

export interface SheetOptions
{
    readonly pageSize?: PageSize;
    readonly hand?: Hand;
    readonly fonts: SheetFonts;
    /** The site's address, printed at the foot of every page; none until the site has a domain. */
    readonly link?: string;
    /** The document's title in the PDF's properties; default the character's name. */
    readonly title?: string;
}

export interface RenderedSheet
{
    readonly bytes: Uint8Array;
    /** Every field with its rectangle and the size its value was set at (for the tests). */
    readonly fields: readonly FieldBox[];
}

/** The classic sheet's first page, filled from `input` (blank without a character). */
export async function renderSheet(input: SheetInput, options: SheetOptions): Promise<RenderedSheet>
{
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const hand = options.hand ?? "patrick-hand";
    // No ligatures: a viewer that redraws a field would not find the ligature's glyph ("fl", "fi", "ll").
    const features = { liga: false, clig: false, dlig: false, rlig: false, calt: false };
    const fonts: Fonts = {
        display: await doc.embedFont(options.fonts.display, { subset: true, features: features }),
        text: await doc.embedFont(options.fonts.text, { subset: true, features: features }),
        textBold: await doc.embedFont(options.fonts.textBold, { subset: true, features: features }),
        hand: await doc.embedFont(options.fonts.hand, { subset: true, features: features }),
        handScale: HAND_SCALE[hand]
    };

    // The hand keeps every Latin-1 letter, not only those the sheet uses: whoever edits a field later writes others.
    // (A whole WOFF cannot be embedded as it is: pdf-lib copies its bytes, and a PDF wants TrueType or CFF.)
    fonts.hand.encodeText(LATIN_1);

    const [width, height] = PAGE_SIZES[options.pageSize ?? "a4"];
    const page = doc.addPage([width, height]);
    const pen = new Pen(doc, page, fonts);
    const values = sheetValues(input);
    const labels = sheetLabels(input.language);
    pageOne({ pen: pen, values: values, labels: labels, ...(options.link ? { link: options.link } : {}) });

    const name = values.text["name"];
    doc.setTitle(options.title ?? name ?? sheetLabels(input.language).characterName);
    doc.setCreator("D&D Platform");
    doc.setProducer("D&D Platform");
    doc.setLanguage(input.language);

    const bytes = await doc.save({ updateFieldAppearances: false });

    return { bytes: bytes, fields: pen.fields };
}
