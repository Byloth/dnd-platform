/**
 * A creature's stat block (DEC-24) as display strings, in the order and the wording of the manuals: the Italian
 * block reads "Drago Enorme, legale buono", "Sfida 16 (15.000 PE)". The content's texts are shown as they are; the
 * composer writes the labels, the numbers and the distances in the chosen units.
 */

import type { PackageSet } from "@byloth/dnd-platform-loader";

import { createTranslate } from "./messages/index.js";
import type { Translate, TranslateParams } from "./messages/index.js";

type Text = Readonly<Record<string, string | undefined>>;
type Value = number | string;

interface CreatureAction
{
    readonly name: Text;
    readonly text: Text;
    readonly usage?: { readonly perDay?: number, readonly recharge?: number, readonly rest?: "short" | "long" };
    readonly cost?: number;
    readonly attack?: { readonly bonus: Value };
    readonly damage?: readonly { readonly dice: Value, readonly damageType?: string, readonly choose?: string[] }[];
    readonly save?: { readonly ability: string, readonly dc: Value, readonly onSuccess?: "half" | "none" };
}
type Defense = string | { readonly types?: readonly string[], readonly note: Text };
type SpeedType = "walk" | "fly" | "swim" | "climb" | "burrow";
type Speed = Readonly<Partial<Record<SpeedType, Value>>> & { readonly hover?: boolean };
/** The creature entity as the loader keeps it (`creature.schema.json`). */
export interface CreatureData
{
    readonly name: Text;
    readonly text?: Text;
    readonly size: string;
    readonly creatureType: string;
    readonly subtypes?: readonly string[];
    readonly swarmOf?: string;
    readonly alignment?: Text;
    readonly armorClass: readonly { readonly value: Value, readonly note?: Text }[];
    readonly hitPoints: { readonly average: Value, readonly dice?: Value };
    readonly speed?: Speed;
    readonly abilities: Readonly<Record<string, Value>>;
    readonly savingThrows?: Readonly<Record<string, Value>>;
    readonly skills?: Readonly<Record<string, Value>>;
    readonly vulnerabilities?: readonly Defense[];
    readonly resistances?: readonly Defense[];
    readonly immunities?: readonly Defense[];
    readonly conditionImmunities?: readonly string[];
    readonly senses: Readonly<Partial<Record<"darkvision" | "blindsight" | "tremorsense" | "truesight", Value>>> &
        { readonly blindBeyond?: boolean, readonly passivePerception: Value };
    readonly languages?: Text;
    readonly challenge: number;
    readonly xp?: number;
    readonly traits?: readonly CreatureAction[];
    readonly actions?: readonly CreatureAction[];
    readonly bonusActions?: readonly CreatureAction[];
    readonly reactions?: readonly CreatureAction[];
    readonly legendary?: { readonly count?: number, readonly text?: Text, readonly actions: readonly CreatureAction[] };
    readonly forms?: readonly { readonly name: Text;
        readonly armorClass?: CreatureData["armorClass"];
        readonly speed?: Speed; }[];
}

export interface StatBlockLine { readonly label: string, readonly value: string }
export interface StatBlockAbility { readonly ability: string;
    readonly label: string;
    readonly score: string;
    readonly modifier: string; }
export interface StatBlockEntry
{
    /** The name with its usage: "Fire Breath (Recharge 5–6)". */
    readonly name: string;
    readonly text: string;
    /** "+14", when the entry is an attack. */
    readonly attack?: string;
    /** "2d10 + 8 piercing", one per damage roll. */
    readonly damage?: readonly string[];
    /** "DC 21 Dexterity". */
    readonly save?: string;
}
export interface StatBlockSection
{
    readonly id: "traits" | "actions" | "bonusActions" | "reactions" | "legendary";
    /** Empty for the traits, which have no heading. */
    readonly title: string;
    readonly intro?: string;
    readonly entries: readonly StatBlockEntry[];
}
export interface StatBlock
{
    readonly name: string;
    /** "Huge dragon, lawful good". */
    readonly header: string;
    readonly text?: string;
    /** Armor Class, Hit Points, Speed. */
    readonly core: readonly StatBlockLine[];
    readonly abilities: readonly StatBlockAbility[];
    /** Saving Throws … Challenge, only those the creature has. */
    readonly details: readonly StatBlockLine[];
    readonly sections: readonly StatBlockSection[];
}

