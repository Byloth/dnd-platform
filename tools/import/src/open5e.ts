/** Readers for the Open5e v2 Django fixtures cached under tools/import/cache/open5e. */

import { readCachedJson } from "./lib.ts";

const BASE = "data/v2/wizards-of-the-coast/srd-2014";

interface Row<F> { model: string, pk: string | number, fields: F }

export function rows<F>(file: string): Row<F>[]
{
    return readCachedJson<Row<F>[]>("open5e", `${BASE}/${file}.json`);
}

export interface CharacterClass
{
    name: string;
    hit_dice: string;
    caster_type: string | null;
    primary_abilities: string[];
    saving_throws: string[];
    subclass_of: string | null;
}
export interface ClassFeature { name: string, parent: string, desc: string }
export interface ClassFeatureItem { parent: string, level: number, column_value: string | null, detail: string | null }
export interface Species { name: string, desc: string, subspecies_of: string | null }
export interface SpeciesTrait { name: string, parent: string, desc: string, type: string | null }
export interface Background { name: string, desc: string }
export interface BackgroundBenefit { name: string, parent: string, desc: string, type: string }
export interface Feat { name: string, desc: string, prerequisite: string | null, type: string }
export interface FeatBenefit { name: string, parent: string, desc: string, type: string | null }
export interface Spell
{
    name: string;
    level: number;
    school: string;
    casting_time: string;
    reaction_condition: string | null;
    range_text: string;
    range: number | null;
    range_unit: string | null;
    shape_type: string | null;
    shape_size: number | null;
    target_type: string | null;
    target_count: number | null;
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    material_specified: string | null;
    material_cost: string | null;
    material_consumed: boolean;
    duration: string;
    concentration: boolean;
    ritual: boolean;
    attack_roll: boolean;
    saving_throw_ability: string | null;
    damage_roll: string | null;
    damage_types: string[];
    classes: string[];
    desc: string;
    higher_level: string;
}
export interface SpellCastingOption
{
    parent: string;
    type: string;
    damage_roll: string | null;
    desc: string | null;
}
export interface Item
{
    name: string;
    category: string;
    cost: string | null;
    weight: string | null;
    desc: string;
    weapon: string | null;
    armor: string | null;
    rarity?: string;
    requires_attunement?: string | null;
}
export interface Weapon
{
    name: string;
    damage_dice: string;
    damage_type: string;
    is_simple: boolean;
    range: number;
    long_range: number;
}
export interface WeaponPropertyAssignment { weapon: string, property: string, detail: string | null }
export interface Armor
{
    name: string;
    ac_base: number;
    ac_add_dexmod: boolean;
    ac_cap_dexmod: number | null;
    grants_stealth_disadvantage: boolean;
    strength_score_required: number | null;
}
export interface ConditionDescription { describes: string, desc: string }
export interface Rule { name: string, ruleset: string, index: number, desc: string }
export interface RuleSet { name: string, desc: string }

export function slug(pk: string | number): string
{
    return String(pk).replace(/^srd(-2014)?_/, "");
}
