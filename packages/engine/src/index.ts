/**
 * Engine contract — see docs/phase-0/03-engine-contract.md.
 *
 * Every function here is pure: no I/O, no clock, no randomness. Callers
 * read files and roll dice; the engine only computes.
 *
 * Content and character types come from the schema package (generated from
 * the JSON Schemas); the package set the engine computes from is the
 * loader's product (@byloth/dnd-platform-loader), whose types it re-exports
 * where they appear in its own signatures; the engine's output types are
 * defined here.
 */

import type {
    Character,
    Choice,
    Condition,
    Effect,
    LocalizedString,
    PackageManifest,
    PlayEffect,
    Ruleset,
    Spell
} from "@byloth/dnd-platform-schema";
import type { Diagnostic, Diagnostics, PackageSet, ResolvedEntity } from "@byloth/dnd-platform-loader";

export { assertNever, effectKind, playEffectKind } from "./effects.js";
export { derive, explain } from "./derive/index.js";
export { evaluateFormula, formulaReferences } from "./formula/evaluate.js";
export type { DiceExpression, FormulaEnvironment, FormulaValue } from "./formula/evaluate.js";
export { evaluateWhen } from "./conditions/evaluate.js";
export { matchesItemFilter } from "./items.js";
export { PLAY_EVENT_TYPES, apply, undo } from "./play/index.js";
export type { ApplyOptions } from "./play/index.js";
export type { Facts, WieldedWeapon } from "./conditions/evaluate.js";
export type { Character, Condition, Effect, PackageManifest, PlayEffect, Ruleset };
export type { Diagnostic, Diagnostics, PackageSet, ResolvedEntity };

export type EntityId = string;
export type ValuePath = string;

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
/** What an option must be when a choice lists none (`options: []`): spells of a list, of a level… */
export type ChoiceFilter = NonNullable<Choice["filter"]>;
export interface OptionDetail { readonly name?: LocalizedString, readonly text?: LocalizedString }
export interface ChoiceView
{
    /** `<owner id>#<choice id>`, the key used in `character.choices.answers`. */
    readonly key: string;
    readonly owner: EntityId;
    readonly choice: string;
    readonly of: string;
    readonly count: number;
    readonly options: readonly string[];
    /** When `options` is empty: what the options are (a class's spells up to a level, a list's cantrips). */
    readonly filter?: ChoiceFilter;
    /** The name and text of options declared inside the choice (a fighting style, a favored enemy). */
    readonly optionDetails?: Readonly<Record<string, OptionDetail>>;
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
/** A reminder a feature, item, condition or spell adds to a section of the sheet (`add-text`). */
export interface TextView
{
    readonly section: string;
    readonly text: LocalizedString;
    readonly source: ContributionSource;
}
/** A section a package declares (`add-section`), placed in the middle band of the sheet. */
export interface CustomSectionView
{
    readonly id: string;
    readonly name: LocalizedString;
    readonly layout?: "list" | "cards" | "table" | "text";
    readonly source: ContributionSource;
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
    /** Reminders added to sections, in the order the effects were applied; absent when there are none. */
    readonly texts?: readonly TextView[];
    /** Sections declared by packages that have content; absent when there are none. */
    readonly customSections?: readonly CustomSectionView[];
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
