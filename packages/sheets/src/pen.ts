/**
 * The drawing primitives of every template: a page seen from its top-left corner, in points, as a designer reads
 * it (pdf-lib counts from the bottom). Static art is drawn on the page; what a player writes is a form field, filled
 * with the character's value when there is one and left empty otherwise.
 */

import { drawEllipse, drawSvgPath, rgb, TextAlignment } from "pdf-lib";
import type { Color, PDFForm, PDFCheckBox, PDFDocument, PDFFont, PDFPage } from "pdf-lib";

// ---- palette ------------------------------------------------------------------------

/** The site's light theme ("parchment and ink", packages/web/assets/scss/_tokens.scss), tuned for paper. */
export const INK = rgb(0x23 / 255, 0x1C / 255, 0x14 / 255);
export const INK_MUTED = rgb(0x62 / 255, 0x56 / 255, 0x46 / 255);
export const RULE = rgb(0x8A / 255, 0x78 / 255, 0x5C / 255);
export const HAIRLINE = rgb(0xC9 / 255, 0xB8 / 255, 0x98 / 255);
export const ACCENT = rgb(0x8E / 255, 0x2A / 255, 0x1C / 255);
export const BRASS = rgb(0x83 / 255, 0x5F / 255, 0x1E / 255);
export const TINT = rgb(0xF8 / 255, 0xF3 / 255, 0xE8 / 255);
export const TINT_STRONG = rgb(0xF1 / 255, 0xE7 / 255, 0xD3 / 255);
export const PAPER = rgb(1, 1, 1);
/** A value written by hand: dark blue-black, like a ballpoint on paper. */
export const PEN = rgb(0x1B / 255, 0x24 / 255, 0x3A / 255);

// ---- fonts ------------------------------------------------------------------------

export interface Fonts
{
    /** Cinzel 700: titles, labels of the large boxes. */
    readonly display: PDFFont;
    /** Atkinson Hyperlegible 400: small labels, skill names, legal lines. */
    readonly text: PDFFont;
    /** Atkinson Hyperlegible 700. */
    readonly textBold: PDFFont;
    /** The font the values are written in: a handwriting one, or Atkinson for print hand. */
    readonly hand: PDFFont;
    /** How much larger the hand font is set than a print one, for the same apparent size. */
    readonly handScale: number;
}

export interface TextOptions
{
    readonly font: PDFFont;
    readonly size: number;
    readonly color?: Color;
    readonly align?: "left" | "center" | "right";
    /** Letter spacing in points, for the small capitals of labels. */
    readonly tracking?: number;
    /** When the text is wider, its size shrinks down to 60 %. */
    readonly maxWidth?: number;
}

export interface FieldOptions
{
    readonly value?: string | undefined;
    readonly size: number;
    readonly align?: "left" | "center" | "right";
    readonly multiline?: boolean;
    /** Smallest size the value may shrink to so that it fits. */
    readonly minSize?: number;
    /** A one-line field whose value does not fit even at its smallest size may wrap onto two lines. */
    readonly wrap?: boolean;
}

export type Mark = "dot" | "diamond";

/** A field as drawn: its rectangle, the size its value was set at, and whether the value fits at that size. */
export interface FieldBox
{
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly size: number;
    readonly fits: boolean;
}

// ---- the pen ------------------------------------------------------------------------

export class Pen
{
    public readonly doc: PDFDocument;
    public readonly page: PDFPage;
    public readonly form: PDFForm;
    public readonly fonts: Fonts;
    public readonly width: number;
    public readonly height: number;
    /** Every field drawn, with its rectangle, for the tests (values fit their boxes). */
    public readonly fields: FieldBox[] = [];

    public constructor(doc: PDFDocument, page: PDFPage, fonts: Fonts)
    {
        this.doc = doc;
        this.page = page;
        this.form = doc.getForm();
        this.fonts = fonts;
        this.width = page.getWidth();
        this.height = page.getHeight();
    }