export interface CreatureOptions
{
    readonly packages: PackageSet;
    readonly language?: string;
    readonly translate?: Translate;
    /** Default `imperial`; `metric` as in the sheet (5 ft = 1,5 m). */
    readonly units?: "imperial" | "metric";
}

const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];
const SENSES = ["blindsight", "darkvision", "tremorsense", "truesight"] as const;
const SPEEDS = ["burrow", "climb", "fly", "swim"] as const;

function signed(value: Value): string
{
    return (typeof value === "number") && (value >= 0) ? `+${value}` : String(value);
}

class CreatureComposer
{
    private readonly _language: string;
    private readonly _translate: Translate;

    public constructor(private readonly _data: CreatureData, private readonly _options: CreatureOptions)
    {
        this._language = _options.language ?? "en";
        this._translate = _options.translate ?? createTranslate(this._language);
    }

    private t(key: string, params?: TranslateParams, fallback?: string): string
    {
        const text = this._translate(`sheet.${key}`, params);

        return (text === `sheet.${key}` && fallback !== undefined) ? fallback : text;
    }

    private text(label: Text | undefined): string
    {
        if (label === undefined) { return ""; }

        return label[this._language] ?? label["en"] ?? Object.values(label).find((v) => v !== undefined) ?? "";
    }

    private number(value: number): string
    {
        return new Intl.NumberFormat(this._language, { maximumFractionDigits: 1 }).format(value);
    }

    private feet(value: Value): string
    {
        if ((this._options.units !== "metric") || (typeof value !== "number"))
        {
            return this.t("units.feet", { value: value });
        }

        return this.t("units.metres", { value: this.number(value * 0.3) });
    }

    private entityName(id: string): string
    {
        const data = this._options.packages.entities.get(id)?.data as { name?: Text } | undefined;

        return data?.name ? this.text(data.name) : id.split(".").pop() ?? id;
    }

    private list(items: readonly string[]): string
    {
        return new Intl.ListFormat(this._language, { type: "conjunction" }).format(items);
    }

    /** "Huge dragon, lawful good"; in Italian the size follows the type and agrees with it. */
    private header(): string
    {
        const d = this._data;
        const gender = (type: string): string => this.t(`creature.typeGender.${type}`, undefined, "m");
        const size = (s: string, type: string): string => this.t(`creature.sizes.${gender(type)}.${s}`, undefined, s);
        const subtypes = d.subtypes?.length ?
            ` (${d.subtypes.map((s) => this.t(`creature.subtypes.${s}`, undefined, s.replace(/-/g, " ")))
                .join(", ")})` :
            "";
        const kind = d.swarmOf ?
            this.t("creature.swarm", {
                size: size(d.size, "swarm"),
                of: this.t(`creature.sizesPlural.${gender(d.creatureType)}.${d.swarmOf}`, undefined, d.swarmOf),
                type: this.t(`creature.typesPlural.${d.creatureType}`, undefined, d.creatureType)
            }) :
            this.t("creature.kind", {
                size: size(d.size, d.creatureType),
                type: this.t(`creature.types.${d.creatureType}`, undefined, d.creatureType)
            });
        const alignment = this.text(d.alignment);

        return `${kind}${subtypes}${alignment ? `, ${alignment}` : ""}`;
    }

    private armorClass(entries: CreatureData["armorClass"]): string
    {
        return entries.map((e) => (e.note ? `${e.value} (${this.text(e.note)})` : String(e.value))).join(", ");
    }

