/**
 * Content selection (DEC-20): exclusions never remove an entity from the
 * package set. Excluded entities and everything that cannot exist without
 * them become *inactive* (not offered for new choices, still computing for
 * the characters that already use them); references to them are pruned from
 * the entities that stay active; a cascade report says what each exclusion
 * also disabled.
 */

import type {
    CascadeEntry, CascadeReport, Diagnostic, EntityId, ExclusionFilter, ExclusionMatch, InactiveReason,
    PrunedReference, ResolvedEntity, Selection
} from "../types.js";
import { compareForSplicing, enclosingArrayElement, spliceAt, walkReferences } from "../references/walk.js";

export const EMPTY_CASCADE: CascadeReport = { exclusions: [], inactive: [], pruned: [], empty: true };

interface Indexed { entities: Map<string, ResolvedEntity> }

interface Dependent
{
    readonly from: EntityId;
    readonly path: string;
    readonly kind: "hard" | "contains";
}

function clone<T>(value: T): T
{
    return JSON.parse(JSON.stringify(value)) as T;
}

function compareIds(a: string, b: string): number
{
    return a < b ? -1 : a > b ? 1 : 0;
}

function hasNoKey(filter: ExclusionFilter): boolean
{
    return (filter.package === undefined) && (filter.type === undefined) &&
        ((filter.tags === undefined) || (filter.tags.length === 0)) &&
        ((filter.ids === undefined) || (filter.ids.length === 0));
}

function matches(entity: ResolvedEntity, filter: ExclusionFilter): boolean
{
    if (hasNoKey(filter)) { return false; }
    if ((filter.package !== undefined) && (entity.package !== filter.package)) { return false; }
    if ((filter.type !== undefined) && (entity.type !== filter.type)) { return false; }
    if ((filter.ids !== undefined) && (filter.ids.length > 0) && !filter.ids.includes(entity.id)) { return false; }
    if ((filter.tags !== undefined) && (filter.tags.length > 0))
    {
        const tags = (entity.data as { tags?: unknown } | null)?.tags;
        if (!Array.isArray(tags) || !filter.tags.some((tag) => tags.includes(tag))) { return false; }
    }

    return true;
}

// ---- hard edges: the owner cannot exist without the target ----------------------------

function conditionIds(condition: unknown, path: string, out: { path: string, ref: string }[]): void
{
    if ((condition === null) || (typeof condition !== "object") || Array.isArray(condition)) { return; }

    const record = condition as Record<string, unknown>;
    for (const key of ["species", "class", "hasFeature"] as const)
    {
        const value = record[key];
        if (typeof value === "string") { out.push({ path: `${path}/${key}`, ref: value }); }
        else if (Array.isArray(value))
        {
            value.forEach((v, i) =>
            {
                if (typeof v === "string") { out.push({ path: `${path}/${key}/${i}`, ref: v }); }
            });
        }
    }
    // Only a conjunction is a real requirement; `any` offers alternatives and `not` inverts.
    const all = record["all"];
    if (Array.isArray(all)) { all.forEach((c, i) => conditionIds(c, `${path}/all/${i}`, out)); }
}

/** References whose exclusion makes `entity` meaningless. */
function hardReferences(entity: ResolvedEntity): { path: string, ref: string }[]
{
    const data = entity.data as Record<string, unknown> | null;
    if ((data === null) || (typeof data !== "object")) { return []; }

    const out: { path: string, ref: string }[] = [];
    const scalar = (key: string, path = `/${key}`): void =>
    {
        const value = data[key];
        if (typeof value === "string") { out.push({ path: path, ref: value }); }
    };
    switch (entity.type)
    {
        case "subclass": scalar("class"); break;
        case "item": scalar("baseItem"); break;
        case "feat": conditionIds(data["prerequisites"], "/prerequisites", out); break;
        case "archetype":
        {
            const recommends = data["recommends"] as Record<string, unknown> | undefined;
            for (const key of ["species", "subspecies", "class", "subclass", "background"])
            {
                const value = recommends?.[key];
                if (typeof value === "string") { out.push({ path: `/recommends/${key}`, ref: value }); }
            }
            break;
        }
        default: break;
    }
    const effects = data["effects"];
    if (Array.isArray(effects))
    {
        effects.forEach((effect, i) =>
        {
            const record = effect as Record<string, unknown> | null;
            if ((record?.["kind"] === "grant-spellcasting") && (typeof record["list"] === "string"))
            {
                out.push({ path: `/effects/${i}/list`, ref: record["list"] });
            }
        });
    }

    return out;
}

function buildDependents(index: Indexed): Map<EntityId, Dependent[]>
{
    const dependents = new Map<EntityId, Dependent[]>();
    const add = (target: EntityId, dependent: Dependent): void =>
    {
        const list = dependents.get(target) ?? [];
        list.push(dependent);
        dependents.set(target, list);
    };
    for (const entity of index.entities.values())
    {
        for (const { path, ref } of hardReferences(entity)) { add(ref, { from: entity.id, path: path, kind: "hard" }); }
        const inline = entity.inline;
        if (inline !== undefined) { add(inline.owner, { from: entity.id, path: inline.path, kind: "contains" }); }
    }
    for (const list of dependents.values())
    {
        list.sort((a, b) => compareIds(a.from, b.from) || compareIds(a.path, b.path));
    }

    return dependents;
}

function insertSorted(list: string[], id: string): void
{
    let low = 0;
    let high = list.length;
    while (low < high)
    {
        const mid = (low + high) >>> 1;
        if (list[mid]! < id) { low = mid + 1; }
        else { high = mid; }
    }
    list.splice(low, 0, id);
}

/**
 * Apply the exclusions of `selection` to the index in place and return the
 * cascade report. Deterministic: entities are visited in id order, the
 * closure always takes the smallest pending id, splices run from the end.
 */
