/**
 * A package as files: the layout of docs/phase-0/02-content-format.md read
 * from any source (a directory, a zip, a browser file list) into parsed YAML
 * documents, then into the `PackageSource` the loader works on. Pure: the
 * caller lists the paths and reads the texts.
 */

import { parse } from "yaml";

import { ENTITY_TYPE_FOR_DIRECTORY, SCHEMA_FOR_DIRECTORY } from "@byloth/dnd-platform-schema";
import type { EntityDirectory } from "@byloth/dnd-platform-schema";
import type { PackageManifest, Ruleset } from "@byloth/dnd-platform-schema";

import { run, runPausing } from "./steps.js";
import type { PauseOptions, Steps } from "./steps.js";
import type { PackageSource, SourceEntity } from "./types.js";

/** One YAML document of a package, with where it came from. */
export interface SourceFile
{
    /** Path relative to the package root, e.g. `classes/monk.yaml`. */
    readonly path: string;
    /** Top-level directory, e.g. `classes`; `""` for `package.yaml` and `ruleset.yaml`. */
    readonly directory: string;
    /** Schema name the file must conform to. */
    readonly schema: string;
    /** Parsed content, or `undefined` when parsing failed. */
    readonly data: unknown;
    readonly parseError?: string;
}

export interface PackageFiles
{
    readonly manifest?: SourceFile;
    readonly ruleset?: SourceFile;
    readonly files: readonly SourceFile[];
    /** Top-level directories that are not part of the layout. */
    readonly unknownDirectories: readonly string[];
}

const YAML_FILE = /\.ya?ml$/;

/** The order of a recursive directory walk that sorts each level: segment by segment, by code unit. */
export function comparePaths(a: string, b: string): number
{
    const left = a.split("/");
    const right = b.split("/");
    for (let i = 0; i < Math.min(left.length, right.length); i += 1)
    {
        if (left[i] !== right[i]) { return left[i]! < right[i]! ? -1 : 1; }
    }

    return left.length - right.length;
}

function readYaml(path: string, directory: string, schema: string, read: (path: string) => string): SourceFile
{
    try
    {
        const data = parse(read(path)) as unknown;

        return { path: path, directory: directory, schema: schema, data: data };
    }
    catch (error)
    {
        return {
            path: path, directory: directory, schema: schema, data: undefined, parseError: (error as Error).message
        };
    }
}

/**
 * Read a package from the relative paths of its files (`/`-separated; a directory may be listed as `name/`)
 * and a function returning the text of one of them. Only `package.yaml`, `ruleset.yaml` and the YAML files
 * under the known top-level directories are read; other root files are ignored.
 */
export function readPackageFiles(paths: Iterable<string>, read: (path: string) => string): PackageFiles
{
    return run(readSteps(paths, read));
}

/** `readPackageFiles`, pausing between files. */
export function readPackageFilesAsync(
    paths: Iterable<string>, read: (path: string) => string, options: PauseOptions = {}
): Promise<PackageFiles>
{
    return runPausing(readSteps(paths, read), options);
}

function* readSteps(paths: Iterable<string>, read: (path: string) => string): Steps<PackageFiles>
{
    const all = new Set<string>();
    const directories = new Set<string>();
    for (const path of paths)
    {
        const slash = path.indexOf("/");
        if (slash > 0) { directories.add(path.slice(0, slash)); }
        if (!path.endsWith("/")) { all.add(path); }
    }

    const manifest = all.has("package.yaml") ? readYaml("package.yaml", "", "package", read) : undefined;
    const ruleset = all.has("ruleset.yaml") ? readYaml("ruleset.yaml", "", "ruleset", read) : undefined;
    const files: SourceFile[] = [];
    const unknown: string[] = [];

    for (const directory of [...directories].sort())
    {
        const schema = (SCHEMA_FOR_DIRECTORY as Record<string, string | undefined>)[directory];
        if (schema === undefined)
        {
            unknown.push(directory);

            continue;
        }

        const inside = [...all].filter((p) => p.startsWith(`${directory}/`) && YAML_FILE.test(p)).sort(comparePaths);
        for (const path of inside)
        {
            files.push(readYaml(path, directory, schema, read));
            yield;
        }
    }

    return {
        ...(manifest ? { manifest: manifest } : {}),
        ...(ruleset ? { ruleset: ruleset } : {}),
        files: files,
        unknownDirectories: unknown
    };
}

