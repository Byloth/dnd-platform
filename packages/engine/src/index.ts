/**
 * Engine contract — see docs/phase-0/03-engine-contract.md.
 *
 * Every function here is pure: no I/O, no clock, no randomness. Callers
 * read files and roll dice; the engine only computes.
 *
 * Content and character types come from the schema package (generated from
 * the JSON Schemas); the engine's own output types are defined here. Bodies
 * are filled in M0.3 (derive) and M0.7 (apply).
 */

import type {
    Character,
    Effect,
    PackageManifest,
    PlayEffect,
    Ruleset
} from "@byloth/dnd-platform-schema";

export { assertNever, effectKind, playEffectKind } from "./effects.js";
export type { Character, Effect, PackageManifest, PlayEffect, Ruleset };

export type EntityId = string;
export type ValuePath = string;

// ---- packages ---------------------------------------------------------------

export interface PackageSource
{
    readonly manifest: PackageManifest;
    readonly ruleset?: Ruleset;
    readonly entities: readonly Record<string, unknown>[];
    readonly patches: readonly Record<string, unknown>[];
    readonly translations: readonly Record<string, unknown>[];
}
export interface LoadOptions
{
    readonly pins?: Readonly<Record<string, string>>;
    readonly language?: string;
}
export interface PackageSet
{
    readonly order: readonly PackageManifest[];
    readonly ruleset: Ruleset;
    readonly diagnostics: Diagnostics;
}

// ---- diagnostics --------------------------------------------------------------

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

// ---- computed sheet --------------------------------------------------------------

export type CharacterState = Character["state"];

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
    readonly label: Readonly<Record<string, string>>;
    readonly source: ContributionSource;
    readonly applied: boolean;
}
export type Provenance = readonly Contribution[];
export interface DerivedValue
{
    readonly value: number | string;
    readonly provenance: Provenance;
}
export interface DeriveOptions
{
    readonly language?: string;
    readonly includeText?: boolean;
}
export interface SheetMeta
{
    readonly characterId: string;
    readonly ruleset: string;
    readonly formatVersion: number;
    readonly language: string;
}
export interface ComputedSheet
{
    readonly meta: SheetMeta;
    readonly level: number;
    readonly values: Readonly<Record<ValuePath, DerivedValue>>;
    readonly sections: readonly string[];
    readonly warnings: readonly Diagnostic[];
}

// ---- play -----------------------------------------------------------------------

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

// ---- contract -----------------------------------------------------------------------

const NOT_IMPLEMENTED = "Not implemented yet: scheduled for a later Phase 0 milestone.";

export function loadPackages(sources: readonly PackageSource[], options?: LoadOptions): PackageSet
{
    void sources;
    void options;

    throw new Error(NOT_IMPLEMENTED);
}

export function validate(set: PackageSet): Diagnostics
{
    void set;

    throw new Error(NOT_IMPLEMENTED);
}

export function derive(character: Character, set: PackageSet, options?: DeriveOptions): ComputedSheet
{
    void character;
    void set;
    void options;

    throw new Error(NOT_IMPLEMENTED);
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

export function explain(sheet: ComputedSheet, path: ValuePath): Provenance
{
    void sheet;
    void path;

    throw new Error(NOT_IMPLEMENTED);
}
