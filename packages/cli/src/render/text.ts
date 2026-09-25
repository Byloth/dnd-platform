/**
 * The readable sheet: the composer's section tree rendered as text for the
 * terminal (`dnd derive --text`) and for the golden `sheet.txt` files. It is
 * the first user interface of the project and the reference for the web
 * sheet (docs/phase-1/03-sheet-composer.md).
 *
 * Typography only: columns, rules, wrapping, pips, colour. What to show and
 * how to word it comes from `@byloth/dnd-platform-composer`. Colour is
 * optional and off by default, so the golden files are plain text; when on,
 * it only wraps cells that were laid out on their plain width.
 */

import pc from "picocolors";
import stringWidth from "string-width";

import { compose, explain, plain } from "@byloth/dnd-platform-composer";
import type {
    Block, ComposeOptions, Explanation, ExplanationLine, Section, SectionTree
} from "@byloth/dnd-platform-composer";
import type { PackageSet } from "@byloth/dnd-platform-loader";
import type { Character, ComputedSheet } from "@byloth/dnd-platform-engine";

export interface RenderOptions
{
    readonly character: Character;
    readonly packages: PackageSet;
    readonly language?: string;
    readonly units?: "imperial" | "metric";
    readonly color?: boolean;
    readonly width?: number;
}

type Style = "bold" | "dim" | "warn" | "title" | "none";
interface Cell { readonly text: string, readonly style?: Style, readonly align?: "left" | "right" }
type SkillsRow = Extract<Block, { kind: "skills" }>["rows"][number];

const MARKS = { untrained: "○", proficient: "●", expertise: "◉" } as const;

// ---- primitives ---------------------------------------------------------------------

class Canvas
{
    private readonly _lines: string[] = [];
    private readonly _colors: ReturnType<typeof pc.createColors>;

    public constructor(public readonly width: number, color: boolean)
    {
        this._colors = pc.createColors(color);
    }

    public paint(text: string, style: Style | undefined): string
    {
        if (text === "") { return ""; }
        switch (style)
        {
            case "bold": return this._colors.bold(text);
            case "dim": return this._colors.dim(text);
            case "warn": return this._colors.yellow(text);
            case "title": return this._colors.bold(this._colors.cyan(text));
            default: return text;
        }
    }

    public line(text = "", style?: Style): void
    {
        this._lines.push(text === "" ? "" : this.paint(text, style));
    }

    public blank(): void
    {
        if (this._lines.length > 0 && this._lines[this._lines.length - 1] !== "") { this._lines.push(""); }
    }

    /** A section title: small caps over a light rule. */
    public title(name: string): void
    {
        this.blank();
        this._lines.push(this.paint(name.toUpperCase(), "title"));
        this._lines.push(this.paint("─".repeat(this.width), "dim"));
    }

    /** Aligned columns; widths come from the plain text, colour is applied afterwards. */
    public table(rows: readonly (readonly Cell[])[], indent = 2, gap = 2): void
    {
        const columns = Math.max(0, ...rows.map((r) => r.length));
        const widths = Array.from({ length: columns }, (_, i) =>
            Math.max(0, ...rows.map((r) => (r[i] ? stringWidth(r[i].text) : 0))));
        for (const full of rows)
        {
            let last = full.length;
            while (last > 0 && full[last - 1]?.text === "") { last -= 1; }
            const row = full.slice(0, last);
            const cells = row.map((cell, i) =>
            {
                const width = widths[i] ?? 0;
                const pad = " ".repeat(Math.max(0, width - stringWidth(cell.text)));
                const padded = cell.align === "right" ? pad + cell.text : cell.text + pad;

                return this.paint(i === row.length - 1 ? padded.trimEnd() : padded, cell.style);
            });
            const lead = " ".repeat(indent) + cells.slice(0, -1).map((c) => c + " ".repeat(gap))
                .join("");
            const lastCell = row[row.length - 1];
            const leadWidth = indent + widths.slice(0, row.length - 1).reduce((n, w) => n + w + gap, 0);
            if (lastCell === undefined || (leadWidth + stringWidth(lastCell.text) <= this.width))
            {
                this._lines.push((lead + (cells[cells.length - 1] ?? "")).trimEnd());

                continue;
            }
            // The last column wraps under itself when the row would exceed the width.
            const room = Math.max(20, this.width - leadWidth);
            const chunks: string[] = [];
            let current = "";
            for (const word of lastCell.text.split(" "))
            {
                const candidate = current === "" ? word : `${current} ${word}`;
                if ((stringWidth(candidate) > room) && (current !== ""))
                {
                    chunks.push(current);
                    current = word;
                }
                else { current = candidate; }
            }
            chunks.push(current);
            chunks.forEach((chunk, i) =>
            {
                const head = i === 0 ? lead : " ".repeat(leadWidth);
                this._lines.push((head + this.paint(chunk, lastCell.style)).trimEnd());
            });
        }
    }

