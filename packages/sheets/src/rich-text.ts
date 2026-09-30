/**
 * Markdown on the page: the content's texts (a feature's, a spell's) set in lines that are measured before they are
 * drawn, so that a card knows its height, can move to the next column and, when longer than a column, break between
 * two lines. Paragraphs, bullet lists, tables and headings; bold, italic and both inline. A single line break inside
 * a paragraph (homebrew texts keep the author's) is a space.
 */

import { Lexer } from "marked";
import type { Token, Tokens } from "marked";
import type { Color, PDFFont } from "pdf-lib";

import { INK } from "./pen.js";
import type { Pen } from "./pen.js";

export interface TextFonts
{
    readonly regular: PDFFont;
    readonly bold: PDFFont;
    readonly italic: PDFFont;
}

export interface TextStyle
{
    readonly fonts: TextFonts;
    readonly size: number;
    readonly color?: Color;
    /** Line height as a multiple of the size. */
    readonly leading?: number;
}

/** A piece of a line: a word or a few, in one font, at an offset from the line's left. */
export interface Segment
{
    readonly x: number;
    readonly text: string;
    readonly font: PDFFont;
    readonly size: number;
    readonly color: Color;
}
/** A laid-out line; a spacer has no segments. */
export interface TextLine
{
    readonly height: number;
    readonly segments: readonly Segment[];
    /** Hairline under the line (a table's header). */
    readonly rule?: boolean;
}

interface Run { readonly text: string, readonly bold: boolean, readonly italic: boolean }

function runs(tokens: readonly Token[] | undefined, bold = false, italic = false): Run[]
{
    const out: Run[] = [];
    for (const token of tokens ?? [])
    {
        switch (token.type)
        {
            case "strong": out.push(...runs((token as Tokens.Strong).tokens, true, italic)); break;
            case "em": out.push(...runs((token as Tokens.Em).tokens, bold, true)); break;
            case "br": out.push({ text: " ", bold: bold, italic: italic }); break;
            case "link": out.push(...runs((token as Tokens.Link).tokens, bold, italic)); break;
            case "text":
            {
                const text = token as Tokens.Text;
                if (text.tokens) { out.push(...runs(text.tokens, bold, italic)); }
                else { out.push({ text: decode(text.text).replace(/\s*\n\s*/g, " "), bold: bold, italic: italic }); }
                break;
            }
            default:
            {
                const raw = (token as { text?: string }).text ?? token.raw;
                out.push({ text: decode(raw).replace(/\s*\n\s*/g, " "), bold: bold, italic: italic });
            }
        }
    }

    return out;
}

/** The few HTML entities marked writes back. */
function decode(text: string): string
{
    return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'");
}

const fontOf = (fonts: TextFonts, run: Run): PDFFont =>
    (run.bold ? fonts.bold : run.italic ? fonts.italic : fonts.regular);

/** Wraps styled runs into lines of `width`, the first line indented by `indent` (a bullet's). */
function wrapRuns(source: readonly Run[], style: TextStyle, width: number, indent = 0, hanging = 0): TextLine[]
{
    const color = style.color ?? INK;
    const height = style.size * (style.leading ?? 1.3);
    const lines: TextLine[] = [];
    let segments: Segment[] = [];
    let x = indent;
    const left = hanging;
    const flush = (): void =>
    {
        lines.push({ height: height, segments: segments });
        segments = [];
        x = left;
    };
    for (const run of source)
    {
        const font = fontOf(style.fonts, run);
        // Words with the space before them, so that a line never starts with one.
        for (const piece of run.text.split(/(\s+)/))
        {
            if (piece === "") { continue; }
            if (/^\s+$/.test(piece))
            {
                if (segments.length > 0) { x += font.widthOfTextAtSize(" ", style.size); }
                continue;
            }
            let word = piece;
            let w = font.widthOfTextAtSize(word, style.size);
            if ((x + w > width) && (segments.length > 0)) { flush(); }
            // A word longer than the whole line is cut.
            while (w > width - left)
            {
                let cut = word.length - 1;
                while ((cut > 1) && (font.widthOfTextAtSize(word.slice(0, cut), style.size) > width - x)) { cut -= 1; }
                segments.push({ x: x, text: word.slice(0, cut), font: font, size: style.size, color: color });
                flush();
                word = word.slice(cut);
                w = font.widthOfTextAtSize(word, style.size);
            }
            segments.push({ x: x, text: word, font: font, size: style.size, color: color });
            x += w;
        }
    }
    if (segments.length > 0) { flush(); }

    return lines;
}

