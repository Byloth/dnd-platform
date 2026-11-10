/**
 * An entry of the compendium (docs/phase-1/13-compendium.md): a spell, an item or a condition as display strings,
 * in the order and the wording of the manuals ("3rd-level evocation", "Casting Time 1 action"; "Invocazione di 3°
 * livello", "Tempo di lancio 1 azione"). The content's texts are shown as they are; the composer writes the labels,
 * the numbers and the distances in the chosen units. A creature is `composeCreature`'s.
 */

import type { PackageSet } from "@byloth/dnd-platform-loader";

import { DisplayComposer } from "./display.js";
import type { DisplayOptions, Text, Value } from "./display.js";
import type { StatBlockLine } from "./creature.js";

export interface EntrySection { readonly title: string, readonly text: string }
export interface EntryView
{
    readonly kind: "spell" | "item" | "condition" | "species" | "class" | "background" | "archetype";
    readonly name: string;
    /** "3rd-level evocation", "Martial weapon", "Weapon (any sword), rare (requires attunement)". */
    readonly subtitle: string;
    /** The facts the entity has, labelled: casting time, range…; cost, weight, damage… */
    readonly lines: readonly StatBlockLine[];
    /** Markdown. */
    readonly text: string;
    /** "At Higher Levels", "Contents". */
    readonly sections: readonly EntrySection[];
    /** A spell's classes, by name. */
    readonly classes?: readonly string[];
    /**
     * A species', class' or background's few key facts, short enough for a chip on the wizard's cards ("+2
     * Constitution", "Darkvision 60 ft", "Hit die d10"); docs/phase-1/14-wizard-steps-revision.md.
     */
    readonly facts?: readonly string[];
}
export type EntryOptions = DisplayOptions;

interface SpellData
{
    readonly name: Text;
    readonly text?: Text;
    readonly level: number;
    readonly school: string;
    readonly castingTime: {
        readonly activation: string;
        readonly minutes?: number;
        readonly hours?: number;
        readonly trigger?: Text;
    };
    readonly range: { readonly type: string, readonly distance?: number };
    readonly area?: {
        readonly shape: string;
        readonly radius?: number;
        readonly size?: number;
        readonly length?: number;
    };
    readonly components: { readonly v: boolean, readonly s: boolean, readonly m: boolean | Text };
    readonly duration: {
        readonly type: string;
        readonly rounds?: number;
        readonly minutes?: number;
        readonly hours?: number;
        readonly days?: number;
        readonly concentration?: boolean;
    };
    readonly ritual?: boolean;
    readonly higherLevel?: Text;
}
interface ItemData
{
    readonly name: Text;
    readonly text?: Text;
    readonly type?: string;
    readonly category?: string;
    readonly cost?: { readonly amount: number, readonly currency: string };
    readonly weight?: number;
    readonly contents?: readonly { readonly item: string, readonly quantity?: number }[];
    readonly damage?: string;
    readonly damageType?: string;
    readonly properties?: readonly string[];
    readonly versatile?: string;
    readonly range?: { readonly normal: number, readonly long: number };
    readonly ac?: {
        readonly base?: number;
        readonly dexMax?: number;
        readonly bonus?: number;
        readonly addDex?: boolean;
    };
    readonly strengthMin?: number;
    readonly stealthDisadvantage?: boolean;
    readonly magical?: boolean;
    readonly rarity?: string;
    readonly attunement?: boolean | { readonly by: Text };
    readonly charges?: { readonly max: Value };
}
interface ConditionData { readonly name: Text, readonly text?: Text }