export function applySelection(index: Indexed, selection: Selection, out: Diagnostic[]): CascadeReport
{
    const filters = selection.exclude ?? [];
    if (filters.length === 0) { return EMPTY_CASCADE; }

    const ids = [...index.entities.keys()].sort(compareIds);

    // 1. direct matches: the lowest filter index claims an entity
    const matched: EntityId[][] = filters.map(() => []);
    const excludedBy = new Map<EntityId, number>();
    for (const id of ids)
    {
        const entity = index.entities.get(id)!;
        filters.forEach((filter, i) =>
        {
            if (!matches(entity, filter)) { return; }
            matched[i]!.push(id);
            if (!excludedBy.has(id)) { excludedBy.set(id, i); }
        });
    }
    filters.forEach((filter, i) =>
    {
        if (hasNoKey(filter))
        {
            const message = `exclusion #${i} has no key and matches nothing`;
            out.push({ severity: "warning", code: "W_EMPTY_EXCLUSION", message: message });
        }
        else if (matched[i]!.length === 0)
        {
            const message = `exclusion #${i} matches no loaded entity`;
            out.push({ severity: "warning", code: "W_UNKNOWN_EXCLUSION", message: message });
        }
    });

    // 2. hard closure
    const dependents = buildDependents(index);
    const inactive = new Map<EntityId, InactiveReason>();
    const frontier: string[] = [];
    for (const id of [...excludedBy.keys()].sort(compareIds))
    {
        inactive.set(id, { excludedBy: excludedBy.get(id)! });
        frontier.push(id);
    }
    while (frontier.length > 0)
    {
        const id = frontier.shift()!;
        for (const dependent of dependents.get(id) ?? [])
        {
            if (inactive.has(dependent.from)) { continue; }
            inactive.set(dependent.from, {
                excludedBy: inactive.get(id)!.excludedBy,
                via: { requires: id, path: dependent.path, kind: dependent.kind }
            });
            insertSorted(frontier, dependent.from);
        }
    }

    // 3. embedded removal: inactive inline entries leave the data of owners that stay active
    const pruned: PrunedReference[] = [];
    const byOwner = new Map<EntityId, { path: string, id: EntityId }[]>();
    for (const id of [...inactive.keys()].sort(compareIds))
    {
        const inline = index.entities.get(id)!.inline;
        if ((inline === undefined) || inactive.has(inline.owner)) { continue; }

        const list = byOwner.get(inline.owner) ?? [];
        list.push({ path: inline.path, id: id });
        byOwner.set(inline.owner, list);
    }
    for (const owner of [...byOwner.keys()].sort(compareIds))
    {
        const entity = index.entities.get(owner)!;
        const data = clone(entity.data);
        for (const entry of byOwner.get(owner)!.sort((a, b) => compareForSplicing(a.path, b.path)))
        {
            if (spliceAt(data, entry.path)) { pruned.push({ from: owner, path: entry.path, ref: entry.id }); }
        }
        index.entities.set(owner, { ...entity, data: data });
    }

    // 4. soft prune: references from active entities to inactive ones go with their smallest array element
    for (const id of ids)
    {
        if (inactive.has(id)) { continue; }

        const entity = index.entities.get(id)!;
        const refs: { path: string, ref: string }[] = [];
        walkReferences(entity.data, "", refs);
        const hits = refs.filter((r) => inactive.has(r.ref) && (r.ref !== id));
        if (hits.length === 0) { continue; }

        const data = clone(entity.data);
        const units = new Map<string, EntityId>();
        for (const hit of hits)
        {
            const unit = enclosingArrayElement(data, hit.path);
            if (unit === undefined)
            {
                out.push({
                    severity: "info",
                    code: "I_EXCLUDED_REFERENCE",
                    package: entity.package,
                    entity: id,
                    path: hit.path,
                    message: `"${hit.ref}" is excluded from the selection; the reference is kept`
                });

                continue;
            }
            if (!units.has(unit)) { units.set(unit, hit.ref); }
        }
        for (const unit of [...units.keys()].sort(compareForSplicing))
        {
            if (spliceAt(data, unit)) { pruned.push({ from: id, path: unit, ref: units.get(unit)! }); }
        }
        index.entities.set(id, { ...entity, data: data });
    }

    // 5. flags, diagnostics, report
    const entries: CascadeEntry[] = [];
    for (const id of [...inactive.keys()].sort(compareIds))
    {
        const reason = inactive.get(id)!;
        const entity = index.entities.get(id)!;
        index.entities.set(id, { ...entity, active: false, inactiveBecause: reason });
        entries.push({ id: id, ...reason });
        out.push({
            severity: "info",
            code: reason.via === undefined ? "I_EXCLUDED" : "I_CASCADE",
            package: entity.package,
            entity: id,
            ...(reason.via !== undefined ? { path: reason.via.path } : {}),
            message: reason.via === undefined ?
                `"${id}" is excluded from the selection` :
                `"${id}" is inactive because it ${reason.via.kind === "contains" ? "belongs to" : "requires"} ` +
                `"${reason.via.requires}"`
        });
    }
    pruned.sort((a, b) => compareIds(a.from, b.from) || compareIds(a.path, b.path));
    for (const p of pruned)
    {
        out.push({
            severity: "info",
            code: "I_PRUNED",
            entity: p.from,
            path: p.path,
            message: `reference to excluded "${p.ref}" removed from "${p.from}"`
        });
    }
    const exclusions: ExclusionMatch[] = filters.map((filter, i) => ({ filter: filter, matched: matched[i]! }));

    const empty = (entries.length === 0) && (pruned.length === 0);

    return { exclusions: exclusions, inactive: entries, pruned: pruned, empty: empty };
}
