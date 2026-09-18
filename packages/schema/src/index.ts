/**
 * Content format v0 — shared vocabulary.
 *
 * The JSON Schemas under `schemas/` are the source of truth (M0.2); the
 * TypeScript types will be generated from them into `src/generated/`.
 * Until then this module only fixes the version of the format and the
 * closed enumerations that every other package refers to.
 */

export const FORMAT_VERSION = 0 as const;

export const PACKAGE_KINDS = ["base", "extension", "translation"] as const;
export type PackageKind = (typeof PACKAGE_KINDS)[number];

export const VISIBILITIES = ["public", "campaign", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const ACTIVATION_TYPES = ["action", "bonus-action", "reaction", "free", "special"] as const;
export type ActivationType = (typeof ACTIVATION_TYPES)[number];

export const EFFECT_KINDS = [
    "modify",
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
