/**
 * The readable sheet: a computed sheet rendered as text for the terminal
 * (`dnd derive --text`) and for the golden `sheet.txt` files. It is the first
 * user interface of the project and the reference for the web sheet
 * (docs/phase-0/08-workplan.md, M0.8; sections and contents from
 * docs/08-dynamic-sheet.md).
 *
 * Pure: strings in, string out. Colour is optional and off by default, so the
 * golden files are plain text; when on, it only wraps cells that were laid
 * out on their plain width.
 */

import pc from "picocolors";
import stringWidth from "string-width";

import type {
    ActionView, Character, ComputedSheet, Contribution, DerivedValue, PackageSet, SpellView
} from "@byloth/dnd-platform-engine";

export interface RenderOptions
{
    readonly character: Character;
    readonly packages: PackageSet;
    readonly language?: string;
    readonly color?: boolean;
    readonly width?: number;
}

type Text = Readonly<Record<string, string | undefined>>;
type Style = "bold" | "dim" | "warn" | "title" | "none";
interface Cell { readonly text: string, readonly style?: Style, readonly align?: "left" | "right" }

const ABILITY_NAMES: Record<string, string> = {
    str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma"
};
const ACTIVATION_NAMES: Record<string, string> = {
    "action": "Actions", "bonus-action": "Bonus actions", "reaction": "Reactions", "free": "Free", "special": "Special"
};
const ORIGIN_NAMES: Record<string, string> = {
    species: "Species",
    subspecies: "Subspecies",
    class: "Class",
    subclass: "Subclass",
    background: "Background",
    feat: "Feats",
    item: "Items",
    condition: "Conditions",
    option: "Options",
    spell: "Active spells",
    custom: "Custom effects"
};
const ORIGIN_ORDER = Object.keys(ORIGIN_NAMES);
const ORDINALS = ["Cantrips", "1st level", "2nd level", "3rd level", "4th level", "5th level", "6th level", "7th level",
    "8th level", "9th level"];

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

function signed(value: number | string): string
{
    if (typeof value !== "number") { return value; }

    return value < 0 ? `−${-value}` : `+${value}`;
}

function plain(value: number | string): string
{
    return typeof value === "number" && value < 0 ? `−${-value}` : String(value);
}

