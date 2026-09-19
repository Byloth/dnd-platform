/** Readers for the 5e-database JSON cached under tools/import/cache/5e-database. */

import { readCachedJson } from "./lib.ts";

const BASE = "src/2014/en/5e-SRD-";

export function rows<T>(file: string): T[]
{
    return readCachedJson<T[]>("5e-database", `${BASE}${file}.json`);
}

export interface Ref { index: string, name: string }
export interface OptionSet
{
    option_set_type: "options_array" | "equipment_category" | "resource_list";
    options?: Option[];
    equipment_category?: Ref;
}
export interface Option
{
    option_type: "reference" | "choice" | "counted_reference" | "multiple" | "string";
    item?: Ref;
    of?: Ref;
    count?: number;
    choice?: ChoiceBlock;
    items?: Option[];
    string?: string;
    prerequisites?: { type: string, proficiency?: Ref }[];
}
export interface ChoiceBlock { desc?: string, choose: number, type: string, from: OptionSet }
export interface DbClass
{
    index: string;
    name: string;
    hit_die: number;
    proficiencies: Ref[];
    proficiency_choices: ChoiceBlock[];
    saving_throws: Ref[];
    starting_equipment: { equipment: Ref, quantity: number }[];
    starting_equipment_options: ChoiceBlock[];
    multi_classing: {
        prerequisites?: { ability_score: Ref, minimum_score: number }[];
        proficiencies?: Ref[];
        proficiency_choices?: ChoiceBlock[];
    };
    subclasses: Ref[];
    spellcasting?: { level: number, spellcasting_ability: Ref };
}
export interface DbLevel
{
    level: number;
    ability_score_bonuses: number;
    prof_bonus: number;
    class: Ref;
    subclass?: Ref;
    features: Ref[];
    class_specific?: Record<string, unknown>;
    spellcasting?: Record<string, number>;
}
export interface DbSubclass { index: string, name: string, class: Ref, subclass_flavor: string }
export interface DbRace
{
    index: string;
    name: string;
    speed: number;
    size: string;
    ability_bonuses: { ability_score: Ref, bonus: number }[];
    languages: Ref[];
    language_options?: ChoiceBlock;
    traits: Ref[];
    subraces: Ref[];
}
export interface DbSubrace
{
    index: string;
    name: string;
    race: Ref;
    ability_bonuses: { ability_score: Ref, bonus: number }[];
    racial_traits: Ref[];
}
export interface DbBackground
{
    index: string;
    name: string;
    starting_proficiencies: Ref[];
    language_options?: ChoiceBlock;
    starting_equipment: { equipment: Ref, quantity: number }[];
    starting_equipment_options: ChoiceBlock[];
    feature: { name: string, desc: string[] };
    personality_traits: { choose: number, from: OptionSet };
    ideals: { choose: number, from: OptionSet };
    bonds: { choose: number, from: OptionSet };
    flaws: { choose: number, from: OptionSet };
}
export interface DbFeat
{
    index: string;
    name: string;
    prerequisites: { ability_score: Ref, minimum_score: number }[];
    desc: string[];
}
export interface DbEquipment
{
    index: string;
    name: string;
    equipment_category: Ref;
    weapon_category?: string;
    weapon_range?: string;
    armor_category?: string;
    armor_class?: { base: number, dex_bonus: boolean, max_bonus?: number | null };
    str_minimum?: number;
    stealth_disadvantage?: boolean;
    cost?: { quantity: number, unit: string };
    damage?: { damage_dice: string, damage_type: Ref };
    two_handed_damage?: { damage_dice: string, damage_type: Ref };
    range?: { normal: number, long?: number };
    throw_range?: { normal: number, long: number };
    weight?: number;
    properties?: Ref[];
    gear_category?: Ref;
    tool_category?: string;
}
export interface DbMagicItem
{
    index: string;
    name: string;
    equipment_category: Ref;
    rarity: { name: string };
    variants: Ref[];
    variant: boolean;
    desc: string[];
}
export interface DbSpell
{
    index: string;
    name: string;
    level: number;
    classes: Ref[];
    subclasses: Ref[];
    dc?: { dc_type: Ref, dc_success: string };
    damage?: {
        damage_type?: Ref;
        damage_at_slot_level?: Record<string, string>;
        damage_at_character_level?: Record<string, string>;
    };
    heal_at_slot_level?: Record<string, string>;
    area_of_effect?: { type: string, size: number };
}
