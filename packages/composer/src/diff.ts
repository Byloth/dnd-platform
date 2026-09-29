/**
 * What changed on a sheet between two derivations of the same character (DEC-21, docs/phase-1/08-workplan.md
 * M1.5b): the section trees before and after a package update, compared by the ids of what they show, so a
 * renamed label is not a change and a new number is ("Hit Points: 38 → 41"). Features and spells that appear or
 * disappear are listed by name. The wording is the trees' own, in their language.
 */

import type { Block, SectionTree } from "./index.js";
import { createTranslate } from "./messages/index.js";
import type { Translate } from "./messages/index.js";

export interface SheetChange
{
    /** The section it belongs to ("Combat", "Abilities"). */
    readonly section: string;
    readonly label: string;
    /** Absent when the item is new. */
    readonly before?: string;
    /** Absent when the item is gone. */
    readonly after?: string;
}

export interface DiffOptions
{
    readonly language?: string;
    readonly translate?: Translate;
}

interface Fact { readonly section: string, readonly label: string, readonly shown: string }

/** Every labelled thing a tree shows, keyed by what it is rather than by how it is named. */
function facts(tree: SectionTree, t: Translate): Map<string, Fact>
{
    const out = new Map<string, Fact>();
    const put = (key: string, section: string, label: string, shown: string): void =>
    {
        out.set(key, { section: section, label: label, shown: shown });
    };
    const block = (section: string, b: Block): void =>
    {
        switch (b.kind)
        {
            case "values":
                b.items.forEach((i) => put(`value:${i.id}`, section, i.label, i.shown));
                break;
            case "abilities":
                for (const row of b.rows)
                {
                    put(`ability:${row.id}`, section, row.name, `${row.score} (${row.modifier})`);
                    put(`save:${row.id}`, section, `${t("sheet.sections.saves")}: ${row.name}`, row.save);
                }
                break;
            case "skills":
                b.rows.forEach((r) => put(`skill:${r.id}`, section, r.name, r.bonus));
                break;
            case "attacks":
                b.rows.forEach((r) => put(`attack:${r.id}`, section, r.name, `${r.toHit}, ${r.damage}`));
                break;
            case "resources":
                b.items.forEach((r) => put(`resource:${r.id}`, section, r.name, r.shownMax));
                break;
            case "spellcasting":
                for (const c of b.casters)
                {
                    const slots = c.slots.map((s) => `${s.label} ${s.max}`).join(", ");
                    put(`caster:${c.id}`, section, c.name, [...c.parts, slots].filter(Boolean).join(" · "));
                }
                break;
            case "spells":
                b.levels.forEach((l) => l.items.forEach((s) => put(`spell:${s.id}`, section, s.name, "")));
                break;
            case "features":
                b.groups.forEach((g) => g.items.forEach((f) => put(`feature:${f.id}`, section, f.name, "")));
                break;
            case "pairs":
                b.rows.forEach((r) => put(`pair:${section}:${r.label}`, section, r.label, r.text));
                break;
            default:
                break;
        }
    };
    for (const section of tree.sections) { section.blocks.forEach((b) => block(section.title, b)); }

    return out;
}

/** The changes from `before` to `after`, in the order the new sheet shows them, the removed ones last. */
export function diffTrees(before: SectionTree, after: SectionTree, options: DiffOptions = {}): SheetChange[]
{
    const t = options.translate ?? createTranslate(options.language ?? "en");
    const old = facts(before, t);
    const now = facts(after, t);
    const changes: SheetChange[] = [];

    for (const [key, fact] of now)
    {
        const was = old.get(key);
        if (!was) { changes.push({ section: fact.section, label: fact.label, after: fact.shown }); }
        else if (was.shown !== fact.shown)
        {
            changes.push({ section: fact.section, label: fact.label, before: was.shown, after: fact.shown });
        }
    }
    for (const [key, fact] of old)
    {
        if (!now.has(key)) { changes.push({ section: fact.section, label: fact.label, before: fact.shown }); }
    }

    return changes;
}
