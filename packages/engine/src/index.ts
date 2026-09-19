/**
 * Engine contract — see docs/phase-0/03-engine-contract.md.
 *
 * Every function here is pure: no I/O, no clock, no randomness. Callers
 * read files and roll dice; the engine only computes.
 *
 * Content and character types come from the schema package (generated from
 * the JSON Schemas); the engine's own input and output types are defined
 * here. `apply`/`undo` bodies arrive in M0.7.
 */

import type {
    Character,
    Condition,
    Effect,
    EntityType,
    LocalizedString,
    PackageManifest,
    PlayEffect,
    Ruleset
} from "@byloth/dnd-platform-schema";

export { assertNever, effectKind, playEffectKind } from "./effects.js";
export { canonicalize, stableStringify } from "./canonical.js";
export { loadPackages } from "./load/index.js";
export { derive, explain } from "./derive/index.js";
export { evaluateFormula, formulaReferences } from "./formula/evaluate.js";
export type { DiceExpression, FormulaEnvironment, FormulaValue } from "./formula/evaluate.js";
export { evaluateWhen } from "./conditions/evaluate.js";
export type { Facts, WieldedWeapon } from "./conditions/evaluate.js";
export type { Character, Condition, Effect, PackageManifest, PlayEffect, Ruleset };

export type EntityId = string;
export type ValuePath = string;

// ---- packages -----------------------------------------------------------------

/** One entity as read from a package directory (translations and patches included). */
export interface SourceEntity
{
    readonly type: EntityType | "translation";
    readonly id: string;
    readonly data: unknown;
    /** Path inside the package, for diagnostics. */
    readonly file?: string;
}
export interface PackageSource
{
    readonly manifest: PackageManifest;
    readonly ruleset?: Ruleset;
    readonly entities: readonly SourceEntity[];
}
export interface LoadOptions
{
    /** Package id → exact version required (from a character's pins). */
    readonly pins?: Readonly<Record<string, string>>;
    readonly language?: string;
}
export interface ResolvedEntity
{
    readonly type: EntityType;
    readonly id: EntityId;
    readonly data: unknown;
    readonly package: string;
    /** Ids of the patches applied to this entity, in order. */
    readonly patchedBy: readonly EntityId[];
}
export interface PackageSet
{
    /** Topological order, base first; deterministic tie-break by id. */
    readonly order: readonly PackageManifest[];
    readonly ruleset: Ruleset;
    readonly rulesetPackage: string;
    readonly entities: ReadonlyMap<EntityId, ResolvedEntity>;
    readonly diagnostics: Diagnostics;
}

// ---- diagnostics ----------------------------------------------------------------

export interface Diagnostic
{
    readonly severity: "error" | "warning" | "info";
    readonly code: string;
    readonly message: string;
    readonly package?: string;
    readonly entity?: EntityId;
    readonly path?: string;
}
export interface Diagnostics
{
    readonly ok: boolean;
    readonly entries: readonly Diagnostic[];
}

// ---- computed sheet -------------------------------------------------------------------

export type CharacterState = Character["state"];
export type PackageRef = Character["packages"][number];

export interface ContributionSource
{
    readonly package: string;
    readonly entity?: EntityId;
    readonly feature?: EntityId;
    readonly effectIndex?: number;
}
export interface Contribution
{
    readonly kind: "base" | "add" | "set" | "set-formula" | "mul" | "min" | "max" | "patch";
    readonly value: number | string;
    readonly formula?: string;
    readonly label: LocalizedString;
    readonly source: ContributionSource;
    /** False when a `when` condition kept the contribution out of the value. */
    readonly applied: boolean;
}
export type Provenance = readonly Contribution[];
export interface DerivedValue
{
    readonly value: number | string;
    readonly provenance: Provenance;
}

export type FeatureOrigin =
    "species" | "subspecies" | "class" | "subclass" | "background" | "feat" | "item" | "condition" | "option";

export interface FeatureView
{
    readonly id: EntityId;
    readonly name: LocalizedString;
    readonly text?: LocalizedString;
    readonly origin: FeatureOrigin;
    readonly owner: EntityId;
    readonly level?: number;
    readonly source: ContributionSource;
}
export interface ProficiencyView
{
    readonly type: "skill" | "save" | "armor" | "weapon" | "tool" | "language";
    readonly item: string;
    readonly expertise: boolean;
    readonly source: ContributionSource;
}
export interface ResourceView
{
    readonly id: string;
    readonly name: LocalizedString;
    readonly max: DerivedValue;
    /** Current value from the character state; null when the state has no entry yet. */
    readonly current: number | null;
    readonly recharge: readonly { readonly on: string, readonly amount: string | number }[];
    readonly display: "pips" | "counter";
    readonly source: ContributionSource;
}
export interface ResolvedRoll
{
    readonly type: "attack" | "damage" | "save" | "healing";
    readonly ability?: string;
    readonly bonus?: DerivedValue;
    readonly dice?: string;
    readonly damageType?: string;
    readonly dc?: DerivedValue;
    readonly onSuccess?: "half" | "none";
}
export type ActionCost =
    { readonly resource: string, readonly amount: number } |
    { readonly resource: "spell-slot", readonly level: number };
