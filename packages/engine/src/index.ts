/**
 * Engine contract — see docs/phase-0/03-engine-contract.md.
 *
 * Every function here is pure: no I/O, no clock, no randomness. Callers
 * read files and roll dice; the engine only computes.
 *
 * Content and character types come from the schema package (generated from
 * the JSON Schemas); the engine's own input and output types are defined
 * here.
 */

import type {
    Character,
    Condition,
    Effect,
    EntityType,
    LocalizedString,
    PackageManifest,
    PlayEffect,
    Ruleset,
    Spell
} from "@byloth/dnd-platform-schema";

export { assertNever, effectKind, playEffectKind } from "./effects.js";
export { canonicalize, stableStringify } from "./canonical.js";
export { loadPackages } from "./load/index.js";
export { validate } from "./validate/index.js";
export { derive, explain } from "./derive/index.js";
export { evaluateFormula, formulaReferences } from "./formula/evaluate.js";
export type { DiceExpression, FormulaEnvironment, FormulaValue } from "./formula/evaluate.js";
export { evaluateWhen } from "./conditions/evaluate.js";
export { PLAY_EVENT_TYPES, apply, undo } from "./play/index.js";
export type { ApplyOptions } from "./play/index.js";
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
// ---- content selection (DEC-20) ---------------------------------------------------

/** One exclusion: every present key must match (AND); filters of a selection combine with OR. */
export interface ExclusionFilter
{
    readonly package?: string;
    /** Resolved type; `species` also matches subspecies. */
    readonly type?: EntityType;
    /** Any of these tags. */
    readonly tags?: readonly string[];
    readonly ids?: readonly EntityId[];
}
/**
 * What a campaign (or, without one, a character) allows: which packages,
 * in which order among siblings, and what to exclude. Nothing is ever
 * incompatible; excluded content becomes inactive and its dependants follow.
 */
export interface Selection
{
    /** Package ids to load; unlisted sources are dropped unless a listed package depends on them. Empty: all. */
    readonly packages?: readonly string[];
    /** Tie-break priority among packages at the same dependency depth (earlier wins ties; later wins patches). */
    readonly order?: readonly string[];
    readonly exclude?: readonly ExclusionFilter[];
}
export interface InactiveVia
{
    /** The inactive entity this one cannot exist without. */
    readonly requires: EntityId;
    /** Pointer of the reference in the dependant's data (`hard`) or of the entry in the owner's data (`contains`). */
    readonly path: string;
    readonly kind: "hard" | "contains";
}
export interface InactiveReason
{
    /** Index of the exclusion filter at the root of the cascade. */
    readonly excludedBy: number;
    /** Absent for a direct match. */
    readonly via?: InactiveVia;
}
export interface CascadeEntry extends InactiveReason { readonly id: EntityId }
export interface ExclusionMatch
{
    readonly filter: ExclusionFilter;
    /** Entities matched directly, sorted. */
    readonly matched: readonly EntityId[];
}
export interface PrunedReference
{
    readonly from: EntityId;
    /** Pointer of the array element removed from `from`. */
    readonly path: string;
    readonly ref: EntityId;
}
export interface CascadeReport
{
    readonly exclusions: readonly ExclusionMatch[];
    /** Every inactive entity, sorted by id, direct matches included. */
    readonly inactive: readonly CascadeEntry[];
    readonly pruned: readonly PrunedReference[];
    readonly empty: boolean;
}

