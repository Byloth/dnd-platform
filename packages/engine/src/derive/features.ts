/** Collection of the active features of a character, with their origin. */

import type {
    Character, Choice, ConditionEntity, Feature, Item, Species, Subclass, Class, Background, Feat
} from "@byloth/dnd-platform-schema";

import type { ContributionSource, Diagnostic, FeatureOrigin, PackageSet, ResolvedEntity } from "../index.js";

/**
 * DEC-20: an entity excluded by the selection stays loaded and keeps
 * contributing to the characters that already chose it; the sheet says so.
 */
export function noteExcluded(resolved: ResolvedEntity | undefined, out: Diagnostic[]): void
{
    if ((resolved === undefined) || resolved.active) { return; }
    out.push({
        severity: "warning",
        code: "W_EXCLUDED_CONTENT",
        package: resolved.package,
        entity: resolved.id,
        message: `"${resolved.id}" is excluded from the current selection; the sheet keeps it`
    });
}

export interface ActiveFeature
{
    readonly id: string;
    readonly data: Feature;
    readonly origin: FeatureOrigin;
    readonly owner: string;
    readonly level?: number;
    readonly source: ContributionSource;
    /** Class that owns the feature (for `classLevel` tables), when any. */
    readonly ownerClass?: string;
}
export interface PendingChoice
{
    readonly owner: string;
    readonly choice: Choice;
    readonly level?: number;
    readonly ownerClass?: string;
}
export interface Collected
{
    readonly features: ActiveFeature[];
    readonly choices: PendingChoice[];
    readonly warnings: Diagnostic[];
}

type FeatureRef = string | Feature;

function resolveFeature(ref: FeatureRef, set: PackageSet, out: Collected): { data: Feature, pkg: string } | undefined
{
    if (typeof ref !== "string")
    {
        const indexed = set.entities.get(ref.id);
        noteExcluded(indexed, out.warnings);

        return { data: (indexed?.data as Feature | undefined) ?? ref, pkg: indexed?.package ?? "" };
    }
    const resolved = set.entities.get(ref);
    if ((resolved === undefined) || (resolved.type !== "feature"))
    {
        out.warnings.push({
            severity: "warning", code: "W_MISSING_ENTITY", entity: ref, message: `feature "${ref}" is not loaded`
        });

        return undefined;
    }
    noteExcluded(resolved, out.warnings);

    return { data: resolved.data as Feature, pkg: resolved.package };
}

function addFeatures(
    refs: readonly FeatureRef[] | undefined,
    origin: FeatureOrigin,
    owner: string,
    ownerPkg: string,
    set: PackageSet,
    out: Collected,
    level?: number,
    ownerClass?: string
): void
{
    for (const ref of refs ?? [])
    {
        const resolved = resolveFeature(ref, set, out);
        if (resolved === undefined) { continue; }
        out.features.push({
            id: resolved.data.id,
            data: resolved.data,
            origin: origin,
            owner: owner,
            ...(level !== undefined ? { level: level } : {}),
            ...(ownerClass !== undefined ? { ownerClass: ownerClass } : {}),
            source: { package: resolved.pkg || ownerPkg, entity: owner, feature: resolved.data.id }
        });
        for (const choice of resolved.data.choices ?? [])
        {
            out.choices.push({
                owner: resolved.data.id,
                choice: choice,
                ...(level !== undefined ? { level: level } : {}),
                ...(ownerClass !== undefined ? { ownerClass: ownerClass } : {})
            });
        }
    }
}

function entity<T>(
    id: string | undefined,
    type: string,
    set: PackageSet,
    out: Collected
): { data: T, pkg: string } | undefined
{
    if (id === undefined) { return undefined; }
    const resolved = set.entities.get(id);
    if ((resolved === undefined) || (resolved.type !== type))
    {
        out.warnings.push({
            severity: "warning", code: "W_MISSING_ENTITY", entity: id, message: `${type} "${id}" is not loaded`
        });

        return undefined;
    }
    noteExcluded(resolved, out.warnings);

    return { data: resolved.data as T, pkg: resolved.package };
}

interface LevelContent { features?: FeatureRef[], choices?: Choice[] }

function levelsUpTo(levels: Record<string, LevelContent | undefined>, max: number): [number, LevelContent][]
{
    return Object.entries(levels)
        .map(([k, v]) => [Number(k), v] as [number, LevelContent | undefined])
        .filter((entry): entry is [number, LevelContent] => (entry[1] !== undefined) && (entry[0] <= max))
        .sort((a, b) => a[0] - b[0]);
}