export interface ActionView
{
    readonly id: string;
    readonly name: LocalizedString;
    readonly activation: "action" | "bonus-action" | "reaction" | "free" | "special";
    readonly cost: readonly ActionCost[];
    readonly requires?: { readonly afterAction?: string, readonly condition?: Condition };
    readonly dc?: DerivedValue;
    readonly rolls?: readonly ResolvedRoll[];
    readonly text?: LocalizedString;
    readonly toggle?: string;
    readonly onUse?: readonly PlayEffect[];
    readonly onHit?: readonly PlayEffect[];
    readonly source: ContributionSource;
    /** False when the action's own `when` is not met; the action is listed but greyed out. */
    readonly available: boolean;
}
export interface RollModifierTarget
{
    readonly type: string;
    readonly ability?: string;
    readonly skill?: string;
    readonly against?: readonly string[];
}
export interface RollModifierView
{
    readonly kind: "advantage" | "disadvantage";
    readonly on: RollModifierTarget;
    readonly note?: LocalizedString;
    readonly source: ContributionSource;
    readonly applied: boolean;
}
export interface DefenseView
{
    readonly defense: "resistance" | "immunity" | "vulnerability" | "condition-immunity";
    readonly to: readonly string[];
    readonly source: ContributionSource;
}
export interface ChoiceView
{
    /** `<owner id>#<choice id>`, the key used in `character.choices.answers`. */
    readonly key: string;
    readonly owner: EntityId;
    readonly choice: string;
    readonly of: string;
    readonly count: number;
    readonly options: readonly string[];
    readonly answers: readonly string[];
    readonly answered: boolean;
    readonly level?: number;
}
export interface SheetMeta
{
    readonly characterId: string;
    readonly name: string;
    readonly ruleset: string;
    readonly packages: readonly PackageRef[];
    readonly formatVersion: number;
    readonly language: string;
}
export interface DeriveOptions
{
    readonly language?: string;
    readonly includeText?: boolean;
}
export interface ComputedSheet
{
    readonly meta: SheetMeta;
    readonly level: number;
    readonly classes: readonly { readonly class: EntityId, readonly subclass?: EntityId, readonly levels: number }[];
    readonly values: Readonly<Record<ValuePath, DerivedValue>>;
    readonly features: readonly FeatureView[];
    readonly proficiencies: readonly ProficiencyView[];
    readonly resources: readonly ResourceView[];
    readonly actions: readonly ActionView[];
    readonly rollModifiers: readonly RollModifierView[];
    readonly defenses: readonly DefenseView[];
    readonly choices: readonly ChoiceView[];
    readonly sections: readonly string[];
    readonly warnings: readonly Diagnostic[];
}

// ---- play ----------------------------------------------------------------------------

export interface HitDieRoll
{
    readonly die: number;
    readonly rolls: readonly number[];
}
export type PlayEvent =
    { readonly type: "damage", readonly amount: number, readonly damageType?: string } |
    { readonly type: "heal", readonly amount: number } |
    { readonly type: "temp-hp", readonly amount: number } |
    { readonly type: "spend-resource", readonly resource: string, readonly amount: number } |
    { readonly type: "restore-resource", readonly resource: string, readonly amount: number } |
    { readonly type: "cast-spell", readonly spell: EntityId, readonly slotLevel?: number } |
    { readonly type: "end-concentration" } |
    { readonly type: "end-spell", readonly spell: EntityId } |
    { readonly type: "toggle", readonly state: string, readonly on: boolean } |
    { readonly type: "apply-condition", readonly condition: EntityId } |
    { readonly type: "remove-condition", readonly condition: EntityId } |
    { readonly type: "short-rest", readonly hitDice: readonly HitDieRoll[] } |
    { readonly type: "long-rest" } |
    { readonly type: "death-save", readonly roll: number } |
    { readonly type: "stabilise" } |
    { readonly type: "inspiration", readonly value: boolean } |
    { readonly type: "use-action", readonly action: string } |
    { readonly type: "end-turn" } |
    { readonly type: "note", readonly text: string };

export interface LogEntry
{
    readonly id: string;
    readonly event: PlayEvent;
    readonly before: Partial<CharacterState>;
    readonly after: Partial<CharacterState>;
}
export interface ApplyResult
{
    readonly state: CharacterState;
    readonly entry: LogEntry;
    readonly warnings: readonly Diagnostic[];
}

// ---- play contract (M0.7) --------------------------------------------------------------

const NOT_IMPLEMENTED = "Not implemented yet: scheduled for milestone M0.7.";

export function validate(set: PackageSet): Diagnostics
{
    // Referential integrity and coherence rules arrive in M0.4; loading already reports structure problems.
    return set.diagnostics;
}

export function apply(sheet: ComputedSheet, state: CharacterState, event: PlayEvent): ApplyResult
{
    void sheet;
    void state;
    void event;

    throw new Error(NOT_IMPLEMENTED);
}

export function undo(state: CharacterState, entry: LogEntry): CharacterState
{
    void state;
    void entry;

    throw new Error(NOT_IMPLEMENTED);
}
