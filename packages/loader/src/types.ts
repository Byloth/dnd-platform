/**
 * The loader's contract: the package sources it reads and the package set it
 * produces, the input of the rules engine (docs/phase-1/02-content-and-character-stores.md).
 */

import type { EntityType, PackageManifest, Ruleset } from "@byloth/dnd-platform-schema";

export type EntityId = string;

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
