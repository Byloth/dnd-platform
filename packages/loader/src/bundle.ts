/**
 * Bundles: a `PackageSource` as one canonical JSON document (docs/phase-0/02-content-format.md).
 * Entities are sorted by type then id and every key by the serialiser, so that the same package
 * always gives the same bytes; `JSON.parse` of a bundle is a valid input of `loadPackages`.
 */

import { stableStringify } from "@byloth/dnd-platform-schema";

import type { PackageSource } from "./types.js";

const TYPE_ORDER = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** The bundle of a package source: entities sorted by type then id, every key sorted by the serialiser. */
export function toBundle(source: PackageSource): PackageSource
{
    const entities = [...source.entities].sort((a, b) => TYPE_ORDER(a.type, b.type) || TYPE_ORDER(a.id, b.id));

    return { ...source, entities: entities };
}

export function bundleText(source: PackageSource): string
{
    return stableStringify(toBundle(source));
}

/**
 * The package source of a bundle's text. Only the shape is checked here (a manifest object and an
 * entities array); the content is checked like any other package.
 */
export function parseBundle(text: string, label: string): PackageSource
{
    let value: unknown;
    try { value = JSON.parse(text); }
    catch (error) { throw new Error(`${label}: not a JSON bundle (${(error as Error).message})`, { cause: error }); }

    const bundle = value as Partial<PackageSource> | null;
    if (typeof bundle !== "object" || bundle === null || Array.isArray(bundle))
    {
        throw new Error(`${label}: not a bundle`);
    }
    if (typeof bundle.manifest !== "object" || bundle.manifest === null)
    {
        throw new Error(`${label}: the bundle has no manifest`);
    }
    if (!Array.isArray(bundle.entities)) { throw new Error(`${label}: the bundle has no entities`); }

    return bundle as PackageSource;
}