type ProficiencyList = readonly string[] | { readonly choose: number, readonly from: readonly string[] };
interface ProficiencyGrants
{
    readonly armor?: ProficiencyList;
    readonly weapons?: ProficiencyList;
    readonly tools?: ProficiencyList;
    readonly skills?: ProficiencyList;
    readonly savingThrows?: ProficiencyList;
}
interface LanguageGrant { readonly fixed?: readonly string[], readonly choose?: number }
interface EffectData
{
    readonly kind: string;
    readonly target?: string;
    readonly op?: string;
    readonly value?: unknown;
}
interface FeatureData { readonly name?: Text, readonly text?: Text, readonly effects?: readonly EffectData[] }
interface SpeciesData
{
    readonly name: Text;
    readonly text?: Text;
    readonly size?: string;
    readonly speed?: Readonly<Record<string, number | undefined>>;
    readonly languages?: LanguageGrant;
    readonly features?: readonly (FeatureData | string)[];
}
interface ClassData
{
    readonly name: Text;
    readonly text?: Text;
    readonly hitDie: number;
    readonly primaryAbilities?: readonly string[];
    readonly savingThrows?: readonly string[];
    readonly proficiencies?: ProficiencyGrants;
    readonly levels?: Readonly<Record<string, { readonly features?: readonly (FeatureData | string)[] } | undefined>>;
}
interface BackgroundData
{
    readonly name: Text;
    readonly text?: Text;
    readonly proficiencies?: ProficiencyGrants;
    readonly languages?: LanguageGrant;
    readonly equipment?: { readonly text?: Text };
    readonly features?: readonly (FeatureData | string)[];
}

const ABILITIES = new Set(["str", "dex", "con", "int", "wis", "cha"]);

/** The SRD's type line of a magic item is its text's first paragraph: short, one line. */
const TYPE_LINE_MAX = 120;

/** The classes whose spellcasting draws from each spell list, per package set. */
const _listClasses = new WeakMap<PackageSet, Map<string, string[]>>();

function listClasses(set: PackageSet): Map<string, string[]>
{
    let map = _listClasses.get(set);
    if (map) { return map; }

    map = new Map();
    const visit = (node: unknown, owner: string): void =>
    {
        if (Array.isArray(node))
        {
            node.forEach((n) => visit(n, owner));

            return;
        }
        if ((typeof node !== "object") || (node === null)) { return; }
        for (const [key, value] of Object.entries(node))
        {
            const isList = (key === "list") && (typeof value === "string") &&
                (set.entities.get(value as never)?.type === "spell-list");
            if (isList)
            {
                const classes = map!.get(value as string) ?? [];
                if (!classes.includes(owner)) { classes.push(owner); }
                map!.set(value as string, classes);
            }
            else { visit(value, owner); }
        }
    };
    for (const entity of set.entities.values())
    {
        if ((entity.type === "class") && entity.active) { visit(entity.data, entity.id); }
    }
    _listClasses.set(set, map);

    return map;
}

const _spellClasses = new WeakMap<PackageSet, Map<string, string[]>>();

/**
 * The classes that can cast each spell, by id: those whose spellcasting draws from a list holding it. A list no
 * class uses stands for itself (its id), so a homebrew list is not lost.
 */
export function spellClassIds(set: PackageSet): ReadonlyMap<string, readonly string[]>
{
    let map = _spellClasses.get(set);
    if (map) { return map; }

    map = new Map();
    for (const entity of set.entities.values())
    {
        if ((entity.type !== "spell-list") || !entity.active) { continue; }
        const classes = listClasses(set).get(entity.id);
        const holders = classes?.length ? classes : [entity.id];
        for (const spell of (entity.data as { spells?: readonly string[] }).spells ?? [])
        {
            map.set(spell, [...new Set([...map.get(spell) ?? [], ...holders])]);
        }
    }
    _spellClasses.set(set, map);

    return map;
}

