/** Static facts of a character: what the condition language and the formulas read. */

import type { Character, Item } from "@byloth/dnd-platform-schema";

import type { Facts, WieldedWeapon } from "../conditions/evaluate.js";
import type { PackageSet } from "../index.js";

export interface Equipment
{
    readonly armor?: { readonly id: string, readonly item: Item };
    readonly shield?: { readonly id: string, readonly item: Item };
    readonly weapons: readonly { readonly id: string, readonly item: Item }[];
}

export function equippedItems(character: Character, set: PackageSet): Equipment
{
    let armor: Equipment["armor"];
    let shield: Equipment["shield"];
    const weapons: { id: string, item: Item }[] = [];
    for (const entry of character.choices.equipment ?? [])
    {
        if (!entry.equipped) { continue; }
        const resolved = set.entities.get(entry.item);
        if ((resolved === undefined) || (resolved.type !== "item")) { continue; }
        const item = resolved.data as Item;
        if (item.type === "armor") { armor = { id: entry.item, item: item }; }
        else if (item.type === "shield") { shield = { id: entry.item, item: item }; }
        else if (item.type === "weapon") { weapons.push({ id: entry.item, item: item }); }
    }

    return { ...(armor ? { armor: armor } : {}), ...(shield ? { shield: shield } : {}), weapons: weapons };
}

export function baseAbilityScores(character: Character): Record<string, number>
{
    const scores = character.choices.abilityScores;
    const out: Record<string, number> = {};
    for (const [ability, value] of Object.entries(scores?.base ?? {}))
    {
        out[ability] = (value ?? 10) + (scores?.bonuses?.[ability] ?? 0);
    }

    return out;
}

export function classLevelsOf(character: Character): Record<string, number>
{
    const out: Record<string, number> = {};
    for (const entry of character.choices.classes ?? [])
    {
        out[entry.class] = (out[entry.class] ?? 0) + entry.levels;
        // Also addressable by the short name used in formulas: classLevel(monk).
        const short = entry.class.split(".").pop() ?? entry.class;
        out[short] = (out[short] ?? 0) + entry.levels;
    }

    return out;
}

export function totalLevel(character: Character): number
{
    return (character.choices.classes ?? []).reduce((sum, c) => sum + c.levels, 0);
}

export interface FactsInput
{
    readonly character: Character;
    readonly set: PackageSet;
    readonly features: ReadonlySet<string>;
    readonly proficiencies: ReadonlySet<string>;
    readonly abilities: Readonly<Record<string, number>>;
    readonly knownSpells: ReadonlySet<string>;
}

export function buildFacts(input: FactsInput): Facts
{
    const { character, set } = input;
    const equipment = equippedItems(character, set);
    const armor = equipment.armor?.item;
    const strength = input.abilities["str"] ?? 10;
    const weapons: WieldedWeapon[] = equipment.weapons.map((w) => ({
        id: w.id,
        properties: w.item.properties ?? [],
        ...(w.item.category === "simple" || w.item.category === "martial" ? { category: w.item.category } : {}),
        ranged: w.item.ranged === true,
        monkWeapon: w.item.monkWeapon === true
    }));
    const worn = armor?.category;
    const armorCategory = (worn === "light" || worn === "medium" || worn === "heavy") ? worn : "none";

    return {
        level: totalLevel(character),
        classLevels: classLevelsOf(character),
        classes: (character.choices.classes ?? []).map((c) => c.class),
        ...(character.choices.species !== undefined ? { species: character.choices.species } : {}),
        ...(character.choices.subspecies !== undefined ? { subspecies: character.choices.subspecies } : {}),
        features: input.features,
        abilities: input.abilities,
        proficiencies: input.proficiencies,
        armorCategory: armorCategory,
        armorStrengthUnmet: (armor?.strengthMin !== undefined) && (strength < armor.strengthMin),
        shield: equipment.shield !== undefined,
        weapons: weapons,
        conditions: new Set(character.state.conditions.map((c) => c.condition)),
        toggles: new Set((character.state.toggles ?? []).map((t) => t.state)),
        resources: Object.fromEntries(Object.entries(character.state.resources).map(([k, v]) => [k, v ?? 0])),
        answers: Object.fromEntries(Object.entries(character.choices.answers ?? {}).map(([k, v]) => [k, v ?? []])),
        knownSpells: input.knownSpells
    };
}
