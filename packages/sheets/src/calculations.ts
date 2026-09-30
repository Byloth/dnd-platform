/**
 * The sheet's formulas: JavaScript calculate actions of the PDF form (docs/phase-1/05-print-and-export.md), run by
 * the viewers that run them (Acrobat, Firefox, Chrome and Edge on a computer) whenever a field changes. Viewers that
 * do not keep the values the site wrote, which are right anyway.
 *
 * Each formula is the rule's plain one (modifier from score, save and skill from modifier and proficiency…) plus a
 * constant: what the engine added on top of it for this character (a feat, an item, Jack of All Trades), measured
 * when the sheet is drawn. With the site's values the formulas give back exactly the site's numbers; when the player
 * changes a score or ticks a proficiency, the number follows and keeps the bonus. The blank sheet's constants are 0.
 * An input left empty leaves the result empty.
 */

/** The helpers every script starts with: read a field as a number (`−1` or `-1`), write a signed number. */
const PRELUDE = "var d=this;" +
    "function n(f){var x=d.getField(f);if(!x)return null;var s=String(x.value).replace(/\\u2212/g,\"-\")" +
    ".replace(/\\s/g,\"\");if(s===\"\")return null;var v=parseInt(s,10);return isNaN(v)?null:v;}" +
    "function c(f){var x=d.getField(f);return !!x&&x.value!==\"Off\"&&x.value!==\"\";}" +
    "function s(v){return v<0?\"\\u2212\"+(-v):\"+\"+v;}";

/** A number as the sheet writes it (`+2`, `−1`, `15`) → its value; undefined when there is none. */
export function parseShown(value: string | undefined): number | undefined
{
    if (value === undefined) { return undefined; }
    const parsed = Number.parseInt(value.replace(/\u2212/g, "-").replace(/\s/g, ""), 10);

    return Number.isNaN(parsed) ? undefined : parsed;
}

/** The engine's value less the plain formula's, when both are known; 0 otherwise. */
export function extra(engine: string | undefined, plain: number | undefined): number
{
    const value = parseShown(engine);

    return (value === undefined) || (plain === undefined) ? 0 : value - plain;
}

export const modifierOf = (score: number): number => Math.floor((score - 10) / 2);

/** An ability's modifier from its score. */
export function modifierScript(ability: string, bonus: number): string
{
    return `${PRELUDE}var v=n("ability-${ability}-score");` +
        `event.value=v===null?"":s(Math.floor((v-10)/2)+${bonus});`;
}

/** A saving throw: modifier, plus the proficiency bonus when its box is ticked. */
export function saveScript(ability: string, bonus: number): string
{
    return `${PRELUDE}var m=n("ability-${ability}-modifier");` +
        `var p=c("save-${ability}-proficient")?(n("proficiency-bonus")||0):0;` +
        `event.value=m===null?"":s(m+p+${bonus});`;
}

/** A skill: its ability's modifier, plus the proficiency bonus (twice with expertise) when its box is ticked. */
export function skillScript(skill: string, ability: string, times: number, bonus: number): string
{
    return `${PRELUDE}var m=n("ability-${ability}-modifier");` +
        `var p=c("skill-${skill}-proficient")?(n("proficiency-bonus")||0)*${times}:0;` +
        `event.value=m===null?"":s(m+p+${bonus});`;
}

/** Passive Perception: 10 plus Perception. */
export function passiveScript(bonus: number): string
{
    return `${PRELUDE}var v=n("skill-perception-bonus");event.value=v===null?"":String(10+v+${bonus});`;
}

/** Initiative: the Dexterity modifier. */
export function initiativeScript(bonus: number): string
{
    return `${PRELUDE}var m=n("ability-dex-modifier");event.value=m===null?"":s(m+${bonus});`;
}

/** A spellcasting class's save DC (8 + proficiency + modifier) or attack bonus (proficiency + modifier). */
export function casterScript(ability: string, kind: "dc" | "attack", bonus: number): string
{
    const base = kind === "dc" ? 8 : 0;
    const shown = kind === "dc" ? "String" : "s";

    return `${PRELUDE}var m=n("ability-${ability}-modifier");var p=n("proficiency-bonus");` +
        `event.value=(m===null||p===null)?"":${shown}(${base}+m+p+${bonus});`;
}
