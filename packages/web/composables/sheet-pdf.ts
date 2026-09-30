/**
 * The character's sheet as a PDF (M1.6, DEC-13 as amended, DEC-26): the classic template of
 * `@byloth/dnd-platform-sheets` drawn in the browser from the sheet already on the page, then saved or shared.
 * This module and the PDF library load with the first PDF asked for, never with the sheet; so do the fonts.
 */

import { renderSheet } from "@byloth/dnd-platform-sheets";
import type { Hand, PageSize, SheetFonts } from "@byloth/dnd-platform-sheets";
import type { SectionTree } from "@byloth/dnd-platform-composer";
import type { Character } from "@byloth/dnd-platform-engine";
import type { PackageSet } from "@byloth/dnd-platform-loader";

import atkinsonBold from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff?url";
import atkinson from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff?url";
import atkinsonItalic from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-italic.woff?url";
import cinzel from "@fontsource/cinzel/files/cinzel-latin-700-normal.woff?url";
import patrickHand from "@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff?url";

import { safeFileName, saveFile } from "./save-file";

// WOFF, not WOFF2: the PDF library's font subsetter reads the first and fails on some of the second.
const HAND_FONTS: Readonly<Record<Hand, string>> = { handwriting: patrickHand, print: atkinson };

async function bytes(url: string): Promise<ArrayBuffer>
{
    const response = await fetch(url);
    if (!response.ok) { throw new Error(`${url}: ${response.status}`); }

    return response.arrayBuffer();
}

async function fonts(hand: Hand): Promise<SheetFonts>
{
    const [display, text, textBold, textItalic, written] = await Promise.all([
        bytes(cinzel), bytes(atkinson), bytes(atkinsonBold), bytes(atkinsonItalic), bytes(HAND_FONTS[hand])
    ]);

    return { display: display, text: text, textBold: textBold, textItalic: textItalic, hand: written };
}

export interface SheetPdfOptions
{
    readonly language: string;
    readonly pageSize?: PageSize;
    readonly hand?: Hand;
    /** The character's package set: the spells' cards take their full entries from it. */
    readonly packages?: PackageSet;
}

/** The PDF of a character's sheet, from the section tree the sheet page already composed; blank without them. */
export async function sheetPdf(
    character: Character | undefined, tree: SectionTree | undefined, options: SheetPdfOptions
): Promise<Blob>
{
    const hand = options.hand ?? "handwriting";
    const input = character && tree ?
        {
            language: options.language,
            tree: tree,
            character: character,
            ...(options.packages ? { packages: options.packages } : {})

        } :
        { language: options.language };
    const pageSize = options.pageSize ?? "a4";
    const sheet = await renderSheet(input, { fonts: await fonts(hand), hand: hand, pageSize: pageSize });

    return new Blob([sheet.bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

/** Draws the PDF and hands it to the player: downloaded, or through the share sheet on a phone. */
export async function saveSheetPdf(character: Character, tree: SectionTree, options: SheetPdfOptions): Promise<void>
{
    const blob = await sheetPdf(character, tree, options);
    await saveFile(blob, safeFileName(character.name, "pdf"), { share: true, title: character.name });
}

/** The blank sheet (all three pages, every field empty), saved as `name` (without its extension). */
export async function saveBlankSheetPdf(name: string, options: SheetPdfOptions): Promise<void>
{
    const blob = await sheetPdf(undefined, undefined, options);
    await saveFile(blob, safeFileName(name, "pdf"), { share: true, title: name });
}
