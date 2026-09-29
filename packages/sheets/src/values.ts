/**
 * What a sheet template writes: the character's section tree and state read into rows (abilities, skills) and
 * named values, one per form field. Nothing is computed here that the engine did not compute; the words are the
 * composer's. Without a character every value is empty and the rows are the ruleset's standard ones: the blank sheet.
 */

import { createTranslate } from "@byloth/dnd-platform-composer";
import type {
    AbilitiesBlock, AttacksBlock, Block, EquipmentBlock, FeaturesBlock, IdentityBlock, PersonalityBlock,
    SectionTree, SkillsBlock, SpellcastingBlock, ValuesBlock
} from "@byloth/dnd-platform-composer";
import type { Character } from "@byloth/dnd-platform-engine";

import { sheetLabels } from "./labels.js";

export interface AbilityValues
{
    readonly id: string;
    readonly name: string;
    readonly abbreviation: string;
    readonly score: string;
    readonly modifier: string;
    readonly save: string;
    readonly saveProficient: boolean;
}
export interface SkillValues
{
    readonly id: string;
    readonly name: string;
    readonly abbreviation: string;
    readonly bonus: string;
    readonly mark: "untrained" | "proficient" | "expertise";
}
export interface AttackValues { readonly name: string, readonly bonus: string, readonly damage: string }

export interface SheetValues
{
    readonly language: string;
    readonly abilities: readonly AbilityValues[];
    readonly skills: readonly SkillValues[];
    readonly attacks: readonly AttackValues[];
    /** Every other field, by name; an absent name is an empty field. */
    readonly text: Readonly<Record<string, string>>;
    /** Check boxes by name; an absent name is unchecked. */
    readonly checks: Readonly<Record<string, boolean>>;
}

export interface SheetInput
{
    readonly language: string;
    /** The composed tree of the character; absent for the blank sheet. */
    readonly tree?: SectionTree;
    readonly character?: Character;
}

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
/** The SRD's eighteen skills and their abilities, for the blank sheet. */
const SKILLS: readonly (readonly [string, string])[] = [
    ["acrobatics", "dex"], ["animal-handling", "wis"], ["arcana", "int"], ["athletics", "str"],
    ["deception", "cha"], ["history", "int"], ["insight", "wis"], ["intimidation", "cha"],
    ["investigation", "int"], ["medicine", "wis"], ["nature", "int"], ["perception", "wis"],
    ["performance", "cha"], ["persuasion", "cha"], ["religion", "int"], ["sleight-of-hand", "dex"],
    ["stealth", "dex"], ["survival", "wis"]
];
const COINS = ["copper", "silver", "electrum", "gold", "platinum"] as const;

type BlockOf<K extends Block["kind"]> = Extract<Block, { kind: K }>;

function block<K extends Block["kind"]>(tree: SectionTree, section: string, kind: K): BlockOf<K> | undefined
{
    const found = tree.sections.find((s) => s.id === section)?.blocks.find((b) => b.kind === kind);

    return found as BlockOf<K> | undefined;
}

