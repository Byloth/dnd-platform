/**
 * The SRD's creatures (the Monsters chapter and the Creatures and Nonplayer Characters appendices) from the
 * 5e-database monsters dataset, in the creature format of DEC-24. The stat block's texts are kept whole; the
 * structured fields beside them (attack, damage, save, usage, spellcasting) come from the dataset's own fields and
 * from the fixed wording of the attack lines ("Melee Weapon Attack: +14 to hit, reach 10 ft.").
 *
 * A shapechanger that the dataset splits into one record per form (the vampire, the lycanthropes) becomes one
 * creature, as in the SRD: the first form's stat block, every form under `forms` (the first with nothing to
 * override), and the traits and actions of all the forms in one list.
 */

import * as db from "./fivedb.ts";
import { text } from "./emit.ts";

type Entity = Record<string, unknown>;

interface DbDamage
{
    damage_type?: db.Ref;
    damage_dice?: string;
    choose?: number;
    from?: { options: { damage_type: db.Ref, damage_dice: string }[] };
}
interface DbAction
{
    name: string;
    desc: string;
    attack_bonus?: number;
    damage?: DbDamage[];
    dc?: { dc_type: db.Ref, dc_value: number, success_type: "none" | "half" | "other" };
    usage?: { type: "per day" | "recharge on roll" | "recharge after rest";
        times?: number;
        min_value?: number;
        rest_types?: string[]; };
    actions?: { action_name: string, count: number | string, type: string }[];
    spellcasting?: {
        ability: db.Ref;
        dc?: number;
        modifier?: number;
        level?: number;
        slots?: Record<string, number>;
        spells: { url: string, usage?: { type: "at will" | "per day", times?: number } }[];
    };
}
export interface DbMonster
{
    index: string;
    name: string;
    desc?: string;
    size: string;
    type: string;
    subtype?: string;
    alignment: string;
    armor_class: { type: string, value: number, armor?: db.Ref[], spell?: db.Ref, condition?: db.Ref }[];
    hit_points: number;
    hit_points_roll: string;
    speed: Record<string, string | boolean>;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    proficiencies: { value: number, proficiency: db.Ref }[];
    damage_vulnerabilities: string[];
    damage_resistances: string[];
    damage_immunities: string[];
    condition_immunities: db.Ref[];
    senses: Record<string, string | number>;
    languages: string;
    challenge_rating: number;
    proficiency_bonus: number;
    xp: number;
    special_abilities?: DbAction[];
    actions?: DbAction[];
    legendary_actions?: DbAction[];
    reactions?: DbAction[];
    forms?: db.Ref[];
}

const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison",
    "psychic", "radiant", "slashing", "thunder"];
/** 5e-database spell indexes that srd51 spells differently. */
const SPELL_ALIASES: Record<string, string> = {
    "enlarge-reduce": "enlargereduce",
    "blindness-deafness": "blindnessdeafness"
};
const feet = (value: string | number | boolean | undefined): number | undefined =>
{
    const match = /^(\d+) ft\./.exec(String(value ?? ""));

    return match ? Number(match[1]) : undefined;
};
const empty = <T>(list: T[]): T[] | undefined => (list.length ? list : undefined);
function compact<T extends object>(value: T): T
{
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null)) as T;
}

function armorClass(entries: DbMonster["armor_class"]): Entity[]
{
    const out: Entity[] = [];
    for (const entry of entries)
    {
        const armor = (entry.armor ?? []).map((a) => a.name.toLowerCase().replace(/ armor$/, ""));
        const previous = out.at(-1);
        // "17 (natural armor, shield)": the dataset gives the natural armour and the shield as two entries.
        if ((entry.type === "armor") && (armor.join() === "shield") && previous &&
            (String((previous["note"] as { en?: string } | undefined)?.en) === "natural armor"))
        {
            out[out.length - 1] = { value: entry.value, note: text("natural armor, shield") };
            continue;
        }
        const notes: Record<string, string | undefined> = {
            natural: "natural armor",
            armor: armor.join(", "),
            spell: `with ${entry.spell?.name.toLowerCase()}`,
            condition: `while ${entry.condition?.name.toLowerCase()}`
        };
        const note = notes[entry.type];
        out.push(compact({ value: entry.value, note: note ? text(note) : undefined }));
    }

    return out;
}

