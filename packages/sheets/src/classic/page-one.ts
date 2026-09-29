/**
 * Page 1 of the classic sheet: the layout players know from the fifth edition's own sheet (header across the
 * top, three columns under it), drawn from scratch with the platform's marks. Every region is a function of the
 * page's width and height, so A4 and Letter share it; the boxes at the bottom of each column take what is left.
 */

import { diamond, divider, emblem, frame, smallLabel } from "../art.js";
import type { SheetLabels } from "../labels.js";
import type { Pen } from "../pen.js";
import { ACCENT, BRASS, HAIRLINE, INK, INK_MUTED, notchedRect, PAPER, roundedRect, RULE, TINT, TINT_STRONG }
    from "../pen.js";
import type { SheetValues } from "../values.js";

export interface PageContext
{
    readonly pen: Pen;
    readonly values: SheetValues;
    readonly labels: SheetLabels;
    /** The address printed at the foot of the page, when the site has one. */
    readonly link?: string;
}

const MARGIN = 24;
const GAP = 9;

export function pageOne(context: PageContext): void
{
    const { pen } = context;
    const width = pen.width - (MARGIN * 2);
    const height = pen.height - (MARGIN * 2);
    const top = MARGIN + 76;
    const bottom = MARGIN + height - 26;
    const column = (width - (GAP * 2)) / 3;

    header(context, MARGIN, MARGIN, width);
    columnOne(context, MARGIN, top, column, bottom);
    columnTwo(context, MARGIN + column + GAP, top, column, bottom);
    columnThree(context, MARGIN + ((column + GAP) * 2), top, column, bottom);
    footer(context, MARGIN, bottom + 8, width);
}

// ---- header ------------------------------------------------------------------------

function header(context: PageContext, x: number, y: number, width: number): void
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
    pen.field("name", plateX + 12, plateY + 5, plateW - 24, plateH - 14, { value: values.text["name"], size: 17 });
    smallLabel(pen, labels.characterName, plateX + 12, plateY + plateH + 9);

    // The details: two rows of three lines.
    const boxX = x + (width * 0.4) + 10;
    const boxW = width - (width * 0.4) - 10;
    frame(pen, boxX, y + 4, boxW, 60, { fill: PAPER });
    const cell = (boxW - 20) / 3;
    const rows: [string, string][][] = [
        [["class-level", labels.classLevel], ["background", labels.background], ["player", labels.player]],
        [["species", labels.species], ["alignment", labels.alignment], ["experience", labels.experience]]
    ];
    rows.forEach((cells, r) =>
    {
        const lineY = y + 26 + (r * 25);
        cells.forEach(([name, label], c) =>
        {
            const cx = boxX + 10 + (c * cell);
            pen.line(cx, lineY, cx + cell - 8, lineY, RULE, 0.6);
            pen.field(name, cx, lineY - 15, cell - 8, 14.5, { value: values.text[name], size: 10.5, wrap: true });
            smallLabel(pen, label, cx, lineY + 6.5, { maxWidth: cell - 8, size: 5 });
        });
    });
}

// ---- column 1: abilities, saves, skills ------------------------------------------------