    /** An SVG path in page coordinates (top-left origin, y down), filled and/or stroked. */
    public path(d: string, style: { fill?: Color, stroke?: Color, width?: number, dash?: number[] }): void
    {
        this.page.drawSvgPath(d, {
            x: 0,
            y: this.height,
            ...(style.fill ? { color: style.fill } : {}),
            ...(style.stroke ? { borderColor: style.stroke, borderWidth: style.width ?? 0.75 } : {}),
            ...(style.dash ? { borderDashArray: style.dash } : {})
        });
    }

    public line(x1: number, y1: number, x2: number, y2: number, color: Color = RULE, width = 0.5): void
    {
        this.page.drawLine({
            start: { x: x1, y: this.height - y1 },
            end: { x: x2, y: this.height - y2 },
            thickness: width,
            color: color
        });
    }

    public circle(cx: number, cy: number, r: number, style: { fill?: Color, stroke?: Color, width?: number }): void
    {
        this.page.drawEllipse({
            x: cx,
            y: this.height - cy,
            xScale: r,
            yScale: r,
            ...(style.fill ? { color: style.fill } : {}),
            ...(style.stroke ? { borderColor: style.stroke, borderWidth: style.width ?? 0.75 } : {})
        });
    }

    /** Text whose *baseline* is at `y`. Returns the width drawn. */
    public text(value: string, x: number, y: number, options: TextOptions): number
    {
        const tracking = options.tracking ?? 0;
        let size = options.size;
        const measure = (s: number): number =>
            options.font.widthOfTextAtSize(value, s) + (tracking * (s / options.size) * Math.max(0, value.length - 1));
        if (options.maxWidth !== undefined)
        {
            while ((measure(size) > options.maxWidth) && (size > options.size * 0.6)) { size -= 0.1; }
        }
        const width = measure(size);
        const left = options.align === "center" ? x - (width / 2) : options.align === "right" ? x - width : x;
        const color = options.color ?? INK;
        if (tracking === 0)
        {
            this.page.drawText(value, { x: left, y: this.height - y, size: size, font: options.font, color: color });
        }
        else
        {
            let cursor = left;
            const step = tracking * (size / options.size);
            for (const letter of value)
            {
                this.page.drawText(letter, {
                    x: cursor, y: this.height - y, size: size, font: options.font, color: color
                });
                cursor += options.font.widthOfTextAtSize(letter, size) + step;
            }
        }

        return width;
    }

    /** Height of the capitals of a font at a size, for centring a label on a line. */
    public capHeight(font: PDFFont, size: number): number
    {
        return font.heightAtSize(size, { descender: false }) * 0.72;
    }

    /**
     * A text field written in the hand font; `value` fills it, and it stays editable. The size shrinks until the
     * value fits (by width on one line, by wrapped lines when multiline).
     */
    public field(name: string, x: number, y: number, width: number, height: number, options: FieldOptions): void
    {
        const font = this.fonts.hand;
        const value = options.value ?? "";
        const padding = 2;
        let size = options.size * this.fonts.handScale;
        const smallest = (options.minSize ?? options.size * 0.55) * this.fonts.handScale;
        let fits = true;
        let multiline = options.multiline ?? false;
        // pdf-lib's own line height for multiline fields: the font's height plus a fifth.
        const lines = (s: number): number => wrap(value, font, s, width - (padding * 2)).length *
            font.heightAtSize(s) * 1.2;
        const fitLines = (from: number, to: number): void =>
        {
            size = from;
            while ((size > to) && (lines(size) > height - (padding * 2))) { size -= 0.25; }
            fits = lines(size) <= height - (padding * 2);
        };
        if ((value !== "") && multiline) { fitLines(size, smallest); }
        else if (value !== "")
        {
            const room = width - (padding * 2);
            while ((size > smallest) && (font.widthOfTextAtSize(value, size) > room)) { size -= 0.25; }
            fits = font.widthOfTextAtSize(value, size) <= room;
            size = Math.min(size, height * 0.9);
            // Too long for one line even small: two lines, when the field allows it.
            if (!fits && options.wrap)
            {
                multiline = true;
                fitLines(size, smallest * 0.8);
            }
        }

        const field = this.form.createTextField(name);
        if (multiline) { field.enableMultiline(); }
        field.setAlignment(options.align === "center" ?
            TextAlignment.Center :
            options.align === "right" ? TextAlignment.Right : TextAlignment.Left);
        if (value !== "") { field.setText(value); }
        field.addToPage(this.page, {
            x: x,
            y: this.height - y - height,
            width: width,
            height: height,
            font: font,
            textColor: PEN,
            backgroundColor: undefined,
            borderColor: undefined,
            borderWidth: 0

        } as unknown as Parameters<typeof field.addToPage>[1]);
        field.setFontSize(Math.round(size * 4) / 4);
        field.updateAppearances(font);
        this.fields.push({ name: name, x: x, y: y, width: width, height: height, size: size, fits: fits });
    }