export function collectFeatures(character: Character, set: PackageSet): Collected
{
    const out: Collected = { features: [], choices: [], warnings: [] };
    const choices = character.choices;

    const species = entity<Species>(choices.species, "species", set, out);
    if (species) { addFeatures(species.data.features, "species", species.data.id, species.pkg, set, out); }
    type Subspecies = Species["subspecies"] extends (infer S)[] | undefined ? S : never;
    const subspecies = entity<Subspecies>(choices.subspecies, "species", set, out);
    if (subspecies)
    {
        addFeatures(subspecies.data.features, "subspecies", subspecies.data.id, subspecies.pkg, set, out);
    }

    for (const entry of choices.classes ?? [])
    {
        const cls = entity<Class>(entry.class, "class", set, out);
        if (cls)
        {
            for (const [level, content] of levelsUpTo(cls.data.levels, entry.levels))
            {
                addFeatures(content.features, "class", cls.data.id, cls.pkg, set, out, level, cls.data.id);
                for (const choice of content.choices ?? [])
                {
                    out.choices.push({ owner: cls.data.id, choice: choice, level: level, ownerClass: cls.data.id });
                }
            }
        }
        const sub = entity<Subclass>(entry.subclass, "subclass", set, out);
        if (sub)
        {
            for (const [level, content] of levelsUpTo(sub.data.levels, entry.levels))
            {
                addFeatures(content.features, "subclass", sub.data.id, sub.pkg, set, out, level, entry.class);
                for (const choice of content.choices ?? [])
                {
                    out.choices.push({ owner: sub.data.id, choice: choice, level: level, ownerClass: entry.class });
                }
            }
        }
    }

    const background = entity<Background>(choices.background, "background", set, out);
    if (background)
    {
        addFeatures(background.data.features, "background", background.data.id, background.pkg, set, out);
    }

    // Feats: every answer that names a feat entity.
    for (const [key, answers] of Object.entries(choices.answers ?? {}))
    {
        for (const answer of answers ?? [])
        {
            const resolved = set.entities.get(answer);
            if ((resolved === undefined) || (resolved.type !== "feat")) { continue; }
            noteExcluded(resolved, out.warnings);
            const feat = resolved.data as Feat;
            const asFeature: Feature = {
                id: feat.id,
                name: feat.name,
                ...(feat.text ? { text: feat.text } : {}),
                ...(feat.effects ? { effects: feat.effects } : {}),
                ...(feat.choices ? { choices: feat.choices } : {})
            };
            out.features.push({
                id: feat.id,
                data: asFeature,
                origin: "feat",
                owner: key,
                source: { package: resolved.package, entity: feat.id, feature: feat.id }
            });
            addFeatures(feat.features, "feat", feat.id, resolved.package, set, out);
        }
    }

    // Equipped and attuned items.
    for (const entry of choices.equipment ?? [])
    {
        if (!entry.equipped) { continue; }
        const resolved = set.entities.get(entry.item);
        if ((resolved === undefined) || (resolved.type !== "item")) { continue; }
        noteExcluded(resolved, out.warnings);
        const item = resolved.data as Item;
        if ((item.attunement !== undefined) && (item.attunement !== false) && !entry.attuned) { continue; }
        addFeatures(item.features, "item", item.id, resolved.package, set, out);
    }

    // Active conditions.
    for (const active of character.state.conditions)
    {
        const resolved = set.entities.get(active.condition);
        if ((resolved === undefined) || (resolved.type !== "condition")) { continue; }
        noteExcluded(resolved, out.warnings);
        const condition = resolved.data as ConditionEntity;
        const effects = [...(condition.effects ?? [])];
        if (condition.levels && (active.level !== undefined))
        {
            for (const [level, content] of Object.entries(condition.levels))
            {
                const n = Number(level);
                const applies = condition.cumulative ? (n <= active.level) : (n === active.level);
                if (applies) { effects.push(...(content?.effects ?? [])); }
            }
        }
        const asFeature: Feature = { id: condition.id, name: condition.name, text: condition.text, effects: effects };
        out.features.push({
            id: condition.id,
            data: asFeature,
            origin: "condition",
            owner: condition.id,
            source: { package: resolved.package, entity: condition.id }
        });
    }

    return out;
}