function columnOne(context: PageContext, x: number, y: number, width: number, bottom: number): void
{
    const { pen, labels, values } = context;
    const stripW = 56;
    const abilityH = 64;
    const abilityGap = 6.5;
    const stripH = (abilityH * 6) + (abilityGap * 5);

    // The strip behind the six abilities.
    pen.path(roundedRect(x, y, stripW, stripH, 5), { fill: TINT_STRONG, stroke: RULE, width: 0.6 });
    values.abilities.forEach((ability, i) =>
    {
        abilityBox(pen, x + 4, y + 4 + (i * (abilityH + abilityGap)), stripW - 8, abilityH - (i === 5 ? 8 : 0) - 1.5,
            ability.name, ability.modifier, ability.score, `ability-${ability.id}`);
    });

    const subX = x + stripW + 7;
    const subW = width - stripW - 7;
    let cursor = y;

    // Inspiration and proficiency bonus: a small box and a label plate beside it.
    pill(pen, subX, cursor, subW, labels.inspiration, () =>
        pen.check("inspiration", subX + 11, cursor + 11, 5.5, values.checks["inspiration"] ?? false, "diamond"));
    cursor += 28;
    pill(pen, subX, cursor, subW, labels.proficiencyBonus, () =>
        pen.field("proficiency-bonus", subX + 2, cursor + 3, 18, 16, {
            value: values.text["proficiency-bonus"], size: 11, align: "center"
        }));
    cursor += 32;

    // Saving throws.
    const rowH = 10.4;
    const savesH = (values.abilities.length * rowH) + 16;
    frame(pen, subX, cursor, subW, savesH, { caption: labels.savingThrows });
    values.abilities.forEach((ability, i) =>
    {
        row(pen, subX, cursor + 7 + (i * rowH), subW, `save-${ability.id}`, ability.save, ability.saveProficient,
            false, ability.name, "");
    });
    cursor += savesH + 9;

    // Skills fill the rest of the strip's height.
    const skillsH = (y + stripH) - cursor;
    frame(pen, subX, cursor, subW, skillsH, { caption: labels.skills });
    const skillH = Math.min(12, (skillsH - 14) / Math.max(1, values.skills.length));
    values.skills.forEach((skill, i) =>
    {
        row(pen, subX, cursor + 6 + (i * skillH), subW, `skill-${skill.id}`, skill.bonus, skill.mark !== "untrained",
            skill.mark === "expertise", skill.name, skill.abbreviation, skillH);
    });

    // Passive Perception.
    cursor = y + stripH + 9;
    pill(pen, x, cursor, width, labels.passivePerception, () =>
        pen.field("passive-perception", x + 2, cursor + 3, 18, 16, {
            value: values.text["passive-perception"], size: 11, align: "center"
        }));
    cursor += 32;

    // Other proficiencies and languages.
    frame(pen, x, cursor, width, bottom - cursor, { caption: labels.proficienciesLanguages });
    ruled(pen, x + 8, cursor + 8, width - 16, bottom - cursor - 18);
    pen.field("proficiencies", x + 7, cursor + 6, width - 14, bottom - cursor - 16, {
        value: values.text["proficiencies"], size: 9, multiline: true, minSize: 6
    });
}

function abilityBox(pen: Pen, x: number, y: number, w: number, h: number, name: string, modifier: string, score: string,
    id: string): void
{
    pen.path(notchedRect(x, y, w, h - 7, 6), { fill: PAPER, stroke: RULE, width: 0.8 });
    pen.path(notchedRect(x + 2, y + 2, w - 4, h - 11, 4.5), { stroke: HAIRLINE, width: 0.4 });
    pen.text(name.toUpperCase(), x + (w / 2), y + 10.5, {
        font: pen.fonts.display, size: 5.6, color: ACCENT, align: "center", tracking: 0.25, maxWidth: w - 8
    });
    pen.field(`${id}-modifier`, x + 4, y + 13, w - 8, 26, { value: modifier, size: 21, align: "center" });
    // The score in an oval set on the bottom edge.
    const cx = x + (w / 2);
    const cy = y + h - 8;
    pen.page.drawEllipse({ x: cx,
        y: pen.height - cy,
        xScale: 14,
        yScale: 7.5,
        color: PAPER,
        borderColor: RULE,
        borderWidth: 0.8 });
    pen.field(`${id}-score`, cx - 11, cy - 6.5, 22, 13, { value: score, size: 9.5, align: "center" });
}