    private speed(speed: Speed | undefined): string
    {
        const parts = [this.feet(speed?.walk ?? 0)];
        for (const type of SPEEDS)
        {
            const value = speed?.[type];
            if (value === undefined) { continue; }
            const hover = (type === "fly") && speed?.hover ? ` ${this.t("creature.hover")}` : "";
            parts.push(`${this.t(`core.speedTypes.${type}`)} ${this.feet(value)}${hover}`);
        }

        return parts.join(", ");
    }

    private core(): StatBlockLine[]
    {
        const d = this._data;
        const forms = d.forms?.slice(1) ?? [];
        const perForm = (label: (f: NonNullable<CreatureData["forms"]>[number]) => string | undefined): string =>
            forms.map((f) => label(f)).filter((s): s is string => !!s)
                .join("; ");
        const formAc = perForm((f) => (f.armorClass ?
            this.t("creature.inForm", { value: this.armorClass(f.armorClass), form: this.text(f.name) }) :
            undefined));
        const formSpeed = perForm((f) => (f.speed ?
            this.t("creature.inForm", { value: this.speed(f.speed), form: this.text(f.name) }) :
            undefined));
        const hp = d.hitPoints.dice !== undefined ?
            `${d.hitPoints.average} (${String(d.hitPoints.dice).replace(/([+-])/, " $1 ")})` :
            String(d.hitPoints.average);

        return [
            {
                label: this.t("creature.labels.ac"),
                value: [this.armorClass(d.armorClass), formAc].filter(Boolean).join("; ")
            },
            { label: this.t("creature.labels.hp"), value: hp },
            {
                label: this.t("creature.labels.speed"),
                value: [this.speed(d.speed), formSpeed].filter(Boolean).join("; ")
            }
        ];
    }

    private abilities(): StatBlockAbility[]
    {
        return ABILITY_ORDER.map((ability) =>
        {
            const score = this._data.abilities[ability] ?? 10;
            const modifier = typeof score === "number" ? signed(Math.floor((score - 10) / 2)) : "";

            return {
                ability: ability,
                label: this.t(`abbreviations.${ability}`),
                score: String(score),
                modifier: modifier
            };
        });
    }

    private defenses(list: readonly Defense[] | undefined): string | undefined
    {
        if (!list?.length) { return undefined; }
        const simple = list.filter((d): d is string => typeof d === "string").map((d) => this.t(`damage.${d}`));
        const groups = list.filter((d): d is Exclude<Defense, string> => typeof d !== "string").map((g) =>
        {
            const types = (g.types ?? []).map((t) => this.t(`damage.${t}`));

            return types.length ? `${this.list(types)} ${this.text(g.note)}` : this.text(g.note);
        });

        return [simple.join(", "), ...groups].filter(Boolean).join("; ");
    }

    private details(): StatBlockLine[]
    {
        const d = this._data;
        const lines: StatBlockLine[] = [];
        const add = (key: string, value: string | undefined): void =>
        {
            if (value) { lines.push({ label: this.t(`creature.labels.${key}`), value: value }); }
        };
        type Bonuses = Readonly<Record<string, Value>> | undefined;
        const bonuses = (map: Bonuses, name: (key: string) => string): string | undefined =>
            (map ?
                Object.entries(map).map(([k, v]) => `${name(k)} ${signed(v)}`)
                    .join(", ") :
                undefined);

        add("saves", bonuses(d.savingThrows, (a) => this.t(`creature.saveAbbreviations.${a}`, undefined, a)));
        add("skills", bonuses(d.skills, (s) => this.t(`skills.${s}`, undefined, s)));
        add("vulnerabilities", this.defenses(d.vulnerabilities));
        add("resistances", this.defenses(d.resistances));
        add("immunities", this.defenses(d.immunities));
        add("conditionImmunities", d.conditionImmunities?.map((c) => this.entityName(c).toLowerCase()).join(", "));

        const senses = SENSES.filter((s) => d.senses[s] !== undefined).map((s) =>
        {
            const blind = (s === "blindsight") && d.senses.blindBeyond ? ` ${this.t("creature.blindBeyond")}` : "";

            return `${this.t(`senses.names.${s}`).toLowerCase()} ${this.feet(d.senses[s]!)}${blind}`;
        });
        const passive = this.t("creature.passive", { value: d.senses.passivePerception });
        const passiveFirst = this.t("creature.passiveFirst") === "yes";
        add("senses", (passiveFirst ? [passive, ...senses] : [...senses, passive]).join(", "));
        add("languages", this.text(d.languages) || "—");
        const cr = d.challenge === 0.125 ?
            "1/8" :
            d.challenge === 0.25 ?
                "1/4" :
                d.challenge === 0.5 ?
                    "1/2" :
                    String(d.challenge);
        add("challenge", d.xp !== undefined ? this.t("creature.challenge", { cr: cr, xp: this.number(d.xp) }) : cr);

        return lines;
    }