function entityOf(file: SourceFile): SourceEntity
{
    if (file.parseError !== undefined) { throw new Error(`${file.path}: ${file.parseError}`); }

    if (file.directory === "translations")
    {
        // translations/<lang>/<entity-id>.yaml
        const segments = file.path.split("/");
        const language = segments.at(-2) ?? "";
        const id = segments.at(-1)!.replace(YAML_FILE, "");

        return { type: "translation", id: id, data: { language: language, strings: file.data }, file: file.path };
    }

    const type = (ENTITY_TYPE_FOR_DIRECTORY as Record<string, SourceEntity["type"] | undefined>)[file.directory];
    if (type === undefined) { throw new Error(`${file.path}: unknown package directory "${file.directory}"`); }

    const id = (file.data as { id?: unknown } | null)?.id;
    if (typeof id !== "string") { throw new Error(`${file.path}: missing "id"`); }

    return { type: type, id: id, data: file.data, file: file.path };
}

/**
 * The `PackageSource` of a read package; no validation (`checkPackage` does that). Errors name the package
 * by `label` (a directory, a file name).
 */
export function toPackageSource(pkg: PackageFiles, label: string): PackageSource
{
    if (pkg.manifest === undefined) { throw new Error(`${label}: package.yaml not found`); }
    if (pkg.manifest.parseError !== undefined) { throw new Error(`${label}/package.yaml: ${pkg.manifest.parseError}`); }
    if (pkg.ruleset?.parseError !== undefined) { throw new Error(`${label}/ruleset.yaml: ${pkg.ruleset.parseError}`); }

    const manifest = pkg.manifest.data as PackageManifest;
    const ruleset = pkg.ruleset?.data as Ruleset | undefined;
    const entities = pkg.files.map(entityOf);

    return { manifest: manifest, ...(ruleset ? { ruleset: ruleset } : {}), entities: entities };
}

const DIRECTORY_FOR_TYPE = new Map(
    Object.entries(ENTITY_TYPE_FOR_DIRECTORY).map(([directory, type]) => [type as string, directory as EntityDirectory])
);

/**
 * The files a package source stands for, so that a bundle is checked like a directory: each entity back in
 * its directory (its recorded `file`, or `<directory>/<id>.yaml`), translations back to their strings.
 */
export function filesOfSource(source: PackageSource): PackageFiles
{
    const files: SourceFile[] = [];
    for (const entity of source.entities)
    {
        if (entity.type === "translation")
        {
            const { language, strings } = entity.data as { language: string, strings: unknown };
            const path = entity.file ?? `translations/${language}/${entity.id}.yaml`;
            files.push({ path: path, directory: "translations", schema: "translation", data: strings });

            continue;
        }

        const directory = DIRECTORY_FOR_TYPE.get(entity.type);
        if (directory === undefined) { throw new Error(`${entity.id}: unknown entity type "${entity.type}"`); }

        const path = entity.file ?? `${directory}/${entity.id}.yaml`;
        files.push({ path: path, directory: directory, schema: SCHEMA_FOR_DIRECTORY[directory], data: entity.data });
    }

    const ruleset: SourceFile | undefined = source.ruleset ?
        { path: "ruleset.yaml", directory: "", schema: "ruleset", data: source.ruleset } :
        undefined;

    return {
        manifest: { path: "package.yaml", directory: "", schema: "package", data: source.manifest },
        ...(ruleset ? { ruleset: ruleset } : {}),
        files: files.sort((a, b) => comparePaths(a.path, b.path)),
        unknownDirectories: []
    };
}