export interface LoadOptions
{
    /** Package id → exact version required (from a character's pins). */
    readonly pins?: Readonly<Record<string, string>>;
    readonly language?: string;
    readonly selection?: Selection;
}
export interface ResolvedEntity
{
    readonly type: EntityType;
    readonly id: EntityId;
    readonly data: unknown;
    readonly package: string;
    /** Ids of the patches applied to this entity, in order. */
    readonly patchedBy: readonly EntityId[];
    /** `false` when excluded by the selection or dependent on something excluded; the entity stays loaded. */
    readonly active: boolean;
    readonly inactiveBecause?: InactiveReason;
    /** For inline features and subspecies: the entity whose data embeds this one, and where. */
    readonly inline?: { readonly owner: EntityId, readonly path: string };
}
export interface PackageSet
{
    /** Topological order, base first; deterministic tie-break by id. */
    readonly order: readonly PackageManifest[];
    readonly ruleset: Ruleset;
    readonly rulesetPackage: string;
    readonly entities: ReadonlyMap<EntityId, ResolvedEntity>;
    readonly diagnostics: Diagnostics;
    /** Effect of `LoadOptions.selection`; empty without one. */
    readonly cascade: CascadeReport;
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
    "species" | "subspecies" | "class" | "subclass" | "background" | "feat" | "item" | "condition" | "option" |
    "spell" | "custom";
/** An expiry as stored in the character state (conditions, toggles, active spells, custom effects). */
export type Expiry = NonNullable<CharacterState["conditions"][number]["expires"]>;
export type SpellDuration = Spell["duration"];

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
export interface PactSlotsView
{
    readonly slots: number;
    readonly level: number;
    readonly current: number | null;
}
export interface SlotView
{
    readonly level: number;
    readonly max: number;
    /** Current slots from the character state; null when the state has no entry yet. */
    readonly current: number | null;
}
export interface SpellcastingView
{
    readonly class: EntityId;
    readonly ability: string;
    readonly dc: DerivedValue;
    readonly attackBonus: DerivedValue;
    readonly preparation: "known" | "prepared" | "spellbook";
    readonly list: EntityId;
    readonly slots: readonly SlotView[];
    /** Pact Magic: all slots share one level. */
    readonly pact?: PactSlotsView;
    readonly cantripsKnown?: number;
    readonly spellsKnown?: number;
    readonly ritual: boolean;
    readonly source: ContributionSource;
}
export type SpellPayment =
    { readonly slot: true } |
    { readonly free: true } |
    { readonly resource: string, readonly amount: number } |
    { readonly uses: number, readonly recharge: string };
export interface SpellView
{
    readonly id: EntityId;
    readonly name: LocalizedString;
    readonly level: number;
    readonly as: "cantrip" | "known" | "prepared" | "always-prepared";
    readonly ability?: string;
    readonly paidWith: SpellPayment;
    /** Class whose spellcasting grants the spell, when any (Pact Magic slots are looked up through it). */
    readonly caster?: EntityId;
    readonly duration: SpellDuration;
    readonly onCast?: readonly PlayEffect[];
    readonly source: ContributionSource;
}
export interface ToggleView
{
    readonly state: string;
    readonly name: LocalizedString;
    readonly expires?: Expiry;
    readonly source: ContributionSource;
}
export interface HitDicePool
{
    readonly die: number;
    readonly total: number;
}
export interface ConditionRef
{
    readonly id: EntityId;
    readonly name: LocalizedString;
    /** Highest level of a levelled condition (exhaustion). */
    readonly maxLevel?: number;
    readonly cumulative?: boolean;
}
/** What the play engine reads from the ruleset, evaluated for this character (docs/phase-0/07). */
export interface PlayRules
{
    /** One pool per class, largest die first. */
    readonly hitDice: readonly HitDicePool[];
    readonly rests: {
        readonly short: { readonly hitDice: "spend" | "none", readonly hours?: number };
        readonly long: {
            readonly hitPoints: "full" | "none";
            readonly hitDiceRecovered: number;
            readonly hours?: number;
            readonly conditionLevelsRecovered?: number;
        };
    };
    readonly concentration?: { readonly saveDc: string };
    readonly deathSaves?: NonNullable<Ruleset["deathSaves"]>;
    /** Every condition entity loaded and active, sorted by id. */
    readonly conditions: readonly ConditionRef[];
}
export interface ExtraDamageView
{
    readonly dice?: string;
    readonly formula?: string;
    readonly damageType?: string;
    readonly source: ContributionSource;
}
export interface AttackView
{
    readonly id: string;
    readonly name: LocalizedString;
    readonly item?: EntityId;
    readonly unarmed: boolean;
    readonly ranged: boolean;
    readonly ability: string;
    readonly proficient: boolean;
    readonly attackBonus: DerivedValue;
    /** Ready to print: `1d8 + 3`. */
    readonly damage: string;
    readonly damageDice: string;
    readonly damageBonus: DerivedValue;
    readonly damageType: string;
    readonly magical: boolean;
    readonly critRange: number;
    readonly extraDamage: readonly ExtraDamageView[];
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
    readonly attacks: readonly AttackView[];
    readonly rollModifiers: readonly RollModifierView[];
    readonly defenses: readonly DefenseView[];
    readonly spellcasting: readonly SpellcastingView[];
    readonly spells: readonly SpellView[];
    readonly toggles: readonly ToggleView[];
    readonly choices: readonly ChoiceView[];
    readonly sections: readonly string[];
    readonly play: PlayRules;
    readonly warnings: readonly Diagnostic[];
}

// ---- play ----------------------------------------------------------------------------

export interface HitDieRoll
{
    readonly die: number;
    readonly rolls: readonly number[];
}
/** Dice results supplied by the caller for recharge amounts that are dice (`1d6 + 1`), by resource id. */
export type RolledAmounts = Readonly<Record<string, number>>;
export type PlayEventBody =
    { readonly type: "damage", readonly amount: number, readonly damageType?: string } |
    { readonly type: "heal", readonly amount: number } |
    { readonly type: "temp-hp", readonly amount: number } |
    { readonly type: "spend-resource", readonly resource: string, readonly amount: number } |
    { readonly type: "restore-resource", readonly resource: string, readonly amount: number } |
    { readonly type: "cast-spell", readonly spell: EntityId, readonly slotLevel?: number, readonly rolled?: number } |
    { readonly type: "end-concentration" } |
    { readonly type: "end-spell", readonly spell: EntityId } |
    { readonly type: "toggle", readonly state: string, readonly on: boolean } |
    {
        readonly type: "apply-condition";
        readonly condition: EntityId;
        readonly level?: number;
        readonly expires?: Expiry;
    } |
    { readonly type: "remove-condition", readonly condition: EntityId } |
    {
        readonly type: "custom-effect";
        readonly name: LocalizedString;
        readonly text?: LocalizedString;
        readonly effects?: readonly Effect[];
        readonly expires?: Expiry;
    } |
    { readonly type: "end-custom-effect", readonly name: LocalizedString } |
    { readonly type: "short-rest", readonly hitDice: readonly HitDieRoll[], readonly rolled?: RolledAmounts } |
    { readonly type: "long-rest", readonly rolled?: RolledAmounts } |
    { readonly type: "dawn", readonly rolled?: RolledAmounts } |
    { readonly type: "death-save", readonly roll: number } |
    { readonly type: "stabilise" } |
    { readonly type: "inspiration", readonly value: boolean } |
    { readonly type: "use-action", readonly action: string, readonly rolled?: number } |
    { readonly type: "start-turn" } |
    { readonly type: "end-turn" } |
    { readonly type: "note", readonly text: string };
/** `force: true` skips the validation of the event against the sheet (DM overrides). */
export type PlayEvent = PlayEventBody & { readonly force?: boolean };

export interface LogEntry
{
    readonly id: string;
    readonly event: PlayEvent;
    /** The touched top-level keys of the state as they were; a key created by the event is absent here. */
    readonly before: Partial<CharacterState>;
    /** The same keys as they are after the event. */
    readonly after: Partial<CharacterState>;
}
export interface ApplyResult
{
    readonly state: CharacterState;
    readonly entry: LogEntry;
    readonly warnings: readonly Diagnostic[];
}
