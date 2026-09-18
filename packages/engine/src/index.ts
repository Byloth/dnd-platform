/**
 * Engine contract — see docs/phase-0/03-engine-contract.md.
 *
 * Every function here is pure: no I/O, no clock, no randomness. Callers
 * read files and roll dice; the engine only computes.
 *
 * M0.1 ships the signatures with placeholder types so that the contract is
 * fixed and the dependency rules are enforced; M0.2 replaces the placeholder
 * types with the ones generated from the schemas, and M0.3 fills the bodies.
 */

import type { EntityId, FORMAT_VERSION } from "@byloth/dnd-platform-schema";

export type FormatVersion = typeof FORMAT_VERSION;

// ---- placeholder types (replaced in M0.2) --------------------------------

export interface PackageSource { readonly manifest: { readonly id: string, readonly version: string } }
export interface LoadOptions { readonly pins?: Readonly<Record<string, string>>, readonly language?: string }
export interface PackageSet { readonly order: readonly string[], readonly diagnostics: Diagnostics }

export interface Diagnostic
{
    readonly severity: "error" | "warning" | "info";
    readonly code: string;
    readonly message: string;
    readonly package?: string;
    readonly entity?: EntityId;
    readonly path?: string;
}
export interface Diagnostics { readonly ok: boolean, readonly entries: readonly Diagnostic[] }

export interface Character { readonly id: string, readonly name: string }
export interface CharacterState { readonly hp: { readonly current: number, readonly temporary: number } }
export interface DeriveOptions { readonly language?: string, readonly includeText?: boolean }
export interface ComputedSheet
{
    readonly meta: { readonly characterId: string };
    readonly warnings: readonly Diagnostic[];
}

export type ValuePath = string;
export type Provenance = readonly Contribution[];
export interface Contribution { readonly kind: string, readonly value: number | string, readonly applied: boolean }

export interface PlayEvent { readonly type: "note", readonly text: string }
export interface LogEntry { readonly id: string, readonly event: PlayEvent }
export interface ApplyResult
{
    readonly state: CharacterState;
    readonly entry: LogEntry;
    readonly warnings: readonly Diagnostic[];
}

// ---- contract -------------------------------------------------------------

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
