import { composeCreature, composeEntry, firstSentence, localize, spellClassIds } from "@byloth/dnd-platform-composer";
import type { PackageSet, PackageSource } from "@byloth/dnd-platform-loader";
import type { LocalizedString } from "@byloth/dnd-platform-schema";

/**
 * The compendium (docs/phase-1/13-compendium.md, DEC-25): the package set of everything the device has, and a
 * pure index over it. Every entry's wording comes from the composer (`composeEntry`, `composeCreature`), so the
 * pages format nothing; this file only lists, ranks and filters.
 */

export type CompendiumKind = "spells" | "items" | "creatures" | "conditions";
export const COMPENDIUM_KINDS: readonly CompendiumKind[] = ["spells", "items", "creatures", "conditions"];

const ENTITY_TYPE: Readonly<Record<CompendiumKind, string>> = {
    spells: "spell",
    items: "item",
    creatures: "creature",
    conditions: "condition"
};

export interface CompendiumFacets
{
    readonly packageId: string;
    readonly level?: number;
    readonly school?: string;
    readonly classes?: readonly string[];
    readonly ritual?: boolean;
    readonly concentration?: boolean;
    readonly type?: string;
    readonly category?: string;
    readonly magical?: boolean;
    readonly rarity?: string;
    readonly attunement?: boolean;
    readonly challenge?: number;
    readonly creatureType?: string;
    readonly size?: string;
}

export interface CompendiumEntry
{
    readonly id: string;
    readonly kind: CompendiumKind;
    readonly name: string;
    /** The English name, which an Italian search matches too ("fireball" finds Palla di fuoco). */
    readonly englishName: string;
    /** "3rd-level evocation", "Martial weapon", "Huge dragon, chaotic evil". */
    readonly subtitle: string;
    /** The first sentence of the text; "" when there is none. */
    readonly summary: string;
    /** From a package that is not redistributable: flagged wherever it is shown. */
    readonly private: boolean;
    readonly facets: CompendiumFacets;
}

// ---- the index ------------------------------------------------------------------------

interface EntityData
{
    readonly name?: LocalizedString;
    readonly level?: number;
    readonly school?: string;
    readonly ritual?: boolean;
    readonly duration?: { readonly concentration?: boolean };
    readonly type?: string;
    readonly category?: string;
    readonly magical?: boolean;
    readonly rarity?: string;
    readonly attunement?: unknown;
    readonly challenge?: number;
    readonly creatureType?: string;
    readonly size?: string;
}

const _entries = new WeakMap<PackageSet, Map<string, readonly CompendiumEntry[]>>();

function facetsOf(
    kind: CompendiumKind, data: EntityData, packageId: string, classes: readonly string[]
): CompendiumFacets
{
    switch (kind)
    {
        case "spells": return {
            packageId: packageId,
            level: data.level ?? 0,
            school: data.school ?? "",
            classes: classes,
            ritual: data.ritual === true,
            concentration: data.duration?.concentration === true
        };
        case "items": return {
            packageId: packageId,
            type: data.type ?? "gear",
            ...(data.category ? { category: data.category } : {}),
            magical: data.magical === true,
            ...(data.rarity ? { rarity: data.rarity } : {}),
            attunement: (data.attunement !== undefined) && (data.attunement !== false)
        };
        case "creatures": return {
            packageId: packageId,
            challenge: data.challenge ?? 0,
            creatureType: data.creatureType ?? "",
            size: data.size ?? ""
        };
        default: return { packageId: packageId };
    }
}

/** The kind's own order: spells by level, creatures by challenge, then everything by name. */
function byKindOrder(language: string): (a: CompendiumEntry, b: CompendiumEntry) => number
{
    return (a, b) =>
        ((a.facets.level ?? 0) - (b.facets.level ?? 0)) ||
        ((a.facets.challenge ?? 0) - (b.facets.challenge ?? 0)) ||
        a.name.localeCompare(b.name, language);
}