function speed(value: DbMonster["speed"]): Entity
{
    return compact({
        walk: feet(value["walk"]),
        fly: feet(value["fly"]),
        swim: feet(value["swim"]),
        climb: feet(value["climb"]),
        burrow: feet(value["burrow"]),
        hover: value["hover"] === true ? true : undefined
    });
}

/** "bludgeoning, piercing, and slashing from nonmagical weapons" → the types and the words that follow them. */
function defenses(list: string[]): (string | Entity)[] | undefined
{
    return empty(list.map((phrase) =>
    {
        if (DAMAGE_TYPES.includes(phrase)) { return phrase; }
        const words = phrase.split(/,? and |, | /);
        const types: string[] = [];
        let at = 0;
        for (const word of words)
        {
            if (!DAMAGE_TYPES.includes(word)) { break; }
            types.push(word);
            at += 1;
        }
        const rest = types.length ? phrase.slice(phrase.indexOf(" ", phrase.indexOf(types.at(-1)!)) + 1) : phrase;

        return compact({ types: at ? types : undefined, note: text(rest) });
    }));
}

const ATTACK = new RegExp("^\\s*(Melee or Ranged|Melee|Ranged) (Weapon|Spell) Attack: [+-]?\\d+ to hit[^,]*," +
    "(?: reach (\\d+) ft\\.)?(?: or)?(?: range (\\d+)(?:/(\\d+))? ft\\.)?");
const KINDS: Record<string, string> = { "Melee": "melee", "Ranged": "ranged", "Melee or Ranged": "melee-or-ranged" };

function attack(value: DbAction): Entity | undefined
{
    if (value.attack_bonus === undefined) { return undefined; }
    const match = ATTACK.exec(value.desc);
    if (!match) { return undefined; }
    const long = match[5] ? Number(match[5]) : undefined;
    const range = match[4] ? compact({ normal: Number(match[4]), long: long }) : undefined;

    return compact({
        kind: KINDS[match[1]!],
        source: match[2]!.toLowerCase(),
        bonus: value.attack_bonus,
        reach: match[3] ? Number(match[3]) : undefined,
        range: range
    });
}

function dice(value: string): string | number
{
    const clean = value.replace(/\s+/g, "");

    return /^\d+$/.test(clean) ? Number(clean) : clean;
}

function damage(list: DbDamage[] | undefined): Entity[] | undefined
{
    return empty((list ?? []).flatMap((d): Entity[] =>
    {
        if (d.damage_dice !== undefined)
        {
            return [compact({ dice: dice(d.damage_dice), damageType: d.damage_type?.index })];
        }
        const options = d.from?.options ?? [];
        const first = options[0];
        if (!first) { return []; }

        const types = [...new Set(options.map((o) => o.damage_type.index))];

        // A versatile weapon's two dice of the same type: the first one, the text gives the other.
        return [types.length > 1 ?
            { dice: dice(first.damage_dice), choose: types } :
            { dice: dice(first.damage_dice), damageType: types[0] }];
    }));
}

function usage(value: DbAction["usage"], name: string): Entity | undefined
{
    if (!value)
    {
        // "Recharge 5–6" and "3/Day" are also written in the name alone.
        const recharge = /\(Recharge (\d)(?:[–-]6)?\)/.exec(name);
        const perDay = /\((\d+)\/Day\)/.exec(name);

        return recharge ? { recharge: Number(recharge[1]) } : perDay ? { perDay: Number(perDay[1]) } : undefined;
    }
    if (value.type === "per day") { return { perDay: value.times }; }
    if (value.type === "recharge on roll") { return { recharge: value.min_value }; }

    return { rest: value.rest_types?.includes("short") ? "short" : "long" };
}