    /** A check box drawn as a ring (or diamond) the player fills; `checked` fills it now. */
    public check(name: string, cx: number, cy: number, r: number, checked: boolean, mark: Mark = "dot"): void
    {
        this.markShape(cx, cy, r, mark, { stroke: INK, width: 0.6, fill: PAPER });
        const box: PDFCheckBox = this.form.createCheckBox(name);
        const side = r * 2;
        box.addToPage(this.page, {
            x: cx - r,
            y: this.height - cy - r,
            width: side,
            height: side,
            backgroundColor: undefined,
            borderColor: undefined,
            borderWidth: 0

        } as unknown as Parameters<typeof box.addToPage>[1]);
        if (checked) { box.check(); }
        const inner = r * 0.62;
        const k = r * 0.72;
        const on = mark === "dot" ?
            drawEllipse({
                x: r, y: r, xScale: inner, yScale: inner, color: INK, borderColor: undefined, borderWidth: 0
            }) :
            drawSvgPath(`M ${r} ${r - k} L ${r + k} ${r} L ${r} ${r + k} L ${r - k} ${r} Z`, {
                x: 0, y: side, scale: 1, color: INK, borderColor: undefined, borderWidth: 0
            });
        box.updateAppearances(() => ({ normal: { on: on, off: [] } }));
    }

    public markShape(
        cx: number, cy: number, r: number, mark: Mark, style: { fill?: Color, stroke?: Color, width?: number }
    ): void
    {
        if (mark === "dot")
        {
            this.circle(cx, cy, r, style);

            return;
        }
        const k = r * 1.2;
        this.path(`M ${cx} ${cy - k} L ${cx + k} ${cy} L ${cx} ${cy + k} L ${cx - k} ${cy} Z`, style);
    }
}

// ---- text layout ------------------------------------------------------------------------

/** Greedy word wrap, honouring the value's own line breaks. */
export function wrap(value: string, font: PDFFont, size: number, width: number): string[]
{
    const lines: string[] = [];
    for (const paragraph of value.split("\n"))
    {
        let line = "";
        for (const word of paragraph.split(" "))
        {
            const next = line === "" ? word : `${line} ${word}`;
            if ((line !== "") && (font.widthOfTextAtSize(next, size) > width))
            {
                lines.push(line);
                line = word;
            }
            else { line = next; }
        }
        lines.push(line);
    }

    return lines;
}

/** A rounded rectangle as an SVG path, in page coordinates. */
export function roundedRect(x: number, y: number, w: number, h: number, r: number): string
{
    return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} ` +
        `Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} ` +
        `Q ${x} ${y} ${x + r} ${y} Z`;
}

/** A rectangle with its corners cut at 45°, the plate of the ability scores and of the header. */
export function notchedRect(x: number, y: number, w: number, h: number, n: number): string
{
    return `M ${x + n} ${y} H ${x + w - n} L ${x + w} ${y + n} V ${y + h - n} L ${x + w - n} ${y + h} ` +
        `H ${x + n} L ${x} ${y + h - n} V ${y + n} Z`;
}