/** A value box beside a label plate (inspiration, proficiency bonus, passive Perception). */
function pill(pen: Pen, x: number, y: number, w: number, label: string, inside: () => void): void
{
    pen.path(roundedRect(x + 16, y + 3, w - 16, 16, 8), { fill: TINT, stroke: RULE, width: 0.6 });
    pen.text(label.toUpperCase(), x + 30, y + 13.6, {
        font: pen.fonts.display, size: 6, color: INK, tracking: 0.3, maxWidth: w - 36
    });
    pen.path(roundedRect(x, y, 22, 22, 3), { fill: PAPER, stroke: RULE, width: 0.8 });
    inside();
}

/** A save or skill: its mark, its bonus on a short line, its name and ability. */
function row(pen: Pen, x: number, y: number, w: number, id: string, bonus: string, proficient: boolean,
    expertise: boolean, name: string, ability: string, h = 10.4): void
{
    const mid = y + (h / 2);
    if (expertise) { pen.circle(x + 9, mid, 3.9, { stroke: INK, width: 0.5 }); }
    pen.check(`${id}-proficient`, x + 9, mid, 2.5, proficient);
    pen.line(x + 15, mid + 3.2, x + 30, mid + 3.2, RULE, 0.5);
    pen.field(`${id}-bonus`, x + 14, mid - 5, 17, 8.6, { value: bonus, size: 8, align: "center" });
    const size = Math.min(6.8, h * 0.62);
    const nameW = pen.text(name, x + 33, mid + 2.3, { font: pen.fonts.text, size: size, color: INK, maxWidth: w - 52 });
    if (ability !== "")
    {
        pen.text(ability, x + 35 + Math.min(nameW, w - 52), mid + 2.3, {
            font: pen.fonts.text, size: size * 0.78, color: INK_MUTED
        });
    }
}

/** Faint writing lines inside a box, for the blank sheet and for the space a value leaves. */
function ruled(pen: Pen, x: number, y: number, w: number, h: number, step = 11.5): void
{
    for (let ly = y + step; ly < y + h; ly += step) { pen.line(x, ly, x + w, ly, TINT_STRONG, 0.5); }
}

// ---- column 2: combat, attacks, equipment ------------------------------------------------

