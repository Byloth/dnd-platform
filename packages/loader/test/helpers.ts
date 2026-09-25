/**
 * Shared helpers of the loader tests, reused by the engine tests: fixture
 * packages read from disk, deterministic shuffling, and an in-memory mini
 * package builder.
 */

import type { EntityType, PackageManifest, Ruleset } from "@byloth/dnd-platform-schema";

import type { PackageSource, SourceEntity } from "../src/index.js";
import { readPackageSource } from "../src/node.js";

// ---- disk reader ---------------------------------------------------------------

/** A fixture package read from disk by the loader, as the CLI reads it. */
export const readPackage = (dir: string): PackageSource => readPackageSource(dir);

// ---- deterministic shuffling -----------------------------------------------------

/** Deterministic pseudo-random generator (mulberry32), so shuffles are reproducible. */
export function seeded(seed: number): () => number
{
    let state = seed >>> 0;

    return () =>
    {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function shuffled<T>(items: readonly T[], random: () => number): T[]
{
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1)
    {
        const other = Math.floor(random() * (index + 1));
        [copy[index], copy[other]] = [copy[other]!, copy[index]!];
    }

    return copy;
}

// ---- manifests ---------------------------------------------------------------------

export interface Dependency { readonly id: string, readonly version: string }

export function makeManifest(
    id: string,
    kind: "base" | "extension" | "translation",
    dependencies: readonly Dependency[] = [],
    version = "0.1.0"
): PackageManifest
{
    return {
        formatVersion: 0,
        id: id,
        name: { en: id },
        version: version,
        kind: kind,
        defaultLanguage: "en",
        languages: ["en"],
        visibility: "public",
        redistributable: true,
        dependencies: [...dependencies],
        sources: [{ id: id, title: id, license: "CC0", attribution: "test" }]

    } as PackageManifest;
}

// ---- mini package ------------------------------------------------------------------

/** An entity to put in a mini package; `id` is read from `data.id`. */
export interface MiniEntity { readonly type: EntityType, readonly data: Record<string, unknown> }

export interface MiniOptions
{
    readonly id?: string;
    readonly entities?: readonly MiniEntity[];
    /** Extra keys merged onto the minimal ruleset (e.g. `spellSlots`). */
    readonly ruleset?: Record<string, unknown>;
    readonly kind?: "base" | "extension";
    readonly dependencies?: readonly Dependency[];
}

export const MINI = "mini";

/**
 * A base package with the smallest ruleset the engine reads: six abilities,
 * two skills, a proficiency bonus table, hit point formulas, no spell slots.
 */
export function miniPackage(options: MiniOptions = {}): PackageSource
{
    const id = options.id ?? MINI;
    const kind = options.kind ?? "base";
    const ruleset: Ruleset = {
        id: `${id}.ruleset`,
        abilities: ["str", "dex", "con", "int", "wis", "cha"],
        skills: [{ id: "perception", ability: "wis" }, { id: "stealth", ability: "dex" }],
        proficiencyBonus: { table: `${id}.table.proficiency-bonus` },
        abilityModifier: "floor((score - 10) / 2)",
        hitPoints: { firstLevel: "hitDie + mod(con)", perLevel: "average(hitDie) + mod(con)" },
        rests: {
            short: { hitDice: "spend" },
            long: { hitPoints: "full", hitDiceRecovered: "max(1, floor(level / 2))" }
        },
        spellSlots: {},
        baseActions: [],
        conditions: [],
        ...(options.ruleset ?? {})

    } as unknown as Ruleset;
    const table: MiniEntity = {
        type: "table",
        data: {
            id: `${id}.table.proficiency-bonus`,
            name: { en: "Proficiency bonus" },
            by: "level",
            rows: { 1: 2, 5: 3, 9: 4, 13: 5, 17: 6 }
        }
    };
    const entities: SourceEntity[] = [...(kind === "base" ? [table] : []), ...(options.entities ?? [])]
        .map((e) => ({ type: e.type, id: String(e.data["id"]), data: e.data }));

    return {
        manifest: makeManifest(id, kind, options.dependencies ?? [], "0.1.0"),
        ...(kind === "base" ? { ruleset: ruleset } : {}),
        entities: entities
    };
}

/** A class entity with the given features per level; `hitDie` 8, saves STR/DEX. */
export function cls(
    id: string,
    levels: Record<string, { features?: unknown[], choices?: unknown[] }>,
    extra: Record<string, unknown> = {}
): MiniEntity
{
    return {
        type: "class",
        data: {
            id: id,
            name: { en: id.split(".").pop() ?? id },
            hitDie: 8,
            savingThrows: ["str", "dex"],
            levels: levels,
            ...extra
        }
    };
}

export function feature(id: string, effects: unknown[], extra: Record<string, unknown> = {}): Record<string, unknown>
{
    return { id: id, name: { en: id.split(".").pop() ?? id }, effects: effects, ...extra };
}

export function item(id: string, data: Record<string, unknown>): MiniEntity
{
    return { type: "item", data: { id: id, name: { en: id.split(".").pop() ?? id }, ...data } };
}

export function spell(id: string, level: number, extra: Record<string, unknown> = {}): MiniEntity
{
    return {
        type: "spell",
        data: {
            id: id,
            name: { en: id.split(".").pop() ?? id },
            level: level,
            school: "evocation",
            castingTime: { activation: "action" },
            range: { type: "self" },
            components: { v: true, s: false, m: false },
            duration: { type: "instantaneous" },
            ...extra
        }
    };
}
