/**
 * Page 2 of the classic sheet: who the character is (appearance, backstory, allies, treasure) as on the fifth
 * edition's own sheet, and what the table needs besides: the resources as pips to tick, with when they come back,
 * and the conditions. Age, height and the other details are the pen's: the character document has none.
 */

import { frame, smallLabel } from "../art.js";
import type { Pen } from "../pen.js";
import { HAIRLINE, INK_MUTED, PAPER, roundedRect, RULE, TINT } from "../pen.js";
import type { ResourceValues } from "../values.js";

import { BODY_TOP, FOOT, footer, GAP, header, MARGIN, ruled } from "./common.js";
import type { PageContext } from "./common.js";

/** Rows of the resources box: enough for a multiclass character; the blank sheet shows them all empty. */
const RESOURCE_ROWS = 6;
const PIPS = 10;

export function pageTwo(context: PageContext): void
{
    const { pen, labels, values } = context;
    const width = pen.width - (MARGIN * 2);
    const bottom = pen.height - MARGIN - FOOT;
    const column = (width - (GAP * 2)) / 3;

    header(context, MARGIN, MARGIN, width, "name-2", [
        [["age", labels.age], ["height", labels.height], ["weight", labels.weight]],
        [["eyes", labels.eyes], ["skin", labels.skin], ["hair", labels.hair]]
    ]);

    // Left column: appearance, then allies and organisations with a box for their symbol.
    const x = MARGIN;
    const appearanceH = Math.round((bottom - BODY_TOP) * 0.42);
    textBox(pen, x, BODY_TOP, column, appearanceH, labels.appearance, "appearance", values.text["appearance"]);
    const alliesY = BODY_TOP + appearanceH + GAP;
    const alliesH = bottom - alliesY;
    frame(pen, x, alliesY, column, alliesH, { caption: labels.allies });
    const symbol = 58;
    const symbolX = x + column - symbol - 8;
    pen.path(roundedRect(symbolX, alliesY + 8, symbol, symbol, 4), { fill: TINT, stroke: HAIRLINE, width: 0.5 });
    smallLabel(pen, labels.symbol, symbolX + (symbol / 2), alliesY + symbol + 4, {
        align: "center", size: 4.6, color: INK_MUTED
    });
    ruled(pen, x + 8, alliesY + symbol + 8, column - 16, alliesH - symbol - 18);
    pen.field("allies", x + 7, alliesY + 6, column - 14, alliesH - 16, { size: 8.5, multiline: true, minSize: 5.5 });

    // Right: the backstory across two columns.
    const rightX = MARGIN + column + GAP;
    const rightW = (column * 2) + GAP;
    const backstoryH = Math.round((bottom - BODY_TOP) * 0.3);
    textBox(pen, rightX, BODY_TOP, rightW, backstoryH, labels.backstory, "backstory", values.text["backstory"]);

    // The resources, in two columns of rows on a plate.
    let cursor = BODY_TOP + backstoryH + GAP;
    const rowH = 25;
    const perColumn = RESOURCE_ROWS / 2;
    const resourcesH = (perColumn * rowH) + 22;
    frame(pen, rightX, cursor, rightW, resourcesH, { caption: labels.resources, fill: PAPER });
    const half = (rightW - 24) / 2;
    for (let i = 0; i < RESOURCE_ROWS; i += 1)
    {
        const col = Math.floor(i / perColumn);
        const rx = rightX + 8 + (col * (half + 8));
        const ry = cursor + 8 + ((i % perColumn) * rowH);
        resourceRow(pen, rx, ry, half, rowH - 4, i + 1, values.resources[i], labels.resourceLeft);
    }
    if (values.resources.length > RESOURCE_ROWS)
    {
        const rest = values.resources.slice(RESOURCE_ROWS).map((r) => `${r.name} ${r.left}/${r.max}`)
            .join(" · ");
        smallLabel(pen, rest, rightX + 10, cursor + resourcesH - 8, {
            size: 4.6, color: INK_MUTED, maxWidth: rightW - 20
        });
    }
    cursor += resourcesH + GAP;

    // Under them: conditions and treasure on the left, the additional features on the right.
    const lowerH = bottom - cursor;
    const conditionsH = Math.round(lowerH * 0.38);
    textBox(pen, rightX, cursor, column, conditionsH, labels.conditions, "conditions", values.text["conditions"]);
    textBox(pen, rightX, cursor + conditionsH + GAP, column, lowerH - conditionsH - GAP, labels.treasure, "treasure",
        undefined);
    textBox(pen, rightX + column + GAP, cursor, column, lowerH, labels.additionalFeatures, "additional-features",
        undefined);

    footer(context, MARGIN, bottom + 8, width);
}

/** A framed box of writing lines with its title on the bottom edge, filled with `value` when there is one. */
function textBox(pen: Pen, x: number, y: number, w: number, h: number, title: string, field: string,
    value: string | undefined): void
{
    frame(pen, x, y, w, h, { caption: title });
    ruled(pen, x + 8, y + 6, w - 16, h - 16);
    pen.field(field, x + 7, y + 5, w - 14, h - 14, { value: value, size: 8.5, multiline: true, minSize: 5.5 });
}

/**
 * One resource: its name on a line, then its pips (ticked when spent) or "left / max", and when it comes back.
 * Without a resource (the blank sheet, the rows left over) the name and the pips are the pen's.
 */
function resourceRow(pen: Pen, x: number, y: number, w: number, h: number, n: number,
    resource: ResourceValues | undefined, leftLabel: string): void
{
    pen.path(roundedRect(x, y, w, h, 3), { fill: TINT, stroke: HAIRLINE, width: 0.4 });
    const nameW = w * 0.42;
    pen.line(x + 5, y + 11.5, x + nameW, y + 11.5, RULE, 0.5);
    pen.field(`resource-${n}-name`, x + 4, y + 1.5, nameW - 4, 10.5, { value: resource?.name, size: 8.5 });
    pen.field(`resource-${n}-recharge`, x + 4, y + 12.5, w - 8, 8, {
        value: resource?.recharge, size: 5.2, minSize: 4
    });

    const pipsX = x + nameW + 8;
    const room = x + w - 6 - pipsX;
    if (resource && (resource.pips === 0))
    {
        // "left / max": the pen keeps count.
        smallLabel(pen, leftLabel, pipsX, y + 9, { size: 4.6, color: INK_MUTED });
        const boxX = pipsX + 34;
        pen.line(boxX, y + 10.5, boxX + 22, y + 10.5, RULE, 0.5);
        pen.field(`resource-${n}-left`, boxX, y + 1, 22, 10, { value: resource.left, size: 8.5, align: "center" });
        pen.text(`/ ${resource.max}`, boxX + 25, y + 9.5, { font: pen.fonts.hand, size: 8.5 * pen.fonts.handScale });

        return;
    }
    const count = resource ? resource.pips : PIPS;
    const step = Math.min(10, room / Math.max(1, count));
    for (let k = 1; k <= count; k += 1)
    {
        pen.check(`resource-${n}-pip-${k}`, pipsX + ((k - 0.5) * step), y + 7, 3, k <= (resource?.spent ?? 0));
    }
}