function columnTwo(context: PageContext, x: number, y: number, width: number, bottom: number): void
{
    const { pen, labels, values } = context;
    const pad = 8;
    const inner = width - (pad * 2);

    // The combat plate.
    const plateH = 246;
    pen.path(roundedRect(x, y, width, plateH, 5), { fill: TINT_STRONG, stroke: RULE, width: 0.6 });
    let cursor = y + pad;

    // AC shield, initiative, speed.
    const third = (inner - 12) / 3;
    shield(pen, x + pad, cursor, third, 58, labels.armorClass, values.text["ac"]);
    statBox(pen, x + pad + third + 6, cursor, third, 58, labels.initiative, "initiative", values.text["initiative"]);
    statBox(pen, x + pad + ((third + 6) * 2), cursor, third, 58, labels.speed, "speed", values.text["speed"],
        values.text["speed-other"]);
    cursor += 58 + 8;

    // Current hit points, with the maximum on the line above and the temporary ones in a box beside them.
    const hpH = 66;
    frame(pen, x + pad, cursor, inner, hpH, { caption: labels.hpCurrent });
    smallLabel(pen, labels.hpMax, x + pad + 8, cursor + 12, { color: INK_MUTED, size: 5, maxWidth: inner - 60 });
    const maxX = x + pad + inner - 44;
    pen.line(maxX, cursor + 13, x + pad + inner - 8, cursor + 13, RULE, 0.6);
    pen.field("hp-max", maxX, cursor + 2, 36, 11, { value: values.text["hp-max"], size: 10, align: "center" });
    divider(pen, x + pad + 8, cursor + 19, inner - 16);
    const tempW = 44;
    const tempX = x + pad + inner - tempW - 6;
    pen.field("hp-current", x + pad + 8, cursor + 23, inner - tempW - 22, 34, {
        value: values.text["hp-current"], size: 24, align: "center"
    });
    pen.path(roundedRect(tempX, cursor + 24, tempW, 34, 3), { fill: TINT, stroke: HAIRLINE, width: 0.5 });
    pen.text(labels.hpTemporaryShort.toUpperCase(), tempX + (tempW / 2), cursor + 31, {
        font: pen.fonts.textBold, size: 4.6, color: INK_MUTED, align: "center", tracking: 0.2, maxWidth: tempW - 6
    });
    pen.field("hp-temporary", tempX + 3, cursor + 33, tempW - 6, 24, {
        value: values.text["hp-temporary"], size: 15, align: "center"
    });
    cursor += hpH + 8;

    // Hit dice: the total on a line, the dice left written large.
    const diceH = 42;
    frame(pen, x + pad, cursor, inner, diceH, { caption: labels.hitDice });
    smallLabel(pen, labels.hitDiceTotal, x + pad + 8, cursor + 20, { color: INK_MUTED, size: 5 });
    const totalX = x + pad + 8 + pen.fonts.textBold.widthOfTextAtSize(labels.hitDiceTotal.toUpperCase(), 5) + 6;
    pen.line(totalX, cursor + 21, x + pad + (inner / 2) - 6, cursor + 21, RULE, 0.5);
    pen.field("hit-dice-total", totalX, cursor + 10, x + pad + (inner / 2) - 6 - totalX, 11, {
        value: values.text["hit-dice-total"], size: 9.5, align: "center"
    });
    pen.line(x + pad + (inner / 2), cursor + 7, x + pad + (inner / 2), cursor + diceH - 9, HAIRLINE, 0.5);
    pen.field("hit-dice", x + pad + (inner / 2) + 6, cursor + 5, (inner / 2) - 12, diceH - 13, {
        value: values.text["hit-dice"], size: 18, align: "center"
    });
    cursor += diceH + 8;

    // Death saves: three successes, three failures, side by side.
    const deathH = y + plateH - pad - cursor;
    frame(pen, x + pad, cursor, inner, deathH, { caption: labels.deathSaves });
    const saves: [string, string][] = [["success", labels.successes], ["failure", labels.failures]];
    saves.forEach(([kind, label], r) =>
    {
        const left = x + pad + 8 + (r * (inner / 2));
        const ry = cursor + (deathH / 2) - 2;
        smallLabel(pen, label, left, ry + 2, { size: 4.6, color: INK_MUTED, maxWidth: (inner / 2) - 44 });
        for (let i = 1; i <= 3; i += 1)
        {
            const cx = left + (inner / 2) - 44 + (i * 9);
            pen.check(`death-${kind}-${i}`, cx, ry, 3.2, values.checks[`death-${kind}-${i}`] ?? false,
                kind === "success" ? "dot" : "diamond");
        }
    });

    // Attacks and spellcasting.
    cursor = y + plateH + GAP;
    const attacksH = 170;
    frame(pen, x, cursor, width, attacksH, { caption: labels.attacks });
    const nameW = inner * 0.4;
    const bonusW = inner * 0.15;
    const damageW = inner - nameW - bonusW - 8;
    const heads: [string, number, number][] = [
        [labels.attackName, x + pad, nameW], [labels.attackBonus, x + pad + nameW + 4, bonusW],
        [labels.attackDamage, x + pad + nameW + bonusW + 8, damageW]
    ];
    for (const [label, hx, hw] of heads)
    {
        smallLabel(pen, label, hx + 2, cursor + 12, { size: 4.8, color: INK_MUTED, maxWidth: hw - 2 });
    }
    const rows = 4;
    for (let i = 0; i < rows; i += 1)
    {
        const ry = cursor + 16 + (i * 17);
        const attack = values.attacks[i];
        for (const [, hx, hw] of heads)
        {
            pen.path(roundedRect(hx, ry, hw, 14, 2), { fill: TINT, stroke: HAIRLINE, width: 0.4 });
        }
        pen.field(`attack-${i + 1}-name`, x + pad + 1, ry + 0.5, nameW - 2, 13, { value: attack?.name, size: 8.5 });
        pen.field(`attack-${i + 1}-bonus`, x + pad + nameW + 5, ry + 0.5, bonusW - 2, 13, {
            value: attack?.bonus, size: 8.5, align: "center"
        });
        pen.field(`attack-${i + 1}-damage`, x + pad + nameW + bonusW + 9, ry + 0.5, damageW - 2, 13, {
            value: attack?.damage, size: 8.5
        });
    }
    const more = values.attacks.slice(rows).map((a) => `${a.name} ${a.bonus} · ${a.damage}`);
    const notes = [...more, values.text["attacks-notes"] ?? ""].filter((n) => n !== "").join("\n");
    const notesY = cursor + 16 + (rows * 17) + 2;
    ruled(pen, x + pad, notesY, inner, cursor + attacksH - notesY - 8);
    pen.field("attacks-notes", x + pad - 1, notesY, inner + 2, cursor + attacksH - notesY - 8, {
        value: notes, size: 8, multiline: true, minSize: 5.5
    });

    // Equipment, with the coins in a column on its left.
    cursor += attacksH + GAP;
    const equipmentH = bottom - cursor;
    frame(pen, x, cursor, width, equipmentH, { caption: labels.equipment });
    const coinW = 40;
    labels.coins.forEach((coin, i) =>
    {
        const cy = cursor + 8 + (i * 26);
        if (cy + 22 > bottom - 8) { return; }
        pen.path(roundedRect(x + 6, cy, coinW, 22, 11), { fill: TINT, stroke: RULE, width: 0.6 });
        pen.circle(x + 6 + 11, cy + 11, 8.5, { fill: PAPER, stroke: BRASS, width: 0.6 });
        pen.text(coin, x + 6 + 11, cy + 13.2, { font: pen.fonts.display, size: 5.8, color: BRASS, align: "center" });
        pen.field(`coins-${i + 1}`, x + 6 + 20, cy + 3, coinW - 21, 16, {
            value: values.text[`coins-${i + 1}`], size: 9, align: "center"
        });
    });
    const eqX = x + coinW + 12;
    ruled(pen, eqX, cursor + 6, x + width - 8 - eqX, equipmentH - 16);
    pen.field("equipment", eqX - 1, cursor + 5, x + width - 7 - eqX, equipmentH - 14, {
        value: values.text["equipment"], size: 8.5, multiline: true, minSize: 5.5
    });
}

