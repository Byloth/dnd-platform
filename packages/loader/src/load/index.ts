/**
 * Package loading: dependency order, single base, version pins, entity
 * index (inline features and subspecies included), patches, translations,
 * content selection (DEC-20).
 */

import type { EntityType, PackageManifest, Ruleset } from "@byloth/dnd-platform-schema";

import type {
    Diagnostic, Diagnostics, LoadOptions, PackageSet, PackageSource, ResolvedEntity, Selection, SourceEntity
} from "../types.js";
import { EMPTY_CASCADE, applySelection } from "./select.js";

interface PatchData
{
    readonly id: string;
    readonly target: string;
    readonly set?: Readonly<Record<string, unknown>>;
    readonly append?: Readonly<Record<string, readonly unknown[]>>;
}
interface TranslationData
{
    readonly language: string;
    readonly strings: Readonly<Record<string, string>>;
}

function clone<T>(value: T): T
{
    return JSON.parse(JSON.stringify(value)) as T;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void
{
    const keys = path.split(".");
    let node: Record<string, unknown> = target;
    for (const key of keys.slice(0, -1))
    {
        const next = node[key];
        if ((next === null) || (typeof next !== "object")) { node[key] = {}; }
        node = node[key] as Record<string, unknown>;
    }
    node[keys[keys.length - 1]!] = value;
}
function getPath(target: Record<string, unknown>, path: string): unknown
{
    let node: unknown = target;
    for (const key of path.split("."))
    {
        if ((node === null) || (typeof node !== "object")) { return undefined; }
        node = (node as Record<string, unknown>)[key];
    }

    return node;
}

function compareIds(a: string, b: string): number
{
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Keep the sources a selection lists, plus everything a kept package depends
 * on (a dependency is never dropped: existing characters must keep computing).
 */
function selectSources(
    sources: readonly PackageSource[],
    selection: Selection | undefined,
    out: Diagnostic[]
): PackageSource[]
{
    const wanted = selection?.packages ?? [];
    if (wanted.length === 0) { return [...sources]; }

    const byId = new Map(sources.map((s) => [s.manifest.id, s]));
    const keep = new Set<string>();
    const frontier = wanted.filter((id) => byId.has(id));
    while (frontier.length > 0)
    {
        const id = frontier.pop()!;
        if (keep.has(id)) { continue; }
        keep.add(id);
        for (const dep of byId.get(id)!.manifest.dependencies ?? [])
        {
            if (!byId.has(dep.id) || keep.has(dep.id)) { continue; }
            if (!wanted.includes(dep.id))
            {
                out.push({
                    severity: "info",
                    code: "I_EXCLUDED_PACKAGE",
                    package: dep.id,
                    message: `package "${dep.id}" is not in the selection but "${id}" depends on it; kept`
                });
            }
            frontier.push(dep.id);
        }
    }
    // A translation is never selected (docs/phase-1/11): it comes with the packages it translates, all of them.
    for (let added = true; added;)
    {
        added = false;
        for (const source of sources)
        {
            const { id, kind, dependencies } = source.manifest;
            if ((kind !== "translation") || keep.has(id)) { continue; }
            if ((dependencies ?? []).every((d) => keep.has(d.id)))
            {
                keep.add(id);
                added = true;
            }
        }
    }
    for (const source of sources)
    {
        if (keep.has(source.manifest.id)) { continue; }
        out.push({
            severity: "info",
            code: "I_EXCLUDED_PACKAGE",
            package: source.manifest.id,
            message: `package "${source.manifest.id}" is not in the selection; not loaded`
        });
    }

    return sources.filter((s) => keep.has(s.manifest.id));
}

/** Topological order of the packages, base first, ties broken by the selection's order and then by id. */
function order(sources: readonly PackageSource[], out: Diagnostic[], selection?: Selection): PackageSource[]
{
    const byId = new Map<string, PackageSource>();
    for (const source of sources)
    {
        if (byId.has(source.manifest.id))
        {
            out.push({
                severity: "error",
                code: "E_DUPLICATE_PACKAGE",
                package: source.manifest.id,
                message: `package "${source.manifest.id}" is loaded twice`
            });

            continue;
        }
        byId.set(source.manifest.id, source);
    }

    const remaining = new Map<string, Set<string>>();
    for (const [id, source] of byId)
    {
        const deps = new Set<string>();
        for (const dep of source.manifest.dependencies ?? [])
        {
            if (!byId.has(dep.id))
            {
                out.push({
                    severity: "error",
                    code: "E_MISSING_DEPENDENCY",
                    package: id,
                    message: `package "${id}" depends on "${dep.id}", which is not loaded`
                });

                continue;
            }
            deps.add(dep.id);
        }
        remaining.set(id, deps);
    }

    const priority = new Map((selection?.order ?? []).map((id, i) => [id, i] as const));
    const rank = (id: string): number => priority.get(id) ?? Number.MAX_SAFE_INTEGER;
    const sorted: PackageSource[] = [];
    while (remaining.size > 0)
    {
        const ready = [...remaining.entries()].filter(([, deps]) => deps.size === 0).map(([id]) => id)
            .sort((a, b) => (rank(a) - rank(b)) || compareIds(a, b));
        if (ready.length === 0)
        {
            const cycle = [...remaining.keys()].sort(compareIds);
            out.push({
                severity: "error", code: "E_DEPENDENCY_CYCLE", message: `dependency cycle among ${cycle.join(", ")}`
            });
            for (const id of cycle) { sorted.push(byId.get(id)!); }
            break;
        }
        for (const id of ready)
        {
            sorted.push(byId.get(id)!);
            remaining.delete(id);
            for (const deps of remaining.values()) { deps.delete(id); }
        }
    }

    return sorted;
}

interface Indexed
{
    entities: Map<string, ResolvedEntity>;
    /** Ids of the loaded packages: an embedded entry whose `source` names one of them belongs to that package. */
    packages: Set<string>;
    /** Target id → path written → id of the patch that wrote it (for the overlap warning). */
    patchedPaths: Map<string, Map<string, string>>;
}

function addEntity(
    index: Indexed,
    type: EntityType,
    id: string,
    data: unknown,
    pkg: string,
    out: Diagnostic[],
    inline?: { owner: string, path: string }
): void
{
    if (index.entities.has(id))
    {
        const first = index.entities.get(id)!;
        out.push({
            severity: "error",
            code: "E_DUPLICATE_ID",
            package: pkg,
            entity: id,
            message: `entity "${id}" is defined in "${first.package}" and again in "${pkg}"`
        });

        return;
    }
    index.entities.set(id, {
        type: type,
        id: id,
        data: data,
        package: pkg,
        patchedBy: [],
        active: true,
        ...(inline !== undefined ? { inline: inline } : {})
    });
}

/**
 * Inline features (objects with an id under a `features` key) inside classes,
 * species, items… are indexed as features of their own, remembering the
 * owner and the pointer of the entry so a selection can remove them.
 */
/** An entry appended by a patch carries the patching package as `source`; that is the package it belongs to. */
function packageOf(index: Indexed, item: unknown, owner: ResolvedEntity): string
{
    const source = (item as { source?: unknown } | null)?.source;

    return (typeof source === "string") && index.packages.has(source) ? source : owner.package;
}

function indexInlineFeatures(index: Indexed, owner: ResolvedEntity, out: Diagnostic[]): void
{
    const visit = (node: unknown, key: string, path: string): void =>
    {
        if (Array.isArray(node))
        {
            node.forEach((item, i) =>
            {
                const itemPath = `${path}/${i}`;
                const isObject = (item !== null) && (typeof item === "object");
                const inline = isObject && (typeof (item as { id?: unknown }).id === "string");
                if ((key === "features") && inline)
                {
                    const id = (item as { id: string }).id;
                    const pkg = packageOf(index, item, owner);
                    addEntity(index, "feature", id, item, pkg, out, { owner: owner.id, path: itemPath });
                }
                visit(item, key, itemPath);
            });
        }
        else if ((node !== null) && (typeof node === "object"))
        {
            for (const [k, v] of Object.entries(node as Record<string, unknown>))
            {
                // A subspecies is a container of its own: its inline features belong to it, not to the species.
                if ((k === "subspecies") && (owner.type === "species") && (owner.inline === undefined)) { continue; }
                visit(v, k, `${path}/${k}`);
            }
        }
    };
    visit(owner.data, "", "");
}

/** Index the subspecies of a species as species of their own; returns the indexed entries. */
function indexSubspecies(index: Indexed, owner: ResolvedEntity, out: Diagnostic[]): ResolvedEntity[]
{
    const subspecies = (owner.data as { subspecies?: { id: string }[] }).subspecies ?? [];
    const indexed: ResolvedEntity[] = [];
    subspecies.forEach((sub, i) =>
    {
        const inline = { owner: owner.id, path: `/subspecies/${i}` };
        const before = index.entities.size;
        const pkg = packageOf(index, sub, owner);
        addEntity(index, "species", sub.id, { ...sub, parent: owner.id }, pkg, out, inline);
        if (index.entities.size > before) { indexed.push(index.entities.get(sub.id)!); }
    });

    return indexed;
}

function applyPatch(index: Indexed, patch: SourceEntity, pkg: string, out: Diagnostic[]): void
{
    const data = patch.data as PatchData;
    const target = index.entities.get(data.target);
    if (target === undefined)
    {
        out.push({
            severity: "error",
            code: "E_PATCH_TARGET",
            package: pkg,
            entity: patch.id,
            message: `patch "${patch.id}" targets unknown entity "${data.target}"`
        });

        return;
    }
    const written = index.patchedPaths.get(data.target) ?? new Map<string, string>();
    index.patchedPaths.set(data.target, written);
    const note = (path: string): void =>
    {
        const previous = written.get(path);
        if (previous !== undefined)
        {
            out.push({
                severity: "warning",
                code: "W_PATCH_OVERLAP",
                package: pkg,
                entity: patch.id,
                path: path,
                message: `patch "${patch.id}" writes "${path}" of "${data.target}" after "${previous}"; ` +
                    "the later package wins"
            });
        }
        written.set(path, patch.id);
    };
    const patched = clone(target.data) as Record<string, unknown>;
    for (const [path, value] of Object.entries(data.set ?? {}))
    {
        note(path);
        setPath(patched, path, value);
    }
    for (const [path, values] of Object.entries(data.append ?? {}))
    {
        note(path);
        const current = getPath(patched, path);
        setPath(patched, path, [...(Array.isArray(current) ? current : []), ...values]);
    }
    index.entities.set(data.target, { ...target, data: patched, patchedBy: [...target.patchedBy, patch.id] });
}

/**
 * Sets a translated string at a path of existing data. Unlike `setPath`, a key that itself holds dots (a patch's
 * `append: { "levels.1.features": … }`) is recognised as one step: at each level the longest existing key that
 * starts the rest of the path is taken.
 */
function setTranslated(target: Record<string, unknown>, path: string, value: unknown): void
{
    let node: Record<string, unknown> = target;
    let rest = path;
    for (;;)
    {
        const key = Object.keys(node)
            .filter((k) => (rest === k) || rest.startsWith(`${k}.`))
            .sort((a, b) => b.length - a.length)[0];
        if (key === undefined) { break; }
        const next = node[key];
        if ((next === null) || (typeof next !== "object") || (rest === key)) { break; }
        node = next as Record<string, unknown>;
        rest = rest.slice(key.length + 1);
    }
    setPath(node, rest, value);
}

/** A copy of `target` with the translation's strings set under their language. */
function translate<T>(target: T, translation: SourceEntity): T
{
    const data = translation.data as TranslationData;
    const translated = clone(target) as Record<string, unknown>;
    for (const [path, text] of Object.entries(data.strings))
    {
        setTranslated(translated, `${path}.${data.language}`, text);
    }

    return translated as T;
}

function applyTranslation(index: Indexed, translation: SourceEntity, pkg: string, out: Diagnostic[]): void
{
    const target = index.entities.get(translation.id);
    if (target === undefined)
    {
        out.push({
            severity: "warning",
            code: "W_MISSING_ENTITY",
            package: pkg,
            entity: translation.id,
            message: `translation for unknown entity "${translation.id}"`
        });

        return;
    }
    index.entities.set(translation.id, { ...target, data: translate(target.data, translation) });
}

export function loadPackages(sources: readonly PackageSource[], options: LoadOptions = {}): PackageSet
{
    const out: Diagnostic[] = [];
    const selected = selectSources(sources, options.selection, out);
    const sorted = order(selected, out, options.selection);

    const bases = sorted.filter((s) => s.manifest.kind === "base");
    if (bases.length === 0)
    {
        out.push({ severity: "error", code: "E_NO_BASE", message: "no base package (ruleset) is loaded" });
    }
    if (bases.length > 1)
    {
        const ids = bases.map((b) => b.manifest.id).join(", ");
        out.push({ severity: "error", code: "E_MULTIPLE_BASE", message: `more than one base package loaded: ${ids}` });
    }
    const base = bases[0];
    if ((base !== undefined) && (base.ruleset === undefined))
    {
        out.push({
            severity: "error",
            code: "E_MISSING_RULESET",
            package: base.manifest.id,
            message: `base package "${base.manifest.id}" has no ruleset`
        });
    }

    for (const source of sorted)
    {
        const pinned = options.pins?.[source.manifest.id];
        if ((pinned !== undefined) && (pinned !== source.manifest.version))
        {
            out.push({
                severity: "warning",
                code: "W_VERSION_MISMATCH",
                package: source.manifest.id,
                message: `character pins "${source.manifest.id}" at ${pinned}, loaded ${source.manifest.version}`
            });
        }
    }

    // 1. top-level entities; 2. patches (they may append subspecies and features), each translated first by the
    // translations keyed by the patch's id; 3. translations of entities, before 4. inline features and subspecies
    // are indexed from the translated data, so they carry the translation too; 5. selection. A translation keyed
    // by the ruleset's id translates the ruleset (languages, alignments, names).
    const translations = sorted.flatMap((source) => source.entities
        .filter((e) => e.type === "translation")
        .map((e) => ({ entity: e, pkg: source.manifest.id })));
    const patchIds = new Set(sorted.flatMap((s) => s.entities.filter((e) => e.type === "patch").map((e) => e.id)));
    const rulesetId = (base?.ruleset as { id?: string } | undefined)?.id;
    const index: Indexed = {
        entities: new Map(),
        packages: new Set(sorted.map((s) => s.manifest.id)),
        patchedPaths: new Map()
    };
    for (const source of sorted)
    {
        for (const entity of source.entities)
        {
            if ((entity.type === "patch") || (entity.type === "translation")) { continue; }
            addEntity(index, entity.type, entity.id, entity.data, source.manifest.id, out);
        }
    }
    for (const source of sorted)
    {
        for (const entity of source.entities)
        {
            if (entity.type !== "patch") { continue; }
            const translated = translations.filter((t) => t.entity.id === entity.id)
                .reduce((patch, t) => ({ ...patch, data: translate(patch.data, t.entity) }), entity);
            applyPatch(index, translated, source.manifest.id, out);
        }
    }
    for (const { entity, pkg } of translations)
    {
        if (patchIds.has(entity.id) || (entity.id === rulesetId)) { continue; }
        applyTranslation(index, entity, pkg, out);
    }
    for (const owner of [...index.entities.values()])
    {
        indexInlineFeatures(index, owner, out);
        if (owner.type !== "species") { continue; }
        for (const sub of indexSubspecies(index, owner, out)) { indexInlineFeatures(index, sub, out); }
    }
    const ruleset = translations.filter((t) => t.entity.id === rulesetId)
        .reduce((r, t) => translate(r, t.entity), (base?.ruleset ?? {}) as Ruleset);
    const cascade = options.selection !== undefined ? applySelection(index, options.selection, out) : EMPTY_CASCADE;

    const diagnostics: Diagnostics = { ok: out.every((d) => d.severity !== "error"), entries: out };

    return {
        order: sorted.map((s) => s.manifest),
        ruleset: ruleset,
        rulesetPackage: base?.manifest.id ?? "",
        entities: index.entities,
        diagnostics: diagnostics,
        cascade: cascade
    };
}

export type { PackageManifest };