function capitalise(text: string): string
{
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function words(id: string): string
{
    return capitalise(id.replace(/-/g, " "));
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

/** `package · entity` with the package prefix and the type segment dropped; the ruleset itself is just the package. */
function sourceLabel(contribution: Contribution, rulesetId: string): string
{
    const { source } = contribution;
    const pkg = source.package;
    const ref = source.feature ?? source.entity;
    if (ref === undefined || ref === rulesetId) { return pkg; }
    const short = ref.startsWith(`${pkg}.`) ? ref.slice(pkg.length + 1) : ref;
    const typed = short.replace(/^(feature|feat|item|class|subclass|species|background|condition|spell|rule|table)\./, "");

    return pkg === "" ? typed : `${pkg} · ${typed}`;
}

/** How a contribution reads in a provenance line: `10`, `+3`, `×2`, `≥16`, `≤20`, `=15`. */
function contributionText(c: Contribution): string
{
    switch (c.kind)
    {
        case "base": return plain(c.value);
        case "add": return signed(c.value);
        case "mul": return `×${plain(c.value)}`;
        case "min": return `≥${plain(c.value)}`;
        case "max": return `≤${plain(c.value)}`;
        default: return `=${plain(c.value)}`;
    }
}

// ---- the renderer ---------------------------------------------------------------------

class SheetRenderer
{
    private readonly _canvas: Canvas;
    private readonly _language: string;

    public constructor(private readonly _sheet: ComputedSheet, private readonly _options: RenderOptions)
    {
        this._canvas = new Canvas(_options.width ?? 100, _options.color === true);
        this._language = _options.language ?? _sheet.meta.language;
    }

    // ---- lookups ----

    private text(label: Text | undefined): string
    {
        if (label === undefined) { return ""; }

        const any = Object.values(label).find((v) => v !== undefined);

        return label[this._language] ?? label["en"] ?? any ?? "";
    }

    private entityName(id: string | undefined): string
    {
        if (id === undefined) { return ""; }
        const data = this._options.packages.entities.get(id)?.data as { name?: Text } | undefined;

        return data?.name ? this.text(data.name) : id.split(".").pop() ?? id;
    }

    private entityText(id: string | undefined): string
    {
        if (id === undefined) { return ""; }
        const data = this._options.packages.entities.get(id)?.data as { text?: Text } | undefined;

        return data?.text ? this.text(data.text) : "";
    }

    private value(path: string): DerivedValue | undefined
    {
        return this._sheet.values[path];
    }

    private number(path: string, fallback = 0): number
    {
        const value = this.value(path)?.value;

        return typeof value === "number" ? value : fallback;
    }

    private sourceLabel(contribution: Contribution): string
    {
        return sourceLabel(contribution, this._options.packages.ruleset.id);
    }

    private contributionRows(value: DerivedValue, indent: string): Cell[][]
    {
        const applied = value.provenance.filter((c) => c.applied);
        if (applied.length <= 1) { return []; }

        return applied.map((c) =>
        {
            return [
                { text: `${indent}${contributionText(c)}`, style: "dim", align: "right" },
                { text: this.text(c.label), style: "dim" },
                { text: `← ${this.sourceLabel(c)}`, style: "dim" }
            ];
        });
    }

    // ---- sections ----

    private identity(): void
    {
        const sheet = this._sheet;
        const choices = this._options.character.choices;
        this._canvas.line(sheet.meta.name.toUpperCase(), "bold");
        const species = [this.entityName(choices.species), choices.subspecies ? `(${this.entityName(choices.subspecies)})` : ""]
            .filter((s) => s !== "")
            .join(" ");
        const classes = sheet.classes.map((c) =>
        {
            const sub = c.subclass ? `, ${this.entityName(c.subclass)}` : "";

            return `${this.entityName(c.class)} ${c.levels}${sub}`;
        });
        const parts = [species, ...classes, this.entityName(choices.background), choices.alignment ?? ""]
            .filter((p) => p !== "");
        this._canvas.line(`${parts.join(" · ")}  —  level ${sheet.level}`);
        const packages = sheet.meta.packages.map((p) => `${p.id} ${p.version}`).join(", ");
        this._canvas.line(`Ruleset ${sheet.meta.ruleset} · packages ${packages}`, "dim");
    }

    private core(): void
    {
        const sheet = this._sheet;
        const state = this._options.character.state;
        this._canvas.title("Core");
        const rows: Cell[][] = [];
        const row = (label: string, path: string, shown: string): void =>
        {
            rows.push([{ text: label }, { text: shown, style: "bold", align: "right" }]);
            const value = this.value(path);
            if (value) { rows.push(...this.contributionRows(value, "    ")); }
        };
        row("Armor Class", "ac", plain(this.number("ac")));
        row("Initiative", "initiative", signed(this.number("initiative")));
        const speeds = Object.keys(sheet.values)
            .filter((p) => p.startsWith("speed.") && this.number(p) > 0)
            .sort((a, b) => (a === "speed.walk" ? -1 : b === "speed.walk" ? 1 : a.localeCompare(b)))
            .map((p) => (p === "speed.walk" ? `${this.number(p)} ft` : `${p.slice(6)} ${this.number(p)} ft`));
        row("Speed", "speed.walk", speeds.join(", "));
        const temporary = state.hp.temporary > 0 ? ` (+${state.hp.temporary} temporary)` : "";
        row("Hit Points", "hp.max", `${state.hp.current} / ${this.number("hp.max")}${temporary}`);
        const dice = sheet.play.hitDice.map((d) => `${d.total}d${d.die}`).join(" + ");
        const spent = state.hitDice.spent > 0 ? ` (${state.hitDice.spent} spent)` : "";
        rows.push([{ text: "Hit Dice" }, { text: `${dice}${spent}`, style: "bold", align: "right" }]);
        row("Proficiency Bonus", "proficiencyBonus", signed(this.number("proficiencyBonus")));
        const perception = this.value("passive.perception");
        if (perception)
        {
            rows.push([{ text: "Passive Perception" }, { text: plain(perception.value), style: "bold", align: "right" }]);
        }
        if (state.inspiration) { rows.push([{ text: "Inspiration" }, { text: "yes", style: "bold", align: "right" }]); }
        this._canvas.table(rows);
    }

    private abilities(): void
    {
        const proficient = new Set(this._sheet.proficiencies.filter((p) => p.type === "save").map((p) => p.item));
        this._canvas.title("Abilities");
        const header: Cell[] = [
            { text: "", style: "dim" },
            { text: "Score", align: "right", style: "dim" },
            { text: "Mod", align: "right", style: "dim" },
            { text: "Save", align: "right", style: "dim" },
            { text: "", style: "dim" }
        ];
        const rows: Cell[][] = [header];
        for (const ability of this._options.packages.ruleset.abilities)
        {
            rows.push([
                { text: ABILITY_NAMES[ability] ?? ability.toUpperCase(), style: "bold" },
                { text: plain(this.number(`ability.${ability}`)), align: "right" },
                { text: signed(this.number(`mod.${ability}`)), align: "right" },
                { text: signed(this.number(`save.${ability}`)), align: "right" },
                { text: proficient.has(ability) ? "● proficient" : "", style: "dim" }
            ]);
        }
        this._canvas.table(rows);
    }

    private skills(): void
    {
        const held = new Map(this._sheet.proficiencies.filter((p) => p.type === "skill").map((p) => [p.item, p.expertise]));
        this._canvas.title("Skills");
        const skills = this._options.packages.ruleset.skills;
        const cell = (skill: { id: string, ability: string } | undefined): Cell[] =>
        {
            if (skill === undefined) { return [{ text: "" }, { text: "" }, { text: "" }]; }
            const mark = held.has(skill.id) ? (held.get(skill.id) ? "◉" : "●") : "○";
            const bonus = this.value(`skill.${skill.id}`)?.value ?? 0;

            return [
                { text: mark, style: held.has(skill.id) ? "bold" : "dim" },
                { text: `${words(skill.id)} (${skill.ability.toUpperCase()})` },
                { text: signed(bonus), align: "right", ...(held.has(skill.id) ? { style: "bold" as const } : {}) }
            ];
        };
        const half = Math.ceil(skills.length / 2);
        const rows: Cell[][] = [];
        for (let i = 0; i < half; i += 1)
        {
            rows.push([...cell(skills[i]), { text: "   " }, ...cell(skills[i + half])]);
        }
        this._canvas.table(rows);
        this._canvas.line("  ○ untrained  ● proficient  ◉ expertise", "dim");

        const groups: [string, string][] = [
            ["armor", "Armor"], ["weapon", "Weapons"], ["tool", "Tools"], ["language", "Languages"]
        ];
        const lines: Cell[][] = [];
        for (const [type, label] of groups)
        {
            const items = this._sheet.proficiencies.filter((p) => p.type === type).map((p) => words(p.item));
            if (items.length > 0) { lines.push([{ text: label, style: "dim" }, { text: items.join(", ") }]); }
        }
        if (lines.length > 0)
        {
            this._canvas.blank();
            this._canvas.table(lines);
        }
    }

    private senses(): void
    {
        const parts: string[] = [];
        for (const path of Object.keys(this._sheet.values).filter((p) => p.startsWith("sense."))
            .sort())
        {
            const value = this.number(path);
            if (value > 0) { parts.push(`${words(path.slice(6))} ${value} ft`); }
        }
        for (const skill of ["perception", "investigation", "insight"])
        {
            const value = this.value(`passive.${skill}`);
            if (value) { parts.push(`Passive ${words(skill)} ${plain(value.value)}`); }
        }
        if (parts.length === 0) { return; }
        this._canvas.title("Senses");
        this._canvas.paragraph(parts.join(" · "));
    }

    private combat(): void
    {
        const sheet = this._sheet;
        const rows: Cell[][] = [];
        const perAction = this.number("attacks.perAction", 1);
        if (perAction > 1) { rows.push([{ text: "Attacks per action", style: "dim" }, { text: String(perAction) }]); }
        for (const defense of sheet.defenses)
        {
            rows.push([{ text: capitalise(defense.defense.replace("-", " ")), style: "dim" }, { text: defense.to.map(words).join(", ") }]);
        }
        for (const modifier of sheet.rollModifiers.filter((m) => m.applied))
        {
            const on = modifier.on;
            const target = [on.type, on.ability?.toUpperCase(), on.skill ? words(on.skill) : undefined,
                on.against ? `against ${on.against.map(words).join(", ")}` : undefined]
                .filter((s) => s !== undefined)
                .join(" ");
            const note = modifier.note ? ` (${this.text(modifier.note)})` : "";
            rows.push([{ text: capitalise(modifier.kind), style: "dim" }, { text: `on ${target}${note}` }]);
        }
        const carry = this.value("carry.capacity");
        if (carry) { rows.push([{ text: "Carrying capacity", style: "dim" }, { text: `${plain(carry.value)} lb` }]); }
        if (rows.length === 0) { return; }
        this._canvas.title("Combat");
        this._canvas.table(rows);
    }

    private attacks(): void
    {
        const sheet = this._sheet;
        if (sheet.attacks.length === 0) { return; }
        this._canvas.title("Attacks");
        const header: Cell[] = [
            { text: "Attack", style: "dim" },
            { text: "To hit", align: "right", style: "dim" },
            { text: "Damage", style: "dim" },
            { text: "", style: "dim" }
        ];
        const rows: Cell[][] = [header];
        for (const attack of sheet.attacks)
        {
            const notes = [
                attack.ranged ? "ranged" : "melee",
                attack.ability.toUpperCase(),
                attack.magical ? "magical" : undefined,
                attack.critRange < 20 ? `crit ${attack.critRange}–20` : undefined,
                ...attack.extraDamage.map((x) => `+${x.dice ?? x.formula ?? ""}${x.damageType ? ` ${x.damageType}` : ""}`)

            ].filter((n) => n !== undefined);
            rows.push([
                { text: this.text(attack.name), style: "bold" },
                { text: signed(attack.attackBonus.value), align: "right" },
                { text: `${attack.damage} ${attack.damageType}` },
                { text: notes.join(", "), style: "dim" }
            ]);
        }
        this._canvas.table(rows);
    }

    private actionLine(action: ActionView): Cell[]
    {
        const cost = action.cost.map((c) => "amount" in c ? `${c.amount} ${c.resource}` : `level ${c.level} slot`).join(" + ");
        const details: string[] = [];
        if (action.requires?.afterAction) { details.push(`after ${words(action.requires.afterAction)}`); }
        if (action.dc) { details.push(`DC ${plain(action.dc.value)}`); }
        for (const roll of action.rolls ?? [])
        {
            if (roll.type === "attack" && roll.bonus) { details.push(`attack ${signed(roll.bonus.value)}`); }
            else if (roll.type === "damage")
            {
                const bonus = roll.bonus && roll.bonus.value !== 0 ? ` ${signed(roll.bonus.value)}` : "";
                const dice = (roll.dice ?? "").replace(/table\(([^)]+)\)/g, (_m, id: string) =>
                    `${words(id.split(".").pop() ?? id).toLowerCase()} die`);
                details.push(`${dice}${bonus}${roll.damageType ? ` ${roll.damageType}` : ""}`.trim());
            }
            else if (roll.type === "save" && roll.dc) { details.push(`save DC ${plain(roll.dc.value)}`); }
        }
        if (action.toggle) { details.push(`toggles ${words(action.toggle)}`); }
        const unavailable = !action.available;

        return [
            { text: this.text(action.name), style: unavailable ? "dim" : "bold" },
            { text: cost, style: "dim" },
            { text: `${details.join(" · ")}${unavailable ? " (not available now)" : ""}`, style: "dim" }
        ];
    }

    private actions(): void
    {
        const sheet = this._sheet;
        const base = sheet.actions.filter((a) => a.source.entity?.includes(".rule.") && a.cost.length === 0 && !a.rolls);
        const granted = sheet.actions.filter((a) => !base.includes(a));
        if (sheet.actions.length === 0) { return; }
        this._canvas.title("Actions");
        for (const activation of ["action", "bonus-action", "reaction", "free", "special"])
        {
            const group = granted.filter((a) => a.activation === activation);
            if (group.length === 0) { continue; }
            this._canvas.line(`  ${ACTIVATION_NAMES[activation] ?? activation}`, "dim");
            this._canvas.table(group.map((a) => this.actionLine(a)), 4);
        }
        if (base.length > 0)
        {
            this._canvas.blank();
            this._canvas.labelled("Base actions", base.map((a) => this.text(a.name)).join(", "), 14, 2, "dim", "dim");
        }
    }

    private resources(): void
    {
        const sheet = this._sheet;
        if (sheet.resources.length === 0) { return; }
        this._canvas.title("Resources");
        const rows: Cell[][] = [];
        for (const resource of sheet.resources)
        {
            const max = resource.max.value;
            const current = resource.current ?? (typeof max === "number" ? max : null);
            const pips = (typeof max === "number" && resource.display === "pips" && max <= 12 && current !== null) ?
                `${"●".repeat(current)}${"○".repeat(Math.max(0, max - current))}` :
                "";
            const recharge = resource.recharge.map((r) =>
            {
                const amount = r.amount === "full" ? "all" : String(r.amount);
                const on = r.on === "short-rest" ? "short rest" : r.on === "long-rest" ? "long rest" : r.on;

                return `${amount} on a ${on}`;
            }).join(", ");
            rows.push([
                { text: this.text(resource.name), style: "bold" },
                { text: `${current ?? "—"} / ${plain(max)}`, align: "right" },
                { text: pips },
                { text: recharge === "" ? "" : `regains ${recharge}`, style: "dim" }
            ]);
            // The declared maximum alone is not worth explaining; modifiers to it are.
            if (resource.max.provenance.filter((c) => c.applied && c.kind !== "base").length > 1)
            {
                rows.push(...this.contributionRows(resource.max, "    "));
            }
        }
        this._canvas.table(rows);
    }

    private spellcasting(): void
    {
        const sheet = this._sheet;
        if (sheet.spellcasting.length === 0) { return; }
        this._canvas.title("Spellcasting");
        const state = this._options.character.state;
        for (const casting of sheet.spellcasting)
        {
            const ability = ABILITY_NAMES[casting.ability] ?? casting.ability;
            const parts = [`save DC ${plain(casting.dc.value)}`, `spell attack ${signed(casting.attackBonus.value)}`,
                `${casting.preparation} spells`, casting.ritual ? "ritual casting" : undefined]
                .filter((p) => p !== undefined);
            this._canvas.line(`  ${this.entityName(casting.class)} — ${ability} · ${parts.join(" · ")}`, "bold");
            const known = [casting.cantripsKnown !== undefined ? `${casting.cantripsKnown} cantrips` : undefined,
                casting.spellsKnown !== undefined ? `${casting.spellsKnown} spells known` : undefined]
                .filter((p) => p !== undefined);
            if (known.length > 0) { this._canvas.line(`    ${known.join(", ")}`, "dim"); }
            const slots = casting.slots.map((slot) =>
            {
                const current = state.spellSlots?.[String(slot.level)] ?? slot.max;
                const pips = `${"●".repeat(current)}${"○".repeat(Math.max(0, slot.max - current))}`;

                return `${ORDINALS[slot.level]?.replace(" level", "") ?? slot.level} ${pips}`;
            });
            if (casting.pact)
            {
                const current = state.spellSlots?.["pact"] ?? casting.pact.slots;
                const pips = `${"●".repeat(current)}${"○".repeat(Math.max(0, casting.pact.slots - current))}`;
                slots.push(`pact (level ${casting.pact.level}) ${pips}`);
            }
            if (slots.length > 0) { this._canvas.paragraph(`Slots  ${slots.join("   ")}`, 4); }
        }
    }

    private spellLabel(spell: SpellView): string
    {
        const paid = spell.paidWith;
        const payment = "free" in paid ?
            (spell.level > 0 ? " (at will)" : "") :
            "resource" in paid ?
                ` (${paid.amount} ${paid.resource})` :
                "uses" in paid ? ` (${paid.uses}/${paid.recharge === "long-rest" ? "long rest" : paid.recharge})` : "";
        const concentration = spell.duration.concentration ? " ©" : "";
        const ritual = spell.as === "always-prepared" ? "*" : "";

        return `${this.text(spell.name)}${ritual}${concentration}${payment}`;
    }

    private spells(): void
    {
        const sheet = this._sheet;
        if (sheet.spells.length === 0) { return; }
        this._canvas.title("Spells");
        for (let level = 0; level <= 9; level += 1)
        {
            const spells = sheet.spells
                .filter((s) => s.level === level)
                .sort((a, b) => this.text(a.name).localeCompare(this.text(b.name)));
            if (spells.length === 0) { continue; }
            const label = ORDINALS[level] ?? String(level);
            this._canvas.labelled(label, spells.map((s) => this.spellLabel(s)).join(", "), 11, 2, undefined, "dim");
        }
        this._canvas.line("  © concentration  * always prepared", "dim");
    }

    private features(): void
    {
        const sheet = this._sheet;
        if (sheet.features.length === 0) { return; }
        this._canvas.title("Features & traits");
        const origins = [...new Set(sheet.features.map((f) => f.origin))]
            .sort((a, b) => ORIGIN_ORDER.indexOf(a) - ORIGIN_ORDER.indexOf(b));
        for (const origin of origins)
        {
            const group = sheet.features.filter((f) => f.origin === origin);
            const owners = [...new Set(group.map((f) => f.owner))];
            const ownerNames = (origin === "class" || origin === "subclass" || origin === "species" ||
                origin === "subspecies" || origin === "background") ?
                ` — ${owners.map((o) => this.entityName(o)).join(", ")}` :
                "";
            this._canvas.line(`  ${ORIGIN_NAMES[origin] ?? capitalise(origin)}${ownerNames}`, "dim");
            const nameWidth = Math.max(...group.map((f) => stringWidth(this.text(f.name))));
            const room = this._canvas.width - 4 - nameWidth - 2 - 4;
            this._canvas.table(group.map((f) =>
            {
                const text = f.text ? this.text(f.text) : this.entityText(f.id);
                const level = f.level !== undefined ? `L${f.level}` : "";

                return [
                    { text: this.text(f.name), style: "bold" as const },
                    { text: level, style: "dim" as const, align: "right" as const },
                    { text: summary(text, room), style: "dim" as const }
                ];
            }), 4);
        }
    }

    private equipment(): void
    {
        const equipment = this._options.character.choices.equipment ?? [];
        if (equipment.length === 0) { return; }
        this._canvas.title("Equipment");
        this._canvas.table(equipment.map((entry) =>
        {
            const flags = [entry.equipped ? "equipped" : undefined, entry.attuned ? "attuned" : undefined]
                .filter((f) => f !== undefined)
                .join(", ");

            return [
                { text: this.entityName(entry.item), style: "bold" as const },
                { text: (entry.quantity ?? 1) > 1 ? `×${entry.quantity}` : "", align: "right" as const },
                { text: flags, style: "dim" as const }
            ];
        }));
    }

    private personality(): void
    {
        const choices = this._options.character.choices;
        const rows: [string, string][] = [];
        const p = choices.personality;
        if (p?.traits) { rows.push(["Traits", this.text(p.traits)]); }
        if (p?.ideals) { rows.push(["Ideals", this.text(p.ideals)]); }
        if (p?.bonds) { rows.push(["Bonds", this.text(p.bonds)]); }
        if (p?.flaws) { rows.push(["Flaws", this.text(p.flaws)]); }
        if (choices.appearance) { rows.push(["Appearance", this.text(choices.appearance)]); }
        if (rows.length === 0) { return; }
        this._canvas.title("Personality");
        for (const [label, text] of rows)
        {
            this._canvas.line(`  ${label}`, "dim");
            this._canvas.paragraph(text, 4);
        }
    }

    private conditions(): void
    {
        const state = this._options.character.state;
        const lines: string[] = [];
        const expiry = (e: { readonly expires?: unknown }): string =>
        {
            const x = e.expires as Record<string, unknown> | undefined;
            if (x === undefined) { return ""; }
            const [key, value] = Object.entries(x)[0] ?? ["", ""];

            return key === "manual" ? " (until removed)" : ` (${key} ${String(value).replace(/-/g, " ")})`;
        };
        for (const c of state.conditions)
        {
            const level = c.level !== undefined ? ` level ${c.level}` : "";
            lines.push(`${this.entityName(c.condition)}${level}${expiry(c)}`);
        }
        for (const t of state.toggles ?? []) { lines.push(`${words(t.state)} (on)${expiry(t)}`); }
        for (const s of state.activeSpells ?? [])
        {
            const concentrating = state.concentration?.spell === s.spell ? ", concentrating" : "";
            lines.push(`${this.entityName(s.spell)}${expiry(s)}${concentrating}`);
        }
        for (const e of state.customEffects ?? []) { lines.push(`${this.text(e.name)}${expiry(e)}`); }
        if (lines.length === 0) { return; }
        this._canvas.title("Conditions & effects");
        for (const line of lines) { this._canvas.line(`  ${line}`); }
    }

    private notes(): void
    {
        const notes = this._options.character.choices.notes;
        const open = this._sheet.choices.filter((c) => !c.answered);
        if (!notes && open.length === 0) { return; }
        this._canvas.title("Notes");
        if (notes) { this._canvas.paragraph(this.text(notes)); }
        if (open.length > 0)
        {
            this._canvas.line("  Choices still open", "dim");
            this._canvas.table(open.map((c) => [
                { text: `${this.entityName(c.owner)}: ${words(c.choice)}` },
                { text: `${c.answers.length} of ${c.count} ${c.of}(s)`, style: "dim" as const }
            ]), 4);
        }
    }

    private credits(): void
    {
        this._canvas.title("Credits");
        for (const manifest of this._options.packages.order)
        {
            this._canvas.line(`  ${this.text(manifest.name)} (${manifest.id} ${manifest.version})`, "bold");
            for (const source of manifest.sources)
            {
                const who = source.publisher ?? source.author;
                this._canvas.paragraph(`${source.title}${who ? `, ${who}` : ""} — ${source.license}. ${source.attribution}`, 4, "dim");
            }
        }
    }

    private warnings(): void
    {
        const warnings = this._sheet.warnings;
        if (warnings.length === 0) { return; }
        this._canvas.title("Warnings");
        for (const w of warnings) { this._canvas.paragraph(`${w.code}: ${w.message}`, 2, "warn"); }
    }

    public render(): string
    {
        const handlers: Record<string, () => void> = {
            identity: () => this.identity(),
            core: () => this.core(),
            abilities: () => this.abilities(),
            skills: () => this.skills(),
            senses: () => this.senses(),
            combat: () => this.combat(),
            attacks: () => this.attacks(),
            actions: () => this.actions(),
            resources: () => this.resources(),
            spellcasting: () => this.spellcasting(),
            spells: () => this.spells(),
            features: () => this.features(),
            equipment: () => this.equipment(),
            personality: () => this.personality(),
            conditions: () => this.conditions(),
            notes: () => this.notes(),
            credits: () => this.credits()
        };
        for (const section of this._sheet.sections) { handlers[section]?.(); }
        this.warnings();

        return this._canvas.toString();
    }
}

/** Render a computed sheet as text; `options.color` off gives the golden, plain form. */
export function renderSheet(sheet: ComputedSheet, options: RenderOptions): string
{
    return new SheetRenderer(sheet, options).render();
}

/** `dnd derive --explain <path>`: every contribution of one value, inactive ones included. */
export function renderExplanation(sheet: ComputedSheet, path: string, options: RenderOptions): string
{
    const value = sheet.values[path];
    const canvas = new Canvas(options.width ?? 100, options.color === true);
    if (value === undefined)
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
    const language = options.language ?? sheet.meta.language;
    const text = (label: Text): string => label[language] ?? label["en"] ?? Object.values(label)[0] ?? "";
    const rows: Cell[][] = value.provenance.map((c) =>
    {
        const shown = (c.kind === "set" || c.kind === "set-formula" || c.kind === "patch") ?
            `${c.kind} ${plain(c.value)}` :
            contributionText(c);
        const source = sourceLabel(c, options.packages.ruleset.id);
        const style: Style = c.applied ? "none" : "dim";

        return [
            { text: shown, align: "right", style: style },
            { text: text(c.label), style: style },
            { text: c.formula ? `= ${c.formula}` : "", style: "dim" },
            { text: `← ${source}${c.applied ? "" : "  (inactive)"}`, style: "dim" }
        ];
    });
    canvas.table(rows);

    return canvas.toString();
}