/** Every entry of a kind in the set, in the kind's order; computed once per set, kind and language. */
export function entriesOf(set: PackageSet, kind: CompendiumKind, language: string): readonly CompendiumEntry[]
{
    let bySet = _entries.get(set);
    if (!bySet)
    {
        bySet = new Map();
        _entries.set(set, bySet);
    }
    const key = `${kind}|${language}`;
    const cached = bySet.get(key);
    if (cached) { return cached; }

    const privatePackages = new Set(set.order.filter((m) => m.redistributable === false).map((m) => m.id));
    const classes = kind === "spells" ? spellClassIds(set) : undefined;
    const options = { packages: set, language: language };
    const entries: CompendiumEntry[] = [];
    for (const entity of set.entities.values())
    {
        if ((entity.type !== ENTITY_TYPE[kind]) || !entity.active || (entity.inline !== undefined)) { continue; }
        const data = entity.data as EntityData;
        let subtitle: string;
        let text: string;
        if (kind === "creatures")
        {
            const block = composeCreature(entity.id, options);
            if (!block) { continue; }
            subtitle = block.header;
            text = block.text ?? "";
        }
        else
        {
            const view = composeEntry(entity.id, options);
            if (!view) { continue; }
            subtitle = view.subtitle;
            text = view.text;
        }
        entries.push({
            id: entity.id,
            kind: kind,
            name: localize(data.name, language) || entity.id,
            englishName: localize(data.name, "en"),
            subtitle: subtitle,
            summary: firstSentence(text),
            private: privatePackages.has(entity.package),
            facets: facetsOf(kind, data, entity.package, classes?.get(entity.id) ?? [])
        });
    }
    entries.sort(byKindOrder(language));
    bySet.set(key, entries);

    return entries;
}

// ---- search -----------------------------------------------------------------------------

