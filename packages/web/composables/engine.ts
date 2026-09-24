import type { HelpLevel, Translate } from "@byloth/dnd-platform-composer";
import { loadPackages } from "@byloth/dnd-platform-loader";
import type { PackageSet, PackageSource } from "@byloth/dnd-platform-loader";
import type { Character } from "@byloth/dnd-platform-engine";
import { stableStringify } from "@byloth/dnd-platform-schema";

import { composeSheet } from "./sheet";
import type { ComposedSheet } from "./sheet";

/**
 * The rules engine for the pages (docs/phase-1/01-web-application.md): package sets and sheets memoised in
 * memory. A package set is keyed by the package versions and the pins; a sheet by the character document,
 * the package versions and the language. The engine version, the fourth part of the rule of
 * docs/15-logical-architecture.md, is constant within one page load, which is as long as these caches
 * live; a cache that outlived the page would have to add it.
 */

const CAPACITY = 16;

/**
 * The performance measure around a derivation and its composition, package loading excluded (the budget of
 * docs/phase-1/07-testing-accessibility-performance.md: under 100 ms on the reference phone). Only the last one
 * is kept, so the timeline never grows.
 */
export const DERIVE_MEASURE = "dnd:derive";
const _DERIVE_START = `${DERIVE_MEASURE}:start`;

/** A map that forgets its least recently used entry past its capacity. */
class LeastRecentlyUsed<V>
{
    private readonly _entries = new Map<string, V>();

    public constructor(private readonly _capacity: number) { }

    public get(key: string): V | undefined
    {
        const value = this._entries.get(key);
        if (value !== undefined)
        {
            this._entries.delete(key);
            this._entries.set(key, value);
        }

        return value;
    }

    public set(key: string, value: V): void
    {
        this._entries.delete(key);
        this._entries.set(key, value);
        if (this._entries.size > this._capacity) { this._entries.delete(this._entries.keys().next().value!); }
    }

    public clear(): void { this._entries.clear(); }
}

const _sets = new LeastRecentlyUsed<PackageSet>(CAPACITY);
const _sheets = new LeastRecentlyUsed<ComposedSheet>(CAPACITY);
const _stats = { packageSets: 0, sheets: 0 };

/** The versions a set of sources stands for, independent of their order. */
function _versions(sources: readonly PackageSource[]): string
{
    return sources.map((s) => `${s.manifest.id}@${s.manifest.version}`).sort()
        .join(",");
}

function _pins(character: Character): Record<string, string>
{
    return Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
}

export interface SheetOptions
{
    readonly language?: string;
    readonly helpLevel?: HelpLevel;
    /** The interface's translation of the composer's `sheet.*` strings; the composer's own when absent. */
    readonly translate?: Translate;
}

export function useEngine()
{
    /** The package set of the sources, loaded with the given pins; computed once per versions and pins. */
    const packageSet = (sources: readonly PackageSource[], pins: Readonly<Record<string, string>> = {}): PackageSet =>
    {
        const key = `${_versions(sources)}|${stableStringify(pins)}`;
        const cached = _sets.get(key);
        if (cached) { return cached; }

        const set = loadPackages(sources, { pins: pins });
        _stats.packageSets += 1;
        _sets.set(key, set);

        return set;
    };

    /**
     * The computed sheet and its section tree; computed once per character document, versions, language and help
     * level (the translation follows the language).
     */
    const sheet = (
        character: Character, sources: readonly PackageSource[], options: SheetOptions = {}
    ): ComposedSheet =>
    {
        const { language, helpLevel } = options;
        const key = `${stableStringify(character)}|${_versions(sources)}|${language ?? ""}|${helpLevel ?? ""}`;
        const cached = _sheets.get(key);
        if (cached) { return cached; }

        const set = packageSet(sources, _pins(character));

        performance.mark(_DERIVE_START);
        const composed = composeSheet(character, set, options);
        performance.clearMeasures(DERIVE_MEASURE);
        performance.measure(DERIVE_MEASURE, _DERIVE_START);
        performance.clearMarks(_DERIVE_START);
        _stats.sheets += 1;
        _sheets.set(key, composed);

        return composed;
    };

    /** How many package sets and sheets were computed rather than served from memory (tests, diagnostics). */
    const stats = (): Readonly<typeof _stats> => ({ ..._stats });

    const clear = (): void =>
    {
        _sets.clear();
        _sheets.clear();
        _stats.packageSets = 0;
        _stats.sheets = 0;
    };

    return { packageSet, sheet, stats, clear };
}
