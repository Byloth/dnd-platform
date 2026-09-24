/**
 * Sheet composer (docs/phase-1/03-sheet-composer.md): a computed sheet, the
 * character it was derived from and the package set it was derived with →
 * a *section tree*, plain data that every rendering of the sheet starts
 * from (the CLI text renderer, the web sheet, the print mode).
 *
 * Pure: no I/O, no framework. The composer computes nothing the engine did
 * not: it groups, labels, localises and attaches provenance. Every number
 * in the tree is a `DerivedValue` copied from the sheet or a count of
 * things in the sheet. Sections follow `sheet.sections`; a section with no
 * content has no blocks.
 */

import type { LocalizedString } from "@byloth/dnd-platform-schema";
import type { PackageSet } from "@byloth/dnd-platform-loader";
import type {
    ActionView, AttackView, Character, ComputedSheet, Condition, Contribution, DerivedValue, Provenance, SpellView
} from "@byloth/dnd-platform-engine";

import { firstSentence, newcomerWording } from "./explain.js";
import type { WordingContext } from "./explain.js";
import { createTranslate, SHEET_MESSAGES } from "./messages/index.js";
import type { Translate, TranslateParams } from "./messages/index.js";

export { SHEET_MESSAGES, createTranslate } from "./messages/index.js";
export { CONDITION_KEYS, conditionWords, firstSentence } from "./explain.js";
export type { WordingContext } from "./explain.js";
export type { SheetMessages, Translate, TranslateParams } from "./messages/index.js";

// ---- options ------------------------------------------------------------------------

/** What the tree is for: `build` (every section, explanations), `play` and `print` (the build tree until Phase 2). */
export type ComposeMode = "build" | "play" | "print";

/**
 * How much the tree explains (docs/phase-1/03-sheet-composer.md): *newcomer* fills a one-line summary for every
 * item and explains every value in words; *regular* is the sheet as the CLI prints it; *expert* explains every
 * value and adds its raw contributions.
 */
export type HelpLevel = "newcomer" | "regular" | "expert";

export interface ComposeOptions
{
    readonly character: Character;
    readonly packages: PackageSet;
    /** Language of every label; default the sheet's. */
    readonly language?: string;
    /**
     * The translation of the interface strings (`sheet.*` keys of `SHEET_MESSAGES`); default the composer's
     * own translator in `language`. A key the function does not know may come back unchanged.
     */
    readonly translate?: Translate;
    /** Default `build`. */
    readonly mode?: ComposeMode;
    /** Default `regular`, the level of the golden trees and of the CLI. */
    readonly helpLevel?: HelpLevel;
}

// ---- the tree -------------------------------------------------------------------------

export interface SectionTree
{
    readonly sections: readonly Section[];
    readonly warnings: readonly WarningItem[];
}
export interface Section
{
    readonly id: string;
    /** Localised title; empty for the identity section, which has none. */
    readonly title: string;
    /** For a section a package declares: how its author wants it rendered. */
    readonly layout?: "list" | "cards" | "table" | "text";
    readonly blocks: readonly Block[];
}
export interface WarningItem { readonly code: string, readonly message: string }

/** One line of an explanation: `+3  Dexterity modifier  ← srd51`. */
export interface ExplanationLine
{
    readonly shown: string;
    readonly label: string;
    readonly source: string;
    readonly formula?: string;
    readonly applied: boolean;
}
export interface Explanation
{
    /**
     * One sentence per applied contribution, for a newcomer ("Your Dexterity (16) gives +3."). Present in
     * `explain()` and in the newcomer and expert trees; the regular tree leaves it out.
     */
    readonly newcomer?: readonly string[];
    /** "Would apply if…" sentences for the inactive contributions; present with `newcomer`. */
    readonly notes?: readonly string[];
    /** The applied contributions, in the sheet's wording. */
    readonly regular: readonly ExplanationLine[];
    /** Every contribution, inactive ones included, with their formulas. */
    readonly expert: readonly ExplanationLine[];
    readonly provenance: Provenance;
}

