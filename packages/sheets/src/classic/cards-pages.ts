/**
 * The cards' pages (Part 3): the features, then the spells from a new page, in two columns. A card shorter than a
 * column is never split: it moves to the next column or page; a longer one breaks between two lines and goes on
 * under its name and "continued". The layout is computed before anything is drawn, so that page 1 can say on which
 * page each feature's card is.
 */

import { diamond, emblem } from "../art.js";
import type { Activation, Card } from "../cards.js";
import type { SheetLabels } from "../labels.js";
import type { Pen } from "../pen.js";
import { ACCENT, BRASS, HAIRLINE, INK, INK_MUTED, PAPER, roundedRect, RULE, TINT_STRONG } from "../pen.js";
import { drawLines, heightOf, layoutMarkdown } from "../rich-text.js";
import type { TextFonts, TextLine } from "../rich-text.js";

import { FOOT, footer, MARGIN } from "./common.js";
import type { PageContext } from "./common.js";

const HEAD = 20;
const PAD = 6;
const CARD_GAP = 8;
const COLUMN_GAP = 12;
const TOP = MARGIN + 46;

/** A card, or a part of one, placed on a page. */
export interface PlacedCard
{
    readonly card: Card;
    readonly lines: readonly TextLine[];
    readonly continued: boolean;
    readonly column: 0 | 1;
    readonly y: number;
    readonly height: number;
}
export interface CardsPage
{
    readonly title: string;
    readonly placed: readonly PlacedCard[];
}