/** The armour class shield. */
function shield(pen: Pen, x: number, y: number, w: number, h: number, label: string, value: string | undefined): void
{
    const cx = x + (w / 2);
    const top = y + 2;
    const d = `M ${x + 3} ${top + 5} Q ${cx} ${top - 3} ${x + w - 3} ${top + 5} ` +
        `L ${x + w - 3} ${top + (h * 0.5)} Q ${x + w - 5} ${top + (h * 0.82)} ${cx} ${top + h - 3} ` +
        `Q ${x + 5} ${top + (h * 0.82)} ${x + 3} ${top + (h * 0.5)} Z`;
    pen.path(d, { fill: PAPER, stroke: RULE, width: 0.9 });
    const inset = `M ${x + 6} ${top + 7.5} Q ${cx} ${top} ${x + w - 6} ${top + 7.5} ` +
        `L ${x + w - 6} ${top + (h * 0.5)} Q ${x + w - 8} ${top + (h * 0.79)} ${cx} ${top + h - 6.5} ` +
        `Q ${x + 8} ${top + (h * 0.79)} ${x + 6} ${top + (h * 0.5)} Z`;
    pen.path(inset, { stroke: HAIRLINE, width: 0.4 });
    // The label on one line when it fits, else on two ("Classe / armatura").
    const words = label.toUpperCase().split(" ");
    const one = words.join(" ");
    const labelStyle = { font: pen.fonts.display, size: 5, color: ACCENT, align: "center" as const, tracking: 0.2 };
    if ((words.length === 1) || (pen.fonts.display.widthOfTextAtSize(one, 5) + (0.2 * one.length) <= w - 18))
    {
        pen.text(one, cx, top + 14, { ...labelStyle, maxWidth: w - 16 });
    }
    else
    {
        const split = Math.ceil(words.length / 2);
        pen.text(words.slice(0, split).join(" "), cx, top + 11.5, { ...labelStyle, maxWidth: w - 16 });
        pen.text(words.slice(split).join(" "), cx, top + 17.5, { ...labelStyle, maxWidth: w - 20 });
    }
    pen.field("ac", x + 8, top + 19, w - 16, 26, { value: value, size: 20, align: "center" });
}