function capitalize(text: string): string
{
    return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

class EntryComposer extends DisplayComposer
{
    // ---- measures ----

    /** "150 feet", "45 metri": a distance written out, as a spell's range. */
    private distance(feet: number): string
    {
        return this.metric ?
            this.t("entry.distance.metres", { value: this.number(feet * 0.3) }) :
            this.t("entry.distance.feet", { value: this.number(feet) });
    }

    /** "20/60 ft", "6/18 m". */
    private rangePair(range: { readonly normal: number, readonly long: number }): string
    {
        const scale = this.metric ? 0.3 : 1;
        const value = `${this.number(range.normal * scale)}/${this.number(range.long * scale)}`;

        return this.t(this.metric ? "units.metres" : "units.feet", { value: value });
    }

    // ---- spells ----

    private spellKind(d: SpellData): string
    {
        const school = this.t(`entry.schools.${d.school}`, undefined, d.school);
        const kind = d.level === 0 ?
            this.t("entry.spell.cantrip", { school: school }) :
            this.t("entry.spell.levelled", { school: school, level: this.t(`slotLevels.${d.level}`) });
        const shown = capitalize(kind);

        return d.ritual ? this.t("entry.spell.ritual", { kind: shown }) : shown;
    }

    private castingTime(c: SpellData["castingTime"]): string
    {
        let time: string;
        if (c.hours !== undefined) { time = this.t("entry.castingTime.hours", { count: c.hours }); }
        else if (c.minutes !== undefined) { time = this.t("entry.castingTime.minutes", { count: c.minutes }); }
        else { time = this.t(`entry.castingTime.${c.activation}`); }

        return c.trigger ? this.t("entry.castingTime.trigger", { time: time, trigger: this.text(c.trigger) }) : time;
    }

    private area(a: NonNullable<SpellData["area"]>): string
    {
        const feet = a.radius ?? a.size ?? a.length ?? 0;
        const value = this.number(this.metric ? feet * 0.3 : feet);
        const unit = this.t(this.metric ? "entry.distance.metre" : "entry.distance.foot");

        return this.t(`entry.area.${a.shape}`, { value: value, unit: unit });
    }

    private range(d: SpellData): string
    {
        const r = d.range;
        const range = r.distance !== undefined ? this.distance(r.distance) : this.t(`entry.range.${r.type}`);

        return d.area ? this.t("entry.range.withArea", { range: range, area: this.area(d.area) }) : range;
    }

    private components(c: SpellData["components"]): string
    {
        const parts = [c.v ? "V" : "", c.s ? "S" : "", c.m ? "M" : ""].filter(Boolean);
        const material = typeof c.m === "object" ?
            this.text(c.m).trim()
                .replace(/\.$/, "") :
            "";
        // The manuals write the material in lower case inside the brackets: "M (a tiny ball of bat guano…)".
        const shown = material ? `${material.charAt(0).toLocaleLowerCase()}${material.slice(1)}` : "";

        return shown ? `${parts.join(", ")} (${shown})` : parts.join(", ");
    }

    private duration(d: SpellData["duration"]): string
    {
        if (d.type !== "timed") { return this.t(`entry.duration.${d.type}`); }
        const unit = (["days", "hours", "minutes", "rounds"] as const).find((u) => d[u] !== undefined) ?? "rounds";
        const time = this.t(`entry.duration.${unit}`, { count: d[unit] ?? 1 });

        return d.concentration ? this.t("entry.duration.concentration", { time: time }) : capitalize(time);
    }

    private spellClasses(id: string): string[]
    {
        const names = (spellClassIds(this._options.packages).get(id) ?? []).map((c) => this.entityName(c));

        return [...new Set(names)].sort((a, b) => a.localeCompare(b, this._language));
    }

    public spell(id: string, d: SpellData): EntryView
    {
        const classes = this.spellClasses(id);
        const lines: StatBlockLine[] = [
            { label: this.t("entry.labels.castingTime"), value: this.castingTime(d.castingTime) },
            { label: this.t("entry.labels.range"), value: this.range(d) },
            { label: this.t("entry.labels.components"), value: this.components(d.components) },
            { label: this.t("entry.labels.duration"), value: this.duration(d.duration) }
        ];
        if (classes.length) { lines.push({ label: this.t("entry.labels.classes"), value: classes.join(", ") }); }
        const higher = this.text(d.higherLevel);

        return {
            kind: "spell",
            name: this.text(d.name),
            subtitle: this.spellKind(d),
            lines: lines,
            text: this.text(d.text),
            sections: higher ? [{ title: this.t("entry.labels.higherLevels"), text: higher }] : [],
            classes: classes
        };
    }

    // ---- items ----

    private itemKind(d: ItemData): string
    {
        const type = d.type ?? "gear";
        if ((type === "weapon") && d.category) { return this.t(`entry.item.weapon.${d.category}`); }
        if ((type === "armor") && d.category) { return this.t(`entry.item.armor.${d.category}`); }

        return this.t(`entry.item.types.${type}`);
    }

    /** A magic item's type line built from its data, when its text does not open with one. */
    private magicKind(d: ItemData): string
    {
        const rarity = d.rarity ? this.t(`entry.item.rarity.${d.rarity}`) : "";
        const kind = rarity ?
            this.t("entry.item.magic", { type: this.t(`entry.item.types.${d.type ?? "wondrous"}`), rarity: rarity }) :
            this.t(`entry.item.types.${d.type ?? "wondrous"}`);
        if (typeof d.attunement === "object")
        {
            return this.t("entry.item.attunementBy", { kind: kind, by: this.text(d.attunement.by) });
        }

        return d.attunement ? this.t("entry.item.attunement", { kind: kind }) : kind;
    }

    private properties(d: ItemData): string
    {
        return (d.properties ?? []).map((p) =>
        {
            const name = this.t(`entry.item.properties.${p}`, undefined, p.replace(/-/g, " "));
            if ((p === "versatile") && d.versatile)
            {
                return this.t("entry.item.withDie", { property: name, dice: d.versatile });
            }
            if (((p === "thrown") || (p === "ammunition")) && d.range)
            {
                return this.t("entry.item.withRange", { property: name, range: this.rangePair(d.range) });
            }

            return name;
        }).join(", ");
    }

    private armorClass(ac: NonNullable<ItemData["ac"]>): string | undefined
    {
        if (ac.base === undefined) { return ac.bonus !== undefined ? `+${ac.bonus}` : undefined; }
        if (!ac.addDex) { return String(ac.base); }

        return ac.dexMax !== undefined ?
            this.t("entry.item.acDexMax", { base: ac.base, max: ac.dexMax }) :
            this.t("entry.item.acDex", { base: ac.base });
    }

    public item(d: ItemData): EntryView
    {
        const lines: StatBlockLine[] = [];
        const add = (key: string, value: string | undefined): void =>
        {
            if (value) { lines.push({ label: this.t(`entry.labels.${key}`), value: value }); }
        };
        add("cost", d.cost ?
            this.t(`entry.item.coins.${d.cost.currency}`, { value: this.number(d.cost.amount) }) :
            undefined);
        add("weight", d.weight ? this.pounds(d.weight) : undefined);
        add("damage", d.damage ?
            [d.damage, d.damageType ? this.t(`damage.${d.damageType}`) : ""].filter(Boolean).join(" ") :
            undefined);
        add("properties", this.properties(d));
        add("ac", d.ac ? this.armorClass(d.ac) : undefined);
        add("strength", d.strengthMin ? this.t("entry.item.strength", { value: d.strengthMin }) : undefined);
        add("stealth", d.stealthDisadvantage ? this.t("entry.item.stealth") : undefined);
        add("charges", d.charges ? String(d.charges.max) : undefined);

        let text = this.text(d.text).trim();
        let subtitle = this.itemKind(d);
        if (d.magical)
        {
            const [first, ...rest] = text.split(/\n\s*\n/);
            if (first && rest.length && !first.includes("\n") && (first.length <= TYPE_LINE_MAX))
            {
                subtitle = first.trim();
                text = rest.join("\n\n");
            }
            else { subtitle = this.magicKind(d); }
        }
        const contents = (d.contents ?? []).map((c) =>
        {
            const name = this.entityName(c.item);

            const quantity = c.quantity ?? 1;

            return `- ${quantity > 1 ? this.t("entry.item.quantity", { count: quantity, name: name }) : name}`;
        });

        // A pack's text is the list of what it holds ("Includes: 1 × Backpack, …"): the section says it better.
        if (contents.length && !/\n\s*\n/.test(text)) { text = ""; }

        return {
            kind: "item",
            name: this.text(d.name),
            subtitle: subtitle,
            lines: lines,
            text: text,
            sections: contents.length ? [{ title: this.t("entry.labels.contents"), text: contents.join("\n") }] : []
        };
    }

    // ---- species, classes and backgrounds: the wizard's cards (docs/phase-1/14-wizard-steps-revision.md) ----

    /** A feature given inline or by id, as data. */
    private feature(f: FeatureData | string): FeatureData | undefined
    {
        return typeof f === "string" ?
            this._options.packages.entities.get(f as never)?.data as FeatureData | undefined :
            f;
    }

    private features(list: readonly (FeatureData | string)[] | undefined): FeatureData[]
    {
        return (list ?? []).map((f) => this.feature(f)).filter((f): f is FeatureData => f !== undefined);
    }

    /** The features as the entry's sections, title and text, those without either left out. */
    private traitSections(features: readonly FeatureData[]): EntrySection[]
    {
        return features.map((f) => ({ title: this.text(f.name), text: this.text(f.text) }))
            .filter((s) => s.title && s.text);
    }

    /** "+2 Constitution": every flat ability increase among the features' effects. */
    private abilityIncreases(features: readonly FeatureData[]): string[]
    {
        return features.flatMap((f) => f.effects ?? [])
            .filter((e) => (e.kind === "modify") && (e.op === "add") && (typeof e.value === "number") &&
                e.target?.startsWith("ability.") && ABILITIES.has(e.target.slice("ability.".length)))
            .map((e) => this.t("entry.option.ability", {
                value: `${(e.value as number) >= 0 ? "+" : "−"}${Math.abs(e.value as number)}`,
                ability: this.t(`abilities.${e.target!.slice("ability.".length)}`)
            }));
    }

    private darkvision(features: readonly FeatureData[]): number | undefined
    {
        const ranges = features.flatMap((f) => f.effects ?? [])
            .filter((e) => (e.kind === "modify") && (e.target === "sense.darkvision") && (typeof e.value === "number"))
            .map((e) => e.value as number);

        return ranges.length ? Math.max(...ranges) : undefined;
    }

    private languageName(id: string): string
    {
        const language = this._options.packages.ruleset.languages?.find((l) => l.id === id);
        if (language) { return this.text(language.name as Text); }

        return this.t(`proficiencyNames.language.${id}`, undefined, id.replace(/-/g, " "));
    }

    private languages(grant: LanguageGrant | undefined): string
    {
        const named = (grant?.fixed ?? []).map((l) => this.languageName(l));
        if (grant?.choose) { named.push(this.t("entry.option.anyLanguages", { count: grant.choose })); }

        return this.list(named);
    }

    /** A proficiency by its kind: a skill, an ability, a category of armour or weapons, a tool. */
    private proficiencyName(kind: keyof ProficiencyGrants, id: string): string
    {
        if (kind === "skills") { return this.t(`skills.${id}`, undefined, id); }
        if (kind === "savingThrows") { return this.t(`abilities.${id}`, undefined, id); }
        const type = kind === "armor" ? "armor" : (kind === "weapons" ? "weapon" : "tool");
        const named = this.t(`proficiencyNames.${type}.${id}`, undefined, "");
        if (named) { return named; }
        // An item named the other way round in the packages: "light-crossbow" is `crossbow-light`.
        const reversed = id.split("-").reverse()
            .join("-");
        for (const suffix of [`.item.${id}`, `.item.${reversed}`])
        {
            for (const entity of this._options.packages.entities.values())
            {
                if (entity.id.endsWith(suffix)) { return this.entityName(entity.id); }
            }
        }

        return id.replace(/-/g, " ");
    }

    private proficiencies(kind: keyof ProficiencyGrants, list: ProficiencyList | undefined): string
    {
        if (list === undefined) { return ""; }
        if (Array.isArray(list)) { return this.list(list.map((id) => this.proficiencyName(kind, id))); }
        const choice = list as { readonly choose: number, readonly from: readonly string[] };

        return this.t("entry.option.chooseFrom", {
            count: choice.choose,
            list: this.list(choice.from.map((id) => this.proficiencyName(kind, id)), "disjunction")
        });
    }

    private line(lines: StatBlockLine[], key: string, value: string | undefined): void
    {
        if (value) { lines.push({ label: this.t(`entry.labels.${key}`), value: value }); }
    }

    public species(d: SpeciesData, subspecies: boolean): EntryView
    {
        const features = this.features(d.features);
        const darkvision = this.darkvision(features);
        const walk = d.speed?.["walk"];
        const lines: StatBlockLine[] = [];
        this.line(lines, "size", d.size ? this.t(`entry.option.sizes.${d.size}`, undefined, d.size) : undefined);
        this.line(lines, "speed", walk !== undefined ? this.feet(walk) : undefined);
        this.line(lines, "senses", darkvision !== undefined ?
            this.t("entry.option.darkvision", { range: this.feet(darkvision) }) :
            undefined);
        this.line(lines, "languages", this.languages(d.languages));
        const facts = [
            ...this.abilityIncreases(features),
            ...(darkvision !== undefined ? [this.t("entry.option.darkvision", { range: this.feet(darkvision) })] : []),
            ...(walk !== undefined ? [this.t("entry.option.speed", { speed: this.feet(walk) })] : [])
        ];

        return {
            kind: "species",
            name: this.text(d.name),
            subtitle: this.t(subspecies ? "entry.option.subspecies" : "entry.option.species"),
            lines: lines,
            text: this.text(d.text),
            sections: this.traitSections(features),
            facts: facts
        };
    }

    /** Whether a class casts spells at some level: a `grant-spellcasting` among its features' effects. */
    private casts(d: ClassData): boolean
    {
        return Object.values(d.levels ?? {}).some((level) => this.features(level?.features)
            .some((f) => (f.effects ?? []).some((e) => e.kind === "grant-spellcasting")));
    }

    public class(d: ClassData): EntryView
    {
        const p = d.proficiencies ?? {};
        const lines: StatBlockLine[] = [];
        this.line(lines, "hitDie", `d${d.hitDie}`);
        this.line(lines, "primary", d.primaryAbilities?.length ?
            this.list(d.primaryAbilities.map((a) => this.t(`abilities.${a}`))) :
            undefined);
        this.line(lines, "saves", this.proficiencies("savingThrows", d.savingThrows ?? p.savingThrows));
        this.line(lines, "armor", this.proficiencies("armor", p.armor));
        this.line(lines, "weapons", this.proficiencies("weapons", p.weapons));
        this.line(lines, "tools", this.proficiencies("tools", p.tools));
        this.line(lines, "skills", this.proficiencies("skills", p.skills));
        const facts = [
            this.t("entry.option.hitDie", { die: `d${d.hitDie}` }),
            ...(this.casts(d) ? [this.t("entry.option.casts")] : [])
        ];

        return {
            kind: "class",
            name: this.text(d.name),
            subtitle: this.t("entry.option.class"),
            lines: lines,
            text: this.text(d.text),
            sections: this.traitSections(this.features(d.levels?.["1"]?.features)),
            facts: facts
        };
    }

    public background(d: BackgroundData): EntryView
    {
        const p = d.proficiencies ?? {};
        const features = this.features(d.features);
        const lines: StatBlockLine[] = [];
        this.line(lines, "skills", this.proficiencies("skills", p.skills));
        this.line(lines, "tools", this.proficiencies("tools", p.tools));
        this.line(lines, "languages", this.languages(d.languages));
        this.line(lines, "equipment", this.text(d.equipment?.text));
        const skills = Array.isArray(p.skills) ? (p.skills as readonly string[]) : [];
        const facts = [
            ...skills.map((id) => this.proficiencyName("skills", id)),
            ...(d.languages?.choose ? [this.t("entry.option.anyLanguages", { count: d.languages.choose })] : []),
            ...features.map((f) => this.text(f.name)).filter(Boolean)
        ];

        return {
            kind: "background",
            name: this.text(d.name),
            subtitle: this.t("entry.option.background"),
            lines: lines,
            text: this.text(d.text),
            sections: this.traitSections(features),
            facts: facts
        };
    }

    // ---- conditions ----

    public condition(d: ConditionData): EntryView
    {
        return {
            kind: "condition",
            name: this.text(d.name),
            subtitle: this.t("entry.condition"),
            lines: [],
            text: this.text(d.text),
            sections: []
        };
    }
}

/**
 * The compendium's entry of a spell, an item or a condition, or the wizard's card of a species, a subspecies, a
 * class or a background; `undefined` for any other id or an unloaded one.
 */
export function composeEntry(id: string, options: EntryOptions): EntryView | undefined
{
    const entity = options.packages.entities.get(id as never);
    if (entity === undefined) { return undefined; }
    const composer = new EntryComposer(options);
    switch (entity.type)
    {
        case "spell": return composer.spell(id, entity.data as unknown as SpellData);
        case "item": return composer.item(entity.data as unknown as ItemData);
        case "condition": return composer.condition(entity.data as unknown as ConditionData);
        case "species": return composer.species(entity.data as unknown as SpeciesData, entity.inline !== undefined);
        case "class": return composer.class(entity.data as unknown as ClassData);
        case "background": return composer.background(entity.data as unknown as BackgroundData);
        default: return undefined;
    }
}
