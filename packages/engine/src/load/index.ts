/**
 * Package loading: dependency order, single base, version pins, entity
 * index (inline features and subspecies included), patches, translations.
 */

import type { EntityType, PackageManifest, Ruleset } from "@byloth/dnd-platform-schema";

import type {
    Diagnostic, Diagnostics, LoadOptions, PackageSet, PackageSource, ResolvedEntity, SourceEntity
} from "../index.js";

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

/** Topological order of the packages, base first, ties broken by id. */
function order(sources: readonly PackageSource[], out: Diagnostic[]): PackageSource[]
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

    const sorted: PackageSource[] = [];
    while (remaining.size > 0)
    {
        const ready = [...remaining.entries()].filter(([, deps]) => deps.size === 0).map(([id]) => id)
            .sort();
        if (ready.length === 0)
        {
            const cycle = [...remaining.keys()].sort();
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

interface Indexed { entities: Map<string, ResolvedEntity> }

function addEntity(index: Indexed, type: EntityType, id: string, data: unknown, pkg: string, out: Diagnostic[]): void
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
    index.entities.set(id, { type: type, id: id, data: data, package: pkg, patchedBy: [] });
}

/** Inline features (objects with an id) inside classes, species, items… are indexed as features of their own. */
function indexInlineFeatures(index: Indexed, data: unknown, pkg: string, out: Diagnostic[]): void
{
    const visit = (node: unknown, key: string): void =>
    {
        if (Array.isArray(node))
        {
            for (const item of node)
            {
                const isObject = (item !== null) && (typeof item === "object");
                const inline = isObject && (typeof (item as { id?: unknown }).id === "string");
                if ((key === "features") && inline)
                {
                    addEntity(index, "feature", (item as { id: string }).id, item, pkg, out);
                }
                visit(item, key);
            }
        }
        else if ((node !== null) && (typeof node === "object"))
        {
            for (const [k, v] of Object.entries(node as Record<string, unknown>)) { visit(v, k); }
        }
    };
    visit(data, "");
}

function indexSubspecies(index: Indexed, data: unknown, pkg: string, out: Diagnostic[]): void
{
    const subspecies = (data as { subspecies?: { id: string }[] }).subspecies ?? [];
    const parent = (data as { id: string }).id;
    for (const sub of subspecies) { addEntity(index, "species", sub.id, { ...sub, parent: parent }, pkg, out); }
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
    const patched = clone(target.data) as Record<string, unknown>;
    for (const [path, value] of Object.entries(data.set ?? {})) { setPath(patched, path, value); }
    for (const [path, values] of Object.entries(data.append ?? {}))
    {
        const current = getPath(patched, path);
        setPath(patched, path, [...(Array.isArray(current) ? current : []), ...values]);
    }
    index.entities.set(data.target, { ...target, data: patched, patchedBy: [...target.patchedBy, patch.id] });
}

function applyTranslation(index: Indexed, translation: SourceEntity, pkg: string, out: Diagnostic[]): void
{
    const data = translation.data as TranslationData;
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
    const translated = clone(target.data) as Record<string, unknown>;
    for (const [path, text] of Object.entries(data.strings)) { setPath(translated, `${path}.${data.language}`, text); }
    index.entities.set(translation.id, { ...target, data: translated });
}

export function loadPackages(sources: readonly PackageSource[], options: LoadOptions = {}): PackageSet
{
    const out: Diagnostic[] = [];
    const sorted = order(sources, out);

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

    const index: Indexed = { entities: new Map() };
    for (const source of sorted)
    {
        for (const entity of source.entities)
        {
            if ((entity.type === "patch") || (entity.type === "translation")) { continue; }
            addEntity(index, entity.type, entity.id, entity.data, source.manifest.id, out);
            indexInlineFeatures(index, entity.data, source.manifest.id, out);
            if (entity.type === "species") { indexSubspecies(index, entity.data, source.manifest.id, out); }
        }
    }
    for (const source of sorted)
    {
        for (const entity of source.entities)
        {
            if (entity.type === "patch") { applyPatch(index, entity, source.manifest.id, out); }
        }
    }
    for (const source of sorted)
    {
        for (const entity of source.entities)
        {
            if (entity.type === "translation") { applyTranslation(index, entity, source.manifest.id, out); }
        }
    }

    const diagnostics: Diagnostics = { ok: out.every((d) => d.severity !== "error"), entries: out };

    return {
        order: sorted.map((s) => s.manifest),
        ruleset: (base?.ruleset ?? {}) as Ruleset,
        rulesetPackage: base?.manifest.id ?? "",
        entities: index.entities,
        diagnostics: diagnostics
    };
}

export type { PackageManifest };
