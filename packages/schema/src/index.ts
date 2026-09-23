/**
 * Content format v0 — shared vocabulary.
 *
 * The JSON Schemas under `schemas/` are the source of truth; the TypeScript
 * types are generated from them into `src/generated/`. This module fixes the
 * version of the format and the closed enumerations that every other package
 * refers to. A test asserts that these constants equal the enums declared in
 * `schemas/common.schema.json`.
 */

export { canonicalize, stableStringify } from "./canonical.js";
export { checkFormula, parseFormula, FORMULA_FUNCTIONS, FORMULA_VARIABLES } from "./formula.js";
export { SCHEMAS } from "./generated/schemas.js";
export type * from "./generated/types.js";
export type {
    BinaryOperator,
    FormulaCheck,
    FormulaFunction,
    FormulaNode,
    FormulaParse,
    FormulaVariable
} from "./formula.js";

export const FORMAT_VERSION = 0 as const;

export const PACKAGE_KINDS = ["base", "extension", "translation"] as const;
export type PackageKind = (typeof PACKAGE_KINDS)[number];

export const VISIBILITIES = ["public", "campaign", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

export const SKILLS = [
    "acrobatics",
    "animal-handling",
    "arcana",
    "athletics",
    "deception",
    "history",
    "insight",
    "intimidation",
    "investigation",
    "medicine",
    "nature",
    "perception",
    "performance",
    "persuasion",
    "religion",
    "sleight-of-hand",
    "stealth",
    "survival"

] as const;
export type Skill = (typeof SKILLS)[number];

export const DAMAGE_TYPES = [
    "acid",
    "bludgeoning",
    "cold",
    "fire",
    "force",
    "lightning",
    "necrotic",
    "piercing",
    "poison",
    "psychic",
    "radiant",
    "slashing",
    "thunder"

] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const ACTIVATION_TYPES = ["action", "bonus-action", "reaction", "free", "special"] as const;
export type ActivationType = (typeof ACTIVATION_TYPES)[number];

export const PROFICIENCY_TYPES = ["skill", "save", "armor", "weapon", "tool", "language"] as const;
export type ProficiencyType = (typeof PROFICIENCY_TYPES)[number];

export const SECTIONS = [
    "identity",
    "core",
    "abilities",
    "saves",
    "skills",
    "senses",
    "combat",
    "attacks",
    "actions",
    "resources",
    "spellcasting",
    "spells",
    "features",
    "equipment",
    "personality",
    "conditions",
    "notes",
    "credits"

] as const;
export type Section = (typeof SECTIONS)[number];

export const EFFECT_KINDS = [
    "modify",
    "modify-attacks",
    "grant-proficiency",
    "declare-resource",
    "add-action",
    "grant-spellcasting",
    "grant-spells",
    "extend-spell-list",
    "roll-advantage",
    "roll-disadvantage",
    "defense",
    "add-text",
    "add-section",
    "open-choice",
    "define-table"

] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];

export const PLAY_EFFECT_KINDS = [
    "heal",
    "tempHp",
    "extraDamage",
    "restoreResource",
    "applyCondition",
    "reroll",
    "note"

] as const;
export type PlayEffectKind = (typeof PLAY_EFFECT_KINDS)[number];

export const ENTITY_TYPES = [
    "class",
    "subclass",
    "species",
    "background",
    "feat",
    "feature",
    "spell",
    "spell-list",
    "item",
    "condition",
    "rule",
    "table",
    "archetype",
    "patch"

] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** `<package>.<type>.<name>` — see docs/phase-0/02-content-format.md. */
export type EntityId = `${string}.${EntityType}.${string}`;

/** Base names of the files under `schemas/` (`<name>.schema.json`). */
export const SCHEMA_NAMES = [
    "common",
    "condition",
    "play-effect",
    "choice",
    "effect",
    "feature",
    "class",
    "subclass",
    "species",
    "background",
    "feat",
    "spell",
    "spell-list",
    "item",
    "condition-entity",
    "rule",
    "table",
    "archetype",
    "patch",
    "translation",
    "package",
    "ruleset",
    "character"

] as const;
export type SchemaName = (typeof SCHEMA_NAMES)[number];

/** Package directory → schema that validates each file in it. */
export const SCHEMA_FOR_DIRECTORY = {
    "classes": "class",
    "subclasses": "subclass",
    "species": "species",
    "backgrounds": "background",
    "feats": "feat",
    "features": "feature",
    "spells": "spell",
    "spell-lists": "spell-list",
    "items": "item",
    "conditions": "condition-entity",
    "rules": "rule",
    "tables": "table",
    "archetypes": "archetype",
    "patches": "patch",
    "translations": "translation"

} as const satisfies Record<string, SchemaName>;
export type EntityDirectory = keyof typeof SCHEMA_FOR_DIRECTORY;

/** Package directory → the entity type its ids must carry (`translations` holds no entities). */
export const ENTITY_TYPE_FOR_DIRECTORY = {
    "classes": "class",
    "subclasses": "subclass",
    "species": "species",
    "backgrounds": "background",
    "feats": "feat",
    "features": "feature",
    "spells": "spell",
    "spell-lists": "spell-list",
    "items": "item",
    "conditions": "condition",
    "rules": "rule",
    "tables": "table",
    "archetypes": "archetype",
    "patches": "patch"

} as const satisfies Partial<Record<EntityDirectory, EntityType>>;