    private entry(action: CreatureAction): StatBlockEntry
    {
        const name = this.text(action.name);
        const tags: string[] = [];
        const u = action.usage;
        if (u?.perDay !== undefined) { tags.push(this.t("creature.usage.perDay", { n: u.perDay })); }
        if (u?.recharge !== undefined)
        {
            tags.push(u.recharge === 6 ?
                this.t("creature.usage.rechargeSix") :
                this.t("creature.usage.recharge", { min: u.recharge }));
        }
        if (u?.rest !== undefined) { tags.push(this.t(`creature.usage.${u.rest}Rest`)); }
        if (action.cost !== undefined) { tags.push(this.t("creature.usage.cost", { count: action.cost })); }
        // A name that already carries its usage ("Fire Breath (Recharge 5–6)") keeps it.
        const shown = tags.length && !/\(.*\)\s*$/.test(name) ? `${name} (${tags.join(", ")})` : name;
        const damage = action.damage?.map((d) =>
        {
            const dice = String(d.dice).replace(/([+-])/, " $1 ");
            const types = d.choose ?
                this.list(d.choose.map((t) => this.t(`damage.${t}`))) :
                d.damageType ? this.t(`damage.${d.damageType}`) : "";

            return types ? `${dice} ${types}` : dice;
        });

        return {
            name: shown,
            text: this.text(action.text),
            ...(action.attack ? { attack: signed(action.attack.bonus) } : {}),
            ...(damage?.length ? { damage: damage } : {}),
            ...(action.save ?
                {
                    save: this.t("creature.save", {
                        dc: action.save.dc,
                        ability: this.t(`abilities.${action.save.ability}`)
                    })

                } :
                {})
        };
    }

    public compose(): StatBlock
    {
        const d = this._data;
        const name = this.text(d.name);
        const sections: StatBlockSection[] = [];
        type Actions = readonly CreatureAction[] | undefined;
        const section = (id: StatBlockSection["id"], list: Actions, intro?: string): void =>
        {
            if (!list?.length) { return; }
            sections.push({
                id: id,
                title: id === "traits" ? "" : this.t(`creature.labels.${id}`),
                ...(intro ? { intro: intro } : {}),
                entries: list.map((a) => this.entry(a))
            });
        };
        section("traits", d.traits);
        section("actions", d.actions);
        section("bonusActions", d.bonusActions);
        section("reactions", d.reactions);
        if (d.legendary)
        {
            const intro = d.legendary.text ?
                this.text(d.legendary.text) :
                this.t("creature.legendaryIntro", { name: name.toLowerCase(), count: d.legendary.count ?? 3 });
            section("legendary", d.legendary.actions, intro);
        }

        return {
            name: name,
            header: this.header(),
            ...(d.text ? { text: this.text(d.text) } : {}),
            core: this.core(),
            abilities: this.abilities(),
            details: this.details(),
            sections: sections
        };
    }
}

/** The stat block of a creature entity (`<package>.creature.<name>`); `undefined` when it is not loaded. */
export function composeCreature(id: string, options: CreatureOptions): StatBlock | undefined
{
    const entity = options.packages.entities.get(id as never);
    if ((entity === undefined) || (entity.type !== "creature")) { return undefined; }

    return new CreatureComposer(entity.data as unknown as CreatureData, options).compose();
}