export function sheetValues(input: SheetInput): SheetValues
{
    const t = createTranslate(input.language);
    const labels = sheetLabels(input.language);
    const tree = input.tree;
    const character = input.character;

    if (!tree || !character)
    {
        const abilities = ABILITIES.map((id) => ({
            id: id,
            name: t(`sheet.abilities.${id}`),
            abbreviation: t(`sheet.abbreviations.${id}`),
            score: "",
            modifier: "",
            save: "",
            saveProficient: false
        }));
        const skills = SKILLS
            .map(([id, ability]) => ({
                id: id,
                name: t(`sheet.skills.${id}`),
                abbreviation: t(`sheet.abbreviations.${ability}`),
                bonus: "",
                mark: "untrained" as const
            }))
            .sort((a, b) => a.name.localeCompare(b.name, input.language));

        return { language: input.language, abilities: abilities, skills: skills, attacks: [], text: {}, checks: {} };
    }

    const text: Record<string, string> = {};
    const checks: Record<string, boolean> = {};
    const state = character.state;

    // Header
    const identity = block(tree, "identity", "identity") as IdentityBlock | undefined;
    if (identity)
    {
        text["name"] = identity.name;
        // One class with its subclass; several without theirs, which the features list by name.
        const single = identity.classes.length === 1;
        text["class-level"] = identity.classes
            .map((c) => ((c.subclass && single) ? `${c.name} ${c.levels} (${c.subclass})` : `${c.name} ${c.levels}`))
            .join(" / ");
        if (identity.background) { text["background"] = identity.background; }
        if (identity.species)
        {
            text["species"] = identity.subspecies ? `${identity.species} (${identity.subspecies})` : identity.species;
        }
        if (identity.alignment) { text["alignment"] = identity.alignment; }
    }

    // Abilities and saves
    const abilityRows = (block(tree, "abilities", "abilities") as AbilitiesBlock | undefined)?.rows ?? [];
    const abilities = abilityRows.map((row) => ({
        id: row.id,
        name: row.name,
        abbreviation: t(`sheet.abbreviations.${row.id}`),
        score: row.score,
        modifier: row.modifier,
        save: row.save,
        saveProficient: row.proficient
    }));

    // Skills and the other proficiencies
    const skillsBlock = block(tree, "skills", "skills") as SkillsBlock | undefined;
    const skills = (skillsBlock?.rows ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        abbreviation: row.ability,
        bonus: row.bonus,
        mark: row.mark
    }));
    const proficiencies = (skillsBlock?.proficiencies ?? []).map((g) => `${g.label}: ${g.items.join(", ")}`);
    if (proficiencies.length > 0) { text["proficiencies"] = proficiencies.join("\n"); }

    // Core values
    const core = (block(tree, "core", "values") as ValuesBlock | undefined)?.items ?? [];
    const shown = (id: string): string | undefined => core.find((i) => i.id === id)?.shown;
    const set = (name: string, value: string | undefined): void =>
    {
        if (value) { text[name] = value; }
    };
    set("ac", shown("ac"));
    set("initiative", shown("initiative"));
    const speeds = (shown("speed") ?? "").split(", ").filter((s) => s !== "");
    set("speed", speeds[0]);
    set("speed-other", speeds.slice(1).join(", "));
    set("proficiency-bonus", shown("proficiency"));
    set("passive-perception", shown("passive-perception"));
    const hpMax = core.find((i) => i.id === "hp")?.value?.value;
    if (typeof hpMax === "number") { text["hp-max"] = String(hpMax); }
    text["hp-current"] = String(state.hp.current);
    if (state.hp.temporary > 0) { text["hp-temporary"] = String(state.hp.temporary); }
    const dice = (shown("hit-dice") ?? "").replace(/\s*\(.*\)$/, "");
    set("hit-dice-total", dice);
    const total = dice.split("+").reduce((sum, part) => sum + (Number.parseInt(part, 10) || 0), 0);
    if (total > 0) { text["hit-dice"] = String(Math.max(0, total - state.hitDice.spent)); }
    checks["inspiration"] = state.inspiration;
    for (let i = 1; i <= 3; i += 1)
    {
        checks[`death-success-${i}`] = state.deathSaves.successes >= i;
        checks[`death-failure-${i}`] = state.deathSaves.failures >= i;
    }

    // Attacks, then spellcasting in the notes under them
    const attackRows = (block(tree, "attacks", "attacks") as AttacksBlock | undefined)?.rows ?? [];
    const attacks = attackRows.map((row) => ({ name: row.name, bonus: row.toHit, damage: row.damage }));
    const casters = (block(tree, "spellcasting", "spellcasting") as SpellcastingBlock | undefined)?.casters ?? [];
    const notes = casters.map((c) => `${labels.spellcasting} (${c.name}): ${c.parts.join(" · ")}`);
    if (notes.length > 0) { text["attacks-notes"] = notes.join("\n"); }

    // Equipment and coins
    const equipment = (block(tree, "equipment", "equipment") as EquipmentBlock | undefined)?.items ?? [];
    const items = equipment.map((i) =>
    {
        const name = i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name;

        return i.flags.length > 0 ? `${name} (${i.flags.join(", ")})` : name;
    });
    if (items.length > 0) { text["equipment"] = items.join(", "); }
    COINS.forEach((coin, i) =>
    {
        const amount = state.currency?.[coin];
        if (amount) { text[`coins-${i + 1}`] = String(amount); }
    });

    // Personality
    const personality = (block(tree, "personality", "personality") as PersonalityBlock | undefined)?.fields ?? [];
    for (const key of ["traits", "ideals", "bonds", "flaws"] as const)
    {
        const field = personality.find((f) => f.label === t(`sheet.personality.${key}`));
        if (field) { text[key] = field.text; }
    }

    // Features: names by origin, their text on the cards of page 3
    const groups = (block(tree, "features", "features") as FeaturesBlock | undefined)?.groups ?? [];
    const features = groups.map((g) => `${g.label}\n${g.items.map((i) => `• ${i.name}`).join("\n")}`);
    if (features.length > 0) { text["features"] = features.join("\n\n"); }

    return {
        language: input.language, abilities: abilities, skills: skills, attacks: attacks, text: text, checks: checks
    };
}
