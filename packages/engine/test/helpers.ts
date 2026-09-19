/**
 * Shared helpers of the engine tests: a disk reader for fixture packages
 * (mirrors packages/cli/src/io/read-package.ts, so the engine keeps zero
 * runtime dependencies), an in-memory mini package builder and a character
 * builder.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

import { parse } from "yaml";

import { ENTITY_TYPE_FOR_DIRECTORY } from "@byloth/dnd-platform-schema";
import type { Character, EntityType, PackageManifest, Ruleset } from "@byloth/dnd-platform-schema";

import type { PackageSource, SourceEntity } from "../src/index.js";

// ---- disk reader ---------------------------------------------------------------

export function* walk(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* walk(path); }
        else if (/\.ya?ml$/.test(entry)) { yield path; }
    }
}

export function readYaml(path: string): unknown
{
    return parse(readFileSync(path, "utf8")) as unknown;
}

export function readPackage(dir: string): PackageSource
{
    const manifest = readYaml(join(dir, "package.yaml")) as PackageManifest;
    const rulesetPath = join(dir, "ruleset.yaml");
    const entities: SourceEntity[] = [];

    for (const directory of readdirSync(dir).sort())
    {
        const path = join(dir, directory);
        if (!statSync(path).isDirectory()) { continue; }

        if (directory === "translations")
        {
            for (const file of walk(path))
            {
                const [language] = relative(path, file).split("/");
                const id = basename(file).replace(/\.ya?ml$/, "");
                entities.push({
                    type: "translation",
                    id: id,
                    data: { language: language, strings: readYaml(file) },
                    file: relative(dir, file)
                });
            }

            continue;
        }

        const type = (ENTITY_TYPE_FOR_DIRECTORY as Record<string, EntityType | undefined>)[directory];
        if (type === undefined) { continue; }

        for (const file of walk(path))
        {
            const data = readYaml(file) as { id: string };
            entities.push({ type: type, id: data.id, data: data, file: relative(dir, file) });
        }
    }

    return {
        manifest: manifest,
        ...(existsSync(rulesetPath) ? { ruleset: readYaml(rulesetPath) as Ruleset } : {}),
        entities: entities
    };
}

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
    kind: "base" | "extension",
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

// ---- character -----------------------------------------------------------------------

export interface CharacterOptions
{
    readonly id?: string;
    readonly ruleset?: string;
    readonly classes?: { class: string, levels: number, subclass?: string }[];
    readonly scores?: Record<string, number>;
    readonly answers?: Record<string, string[]>;
    readonly equipment?: { item: string, quantity?: number, equipped?: boolean, attuned?: boolean }[];
    readonly species?: string;
    readonly subspecies?: string;
    readonly background?: string;
    readonly state?: Partial<Character["state"]>;
}

export function character(options: CharacterOptions = {}): Character
{
    const ruleset = options.ruleset ?? MINI;
    const classes = options.classes ?? [{ class: `${MINI}.class.fighter`, levels: 1 }];
    const base = options.scores ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

    return {
        formatVersion: 0,
        id: options.id ?? "test-character",
        name: "Test Character",
        ruleset: { id: ruleset, version: "0.1.0" },
        packages: [{ id: ruleset, version: "0.1.0" }],
        choices: {
            ...(options.species ? { species: options.species } : {}),
            ...(options.subspecies ? { subspecies: options.subspecies } : {}),
            ...(options.background ? { background: options.background } : {}),
            classes: classes as Character["choices"]["classes"],
            abilityScores: { method: "manual", base: base },
            answers: options.answers ?? {},
            ...(options.equipment ? { equipment: options.equipment } : {})
        },
        state: {
            hp: { current: 10, temporary: 0 },
            hitDice: { spent: 0 },
            resources: {},
            conditions: [],
            deathSaves: { successes: 0, failures: 0 },
            inspiration: false,
            ...(options.state ?? {})
        }
    };
}
