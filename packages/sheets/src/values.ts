/**
 * What a sheet template writes: the character's section tree and state read into rows (abilities, skills) and
 * named values, one per form field. Nothing is computed here that the engine did not compute; the words are the
 * composer's. Without a character every value is empty and the rows are the ruleset's standard ones: the blank sheet.
 */

import { createTranslate } from "@byloth/dnd-platform-composer";
import type {
    AbilitiesBlock, AttacksBlock, Block, ConditionsBlock, EquipmentBlock, FeaturesBlock, IdentityBlock, NotesBlock,
    PersonalityBlock, ResourcesBlock, SectionTree, SkillsBlock, SpellcastingBlock, SpellsBlock, ValuesBlock
} from "@byloth/dnd-platform-composer";
import type { Character } from "@byloth/dnd-platform-engine";
import type { PackageSet } from "@byloth/dnd-platform-loader";

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
    /** The ability's id (`dex`), for the sheet's formulas; empty when the tree's abbreviation matches none. */
    readonly ability: string;
    readonly abbreviation: string;
    readonly bonus: string;
    readonly mark: "untrained" | "proficient" | "expertise";
}
export interface AttackValues { readonly name: string, readonly bonus: string, readonly damage: string }
/** A resource of page 2: pips to tick when it is small, "left / max" otherwise. */
export interface ResourceValues
{
    readonly name: string;
    /** Pips to draw; 0 when the resource is written as "left / max". */
    readonly pips: number;
    /** How many are spent now (the pips ticked). */
    readonly spent: number;
    readonly left: string;
    readonly max: string;
    readonly recharge: string;
}
/** A spellcasting class of page 3. */
export interface CasterValues
{
    readonly name: string;
    readonly ability: string;
    /** The ability's id, for the sheet's formulas; empty when its name matches no ability row. */
    readonly abilityId: string;
    readonly dc: string;
    readonly attackBonus: string;
}
export interface SpellLine { readonly label: string, readonly prepared: boolean }

export interface SheetValues
{
    readonly language: string;
    readonly abilities: readonly AbilityValues[];
    readonly skills: readonly SkillValues[];
    readonly attacks: readonly AttackValues[];
    readonly resources: readonly ResourceValues[];
    readonly casters: readonly CasterValues[];
    /** The spells by level: index 0 the cantrips, 1–9 the levels. */
    readonly spells: readonly (readonly SpellLine[])[];
    /** True for the blank sheet: every page is printed, every row empty. */
    readonly blank: boolean;
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
    /** The character's package set: the cards take the spells' full entries from it. */
    readonly packages?: PackageSet;
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
                ability: ability,
                abbreviation: t(`sheet.abbreviations.${ability}`),
                bonus: "",
                mark: "untrained" as const
            }))
            .sort((a, b) => a.name.localeCompare(b.name, input.language));

        return {
            language: input.language,
            abilities: abilities,
            skills: skills,
            attacks: [],
            resources: [],
            casters: [],
            spells: Array.from({ length: 10 }, () => []),
            blank: true,
            text: {},
            checks: {}
        };
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
    const abilityOf = new Map(ABILITIES.map((id) => [t(`sheet.abbreviations.${id}`), id as string]));
    const skills = (skillsBlock?.rows ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        ability: abilityOf.get(row.ability) ?? "",
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

    // Features: names by origin, their text on the cards
    const features = featuresText(tree);
    if (features !== "") { text["features"] = features; }

    // Page 2: appearance, backstory, resources, conditions
    const appearance = personality.find((f) => f.label === t("sheet.personality.appearance"));
    if (appearance) { text["appearance"] = appearance.text; }
    const notesText = (block(tree, "notes", "notes") as NotesBlock | undefined)?.text;
    if (notesText) { text["backstory"] = notesText; }
    const resourceItems = (block(tree, "resources", "resources") as ResourcesBlock | undefined)?.items ?? [];
    const resources = resourceItems.map((item) =>
    {
        const max = typeof item.max === "number" ? item.max : Number.NaN;
        const current = item.current ?? max;
        const pips = (item.pips && (max <= 10)) ? max : 0;

        return {
            name: item.name,
            pips: pips,
            spent: pips > 0 ? Math.max(0, max - current) : 0,
            left: Number.isFinite(current) ? String(current) : "",
            max: item.shownMax,
            recharge: item.recharge
        };
    });
    const conditions = (block(tree, "conditions", "conditions") as ConditionsBlock | undefined)?.items ?? [];
    if (conditions.length > 0) { text["conditions"] = conditions.join("\n"); }

    // Page 3: the casters, their slots by level (Pact Magic's apart), the spells by level
    casters.forEach((c, i) =>
    {
        text[`caster-${i + 1}-class`] = c.name;
        text[`caster-${i + 1}-ability`] = c.ability;
        text[`caster-${i + 1}-dc`] = c.dc;
        text[`caster-${i + 1}-attack`] = c.attackBonus;
    });
    const casterValues = casters.map((c) => ({
        name: c.name,
        ability: c.ability,
        abilityId: abilities.find((a) => a.name === c.ability)?.id ?? "",
        dc: c.dc,
        attackBonus: c.attackBonus
    }));
    for (let level = 1; level <= 9; level += 1)
    {
        const slots = casters.flatMap((c) => c.slots).filter((slot) => slot.level === level);
        const shared = Math.max(0, ...slots.filter((slot) => !slot.pact).map((slot) => slot.max));
        const pact = slots.filter((slot) => slot.pact).reduce((sum, slot) => sum + slot.max, 0);
        const parts = [shared > 0 ? String(shared) : "", pact > 0 ? `${pact} ${labels.pact}` : ""]
            .filter((p) => p !== "");
        if (parts.length > 0) { text[`slots-${level}-total`] = parts.join(" + "); }
    }
    const levels = (block(tree, "spells", "spells") as SpellsBlock | undefined)?.levels ?? [];
    const spells: SpellLine[][] = Array.from({ length: 10 }, () => []);
    for (const level of levels)
    {
        spells[Math.min(9, Math.max(0, level.level))]!.push(...level.items.map((item) => ({
            label: item.label,
            prepared: (item.spell.as === "prepared") || (item.spell.as === "always-prepared")
        })));
    }

    return {
        language: input.language,
        abilities: abilities,
        skills: skills,
        attacks: attacks,
        resources: resources,
        casters: casterValues,
        spells: spells,
        blank: false,
        text: text,
        checks: checks
    };
}

/**
 * The features box of page 1: the names by origin; with `references`, each name followed by where its card is
 * ("→ p. 4", `reference(page)`).
 */
export function featuresText(tree: SectionTree, references?: ReadonlyMap<string, string>): string
{
    const groups = (block(tree, "features", "features") as FeaturesBlock | undefined)?.groups ?? [];

    return groups
        .map((g) => `${g.label}\n${g.items.map((i) =>
        {
            const reference = references?.get(i.id);

            return reference ? `• ${i.name} ${reference}` : `• ${i.name}`;
        }).join("\n")}`)
        .join("\n\n");
}
