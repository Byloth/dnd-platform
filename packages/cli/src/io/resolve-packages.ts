/**
 * Which package directories a character needs. A `packages.yaml` next to the
 * character (the fixture convention: directories relative to the repository
 * root, `requires`, `selection`) wins; otherwise every package id the
 * character lists is looked up among the packages discovered under
 * `packages/content/` and `content-private/`, plus the directories passed
 * explicitly, which override a discovered package with the same id. With a
 * `language`, the discovered translation packages of that language whose
 * packages are all loaded come too, as the web application adds them
 * (docs/phase-1/11): a character never lists a translation.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { parse } from "yaml";

import type { PackageSource, Selection } from "@byloth/dnd-platform-loader";
import type { Character } from "@byloth/dnd-platform-engine";

import { discoverPackages } from "./repository.js";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

interface PackagesFile
{
    readonly packages: readonly string[];
    readonly requires?: readonly string[];
    readonly selection?: Selection;
}

export interface ResolvedPackages
{
    readonly sources: readonly PackageSource[];
    readonly selection?: Selection;
    /** Where each source came from, in order. */
    readonly directories: readonly string[];
}

export interface ResolveOptions
{
    readonly repoRoot: string;
    /** Explicit package directories (`--package`). */
    readonly extra?: readonly string[];
    /** The derivation language: its translation packages are added. */
    readonly language?: string;
}

/** The translations of `language`, among the discovered and explicit packages, whose packages are all loaded. */
export function withTranslations(resolved: ResolvedPackages, options: ResolveOptions): ResolvedPackages
{
    if (options.language === undefined) { return resolved; }
    // Translations sit among the discovered packages, among the explicit ones, and next to the packages the
    // character uses (a fixture's homebrew and its translation, side by side under fixtures/packages).
    const siblings = [...new Set(resolved.directories.map((d) => dirname(resolve(d))))]
        .flatMap((parent) => readdirSync(parent).map((name) => join(parent, name)))
        .filter((d) => existsSync(join(d, "package.yaml")));
    const candidates = [...new Set([
        ...discoverPackages(options.repoRoot).map((p) => resolve(p.directory)),
        ...(options.extra ?? []).map((d) => resolve(d)),
        ...siblings
    ])]
        .map((directory) => ({ directory: directory, source: read(directory) }))
        .filter(({ source }) => (source.manifest.kind === "translation") &&
            source.manifest.languages.includes(options.language!));
    const sources = [...resolved.sources];
    const directories = [...resolved.directories];
    const present = new Set(sources.map((s) => s.manifest.id));
    for (let added = true; added;)
    {
        added = false;
        for (const { directory, source } of candidates)
        {
            if (present.has(source.manifest.id)) { continue; }
            if (!source.manifest.dependencies.every((d) => present.has(d.id))) { continue; }
            sources.push(source);
            directories.push(directory);
            present.add(source.manifest.id);
            added = true;
        }
    }

    return { ...resolved, sources: sources, directories: directories };
}

export class ResolveError extends Error { }

/**
 * A package directory read once per process: resolving many characters (`dnd fixtures`, `dnd probe-language`)
 * would otherwise read and parse the same packages, and every candidate translation, again for each one.
 */
const _read = new Map<string, PackageSource>();
function read(directory: string): PackageSource
{
    const key = resolve(directory);
    let source = _read.get(key);
    if (!source)
    {
        source = readPackageSource(key);
        _read.set(key, source);
    }

    return source;
}

export function resolvePackages(characterPath: string, character: Character, options: ResolveOptions): ResolvedPackages
{
    return withTranslations(resolveListed(characterPath, character, options), options);
}

function resolveListed(characterPath: string, character: Character, options: ResolveOptions): ResolvedPackages
{
    const sibling = join(dirname(resolve(characterPath)), "packages.yaml");
    if (existsSync(sibling))
    {
        const file = parse(readFileSync(sibling, "utf8")) as PackagesFile;
        const directories = file.packages.map((p) => resolve(options.repoRoot, p));
        const missing = directories.filter((d) => !existsSync(d));
        if (missing.length > 0) { throw new ResolveError(`${sibling}: missing package directories: ${missing.join(", ")}`); }
        const sources = directories.map(read);
        const ids = new Set(sources.map((s) => s.manifest.id));
        const absent = (file.requires ?? []).filter((id) => !ids.has(id));
        if (absent.length > 0) { throw new ResolveError(`${sibling}: required packages not loaded: ${absent.join(", ")}`); }

        return { sources: sources, directories: directories, ...(file.selection ? { selection: file.selection } : {}) };
    }

    const byId = new Map<string, string>();
    for (const found of discoverPackages(options.repoRoot))
    {
        if (found.id !== undefined && !byId.has(found.id)) { byId.set(found.id, found.directory); }
    }
    const explicit = new Map<string, string>();
    for (const dir of options.extra ?? [])
    {
        const directory = resolve(dir);
        explicit.set(read(directory).manifest.id, directory);
    }
    const wanted = character.packages.map((p) => p.id);
    const directories: string[] = [];
    const unresolved: string[] = [];
    for (const id of wanted)
    {
        const directory = explicit.get(id) ?? byId.get(id);
        if (directory === undefined) { unresolved.push(id); }
        else { directories.push(directory); }
    }
    if (unresolved.length > 0)
    {
        const known = [...new Set([...byId.keys(), ...explicit.keys()])].sort();
        throw new ResolveError(`packages not found: ${unresolved.join(", ")} (known: ${known.join(", ") || "none"}; ` +
            "pass --package <dir> or put a packages.yaml next to the character)");
    }

    return { sources: directories.map(read), directories: directories };
}
