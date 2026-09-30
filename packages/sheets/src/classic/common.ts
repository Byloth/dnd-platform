/**
 * What every page of the classic sheet shares: its margins, its header (emblem, name plate, detail lines), the
 * faint writing lines of its boxes and its foot (compatibility, the SRD's attribution, the site's address).
 */

import { diamond, emblem, frame, smallLabel } from "../art.js";
import type { SheetLabels } from "../labels.js";
import type { Pen } from "../pen.js";
import { ACCENT, BRASS, HAIRLINE, INK_MUTED, notchedRect, PAPER, RULE, TINT, TINT_STRONG } from "../pen.js";
import type { SheetValues } from "../values.js";

export interface PageContext
{
    readonly pen: Pen;
    readonly values: SheetValues;
    readonly labels: SheetLabels;
    /** The address printed at the foot of the page, when the site has one. */
    readonly link?: string;
}

/** A detail of the header: its field, its label, and the formula it follows when it has one. */
export type HeaderCell = readonly [field: string, label: string, calculate?: string | undefined];

export const MARGIN = 24;
export const GAP = 9;
/** Where the columns start under the header, and how much the foot keeps at the bottom. */
export const BODY_TOP = MARGIN + 76;
export const FOOT = 26;

// ---- header ------------------------------------------------------------------------

/**
 * The header of every page: the emblem, the name plate and a box of detail lines (two rows of three on the
 * classic sheet). `nameField` names the plate's field, unique in the document.
 */
export function header(
    context: PageContext,
    x: number,
    y: number,
    width: number,
    nameField: string,
    rows: readonly (readonly HeaderCell[])[]
): void
{
    const { pen, labels, values } = context;

    emblem(pen, x + 30, y + 32, 30);

    // The name plate: a banner with cut corners, the name written across it.
    const plateX = x + 68;
    const plateW = (width * 0.4) - 68;
    const plateY = y + 14;
    const plateH = 36;
    pen.path(notchedRect(plateX, plateY, plateW, plateH, 7), { fill: TINT, stroke: RULE, width: 0.8 });
    pen.path(notchedRect(plateX + 2.5, plateY + 2.5, plateW - 5, plateH - 5, 5.5), { stroke: HAIRLINE, width: 0.4 });
    pen.line(plateX + 12, plateY + plateH - 9, plateX + plateW - 12, plateY + plateH - 9, HAIRLINE, 0.5);
    pen.field(nameField, plateX + 12, plateY + 5, plateW - 24, plateH - 14, { value: values.text["name"], size: 17 });
    smallLabel(pen, labels.characterName, plateX + 12, plateY + plateH + 9);

    // The details: two rows of three lines.
    const boxX = x + (width * 0.4) + 10;
    const boxW = width - (width * 0.4) - 10;
    frame(pen, boxX, y + 4, boxW, 60, { fill: PAPER });
    rows.forEach((cells, r) =>
    {
        // Two rows on 25 points; a third (a third spellcasting class) packs them closer.
        const lineY = rows.length > 2 ? y + 21 + (r * 17) : y + 26 + (r * 25);
        const cell = (boxW - 20) / cells.length;
        cells.forEach(([name, label, calculate], c) =>
        {
            const cx = boxX + 10 + (c * cell);
            pen.line(cx, lineY, cx + cell - 8, lineY, RULE, 0.6);
            pen.field(name, cx, lineY - 15, cell - 8, 14.5, {
                value: values.text[name], size: 10.5, wrap: true, calculate: calculate
            });
            smallLabel(pen, label, cx, lineY + 6.5, { maxWidth: cell - 8, size: 5 });
        });
    });
}

/** Faint writing lines inside a box, for the blank sheet and for the space a value leaves. */
export function ruled(pen: Pen, x: number, y: number, w: number, h: number, step = 11.5): void
{
    for (let ly = y + step; ly < y + h; ly += step) { pen.line(x, ly, x + w, ly, TINT_STRONG, 0.5); }
}

// ---- footer ------------------------------------------------------------------------

export function footer(context: PageContext, x: number, y: number, width: number): void
{
    const { pen, labels } = context;
    pen.line(x, y, x + width, y, HAIRLINE, 0.5);
    diamond(pen, x + (width / 2), y, 2, BRASS);
    emblem(pen, x + 7, y + 10, 6.5, { ring: false });
    pen.text(labels.compatible, x + 18, y + 10.5, { font: pen.fonts.display, size: 6, color: ACCENT, tracking: 0.2 });
    pen.text(labels.legal, x + 18, y + 17.5, { font: pen.fonts.text, size: 4.6, color: INK_MUTED });
    if (context.link)
    {
        pen.text(context.link, x + width, y + 10.5, {
            font: pen.fonts.textBold, size: 6.5, color: ACCENT, align: "right"
        });
    }
}
