/**
 * Page 3 of the classic sheet: spellcasting. The header names each spellcasting class with its ability, save DC
 * and attack bonus; under it the cantrips and the nine levels in three columns, as on the fifth edition's own
 * sheet, each level with its slots (total written, expended left to the pen) and its lines, a box to tick for a
 * prepared spell. Printed for a character with spells, and on the blank sheet.
 */

import { frame } from "../art.js";
import type { Pen } from "../pen.js";
import { ACCENT, HAIRLINE, INK_MUTED, PAPER, roundedRect, RULE, TINT, TINT_STRONG } from "../pen.js";
import type { SpellLine } from "../values.js";

import { casterScript, extra, parseShown } from "../calculations.js";

import { BODY_TOP, FOOT, footer, GAP, header, MARGIN } from "./common.js";
import type { HeaderCell, PageContext } from "./common.js";

/** The levels of each column and the lines of each level, as on the official sheet. */
const COLUMNS: readonly (readonly (readonly [number, number])[])[] = [
    [[0, 8], [1, 12], [2, 13]],
    [[3, 13], [4, 13], [5, 9]],
    [[6, 9], [7, 9], [8, 7], [9, 7]]
];
const HEAD = 22;
const PANEL_PAD = 8;
const SECTION_GAP = 8;

/** True when the character has anything for page 3: a spellcasting class or a spell (paid with ki, say). */
export function hasPageThree(context: PageContext): boolean
{
    const { values } = context;

    return values.blank || (values.casters.length > 0) || values.spells.some((level) => level.length > 0);
}

export function pageThree(context: PageContext): void
{
    const { pen, labels, values } = context;
    const width = pen.width - (MARGIN * 2);
    const bottom = pen.height - MARGIN - FOOT;
    const column = (width - (GAP * 2)) / 3;

    const casters = Math.min(3, Math.max(values.blank ? 2 : 1, values.casters.length));
    // The DC and the attack bonus follow the class's ability and the proficiency bonus (calculations.ts).
    const proficiency = parseShown(values.text["proficiency-bonus"]);
    const rows = Array.from({ length: casters }, (_, i): HeaderCell[] =>
    {
        const caster = values.casters[i];
        const ability = caster?.abilityId ?? "";
        const modifier = parseShown(values.abilities.find((a) => a.id === ability)?.modifier);
        const known = (modifier !== undefined) && (proficiency !== undefined);
        const formula = (kind: "dc" | "attack", base: number, shown: string | undefined): string | undefined =>
            (ability === "" ?
                undefined :
                casterScript(ability, kind, extra(shown, known ? base + modifier + proficiency : undefined)));

        return [
            [`caster-${i + 1}-class`, labels.spellcastingClass],
            [`caster-${i + 1}-ability`, labels.spellcastingAbility],
            [`caster-${i + 1}-dc`, labels.spellSaveDc, formula("dc", 8, caster?.dc)],
            [`caster-${i + 1}-attack`, labels.spellAttackBonus, formula("attack", 0, caster?.attackBonus)]
        ];
    });
    header(context, MARGIN, MARGIN, width, "name-3", rows);

    // One line height for the whole page: the fullest column decides it.
    const height = bottom - BODY_TOP;
    const lineH = Math.min(17.5, ...COLUMNS.map((sections) =>
    {
        const fixed = sections.length * (HEAD + PANEL_PAD + SECTION_GAP);
        const lines = sections.reduce((sum, [, n]) => sum + n, 0);

        return (height - fixed + SECTION_GAP) / lines;
    }));

    COLUMNS.forEach((sections, c) =>
    {
        const x = MARGIN + (c * (column + GAP));
        let cursor = BODY_TOP;
        for (const [level, lines] of sections)
        {
            levelSection(context, x, cursor, column, level, lines, lineH, values.spells[level] ?? []);
            cursor += HEAD + PANEL_PAD + (lines * lineH) + SECTION_GAP;
        }
    });

    footer(context, MARGIN, bottom + 8, width);
}

function levelSection(
    context: PageContext, x: number, y: number, w: number, level: number, lines: number, lineH: number,
    spells: readonly SpellLine[]
): void
{
    const { pen, labels, values } = context;
    const panelY = y + HEAD - 4;
    const panelH = (lines * lineH) + PANEL_PAD;
    frame(pen, x, panelY, w, panelH, { fill: PAPER });

    // The level's badge, set on the panel's top-left corner.
    const cx = x + 14;
    const cy = y + 10;
    pen.circle(cx, cy, 11, { fill: TINT_STRONG, stroke: RULE, width: 0.8 });
    pen.circle(cx, cy, 8.8, { stroke: HAIRLINE, width: 0.4 });
    pen.text(String(level), cx, cy + 4, { font: pen.fonts.display, size: 11, color: ACCENT, align: "center" });

    if (level === 0)
    {
        pen.path(roundedRect(x + 30, y + 1, w - 36, 15, 7.5), { fill: TINT, stroke: RULE, width: 0.5 });
        pen.text(labels.cantrips.toUpperCase(), x + 30 + ((w - 36) / 2), y + 11, {
            font: pen.fonts.display, size: 6.4, color: ACCENT, align: "center", tracking: 0.4
        });
    }
    else
    {
        const boxW = (w - 40) / 2;
        slotBox(pen, x + 30, y, boxW, labels.slotsTotal, `slots-${level}-total`, values.text[`slots-${level}-total`]);
        slotBox(pen, x + 34 + boxW, y, boxW, labels.slotsExpended, `slots-${level}-expended`, undefined);
    }

    // The lines: the spells in order, the last line counting those that do not fit (their cards come later).
    const shown = spells.length > lines ? spells.slice(0, lines - 1) : spells;
    const more = spells.length - shown.length;
    const size = Math.min(8.5, lineH * 0.6);
    for (let i = 0; i < lines; i += 1)
    {
        const ly = panelY + (PANEL_PAD / 2) + (i * lineH);
        const left = level === 0 ? x + 8 : x + 17;
        pen.line(left, ly + lineH - 1.5, x + w - 8, ly + lineH - 1.5, HAIRLINE, 0.5);
        const spell = shown[i];
        const value = spell?.label ?? ((i === lines - 1) && (more > 0) ?
            labels.moreSpells.replace("{count}", String(more)) :
            undefined);
        if (level > 0)
        {
            pen.check(`spell-${level}-${i + 1}-prepared`, x + 10.5, ly + (lineH / 2), 2.6, spell?.prepared ?? false);
        }
        pen.field(`spell-${level}-${i + 1}`, left - 1, ly, x + w - 7 - left, lineH - 1, {
            value: value, size: size, minSize: size * 0.7
        });
    }
}

/** A small box with its label above the value: the slots of a level. */
function slotBox(pen: Pen, x: number, y: number, w: number, label: string, field: string, value: string | undefined):
void
{
    pen.path(roundedRect(x, y, w, 19, 3), { fill: PAPER, stroke: RULE, width: 0.6 });
    pen.text(label.toUpperCase(), x + 4, y + 6, {
        font: pen.fonts.textBold, size: 4, color: INK_MUTED, tracking: 0.2, maxWidth: w - 8
    });
    pen.field(field, x + 2, y + 6.5, w - 4, 11.5, { value: value, size: 8, align: "center", minSize: 5 });
}