/** Lower case, without accents, punctuation as spaces: "Explorer's Pack" and "explorers pack" meet. */
export function normalize(text: string): string
{
    return text.normalize("NFD").replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

/** How well a name answers a query: 0 the whole name … 4 every word somewhere; undefined for no match. */
function score(name: string, query: string, words: readonly string[]): number | undefined
{
    if (!name) { return undefined; }
    if (name === query) { return 0; }
    if (name.startsWith(query)) { return 1; }
    if (` ${name}`.includes(` ${query}`)) { return 2; }
    if (name.includes(query)) { return 3; }
    if ((words.length > 1) && words.every((w) => name.includes(w))) { return 4; }

    return undefined;
}

/** The entries matching the query, best first, ties in the kind's order; all of them for an empty query. */
export function search(entries: readonly CompendiumEntry[], query: string): CompendiumEntry[]
{
    const q = normalize(query);
    if (!q) { return [...entries]; }
    const words = q.split(" ");

    const scored: { entry: CompendiumEntry, score: number, index: number }[] = [];
    entries.forEach((entry, index) =>
    {
        const own = score(normalize(entry.name), q, words);
        const english = score(normalize(entry.englishName), q, words);
        const best = Math.min(own ?? Infinity, english === undefined ? Infinity : english + 0.5);
        if (best !== Infinity) { scored.push({ entry: entry, score: best, index: index }); }
    });

    return scored.sort((a, b) => (a.score - b.score) || (a.index - b.index)).map((s) => s.entry);
}

// ---- filters and the address --------------------------------------------------------------

export type Filters = Readonly<Record<string, string>>;
export interface CompendiumQuery
{
    readonly q: string;
    readonly filters: Filters;
}

/** "1/4" → 0.25; a whole number as it is; undefined otherwise. */
function challengeOf(value: string): number | undefined
{
    const fraction = /^1\/(2|4|8)$/.exec(value);
    if (fraction) { return 1 / Number(fraction[1]); }

    return /^\d{1,2}$/.test(value) && (Number(value) <= 30) ? Number(value) : undefined;
}

const WORD = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/;
const isWord = (v: string): boolean => WORD.test(v);
const isYes = (v: string): boolean => v === "yes";
const isLevel = (v: string): boolean => /^\d$/.test(v);
const isChallenge = (v: string): boolean => challengeOf(v) !== undefined;

/** The keys each kind's address accepts, with the check of their values. */
export const FILTERS: Readonly<Record<CompendiumKind, Readonly<Record<string, (value: string) => boolean>>>> = {
    spells: {
        level: isLevel,
        school: isWord,
        class: isWord,
        ritual: isYes,
        concentration: isYes,
        source: isWord
    },
    items: { type: isWord, rarity: isWord, attunement: isYes, magic: isYes, source: isWord },
    creatures: { crMin: isChallenge, crMax: isChallenge, type: isWord, size: isWord, source: isWord },
    conditions: { source: isWord }
};

/** The entries every filter keeps. */
export function filter(entries: readonly CompendiumEntry[], kind: CompendiumKind, filters: Filters): CompendiumEntry[]
{
    const checks: ((f: CompendiumFacets) => boolean)[] = [];
    const add = (key: string, check: (f: CompendiumFacets, value: string) => boolean): void =>
    {
        const value = filters[key];
        if ((value !== undefined) && (FILTERS[kind][key]?.(value) ?? false)) { checks.push((f) => check(f, value)); }
    };
    add("source", (f, v) => f.packageId === v);
    add("level", (f, v) => f.level === Number(v));
    add("school", (f, v) => f.school === v);
    add("class", (f, v) => f.classes?.includes(v) ?? false);
    add("ritual", (f) => f.ritual === true);
    add("concentration", (f) => f.concentration === true);
    add("type", (f, v) => (kind === "creatures" ? f.creatureType === v : f.type === v));
    add("rarity", (f, v) => f.rarity === v);
    add("attunement", (f) => f.attunement === true);
    add("magic", (f) => f.magical === true);
    add("size", (f, v) => f.size === v);
    add("crMin", (f, v) => (f.challenge ?? 0) >= challengeOf(v)!);
    add("crMax", (f, v) => (f.challenge ?? 0) <= challengeOf(v)!);

    return entries.filter((e) => checks.every((check) => check(e.facets)));
}

type RouteQuery = Readonly<Record<string, string | null | readonly (string | null)[] | undefined>>;

/** The search and the filters of a kind from the route's query; unknown keys and invalid values are dropped. */
export function fromQuery(kind: CompendiumKind, query: RouteQuery): CompendiumQuery
{
    const first = (value: RouteQuery[string]): string | undefined =>
        (Array.isArray(value) ? value[0] : value) ?? undefined;
    const filters: Record<string, string> = {};
    for (const [key, check] of Object.entries(FILTERS[kind]))
    {
        const value = first(query[key]);
        if ((value !== undefined) && check(value)) { filters[key] = value; }
    }

    return { q: (first(query["q"]) ?? "").trim(), filters: filters };
}

/** The route's query for a search and filters: empty values left out, keys in a stable order. */
export function toQuery(state: CompendiumQuery): Record<string, string>
{
    const query: Record<string, string> = {};
    if (state.q.trim()) { query["q"] = state.q.trim(); }
    for (const key of Object.keys(state.filters).sort())
    {
        const value = state.filters[key];
        if (value) { query[key] = value; }
    }

    return query;
}

/** The values present among the entries, per facet, for the filters to offer only choices that find something. */
export function filterOptions(entries: readonly CompendiumEntry[]): Readonly<Record<string, readonly string[]>>
{
    const values: Record<string, Set<string>> = {};
    const add = (key: string, value: string | number | undefined): void =>
    {
        if ((value === undefined) || (value === "")) { return; }
        (values[key] ??= new Set()).add(String(value));
    };
    for (const { facets: f } of entries)
    {
        add("source", f.packageId);
        add("level", f.level);
        add("school", f.school);
        f.classes?.forEach((c) => add("class", c));
        add("type", f.creatureType ?? f.type);
        add("rarity", f.rarity);
        add("size", f.size);
        add("challenge", f.challenge);
    }
    const numeric = new Set(["level", "challenge"]);

    return Object.fromEntries(Object.entries(values).map(([key, set]) => [
        key,
        [...set].sort((a, b) => (numeric.has(key) ? Number(a) - Number(b) : a.localeCompare(b)))
    ]));
}

// ---- the package set --------------------------------------------------------------------------

export interface CompendiumSet
{
    readonly packages: PackageSet;
    /** Stored packages left out because they do not load together with the rest (another ruleset). */
    readonly skipped: readonly string[];
}

export function useCompendium()
{
    const store = useContentStore();
    const engine = useEngine();

    /**
     * Every package of the device, with the creatures only when asked. When they do not load together (two base
     * packages, a missing dependency), the site's packages come first and each stored one is added only if the
     * set still loads cleanly with it.
     */
    const set = async (options: { readonly creatures: boolean }): Promise<CompendiumSet> =>
    {
        const all = await store.compendiumSources(options);
        const full = engine.packageSet(all);
        if (full.diagnostics.ok) { return { packages: full, skipped: [] }; }

        const published = new Set(Object.keys((store.index ?? await useContent().fetchIndex()).packages));
        const own = (s: PackageSource): boolean => s.manifest.kind !== "translation";
        const accepted = all.filter((s) => own(s) && published.has(s.manifest.id)).map((s) => s.manifest.id);
        let pending = all.filter((s) => own(s) && !published.has(s.manifest.id)).map((s) => s.manifest.id);
        let packages = engine.packageSet(await store.sources(accepted));
        for (let progress = true; progress && pending.length;)
        {
            progress = false;
            for (const id of pending)
            {
                const candidate = engine.packageSet(await store.sources([...accepted, id]));
                if (!candidate.diagnostics.ok) { continue; }
                accepted.push(id);
                packages = candidate;
                progress = true;
            }
            pending = pending.filter((id) => !accepted.includes(id));
        }

        return { packages: packages, skipped: pending };
    };

    return { set };
}
