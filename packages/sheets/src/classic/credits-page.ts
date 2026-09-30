/**
 * The credits page, last (docs/12-print-and-export.md): one block for every package the character's content comes
 * from, with its sources, licences and attributions as their manifests give them; a private package says that it
 * was loaded by the owner of the book, since attribution is not distribution. Then the fonts, and the sheet itself.
 */

import type { CreditItem } from "@byloth/dnd-platform-composer";

import { INK, INK_MUTED, RULE } from "../pen.js";
import { drawLines, layoutMarkdown } from "../rich-text.js";
import type { TextFonts } from "../rich-text.js";

import { FOOT, footer, MARGIN } from "./common.js";
import type { PageContext } from "./common.js";
import { pageTitle } from "./cards-pages.js";

const plain = (text: string): string => text.replace(/([\\*_`[\]#])/g, "\\$1");

export function creditsPage(context: PageContext, credits: readonly CreditItem[], privateIds: ReadonlySet<string>): void
{
    const { pen, labels } = context;
    const width = pen.width - (MARGIN * 2);
    const fonts: TextFonts = { regular: pen.fonts.text, bold: pen.fonts.textBold, italic: pen.fonts.textItalic };
    pageTitle(context, labels.credits);

    let y = MARGIN + 46;
    y += drawLines(pen, layoutMarkdown(plain(labels.creditsIntro), { fonts: fonts, size: 8, color: INK_MUTED }, width),
        MARGIN, y, width) + 10;
    for (const item of credits)
    {
        pen.text(item.name, MARGIN, y + 9, {
            font: pen.fonts.display, size: 9.5, color: INK, maxWidth: width - 60
        });
        pen.text(`v${item.version}`, MARGIN + width, y + 9, {
            font: pen.fonts.textBold, size: 7, color: INK_MUTED, align: "right"
        });
        y += 14;
        const lines = [
            ...item.sources.map((source) => `• ${plain(source.line)}`),
            ...(privateIds.has(item.id) ? [`*${plain(labels.privatePackage)}*`] : [])
        ];
        y += drawLines(pen, layoutMarkdown(lines.join("\n\n"), { fonts: fonts, size: 7.2 }, width), MARGIN, y, width);
        y += 8;
        pen.line(MARGIN, y, MARGIN + width, y, RULE, 0.4);
        y += 10;
    }
    y += drawLines(pen, layoutMarkdown(plain(labels.fontsCredit), { fonts: fonts, size: 7, color: INK_MUTED }, width),
        MARGIN, y, width) + 4;
    const legal = layoutMarkdown(plain(labels.legal), { fonts: fonts, size: 7, color: INK_MUTED }, width);
    drawLines(pen, legal, MARGIN, y, width);

    footer(context, MARGIN, pen.height - MARGIN - FOOT + 8, width);
}