/** The lines of a Markdown text in a column of `width`. */
export function layoutMarkdown(markdown: string, style: TextStyle, width: number): TextLine[]
{
    const gap = style.size * 0.45;
    const lines: TextLine[] = [];
    const spacer = (): void =>
    {
        if (lines.length > 0) { lines.push({ height: gap, segments: [] }); }
    };
    const bullet = "•";
    const bulletW = style.fonts.regular.widthOfTextAtSize(`${bullet} `, style.size);

    for (const token of new Lexer().lex(markdown))
    {
        switch (token.type)
        {
            case "paragraph":
                spacer();
                lines.push(...wrapRuns(runs((token as Tokens.Paragraph).tokens), style, width));
                break;
            case "heading":
                spacer();
                lines.push(...wrapRuns(runs((token as Tokens.Heading).tokens, true), style, width));
                break;
            case "list":
            {
                spacer();
                const list = token as Tokens.List;
                list.items.forEach((item, i) =>
                {
                    const mark = list.ordered ? `${Number(list.start || 1) + i}.` : bullet;
                    const itemLines = wrapRuns(runs(item.tokens.flatMap((t) =>
                        ((t.type === "text") || (t.type === "paragraph") ?
                            ((t as Tokens.Text).tokens ?? [t]) :
                            [t]))), style, width, bulletW, bulletW);
                    const first = itemLines[0];
                    if (first)
                    {
                        itemLines[0] = {
                            ...first,
                            segments: [{
                                x: 0, text: mark, font: style.fonts.regular, size: style.size, color: style.color ?? INK

                            }, ...first.segments]
                        };
                    }
                    lines.push(...itemLines);
                });
                break;
            }
            case "table":
                spacer();
                lines.push(...layoutTable(token as Tokens.Table, style, width));
                break;
            case "space":
            case "hr":
                break;
            default:
            {
                const text = (token as { text?: string }).text;
                if (text)
                {
                    spacer();
                    lines.push(...wrapRuns([{ text: decode(text), bold: false, italic: false }], style, width));
                }
            }
        }
    }

    return lines;
}

/** A table: columns as wide as their longest cell asks, within the width; each row as tall as its tallest cell. */
function layoutTable(table: Tokens.Table, style: TextStyle, width: number): TextLine[]
{
    const small = { ...style, size: style.size * 0.92 };
    const rows = [table.header, ...table.rows];
    const columns = table.header.length;
    const gutter = small.size * 0.8;
    const natural = Array.from({ length: columns }, (_, c) => Math.max(...rows.map((row) =>
        small.fonts.regular.widthOfTextAtSize(decode(row[c]?.text ?? ""), small.size))));
    const room = width - (gutter * (columns - 1));
    const total = natural.reduce((sum, w) => sum + w, 0);
    const widths = natural.map((w) => (total <= room ? w : Math.max(room / columns / 2, (w / total) * room)));
    const lines: TextLine[] = [];
    rows.forEach((row, r) =>
    {
        const cells = row.map((cell, c) =>
            wrapRuns(runs(cell.tokens, r === 0), small, widths[c] ?? room / columns));
        const height = Math.max(...cells.map((cell) => cell.length));
        for (let i = 0; i < height; i += 1)
        {
            let x = 0;
            const segments: Segment[] = [];
            cells.forEach((cell, c) =>
            {
                for (const segment of cell[i]?.segments ?? []) { segments.push({ ...segment, x: segment.x + x }); }
                x += (widths[c] ?? 0) + gutter;
            });
            const lineHeight = small.size * (small.leading ?? 1.3);
            const rule = (r === 0) && (i === height - 1);
            lines.push({ height: lineHeight, segments: segments, ...(rule ? { rule: true } : {}) });
        }
    });

    return lines;
}

/** Draws lines from `top`; returns the height drawn. */
export function drawLines(pen: Pen, lines: readonly TextLine[], x: number, top: number, width: number): number
{
    let y = top;
    for (const line of lines)
    {
        const baseline = y + (line.height * 0.78);
        for (const segment of line.segments)
        {
            pen.text(segment.text, x + segment.x, baseline, {
                font: segment.font, size: segment.size, color: segment.color
            });
        }
        if (line.rule) { pen.line(x, y + line.height, x + width, y + line.height, INK, 0.3); }
        y += line.height;
    }

    return y - top;
}

export const heightOf = (lines: readonly TextLine[]): number => lines.reduce((sum, line) => sum + line.height, 0);