function spellcasting(value: DbAction["spellcasting"], spells: Set<string>, missing: string[]): Entity | undefined
{
    if (!value) { return undefined; }
    const list = value.spells.flatMap((s) =>
    {
        const index = s.url.split("/").at(-1)!;
        const slug = SPELL_ALIASES[index] ?? index;
        if (!spells.has(slug))
        {
            missing.push(index);

            return [];
        }

        return [compact({
            spell: `srd51.spell.${slug}`,
            atWill: s.usage?.type === "at will" ? true : undefined,
            perDay: s.usage?.type === "per day" ? s.usage.times : undefined
        })];
    });

    return compact({
        ability: value.ability.index,
        dc: value.dc,
        attack: value.modifier,
        casterLevel: value.level,
        innate: value.slots ? undefined : true,
        slots: value.slots && Object.keys(value.slots).length ? value.slots : undefined,
        spells: list
    });
}

function action(value: DbAction, spells: Set<string>, missing: string[]): Entity
{
    const cost = /\(Costs (\d) Actions\)/.exec(value.name);

    return compact({
        name: text(value.name),
        text: text(value.desc.trim()),
        usage: usage(value.usage, value.name),
        cost: cost ? Number(cost[1]) : undefined,
        attack: attack(value),
        damage: damage(value.damage),
        save: value.dc ?
            compact({
                ability: value.dc.dc_type.index,
                dc: value.dc.dc_value,
                onSuccess: value.dc.success_type === "half" ? "half" : undefined
            }) :
            undefined,
        multiattack: empty((value.actions ?? []).map((a) => ({
            action: text(a.action_name),
            count: typeof a.count === "number" ? a.count : Number.parseInt(a.count, 10) || 1
        }))),
        spellcasting: spellcasting(value.spellcasting, spells, missing)
    });
}

const actions = (list: DbAction[] | undefined, spells: Set<string>, missing: string[]): Entity[] | undefined =>
    empty((list ?? []).map((a) => action(a, spells, missing)));

/** "swarm of Tiny beasts" → beast, a swarm of tiny creatures. */
function typeOf(value: string): { creatureType: string, swarmOf?: string }
{
    const swarm = /^swarm of (\w+) (\w+?)s?$/.exec(value);

    return swarm ? { creatureType: swarm[2]!, swarmOf: swarm[1]!.toLowerCase() } : { creatureType: value };
}

/** A shapechanger's forms: the stat block's own first, then what each other form changes. */
function formList(monster: DbMonster, forms: DbMonster[]): Entity[] | undefined
{
    if (!forms.length) { return undefined; }
    const formName = (m: DbMonster): string => /, (.*) Form$/.exec(m.name)?.[1] ?? m.name;
    const changed = (a: unknown, b: unknown): boolean => JSON.stringify(a) !== JSON.stringify(b);

    return [{ name: text(formName(monster)) }, ...forms.map((f) => compact({
        name: text(formName(f)),
        size: f.size !== monster.size ? f.size.toLowerCase() : undefined,
        armorClass: changed(f.armor_class, monster.armor_class) ? armorClass(f.armor_class) : undefined,
        speed: changed(f.speed, monster.speed) ? speed(f.speed) : undefined
    }))];
}

function legendary(monster: DbMonster, spells: Set<string>, missing: string[]): Entity | undefined
{
    if (!monster.legendary_actions?.length) { return undefined; }

    return { count: 3, actions: actions(monster.legendary_actions, spells, missing) };
}

export interface MappedCreature { file: string, entity: Entity }