export interface ValueItem
{
    readonly id: string;
    readonly label: string;
    readonly shown: string;
    readonly value?: DerivedValue;
    /** Present when the value has more than one applied contribution; for every value above the regular level. */
    readonly explain?: Explanation;
    /** Expert level: the applied contributions in one line ("16 Chain mail, +2 Shield"). */
    readonly raw?: string;
}
export interface ClassRef
{
    readonly id: string;
    readonly name: string;
    readonly levels: number;
    readonly subclass?: string;
}
export interface IdentityBlock
{
    readonly kind: "identity";
    readonly name: string;
    readonly level: number;
    /** `Feline (Puma)`, `Monk 3, Way of Shadow`, `Acolyte`, alignment: the non-empty ones. */
    readonly parts: readonly string[];
    readonly species?: string;
    readonly subspecies?: string;
    readonly classes: readonly ClassRef[];
    readonly background?: string;
    readonly alignment?: string;
    readonly ruleset: string;
    readonly packages: readonly { readonly id: string, readonly version: string }[];
}
export interface ValuesBlock { readonly kind: "values", readonly items: readonly ValueItem[] }
export interface AbilityRow
{
    readonly id: string;
    readonly name: string;
    readonly score: string;
    readonly modifier: string;
    readonly save: string;
    readonly proficient: boolean;
    readonly values: { readonly score?: DerivedValue, readonly modifier?: DerivedValue, readonly save?: DerivedValue };
}
export interface AbilitiesBlock { readonly kind: "abilities", readonly rows: readonly AbilityRow[] }
export interface SkillRow
{
    readonly id: string;
    readonly name: string;
    readonly ability: string;
    readonly mark: "untrained" | "proficient" | "expertise";
    readonly bonus: string;
    readonly value?: DerivedValue;
}
export interface ProficiencyGroup { readonly type: string, readonly label: string, readonly items: readonly string[] }
export interface SkillsBlock
{
    readonly kind: "skills";
    readonly rows: readonly SkillRow[];
    readonly proficiencies: readonly ProficiencyGroup[];
}
/** Short facts joined by the renderer (senses, passive scores). */
export interface TextBlock { readonly kind: "text", readonly items: readonly string[] }
export interface LabelledText { readonly label: string, readonly text: string }
export interface PairsBlock { readonly kind: "pairs", readonly rows: readonly LabelledText[] }
export interface AttackRow
{
    readonly id: string;
    readonly name: string;
    readonly toHit: string;
    readonly damage: string;
    readonly notes: readonly string[];
    readonly attack: AttackView;
}
export interface AttacksBlock { readonly kind: "attacks", readonly rows: readonly AttackRow[] }
export interface ActionItem
{
    readonly id: string;
    readonly name: string;
    readonly cost: string;
    readonly details: readonly string[];
    readonly available: boolean;
    readonly text?: string;
    /** Newcomer level: the first sentence of the text. */
    readonly summary?: string;
    readonly action: ActionView;
}
export interface ActionGroup
{
    readonly activation: string;
    readonly label: string;
    readonly items: readonly ActionItem[];
}
export interface ActionsBlock
{
    readonly kind: "actions";
    readonly groups: readonly ActionGroup[];
    /** The ruleset's base actions (Attack, Dash…), by name. */
    readonly base: readonly { readonly id: string, readonly name: string }[];
}
export interface ResourceItem
{
    readonly id: string;
    readonly name: string;
    readonly current: number | null;
    readonly max: number | string;
    readonly shownMax: string;
    /** True when the resource is small enough to show as pips. */
    readonly pips: boolean;
    readonly recharge: string;
    readonly explain?: Explanation;
}
export interface ResourcesBlock { readonly kind: "resources", readonly items: readonly ResourceItem[] }
export interface SlotItem { readonly label: string, readonly current: number, readonly max: number }
export interface CasterItem
{
    readonly id: string;
    readonly name: string;
    readonly ability: string;
    readonly parts: readonly string[];
    readonly known: readonly string[];
    readonly slots: readonly SlotItem[];
}
export interface SpellcastingBlock { readonly kind: "spellcasting", readonly casters: readonly CasterItem[] }
export interface SpellItem
{
    readonly id: string;
    readonly name: string;
    /** Name with its marks: `Bless* ©`, `Darkness (2 ki)`. */
    readonly label: string;
    /** Newcomer level: the first sentence of the spell's text. */
    readonly summary?: string;
    readonly spell: SpellView;
}
export interface SpellLevel { readonly level: number, readonly label: string, readonly items: readonly SpellItem[] }
export interface SpellsBlock
{
    readonly kind: "spells";
    readonly levels: readonly SpellLevel[];
}
export interface FeatureItem
{
    readonly id: string;
    readonly name: string;
    readonly level?: number;
    /** The full text; renderers summarise it. */
    readonly text: string;
    /** Newcomer level: the first sentence of the text. */
    readonly summary?: string;
}
export interface FeatureGroup
{
    readonly origin: string;
    readonly label: string;
    readonly items: readonly FeatureItem[];
}
export interface FeaturesBlock
{
    readonly kind: "features";
    readonly groups: readonly FeatureGroup[];
}
export interface EquipmentItem
{
    readonly id: string;
    readonly name: string;
    readonly quantity: number;
    readonly flags: readonly string[];
}
export interface EquipmentBlock { readonly kind: "equipment", readonly items: readonly EquipmentItem[] }
export interface PersonalityBlock { readonly kind: "personality", readonly fields: readonly LabelledText[] }
export interface ConditionsBlock { readonly kind: "conditions", readonly items: readonly string[] }
export interface NotesBlock
{
    readonly kind: "notes";
    readonly text?: string;
    readonly open: readonly { readonly key: string, readonly label: string, readonly progress: string }[];
}
export interface CreditItem
{
    readonly id: string;
    readonly version: string;
    readonly name: string;
    readonly sources: readonly { readonly title: string, readonly line: string }[];
}
export interface CreditsBlock { readonly kind: "credits", readonly packages: readonly CreditItem[] }
/** A reminder the content adds to a section (`add-text`), with the name of what adds it. */
export interface ReminderItem { readonly text: string, readonly source: string }
/** The reminders of a section, after its own blocks; the whole content of a section a package declares. */
export interface RemindersBlock { readonly kind: "reminders", readonly items: readonly ReminderItem[] }

export type Block =
    IdentityBlock | ValuesBlock | AbilitiesBlock | SkillsBlock | TextBlock | PairsBlock | AttacksBlock | ActionsBlock |
    ResourcesBlock | SpellcastingBlock | SpellsBlock | FeaturesBlock | EquipmentBlock | PersonalityBlock |
    ConditionsBlock | NotesBlock | CreditsBlock | RemindersBlock;