    /** Text wrapped to the width and indented; `hang` indents the continuation lines further (after a label). */
    public paragraph(text: string, indent = 2, style?: Style, hang = 0): void
    {
        for (const raw of text.split("\n"))
        {
            let current = "";
            let first = true;
            const push = (line: string): void =>
            {
                this._lines.push(" ".repeat(indent + (first ? 0 : hang)) + this.paint(line, style));
                first = false;
            };
            for (const word of raw.split(/\s+/).filter((w) => w !== ""))
            {
                const room = Math.max(20, this.width - indent - (first ? 0 : hang));
                const candidate = current === "" ? word : `${current} ${word}`;
                if ((stringWidth(candidate) > room) && (current !== ""))
                {
                    push(current);
                    current = word;
                }
                else { current = candidate; }
            }
            if (current === "") { this._lines.push(""); }
            else { push(current); }
        }
    }

    /** A label in a fixed column, the text wrapped beside it. */
    public labelled(label: string, text: string, column: number, indent = 2, style?: Style, labelStyle?: Style): void
    {
        const room = Math.max(20, this.width - indent - column);
        const lines: string[] = [];
        let current = "";
        for (const word of text.split(/\s+/).filter((w) => w !== ""))
        {
            const candidate = current === "" ? word : `${current} ${word}`;
            if ((stringWidth(candidate) > room) && (current !== ""))
            {
                lines.push(current);
                current = word;
            }
            else { current = candidate; }
        }
        lines.push(current);
        lines.forEach((line, i) =>
        {
            const head = i === 0 ? label.padEnd(column) : " ".repeat(column);
            this._lines.push(`${" ".repeat(indent)}${this.paint(head, labelStyle)}${this.paint(line, style)}`.trimEnd());
        });
    }

    public toString(): string
    {
        return `${this._lines.join("\n").replace(/\n+$/, "")}\n`;
    }
}

/** The first sentence of a text, cut to `max` columns. */
function summary(text: string, max: number): string
{
    const paragraph = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim())
        .find((p) => p !== "") ?? "";
    const sentence = /^(.*?[.!?])(\s|$)/.exec(paragraph)?.[1] ?? paragraph;
    if (stringWidth(sentence) <= max) { return sentence; }
    let cut = "";
    for (const word of sentence.split(" "))
    {
        const candidate = cut === "" ? word : `${cut} ${word}`;
        if (stringWidth(candidate) > max - 1) { break; }
        cut = candidate;
    }

    return `${cut}…`;
}

function pips(current: number, max: number): string
{
    return `${"●".repeat(current)}${"○".repeat(Math.max(0, max - current))}`;
}

function explanationRows(lines: readonly ExplanationLine[], indent: string): Cell[][]
{
    return lines.map((l) => [
        { text: `${indent}${l.shown}`, style: "dim", align: "right" },
        { text: l.label, style: "dim" },
        { text: `← ${l.source}`, style: "dim" }
    ]);
}

// ---- the renderer ---------------------------------------------------------------------

class TextRenderer
{
    private readonly _canvas: Canvas;

    public constructor(private readonly _tree: SectionTree, width: number, color: boolean)
    {
        this._canvas = new Canvas(width, color);
    }

    private identity(block: Extract<Block, { kind: "identity" }>): void
    {
        const packages = block.packages.map((p) => `${p.id} ${p.version}`).join(", ");
        this._canvas.line(block.name.toUpperCase(), "bold");
        this._canvas.line(`${block.parts.join(" · ")}  —  level ${block.level}`);
        this._canvas.line(`Ruleset ${block.ruleset} · packages ${packages}`, "dim");
    }

    private values(block: Extract<Block, { kind: "values" }>): void
    {
        const rows: Cell[][] = [];
        for (const item of block.items)
        {
            rows.push([{ text: item.label }, { text: item.shown, style: "bold", align: "right" }]);
            if (item.explain) { rows.push(...explanationRows(item.explain.regular, "    ")); }
        }
        this._canvas.table(rows);
    }

    private abilities(block: Extract<Block, { kind: "abilities" }>): void
    {
        const header: Cell[] = [
            { text: "", style: "dim" },
            { text: "Score", align: "right", style: "dim" },
            { text: "Mod", align: "right", style: "dim" },
            { text: "Save", align: "right", style: "dim" },
            { text: "", style: "dim" }
        ];
        this._canvas.table([header, ...block.rows.map((row): Cell[] => [
            { text: row.name, style: "bold" },
            { text: row.score, align: "right" },
            { text: row.modifier, align: "right" },
            { text: row.save, align: "right" },
            { text: row.proficient ? "● proficient" : "", style: "dim" }
        ])]);
    }

