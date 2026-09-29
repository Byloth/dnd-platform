/**
 * The character's sheet as a PDF (M1.6, DEC-13 as amended, DEC-26): the classic template of
 * `@byloth/dnd-platform-sheets` drawn in the browser from the sheet already on the page, then saved or shared.
 * This module and the PDF library load with the first PDF asked for, never with the sheet; so do the fonts.
 */

import { renderSheet } from "@byloth/dnd-platform-sheets";
import type { Hand, PageSize, SheetFonts } from "@byloth/dnd-platform-sheets";
import type { SectionTree } from "@byloth/dnd-platform-composer";
import type { Character } from "@byloth/dnd-platform-engine";

import atkinsonBold from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff?url";
import atkinson from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff?url";
import cinzel from "@fontsource/cinzel/files/cinzel-latin-700-normal.woff?url";
import patrickHand from "@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff?url";

import { safeFileName, saveFile } from "./save-file";

// WOFF, not WOFF2: the PDF library's font subsetter reads the first and fails on some of the second.
const HAND_FONTS: Readonly<Partial<Record<Hand, string>>> = { "patrick-hand": patrickHand, "print": atkinson };

async function bytes(url: string): Promise<ArrayBuffer>
{
    const response = await fetch(url);
    if (!response.ok) { throw new Error(`${url}: ${response.status}`); }

    return response.arrayBuffer();
}

async function fonts(hand: Hand): Promise<SheetFonts>
{
    const [display, text, textBold, written] = await Promise.all([
        bytes(cinzel), bytes(atkinson), bytes(atkinsonBold), bytes(HAND_FONTS[hand] ?? patrickHand)
    ]);

    return { display: display, text: text, textBold: textBold, hand: written };
}

export interface SheetPdfOptions
{
    readonly language: string;
    readonly pageSize?: PageSize;
    readonly hand?: Hand;
}

/** The PDF of a character's sheet, from the section tree the sheet page already composed. */
export async function sheetPdf(character: Character, tree: SectionTree, options: SheetPdfOptions): Promise<Blob>
{
    const hand = options.hand ?? "patrick-hand";
    const sheet = await renderSheet(
        { language: options.language, tree: tree, character: character },
        { fonts: await fonts(hand), hand: hand, pageSize: options.pageSize ?? "a4" }
    );

    return new Blob([sheet.bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

/** Draws the PDF and hands it to the player: downloaded, or through the share sheet on a phone. */
export async function saveSheetPdf(character: Character, tree: SectionTree, options: SheetPdfOptions): Promise<void>
{
    const blob = await sheetPdf(character, tree, options);
    await saveFile(blob, safeFileName(character.name, "pdf"), { share: true, title: character.name });
}