// ---- wording ------------------------------------------------------------------------

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const ACTIVATIONS = ["action", "bonus-action", "reaction", "free", "special"];
const ORIGIN_ORDER = [
    "species", "subspecies", "class", "subclass", "background", "feat", "item", "condition", "option", "spell", "custom"
];
const OWNED_ORIGINS = new Set(["class", "subclass", "species", "subspecies", "background"]);
/** Sections whose title the composer knows; the identity section has none. */
const TITLED_SECTIONS = new Set([
    "core", "abilities", "saves", "skills", "senses", "combat", "attacks", "actions", "resources", "spellcasting",
    "spells",
    "features", "equipment", "personality", "conditions", "notes", "credits"
]);

/** `+3`, `−1`; strings pass through. */
export function signed(value: number | string): string
{
    if (typeof value !== "number") { return value; }

    return value < 0 ? `−${-value}` : `+${value}`;
}

/** `15`, `−1`, `∞`; strings pass through. */
export function plain(value: number | string): string
{
    if (value === Infinity) { return "∞"; }

    return typeof value === "number" && value < 0 ? `−${-value}` : String(value);
}

export function capitalise(text: string): string
{
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `sleight-of-hand` → `Sleight of hand`. */
export function words(id: string): string
{
    return capitalise(id.replace(/-/g, " "));
}

const TYPE_SEGMENT = /^(feature|feat|item|class|subclass|species|background|condition|spell|rule|table)\./;

/** `package · entity` with the package prefix and the type segment dropped; the ruleset itself is just the package. */
export function sourceLabel(contribution: Contribution, rulesetId: string): string
{
    const { source } = contribution;
    const pkg = source.package;
    const ref = source.feature ?? source.entity;
    if (ref === undefined || ref === rulesetId) { return pkg; }
    const short = ref.startsWith(`${pkg}.`) ? ref.slice(pkg.length + 1) : ref;
    const typed = short.replace(TYPE_SEGMENT, "");

    return pkg === "" ? typed : `${pkg} · ${typed}`;
}

/** How a contribution reads in a provenance line: `10`, `+3`, `×2`, `≥16`, `≤20`, `=15`. */
export function contributionText(c: Contribution): string
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

// ---- the composer -----------------------------------------------------------------------

type Text = Readonly<Record<string, string | undefined>>;

/** A localized string in a language: that language, else English, else any; "" when absent. */
export function localize(label: Text | LocalizedString | undefined, language: string): string
{
    if (label === undefined) { return ""; }
    const map = label as Text;
    const any = Object.values(map).find((v) => v !== undefined);

    return map[language] ?? map["en"] ?? any ?? "";
}

/** What the wording reads from the entity or option behind a contribution. */
interface Origin
{
    readonly text?: Text;
    readonly effects?: readonly { readonly when?: Condition }[];
}

class Composer
{
    private readonly _language: string;
    private readonly _translate: Translate;
    private readonly _level: HelpLevel;

    public constructor(private readonly _sheet: ComputedSheet, private readonly _options: ComposeOptions)
    {
        this._language = _options.language ?? _sheet.meta.language;
        this._translate = _options.translate ?? createTranslate(this._language);
        this._level = _options.helpLevel ?? "regular";
    }

    // ---- the words of provenance ----

    /** The entity or inline option a contribution comes from, with its text and effects. */
    private origin(c: Contribution): Origin | undefined
    {
        const id = c.source.feature ?? c.source.entity;
        if (id === undefined) { return undefined; }

        const entities = this._options.packages.entities;
        const direct = entities.get(id)?.data;
        if (direct !== undefined) { return direct as never; }

        // An option of a choice is not an entity: look for it inside the entity that offers it.
        const search = (node: unknown): unknown =>
        {
            if (Array.isArray(node)) { return node.map(search).find((n) => n !== undefined); }
            if (typeof node !== "object" || node === null) { return undefined; }
            if ((node as { id?: unknown }).id === id) { return node; }

            return Object.values(node).map(search)
                .find((n) => n !== undefined);
        };

        return (c.source.entity ? search(entities.get(c.source.entity)?.data) : undefined) as never;
    }

    private fromRuleset(c: Contribution): boolean
    {
        const entity = c.source.entity;

        return entity === undefined || entity === this._options.packages.ruleset.id;
    }

    private wording(): WordingContext
    {
        const english = SHEET_MESSAGES["en"]!.sheet.abilities as Record<string, string>;
        const modifierOf = new Map(Object.entries(english).map(([id, name]) => [`${name} modifier`, id]));

        return {
            t: (key, params, fallback) => this.t(key, params, fallback),
            name: (id) => this.entityName(id),
            label: (c) => this.text(c.label),
            abilityOf: (c) => (this.fromRuleset(c) ? modifierOf.get((c.label as Text)["en"] ?? "") : undefined),
            score: (ability) => this.number(`ability.${ability}`),
            rule: (c) =>
            {
                const text = this.origin(c)?.text;

                return text ? firstSentence(this.text(text)) || undefined : undefined;
            },
            condition: (c) =>
            {
                const index = c.source.effectIndex;

                return index !== undefined ? this.origin(c)?.effects?.[index]?.when : undefined;
            },
            fromRuleset: (c) => this.fromRuleset(c)
        };
    }

    /** Whether the tree carries the full explanations (newcomer sentences) and explains every value. */
    private get explainsAll(): boolean { return this._level !== "regular"; }

    /** An interface string; `fallback` when the translation does not know the key. */
    private t(key: string, params?: TranslateParams, fallback?: string): string
    {
        const text = this._translate(`sheet.${key}`, params);

        return (text === `sheet.${key}` && fallback !== undefined) ? fallback : text;
    }

    private abilityName(ability: string): string
    {
        return ABILITIES.includes(ability) ? this.t(`abilities.${ability}`) : ability.toUpperCase();
    }

    private skillName(skill: string): string
    {
        return this.t(`skills.${skill}`, undefined, words(skill));
    }

    private feet(value: number | string): string
    {
        return this.t("units.feet", { value: value });
    }

    // ---- lookups ----

    private text(label: Text | LocalizedString | undefined): string
    {
        return localize(label, this._language);
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

    private line(c: Contribution): ExplanationLine
    {
        return {
            shown: contributionText(c),
            label: this.text(c.label),
            source: sourceLabel(c, this._options.packages.ruleset.id),
            ...(c.formula !== undefined ? { formula: c.formula } : {}),
            applied: c.applied
        };
    }

    public explanation(value: DerivedValue, full = true): Explanation
    {
        const expert = value.provenance.map((c) =>
        {
            const line = this.line(c);
            const shown = (c.kind === "set" || c.kind === "set-formula" || c.kind === "patch") ?
                `${c.kind} ${plain(c.value)}` :
                line.shown;

            return { ...line, shown: shown };
        });

        const wording = full ? newcomerWording(value.provenance, this.wording()) : undefined;

        return {
            ...(wording ? { newcomer: wording.newcomer, notes: wording.notes } : {}),
            regular: value.provenance.filter((c) => c.applied).map((c) => this.line(c)),
            expert: expert,
            provenance: value.provenance
        };
    }

    /** The explanation of a value worth showing: more than one applied contribution. */
    private explainIf(
        value: DerivedValue | undefined,
        when: (applied: readonly Contribution[]) => boolean
    ): Explanation | undefined
    {
        if (value === undefined) { return undefined; }
        if (this.explainsAll) { return this.explanation(value); }
        const applied = value.provenance.filter((c) => c.applied);

        return when(applied) ? this.explanation(value, false) : undefined;
    }

    /** The first sentence of a text, above the regular level. */
    private summary(text: string | undefined): { summary: string } | Record<string, never>
    {
        if (this._level !== "newcomer" || !text) { return {}; }
        const sentence = firstSentence(text);

        return sentence === "" ? {} : { summary: sentence };
    }

    private valueItem(id: string, label: string, path: string, shown: string): ValueItem
    {
        const value = this.value(path);
        const explanation = this.explainIf(value, (applied) => applied.length > 1);

        const raw = (this._level === "expert" && explanation) ?
            explanation.regular.map((l) => `${l.shown} ${l.label}`).join(", ") :
            undefined;

        return {
            id: id,
            label: label,
            shown: shown,
            ...(value ? { value: value } : {}),
            ...(explanation ? { explain: explanation } : {}),
            ...(raw ? { raw: raw } : {})
        };
    }

    // ---- sections ----

    private identity(): Block[]
    {
        const sheet = this._sheet;
        const choices = this._options.character.choices;
        const subspecies = choices.subspecies ? `(${this.entityName(choices.subspecies)})` : "";
        const species = [this.entityName(choices.species), subspecies].filter((s) => s !== "").join(" ");
        const classes = sheet.classes.map((c) => ({
            id: c.class,
            name: this.entityName(c.class),
            levels: c.levels,
            ...(c.subclass ? { subclass: this.entityName(c.subclass) } : {})
        }));
        const classParts = classes.map((c) => `${c.name} ${c.levels}${c.subclass ? `, ${c.subclass}` : ""}`);
        const background = this.entityName(choices.background);
        const parts = [species, ...classParts, background, choices.alignment ?? ""].filter((p) => p !== "");

        return [{
            kind: "identity",
            name: sheet.meta.name,
            level: sheet.level,
            parts: parts,
            ...(choices.species ? { species: this.entityName(choices.species) } : {}),
            ...(choices.subspecies ? { subspecies: this.entityName(choices.subspecies) } : {}),
            classes: classes,
            ...(choices.background ? { background: background } : {}),
            ...(choices.alignment ? { alignment: choices.alignment } : {}),
            ruleset: sheet.meta.ruleset,
            packages: sheet.meta.packages.map((p) => ({ id: p.id, version: p.version }))
        }];
    }

    private core(): Block[]
    {
        const sheet = this._sheet;
        const state = this._options.character.state;
        const items: ValueItem[] = [];
        items.push(this.valueItem("ac", this.t("core.ac"), "ac", plain(this.number("ac"))));
        const initiative = signed(this.number("initiative"));
        items.push(this.valueItem("initiative", this.t("core.initiative"), "initiative", initiative));
        const speeds = Object.keys(sheet.values)
            .filter((p) => p.startsWith("speed.") && this.number(p) > 0)
            .sort((a, b) => (a === "speed.walk" ? -1 : b === "speed.walk" ? 1 : a.localeCompare(b)))
            .map((p) => (p === "speed.walk" ?
                this.feet(this.number(p)) :
                this.t("core.speedOther", { type: p.slice(6), value: this.number(p) })));
        items.push(this.valueItem("speed", this.t("core.speed"), "speed.walk", speeds.join(", ")));
        const temporary = state.hp.temporary > 0 ? ` (${this.t("core.temporary", { value: state.hp.temporary })})` : "";
        const hp = `${state.hp.current} / ${this.number("hp.max")}${temporary}`;
        items.push(this.valueItem("hp", this.t("core.hp"), "hp.max", hp));
        const dice = sheet.play.hitDice.map((d) => `${d.total}d${d.die}`).join(" + ");
        const spent = state.hitDice.spent > 0 ? ` (${this.t("core.spent", { count: state.hitDice.spent })})` : "";
        items.push({ id: "hit-dice", label: this.t("core.hitDice"), shown: `${dice}${spent}` });
        const proficiency = signed(this.number("proficiencyBonus"));
        items.push(this.valueItem("proficiency", this.t("core.proficiency"), "proficiencyBonus", proficiency));
        const perception = this.value("passive.perception");
        if (perception)
        {
            const label = this.t("core.passivePerception");
            // The regular tree shows it unexplained, as the CLI always has; the other levels explain every value.
            items.push(this.explainsAll ?
                this.valueItem("passive-perception", label, "passive.perception", plain(perception.value)) :
                { id: "passive-perception", label: label, shown: plain(perception.value), value: perception });
        }
        if (state.inspiration)
        {
            items.push({ id: "inspiration", label: this.t("core.inspiration"), shown: this.t("core.yes") });
        }

        return [{ kind: "values", items: items }];
    }

    private abilities(): Block[]
    {
        const proficient = new Set(this._sheet.proficiencies.filter((p) => p.type === "save").map((p) => p.item));
        const rows: AbilityRow[] = this._options.packages.ruleset.abilities.map((ability) =>
        {
            const score = this.value(`ability.${ability}`);
            const modifier = this.value(`mod.${ability}`);
            const save = this.value(`save.${ability}`);

            return {
                id: ability,
                name: this.abilityName(ability),
                score: plain(this.number(`ability.${ability}`)),
                modifier: signed(this.number(`mod.${ability}`)),
                save: signed(this.number(`save.${ability}`)),
                proficient: proficient.has(ability),
                values: {
                    ...(score ? { score: score } : {}),
                    ...(modifier ? { modifier: modifier } : {}),
                    ...(save ? { save: save } : {})
                }
            };
        });

        return [{ kind: "abilities", rows: rows }];
    }

    private skills(): Block[]
    {
        const skillProficiencies = this._sheet.proficiencies.filter((p) => p.type === "skill");
        const held = new Map(skillProficiencies.map((p) => [p.item, p.expertise]));
        const rows: SkillRow[] = this._options.packages.ruleset.skills.map((skill) =>
        {
            const value = this.value(`skill.${skill.id}`);
            const mark = held.has(skill.id) ? (held.get(skill.id) ? "expertise" : "proficient") : "untrained";

            return {
                id: skill.id,
                name: this.skillName(skill.id),
                ability: skill.ability.toUpperCase(),
                mark: mark,
                bonus: signed(value?.value ?? 0),
                ...(value ? { value: value } : {})
            };
        });
        const proficiencies: ProficiencyGroup[] = [];
        for (const type of ["armor", "weapon", "tool", "language"])
        {
            const items = this._sheet.proficiencies.filter((p) => p.type === type).map((p) => words(p.item));
            if (items.length === 0) { continue; }
            proficiencies.push({ type: type, label: this.t(`proficiencies.${type}`), items: items });
        }

        return [{ kind: "skills", rows: rows, proficiencies: proficiencies }];
    }

    private senses(): Block[]
    {
        const parts: string[] = [];
        for (const path of Object.keys(this._sheet.values).filter((p) => p.startsWith("sense."))
            .sort())
        {
            const value = this.number(path);
            if (value > 0) { parts.push(this.t("senses.sense", { name: words(path.slice(6)), value: value })); }
        }
        for (const skill of ["perception", "investigation", "insight"])
        {
            const value = this.value(`passive.${skill}`);
            if (!value) { continue; }
            parts.push(this.t("senses.passive", { skill: this.skillName(skill), value: plain(value.value) }));
        }

        return parts.length === 0 ? [] : [{ kind: "text", items: parts }];
    }

    private combat(): Block[]
    {
        const sheet = this._sheet;
        const rows: { label: string, text: string }[] = [];
        const perAction = this.number("attacks.perAction", 1);
        if (perAction > 1) { rows.push({ label: this.t("combat.attacksPerAction"), text: String(perAction) }); }
        for (const defense of sheet.defenses)
        {
            const fallback = capitalise(defense.defense.replace("-", " "));
            const label = this.t(`combat.defenses.${defense.defense}`, undefined, fallback);
            rows.push({ label: label, text: defense.to.map(words).join(", ") });
        }
        for (const modifier of sheet.rollModifiers.filter((m) => m.applied))
        {
            const on = modifier.on;
            const against = on.against ?
                this.t("combat.against", { list: on.against.map(words).join(", ") }) :
                undefined;
            const skill = on.skill ? this.skillName(on.skill) : undefined;
            const target = [on.type, on.ability?.toUpperCase(), skill, against]
                .filter((s) => s !== undefined)
                .join(" ");
            const note = modifier.note ? ` (${this.text(modifier.note)})` : "";
            const label = this.t(`combat.modifiers.${modifier.kind}`, undefined, capitalise(modifier.kind));
            rows.push({ label: label, text: `${this.t("combat.on", { target: target })}${note}` });
        }
        const carry = this.value("carry.capacity");
        if (carry)
        {
            const weight = this.t("units.pounds", { value: plain(carry.value) });
            rows.push({ label: this.t("combat.carrying"), text: weight });
        }

        return rows.length === 0 ? [] : [{ kind: "pairs", rows: rows }];
    }

    private attacks(): Block[]
    {
        const rows: AttackRow[] = this._sheet.attacks.map((attack) =>
        {
            const notes = [
                this.t(attack.ranged ? "attacks.ranged" : "attacks.melee"),
                attack.ability.toUpperCase(),
                attack.magical ? this.t("attacks.magical") : undefined,
                attack.critRange < 20 ? this.t("attacks.crit", { range: attack.critRange }) : undefined,
                ...attack.extraDamage.map((x) =>
                    `+${x.dice ?? x.formula ?? ""}${x.damageType ? ` ${x.damageType}` : ""}`)

            ].filter((n) => n !== undefined);

            return {
                id: attack.id,
                name: this.text(attack.name),
                toHit: signed(attack.attackBonus.value),
                damage: `${attack.damage} ${attack.damageType}`,
                notes: notes,
                attack: attack
            };
        });

        return rows.length === 0 ? [] : [{ kind: "attacks", rows: rows }];
    }

    private actionItem(action: ActionView): ActionItem
    {
        const cost = action.cost
            .map((c) => "amount" in c ?
                this.t("actions.resourceCost", { amount: c.amount, resource: c.resource }) :
                this.t("actions.slotCost", { level: c.level }))
            .join(" + ");
        const details: string[] = [];
        if (action.requires?.afterAction)
        {
            details.push(this.t("actions.after", { action: words(action.requires.afterAction) }));
        }
        if (action.dc) { details.push(this.t("actions.dc", { value: plain(action.dc.value) })); }
        for (const roll of action.rolls ?? [])
        {
            if (roll.type === "attack" && roll.bonus)
            {
                details.push(this.t("actions.attack", { value: signed(roll.bonus.value) }));
            }
            else if (roll.type === "damage")
            {
                const bonus = roll.bonus && roll.bonus.value !== 0 ? ` ${signed(roll.bonus.value)}` : "";
                const dice = (roll.dice ?? "").replace(/table\(([^)]+)\)/g, (_m, id: string) =>
                    this.t("actions.die", { name: words(id.split(".").pop() ?? id).toLowerCase() }));
                details.push(`${dice}${bonus}${roll.damageType ? ` ${roll.damageType}` : ""}`.trim());
            }
            else if (roll.type === "save" && roll.dc)
            {
                details.push(this.t("actions.saveDc", { value: plain(roll.dc.value) }));
            }
        }
        if (action.toggle) { details.push(this.t("actions.toggles", { state: words(action.toggle) })); }

        return {
            id: action.id,
            name: this.text(action.name),
            cost: cost,
            details: details,
            available: action.available,
            ...(action.text ? { text: this.text(action.text) } : {}),
            ...this.summary(action.text ? this.text(action.text) : undefined),
            action: action
        };
    }

    private actions(): Block[]
    {
        const sheet = this._sheet;
        if (sheet.actions.length === 0) { return []; }
        const base = sheet.actions
            .filter((a) => a.source.entity?.includes(".rule.") && a.cost.length === 0 && !a.rolls);
        const granted = sheet.actions.filter((a) => !base.includes(a));
        const groups: { activation: string, label: string, items: ActionItem[] }[] = [];
        for (const activation of ACTIVATIONS)
        {
            const group = granted.filter((a) => a.activation === activation);
            if (group.length === 0) { continue; }
            groups.push({
                activation: activation,
                label: this.t(`activations.${activation}`),
                items: group.map((a) => this.actionItem(a))
            });
        }

        return [{ kind: "actions", groups: groups, base: base.map((a) => ({ id: a.id, name: this.text(a.name) })) }];
    }

    private resources(): Block[]
    {
        const items: ResourceItem[] = this._sheet.resources.map((resource) =>
        {
            const max = resource.max.value;
            const current = resource.current ?? (typeof max === "number" ? max : null);
            const recharge = resource.recharge.map((r) =>
            {
                const amount = r.amount === "full" ? this.t("resources.all") : String(r.amount);
                const on = r.on === "short-rest" ?
                    this.t("resources.shortRest") :
                    r.on === "long-rest" ? this.t("resources.longRest") : r.on;

                return this.t("resources.on", { amount: amount, rest: on });
            }).join(", ");
            // The declared maximum alone is not worth explaining; modifiers to it are.
            const modifiers = (applied: readonly Contribution[]): number =>
                applied.filter((c) => c.kind !== "base").length;
            const explanation = this.explainIf(resource.max, (applied) => modifiers(applied) > 1);

            return {
                id: resource.id,
                name: this.text(resource.name),
                current: current,
                max: max,
                shownMax: plain(max),
                pips: typeof max === "number" && resource.display === "pips" && max <= 12 && current !== null,
                recharge: recharge === "" ? "" : this.t("resources.regains", { list: recharge }),
                ...(explanation ? { explain: explanation } : {})
            };
        });

        return items.length === 0 ? [] : [{ kind: "resources", items: items }];
    }

    private spellcasting(): Block[]
    {
        const state = this._options.character.state;
        const casters: CasterItem[] = this._sheet.spellcasting.map((casting) =>
        {
            const parts = [
                this.t("spellcasting.saveDc", { value: plain(casting.dc.value) }),
                this.t("spellcasting.spellAttack", { value: signed(casting.attackBonus.value) }),
                this.t("spellcasting.preparation", { type: casting.preparation }),
                casting.ritual ? this.t("spellcasting.ritual") : undefined

            ].filter((p) => p !== undefined);
            const known = [
                casting.cantripsKnown !== undefined ?
                    this.t("spellcasting.cantrips", { count: casting.cantripsKnown }) :
                    undefined,
                casting.spellsKnown !== undefined ?
                    this.t("spellcasting.known", { count: casting.spellsKnown }) :
                    undefined

            ].filter((p) => p !== undefined);
            const slots: SlotItem[] = casting.slots.map((slot) => ({
                label: this.t(`slotLevels.${slot.level}`, undefined, String(slot.level)),
                current: state.spellSlots?.[String(slot.level)] ?? slot.max,
                max: slot.max
            }));
            if (casting.pact)
            {
                slots.push({
                    label: this.t("spellcasting.pact", { level: casting.pact.level }),
                    current: state.spellSlots?.["pact"] ?? casting.pact.slots,
                    max: casting.pact.slots
                });
            }

            return {
                id: casting.class,
                name: this.entityName(casting.class),
                ability: ABILITIES.includes(casting.ability) ? this.abilityName(casting.ability) : casting.ability,
                parts: parts,
                known: known,
                slots: slots
            };
        });

        return casters.length === 0 ? [] : [{ kind: "spellcasting", casters: casters }];
    }

    private spellLabel(spell: SpellView): string
    {
        const paid = spell.paidWith;
        const recharge = (r: string): string => (r === "long-rest" ? this.t("spells.longRest") : r);
        const payment = "free" in paid ?
            (spell.level > 0 ? ` (${this.t("spells.atWill")})` : "") :
            "resource" in paid ?
                ` (${this.t("actions.resourceCost", { amount: paid.amount, resource: paid.resource })})` :
                "uses" in paid ?
                    ` (${this.t("spells.uses", { uses: paid.uses, recharge: recharge(paid.recharge) })})` :
                    "";
        const concentration = spell.duration.concentration ? " ©" : "";
        const ritual = spell.as === "always-prepared" ? "*" : "";

        return `${this.text(spell.name)}${ritual}${concentration}${payment}`;
    }

    private spells(): Block[]
    {
        const sheet = this._sheet;
        if (sheet.spells.length === 0) { return []; }
        const levels: { level: number, label: string, items: SpellItem[] }[] = [];
        for (let level = 0; level <= 9; level += 1)
        {
            const spells = sheet.spells
                .filter((s) => s.level === level)
                .sort((a, b) => this.text(a.name).localeCompare(this.text(b.name)));
            if (spells.length === 0) { continue; }
            levels.push({
                level: level,
                label: this.t(`spellLevels.${level}`, undefined, String(level)),
                items: spells.map((s) => ({
                    id: s.id,
                    name: this.text(s.name),
                    label: this.spellLabel(s),
                    ...this.summary(this.entityText(s.id)),
                    spell: s
                }))
            });
        }

        return [{ kind: "spells", levels: levels }];
    }

    private features(): Block[]
    {
        const sheet = this._sheet;
        if (sheet.features.length === 0) { return []; }
        const origins = [...new Set(sheet.features.map((f) => f.origin))]
            .sort((a, b) => ORIGIN_ORDER.indexOf(a) - ORIGIN_ORDER.indexOf(b));
        const groups: FeaturesBlock["groups"] = origins.map((origin) =>
        {
            const group = sheet.features.filter((f) => f.origin === origin);
            const owners = [...new Set(group.map((f) => f.owner))];
            const ownerList = owners.map((o) => this.entityName(o)).join(", ");
            const ownerNames = OWNED_ORIGINS.has(origin) ? ` — ${ownerList}` : "";

            return {
                origin: origin,
                label: `${this.t(`origins.${origin}`, undefined, capitalise(origin))}${ownerNames}`,
                items: group.map((f) =>
                {
                    const text = f.text ? this.text(f.text) : this.entityText(f.id);

                    return {
                        id: f.id,
                        name: this.text(f.name),
                        ...(f.level !== undefined ? { level: f.level } : {}),
                        text: text,
                        ...this.summary(text)
                    };
                })
            };
        });

        return [{ kind: "features", groups: groups }];
    }

    private equipment(): Block[]
    {
        const equipment = this._options.character.choices.equipment ?? [];
        if (equipment.length === 0) { return []; }
        const items: EquipmentItem[] = equipment.map((entry) => ({
            id: entry.item,
            name: this.entityName(entry.item),
            quantity: entry.quantity ?? 1,
            flags: [
                entry.equipped ? this.t("equipment.equipped") : undefined,
                entry.attuned ? this.t("equipment.attuned") : undefined
            ]
                .filter((f) => f !== undefined)
        }));

        return [{ kind: "equipment", items: items }];
    }

    private personality(): Block[]
    {
        const choices = this._options.character.choices;
        const fields: { label: string, text: string }[] = [];
        const p = choices.personality;
        if (p?.traits) { fields.push({ label: this.t("personality.traits"), text: this.text(p.traits) }); }
        if (p?.ideals) { fields.push({ label: this.t("personality.ideals"), text: this.text(p.ideals) }); }
        if (p?.bonds) { fields.push({ label: this.t("personality.bonds"), text: this.text(p.bonds) }); }
        if (p?.flaws) { fields.push({ label: this.t("personality.flaws"), text: this.text(p.flaws) }); }
        if (choices.appearance)
        {
            fields.push({ label: this.t("personality.appearance"), text: this.text(choices.appearance) });
        }

        return fields.length === 0 ? [] : [{ kind: "personality", fields: fields }];
    }

    private conditions(): Block[]
    {
        const state = this._options.character.state;
        const items: string[] = [];
        const expiry = (e: { readonly expires?: unknown }): string =>
        {
            const x = e.expires as Record<string, unknown> | undefined;
            if (x === undefined) { return ""; }
            const [key, value] = Object.entries(x)[0] ?? ["", ""];

            return key === "manual" ?
                ` (${this.t("conditions.untilRemoved")})` :
                ` (${key} ${String(value).replace(/-/g, " ")})`;
        };
        for (const c of state.conditions)
        {
            const level = c.level !== undefined ? ` ${this.t("conditions.level", { level: c.level })}` : "";
            items.push(`${this.entityName(c.condition)}${level}${expiry(c)}`);
        }
        for (const t of state.toggles ?? [])
        {
            items.push(`${words(t.state)} (${this.t("conditions.on")})${expiry(t)}`);
        }
        for (const s of state.activeSpells ?? [])
        {
            const concentrating = state.concentration?.spell === s.spell ?
                `, ${this.t("conditions.concentrating")}` :
                "";
            items.push(`${this.entityName(s.spell)}${expiry(s)}${concentrating}`);
        }
        for (const e of state.customEffects ?? []) { items.push(`${this.text(e.name)}${expiry(e)}`); }

        return items.length === 0 ? [] : [{ kind: "conditions", items: items }];
    }

    private notes(): Block[]
    {
        const notes = this._options.character.choices.notes;
        const open = this._sheet.choices.filter((c) => !c.answered);
        if (!notes && open.length === 0) { return []; }

        return [{
            kind: "notes",
            ...(notes ? { text: this.text(notes) } : {}),
            open: open.map((c) => ({
                key: c.key,
                label: `${this.entityName(c.owner)}: ${words(c.choice)}`,
                progress: this.t("notes.progress", { answered: c.answers.length, count: c.count, of: c.of })
            }))
        }];
    }

    private credits(): Block[]
    {
        const packages: CreditItem[] = this._options.packages.order.map((manifest) => ({
            id: manifest.id,
            version: manifest.version,
            name: this.text(manifest.name),
            sources: manifest.sources.map((source) =>
            {
                const who = source.publisher ?? source.author;

                const line = `${source.title}${who ? `, ${who}` : ""} — ${source.license}. ${source.attribution}`;

                return { title: source.title, line: line };
            })
        }));

        return [{ kind: "credits", packages: packages }];
    }

    private reminders(section: string): Block[]
    {
        const items: ReminderItem[] = (this._sheet.texts ?? [])
            .filter((t) => t.section === section)
            .map((t) => ({
                text: this.text(t.text),
                source: this.entityName(t.source.feature ?? t.source.entity) || t.source.package
            }));

        return items.length === 0 ? [] : [{ kind: "reminders", items: items }];
    }

    public compose(): SectionTree
    {
        const handlers: Record<string, () => Block[]> = {
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
        const declared = new Map((this._sheet.customSections ?? []).map((s) => [s.id, s]));
        const sections: Section[] = this._sheet.sections.map((id) =>
        {
            const custom = declared.get(id);
            const title = custom ?
                this.text(custom.name) :
                TITLED_SECTIONS.has(id) ? this.t(`sections.${id}`) : (id === "identity" ? "" : words(id));

            return {
                id: id,
                title: title,
                ...(custom?.layout ? { layout: custom.layout } : {}),
                blocks: [...(handlers[id]?.() ?? []), ...this.reminders(id)]
            };
        });

        return {
            sections: sections,
            warnings: this._sheet.warnings.map((w) => ({ code: w.code, message: w.message }))
        };
    }
}

/** Compose the section tree of a computed sheet. */
export function compose(sheet: ComputedSheet, options: ComposeOptions): SectionTree
{
    return new Composer(sheet, options).compose();
}

/** The explanation of one derived value (a row's score, save or bonus), every view included. */
export function explainValue(sheet: ComputedSheet, value: DerivedValue, options: ComposeOptions): Explanation
{
    return new Composer(sheet, options).explanation(value);
}

/** The explanation of one value path, inactive contributions included; `undefined` when the path has no value. */
export function explain(sheet: ComputedSheet, path: string, options: ComposeOptions): Explanation | undefined
{
    const value = sheet.values[path];

    return value === undefined ? undefined : new Composer(sheet, options).explanation(value);
}