/** A square value box with its label on the bottom edge (initiative, speed). */
function statBox(pen: Pen, x: number, y: number, w: number, h: number, label: string, id: string,
    value: string | undefined, small?: string): void
{
    pen.path(notchedRect(x, y + 2, w, h - 6, 6), { fill: PAPER, stroke: RULE, width: 0.9 });
    pen.path(notchedRect(x + 2.5, y + 4.5, w - 5, h - 11, 4.5), { stroke: HAIRLINE, width: 0.4 });
    pen.field(id, x + 4, y + 8, w - 8, small ? 24 : 30, { value: value, size: 16, align: "center" });
    pen.field(`${id}-other`, x + 4, y + 31, w - 8, 10, { value: small, size: 6.5, align: "center", minSize: 4.5 });
    const labelY = y + h - 4;
    const tw = pen.fonts.display.widthOfTextAtSize(label.toUpperCase(), 5) + 10;
    pen.path(roundedRect(x + ((w - tw) / 2), labelY - 5.5, tw, 9, 4.5), { fill: TINT, stroke: RULE, width: 0.5 });
    pen.text(label.toUpperCase(), x + (w / 2), labelY + 1.3, {
        font: pen.fonts.display, size: 5, color: ACCENT, align: "center", tracking: 0.2, maxWidth: w - 6
    });
}

// ---- column 3: personality, features ------------------------------------------------

function columnThree(context: PageContext, x: number, y: number, width: number, bottom: number): void
{
    const { pen, labels, values } = context;
    const pad = 8;
    const inner = width - (pad * 2);
    const boxes: [string, string, number][] = [
        ["traits", labels.traits, 62], ["ideals", labels.ideals, 42], ["bonds", labels.bonds, 42],
        ["flaws", labels.flaws, 42]
    ];
    const plateH = boxes.reduce((sum, [, , h]) => sum + h + 12, 0) + pad - 4;
    pen.path(roundedRect(x, y, width, plateH, 5), { fill: TINT_STRONG, stroke: RULE, width: 0.6 });
    let cursor = y + pad;
    for (const [id, label, h] of boxes)
    {
        frame(pen, x + pad, cursor, inner, h, { caption: label });
        ruled(pen, x + pad + 6, cursor + 3, inner - 12, h - 9, 10.5);
        pen.field(id, x + pad + 5, cursor + 3, inner - 10, h - 9, {
            value: values.text[id], size: 8.5, multiline: true, minSize: 5.5
        });
        cursor += h + 12;
    }

    cursor = y + plateH + GAP;
    frame(pen, x, cursor, width, bottom - cursor, { caption: labels.features });
    ruled(pen, x + 8, cursor + 6, width - 16, bottom - cursor - 16);
    pen.field("features", x + 7, cursor + 5, width - 14, bottom - cursor - 14, {
        value: values.text["features"], size: 8.5, multiline: true, minSize: 5.5
    });
}

// ---- footer ------------------------------------------------------------------------

function footer(context: PageContext, x: number, y: number, width: number): void
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