    private skills(block: Extract<Block, { kind: "skills" }>): void
    {
        const cell = (row: SkillsRow | undefined): Cell[] =>
        {
            if (row === undefined) { return [{ text: "" }, { text: "" }, { text: "" }]; }
            const held = row.mark !== "untrained";

            return [
                { text: MARKS[row.mark], style: held ? "bold" : "dim" },
                { text: `${row.name} (${row.ability})` },
                { text: row.bonus, align: "right", ...(held ? { style: "bold" as const } : {}) }
            ];
        };
        const half = Math.ceil(block.rows.length / 2);
        const rows: Cell[][] = [];
        for (let i = 0; i < half; i += 1)
        {
            rows.push([...cell(block.rows[i]), { text: "   " }, ...cell(block.rows[i + half])]);
        }
        this._canvas.table(rows);
        this._canvas.line("  ○ untrained  ● proficient  ◉ expertise", "dim");
        if (block.proficiencies.length > 0)
        {
            this._canvas.blank();
            this._canvas.table(block.proficiencies.map((g): Cell[] => [{ text: g.label, style: "dim" }, { text: g.items.join(", ") }]));
        }
    }

    private attacks(block: Extract<Block, { kind: "attacks" }>): void
    {
        const header: Cell[] = [
            { text: "Attack", style: "dim" },
            { text: "To hit", align: "right", style: "dim" },
            { text: "Damage", style: "dim" },
            { text: "", style: "dim" }
        ];
        this._canvas.table([header, ...block.rows.map((row): Cell[] => [
            { text: row.name, style: "bold" },
            { text: row.toHit, align: "right" },
            { text: row.damage },
            { text: row.notes.join(", "), style: "dim" }
        ])]);
    }

    private actions(block: Extract<Block, { kind: "actions" }>): void
    {
        for (const group of block.groups)
        {
            this._canvas.line(`  ${group.label}`, "dim");
            this._canvas.table(group.items.map((a): Cell[] => [
                { text: a.name, style: a.available ? "bold" : "dim" },
                { text: a.cost, style: "dim" },
                { text: `${a.details.join(" · ")}${a.available ? "" : " (not available now)"}`, style: "dim" }
            ]), 4);
        }
        if (block.base.length > 0)
        {
            this._canvas.blank();
            this._canvas.labelled("Base actions", block.base.map((a) => a.name).join(", "), 14, 2, "dim", "dim");
        }
    }

    private resources(block: Extract<Block, { kind: "resources" }>): void
    {
        const rows: Cell[][] = [];
        for (const item of block.items)
        {
            const shownPips = (item.pips && typeof item.max === "number" && item.current !== null) ?
                pips(item.current, item.max) :
                "";
            rows.push([
                { text: item.name, style: "bold" },
                { text: `${item.current ?? "—"} / ${item.shownMax}`, align: "right" },
                { text: shownPips },
                { text: item.recharge, style: "dim" }
            ]);
            if (item.explain) { rows.push(...explanationRows(item.explain.regular, "    ")); }
        }
        this._canvas.table(rows);
    }

    private spellcasting(block: Extract<Block, { kind: "spellcasting" }>): void
    {
        for (const caster of block.casters)
        {
            this._canvas.line(`  ${caster.name} — ${caster.ability} · ${caster.parts.join(" · ")}`, "bold");
            if (caster.known.length > 0) { this._canvas.line(`    ${caster.known.join(", ")}`, "dim"); }
            if (caster.slots.length > 0)
            {
                const slots = caster.slots.map((s) => `${s.label} ${pips(s.current, s.max)}`);
                this._canvas.paragraph(`Slots  ${slots.join("   ")}`, 4);
            }
        }
    }

    private features(block: Extract<Block, { kind: "features" }>): void
    {
        for (const group of block.groups)
        {
            this._canvas.line(`  ${group.label}`, "dim");
            const nameWidth = Math.max(...group.items.map((f) => stringWidth(f.name)));
            const room = this._canvas.width - 4 - nameWidth - 2 - 4;
            this._canvas.table(group.items.map((f): Cell[] => [
                { text: f.name, style: "bold" },
                { text: f.level !== undefined ? `L${f.level}` : "", style: "dim", align: "right" },
                { text: summary(f.text, room), style: "dim" }
            ]), 4);
        }
    }