/** Text that the Markdown lexer must read as it is (a name, a value). */
const plain = (text: string): string => text.replace(/([\\*_`[\]#])/g, "\\$1");

/** A card's content as measured lines, in the column's width less its padding. */
function cardLines(card: Card, labels: SheetLabels, fonts: TextFonts, width: number): TextLine[]
{
    const inner = width - (PAD * 2);
    const meta = [
        card.kind === "spell" ? card.subtitle ?? card.group : `**${plain(labels.activations[card.activation])}**`,
        card.kind === "spell" ? undefined : plain(card.group),
        card.concentration ? `**${plain(labels.concentration)}**` : undefined

    ].filter((p) => p !== undefined).join(" · ");
    const lines: TextLine[] = [...layoutMarkdown(meta, { fonts: fonts, size: 6.4, color: INK_MUTED }, inner)];
    const gap = (height: number): void => { lines.push({ height: height, segments: [] }); };
    if (card.facts.length > 0)
    {
        gap(2);
        for (const fact of card.facts)
        {
            lines.push(...layoutMarkdown(`**${plain(fact.label)}:** ${plain(fact.value)}`,
                { fonts: fonts, size: 6.8, leading: 1.25 }, inner));
        }
    }
    if (card.text.trim() !== "")
    {
        gap(3);
        lines.push(...layoutMarkdown(card.text, { fonts: fonts, size: 7.2 }, inner));
    }
    for (const section of card.sections)
    {
        gap(3);
        const text = `***${plain(section.title)}.*** ${section.text}`;
        lines.push(...layoutMarkdown(text, { fonts: fonts, size: 7.2 }, inner));
    }
    if (card.forYou.length > 0)
    {
        gap(3);
        lines.push(...layoutMarkdown(`**${plain(labels.forYou)}**`, { fonts: fonts, size: 6.6, color: ACCENT }, inner));
        for (const line of card.forYou)
        {
            lines.push(...layoutMarkdown(`• ${plain(line)}`, { fonts: fonts, size: 6.8, leading: 1.25 }, inner));
        }
    }
    gap(2);
    lines.push(...layoutMarkdown(`*${plain(card.source)}*`, { fonts: fonts, size: 5.4, color: INK_MUTED }, inner));

    return lines;
}

/** Lays the cards out on pages of `height` points; features and spells each start a page. */
export function layoutCards(cards: readonly Card[], labels: SheetLabels, fonts: TextFonts, pageWidth: number,
    pageHeight: number): CardsPage[]
{
    const width = ((pageWidth - (MARGIN * 2)) - COLUMN_GAP) / 2;
    const bottom = pageHeight - MARGIN - FOOT;
    const pages: { title: string, placed: PlacedCard[] }[] = [];
    let column: 0 | 1 = 0;
    let y = TOP;
    const newPage = (title: string): void =>
    {
        pages.push({ title: title, placed: [] });
        column = 0;
        y = TOP;
    };
    const advance = (title: string): void =>
    {
        if (column === 0)
        {
            column = 1;
            y = TOP;
        }
        else { newPage(title); }
    };

    for (const kind of ["feature", "spell"] as const)
    {
        const title = kind === "feature" ? labels.features : labels.spells;
        const own = cards.filter((c) => c.kind === kind);
        if (own.length === 0) { continue; }
        newPage(title);
        for (const card of own)
        {
            let lines = cardLines(card, labels, fonts, width);
            let continued = false;
            const whole = HEAD + heightOf(lines) + (PAD * 2);
            if ((y + whole > bottom) && (whole <= bottom - TOP)) { advance(title); }
            for (;;)
            {
                const room = bottom - y - HEAD - (PAD * 2);
                if (heightOf(lines) <= room)
                {
                    const height = HEAD + heightOf(lines) + (PAD * 2);
                    pages.at(-1)!.placed.push({
                        card: card, lines: lines, continued: continued, column: column, y: y, height: height
                    });
                    y += height + CARD_GAP;
                    break;
                }
                // Longer than what is left: as many lines as fit here (at least a few), the rest further on.
                let taken = 0;
                let used = 0;
                while ((taken < lines.length) && (used + lines[taken]!.height <= room))
                {
                    used += lines[taken]!.height;
                    taken += 1;
                }
                if (taken < 3)
                {
                    advance(title);
                    continue;
                }
                pages.at(-1)!.placed.push({
                    card: card,
                    lines: lines.slice(0, taken),
                    continued: continued,
                    column: column,
                    y: y,
                    height: HEAD + used + (PAD * 2)
                });
                lines = lines.slice(taken);
                continued = true;
                advance(title);
            }
        }
    }

    return pages;
}

/** Draws one page of cards. */
export function drawCardsPage(context: PageContext, page: CardsPage): void
{
    const { pen } = context;
    const width = pen.width - (MARGIN * 2);
    const columnW = (width - COLUMN_GAP) / 2;
    pageTitle(context, page.title);
    for (const placed of page.placed)
    {
        drawCard(pen, context.labels, MARGIN + (placed.column * (columnW + COLUMN_GAP)), placed, columnW);
    }
    footer(context, MARGIN, pen.height - MARGIN - FOOT + 8, width);
}

/** The top of a page of cards or of the credits: the emblem, the character's name, the page's title. */
export function pageTitle(context: PageContext, title: string): void
{
    const { pen, values } = context;
    const width = pen.width - (MARGIN * 2);
    emblem(pen, MARGIN + 17, MARGIN + 17, 17);
    const name = values.text["name"] ?? "";
    pen.text(name, MARGIN + 42, MARGIN + 22, { font: pen.fonts.display, size: 14, color: INK, maxWidth: width * 0.55 });
    pen.text(title.toUpperCase(), MARGIN + width, MARGIN + 22, {
        font: pen.fonts.display, size: 9, color: ACCENT, align: "right", tracking: 0.6, maxWidth: width * 0.4
    });
    pen.line(MARGIN, MARGIN + 34, MARGIN + width, MARGIN + 34, HAIRLINE, 0.6);
    diamond(pen, MARGIN + (width / 2), MARGIN + 34, 2, BRASS);
}

function drawCard(pen: Pen, labels: SheetLabels, x: number, placed: PlacedCard, width: number): void
{
    const { card, y, height } = placed;
    pen.path(roundedRect(x, y, width, height, 4), { fill: PAPER, stroke: RULE, width: 0.7 });
    // The head: a tinted band with the icon, the name and the cost.
    pen.path(`M ${x + 4} ${y} H ${x + width - 4} Q ${x + width} ${y} ${x + width} ${y + 4} V ${y + HEAD} ` +
        `H ${x} V ${y + 4} Q ${x} ${y} ${x + 4} ${y} Z`, { fill: TINT_STRONG });
    pen.line(x, y + HEAD, x + width, y + HEAD, RULE, 0.5);
    icon(pen, card, x + 11, y + (HEAD / 2));
    let nameRoom = width - 30;
    if (card.cost !== "")
    {
        const costW = pen.fonts.textBold.widthOfTextAtSize(card.cost, 6.6) + 10;
        const cx = x + width - 6 - costW;
        pen.path(roundedRect(cx, y + 5, costW, 10, 5), { fill: PAPER, stroke: BRASS, width: 0.6 });
        pen.text(card.cost, cx + (costW / 2), y + 12.3, {
            font: pen.fonts.textBold, size: 6.6, color: BRASS, align: "center"
        });
        nameRoom -= costW + 6;
    }
    const name = placed.continued ? `${card.name} (${labels.continued})` : card.name;
    pen.text(name, x + 22, y + 13.5, { font: pen.fonts.display, size: 8.4, color: INK, maxWidth: nameRoom });
    drawLines(pen, placed.lines, x + PAD, y + HEAD + PAD, width - (PAD * 2));
}

/** The activation's mark: action ●, bonus action ◆, reaction ↺, free ◎, passive ○; a spell's level in its circle. */
function icon(pen: Pen, card: Card, cx: number, cy: number): void
{
    if (card.kind === "spell")
    {
        pen.circle(cx, cy, 6.5, { fill: PAPER, stroke: ACCENT, width: 0.7 });
        pen.text(String(card.level ?? 0), cx, cy + 2.6, {
            font: pen.fonts.display, size: 7.5, color: ACCENT, align: "center"
        });

        return;
    }
    const kinds: Readonly<Record<Activation, () => void>> = {
        "action": () => pen.circle(cx, cy, 4, { fill: ACCENT }),
        "bonus-action": () => diamond(pen, cx, cy, 4.6, ACCENT),
        "reaction": () =>
        {
            pen.circle(cx, cy, 4, { stroke: ACCENT, width: 1.1 });
            pen.path(`M ${cx + 2.2} ${cy - 5.6} L ${cx + 5.4} ${cy - 3.6} L ${cx + 2} ${cy - 1.9} Z`, { fill: ACCENT });
        },
        "free": () =>
        {
            pen.circle(cx, cy, 4, { stroke: ACCENT, width: 0.9 });
            pen.circle(cx, cy, 1.6, { fill: ACCENT });
        },
        "special": () => pen.path(`M ${cx} ${cy - 4.6} L ${cx + 4} ${cy - 2.3} L ${cx + 4} ${cy + 2.3} ` +
            `L ${cx} ${cy + 4.6} L ${cx - 4} ${cy + 2.3} L ${cx - 4} ${cy - 2.3} Z`, { stroke: ACCENT, width: 0.9 }),
        "passive": () => pen.circle(cx, cy, 4, { stroke: ACCENT, width: 0.9 })
    };
    kinds[card.activation]();
}