/** Every SRD creature, keyed by its file name, and the spells the dataset names that srd51 lacks. */
export function mapCreatures(spells: Set<string>): { creatures: MappedCreature[], missingSpells: string[] }
{
    const rows = db.rows<DbMonster>("Monsters");
    const byIndex = new Map(rows.map((m) => [m.index, m]));
    const missing: string[] = [];
    const skip = new Set<string>();
    const creatures: MappedCreature[] = [];

    for (const monster of rows)
    {
        if (skip.has(monster.index)) { continue; }
        const forms = (monster.forms ?? []).map((f) => byIndex.get(f.index)).filter((f): f is DbMonster => !!f);
        forms.forEach((f) => skip.add(f.index));
        // "Werewolf, Human Form" → "Werewolf"; the file is named after the creature, not the form.
        const name = forms.length ? monster.name.replace(/, .* Form$/, "") : monster.name;
        const file = forms.length ? monster.index.replace(/-[a-z]+$/, "") : monster.index;
        // The SRD prints one list of traits and actions for all the forms ("Bite (Wolf or Hybrid Form Only)").
        const union = (key: "special_abilities" | "actions" | "reactions"): DbAction[] | undefined =>
        {
            const all = [monster, ...forms].flatMap((m) => m[key] ?? []);

            return empty(all.filter((a, i) => all.findIndex((b) => b.name === a.name) === i));
        };
        const saves = monster.proficiencies.filter((p) => p.proficiency.index.startsWith("saving-throw-"));
        const skills = monster.proficiencies.filter((p) => p.proficiency.index.startsWith("skill-"));

        creatures.push({
            file: file,
            entity: compact({
                id: `srd51-creatures.creature.${file}`,
                name: text(name),
                source: "srd51",
                text: monster.desc ? text(monster.desc) : undefined,
                size: monster.size.toLowerCase(),
                ...typeOf(monster.type),
                subtypes: monster.subtype ? [monster.subtype.replace(/\s+/g, "-")] : undefined,
                alignment: text(monster.alignment),
                armorClass: armorClass(monster.armor_class),
                hitPoints: { average: monster.hit_points, dice: dice(monster.hit_points_roll) },
                speed: speed(monster.speed),
                abilities: {
                    str: monster.strength,
                    dex: monster.dexterity,
                    con: monster.constitution,
                    int: monster.intelligence,
                    wis: monster.wisdom,
                    cha: monster.charisma
                },
                savingThrows: saves.length ?
                    Object.fromEntries(saves.map((p) => [p.proficiency.index.replace("saving-throw-", ""), p.value])) :
                    undefined,
                skills: skills.length ?
                    Object.fromEntries(skills.map((p) => [p.proficiency.index.replace("skill-", ""), p.value])) :
                    undefined,
                vulnerabilities: defenses(monster.damage_vulnerabilities),
                resistances: defenses(monster.damage_resistances),
                immunities: defenses(monster.damage_immunities),
                conditionImmunities: empty(monster.condition_immunities.map((c) => `srd51.condition.${c.index}`)),
                senses: compact({
                    darkvision: feet(monster.senses["darkvision"]),
                    blindsight: feet(monster.senses["blindsight"]),
                    blindBeyond: String(monster.senses["blindsight"] ?? "").includes("blind beyond") ? true : undefined,
                    tremorsense: feet(monster.senses["tremorsense"]),
                    truesight: feet(monster.senses["truesight"]),
                    passivePerception: monster.senses["passive_perception"]
                }),
                languages: monster.languages && (monster.languages !== "—") ? text(monster.languages) : undefined,
                challenge: monster.challenge_rating,
                xp: monster.xp,
                proficiencyBonus: monster.proficiency_bonus,
                traits: actions(union("special_abilities"), spells, missing),
                actions: actions(union("actions"), spells, missing),
                reactions: actions(union("reactions"), spells, missing),
                legendary: legendary(monster, spells, missing),
                forms: formList(monster, forms)
            })
        });
    }

    return { creatures: creatures, missingSpells: [...new Set(missing)] };
}