    private block(block: Block): void
    {
        switch (block.kind)
        {
            case "identity": this.identity(block); break;
            case "values": this.values(block); break;
            case "abilities": this.abilities(block); break;
            case "skills": this.skills(block); break;
            case "text": this._canvas.paragraph(block.items.join(" · ")); break;
            case "pairs":
                this._canvas.table(block.rows.map((r): Cell[] => [{ text: r.label, style: "dim" }, { text: r.text }]));
                break;
            case "attacks": this.attacks(block); break;
            case "actions": this.actions(block); break;
            case "resources": this.resources(block); break;
            case "spellcasting": this.spellcasting(block); break;
            case "spells":
                for (const level of block.levels)
                {
                    this._canvas.labelled(level.label, level.items.map((s) => s.label).join(", "), 11, 2, undefined, "dim");
                }
                this._canvas.line("  © concentration  * always prepared", "dim");
                break;
            case "features": this.features(block); break;
            case "equipment":
                this._canvas.table(block.items.map((e): Cell[] => [
                    { text: e.name, style: "bold" },
                    { text: e.quantity > 1 ? `×${e.quantity}` : "", align: "right" },
                    { text: e.flags.join(", "), style: "dim" }
                ]));
                break;
            case "personality":
                for (const field of block.fields)
                {
                    this._canvas.line(`  ${field.label}`, "dim");
                    this._canvas.paragraph(field.text, 4);
                }
                break;
            case "conditions":
                for (const item of block.items) { this._canvas.line(`  ${item}`); }
                break;
            case "notes":
                if (block.text) { this._canvas.paragraph(block.text); }
                if (block.open.length > 0)
                {
                    this._canvas.line("  Choices still open", "dim");
                    this._canvas.table(block.open.map((c): Cell[] => [{ text: c.label }, { text: c.progress, style: "dim" }]), 4);
                }
                break;
            case "reminders":
                for (const item of block.items)
                {
                    this._canvas.paragraph(`• ${item.text}  (${item.source})`, 2, undefined, 2);
                }
                break;
            case "credits":
                for (const pkg of block.packages)
                {
                    this._canvas.line(`  ${pkg.name} (${pkg.id} ${pkg.version})`, "bold");
                    for (const source of pkg.sources) { this._canvas.paragraph(source.line, 4, "dim"); }
                }
                break;
            default:
                break;
        }
    }

    private section(section: Section): void
    {
        if (section.blocks.length === 0) { return; }
        if (section.title !== "") { this._canvas.title(section.title); }
        for (const block of section.blocks) { this.block(block); }
    }

    public render(): string
    {
        for (const section of this._tree.sections) { this.section(section); }
        if (this._tree.warnings.length > 0)
        {
            this._canvas.title("Warnings");
            for (const w of this._tree.warnings) { this._canvas.paragraph(`${w.code}: ${w.message}`, 2, "warn"); }
        }

        return this._canvas.toString();
    }
}

function composeOptions(options: RenderOptions): ComposeOptions
{
    return {
        character: options.character,
        packages: options.packages,
        ...(options.language !== undefined ? { language: options.language } : {}),
        ...(options.units !== undefined ? { units: options.units } : {})
    };
}

/** Render an already composed tree (the fixtures compare both the tree and this text). */
export function renderTree(tree: SectionTree, options: Pick<RenderOptions, "color" | "width">): string
{
    return new TextRenderer(tree, options.width ?? 100, options.color === true).render();
}

/** Render a computed sheet as text; `options.color` off gives the golden, plain form. */
export function renderSheet(sheet: ComputedSheet, options: RenderOptions): string
{
    return renderTree(compose(sheet, composeOptions(options)), options);
}

/** `dnd derive --explain <path>`: every contribution of one value, inactive ones included. */
export function renderExplanation(sheet: ComputedSheet, path: string, options: RenderOptions): string
{
    const canvas = new Canvas(options.width ?? 100, options.color === true);
    const explanation: Explanation | undefined = explain(sheet, path, composeOptions(options));
    const value = sheet.values[path];
    if (explanation === undefined || value === undefined)
    {
        const head = path.split(".")[0] ?? path;
        const paths = Object.keys(sheet.values).sort();
        const close = paths.filter((p) => (p === head) || p.startsWith(`${head}.`));
        const families = [...new Set(paths.map((p) => p.split(".")[0] ?? p))];
        canvas.line(`no value at "${path}"`, "warn");
        const hint = close.length > 0 ? `Paths under ${head}: ${close.join(", ")}` : `Value paths: ${families.join(", ")}`;
        canvas.paragraph(hint, 2, "dim");

        return canvas.toString();
    }
    canvas.line(`${path} = ${plain(value.value)}`, "bold");
    canvas.table(explanation.expert.map((l): Cell[] =>
    {
        const style: Style = l.applied ? "none" : "dim";

        return [
            { text: l.shown, align: "right", style: style },
            { text: l.label, style: style },
            { text: l.formula ? `= ${l.formula}` : "", style: "dim" },
            { text: `← ${l.source}${l.applied ? "" : "  (inactive)"}`, style: "dim" }
        ];
    }));

    return canvas.toString();
}
