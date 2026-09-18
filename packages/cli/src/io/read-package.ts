import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { parse } from "yaml";

import { SCHEMA_FOR_DIRECTORY } from "@byloth/dnd-platform-schema";

/** One YAML document read from a package directory, with where it came from. */
export interface SourceFile
{
    /** Path relative to the package directory, e.g. `classes/monk.yaml`. */
    readonly path: string;
    /** Top-level directory, e.g. `classes`; `""` for `package.yaml` and `ruleset.yaml`. */
    readonly directory: string;
    /** Schema name the file must conform to. */
    readonly schema: string;
    /** Parsed content, or `undefined` when parsing failed. */
    readonly data: unknown;
    readonly parseError?: string;
}

export interface PackageDirectory
{
    readonly root: string;
    readonly manifest?: SourceFile;
    readonly ruleset?: SourceFile;
    readonly files: readonly SourceFile[];
    /** Top-level directories that are not part of the layout. */
    readonly unknownDirectories: readonly string[];
}

function readYaml(root: string, path: string, directory: string, schema: string): SourceFile
{
    try
    {
        const data = parse(readFileSync(join(root, path), "utf8")) as unknown;

        return { path: path, directory: directory, schema: schema, data: data };
    }
    catch (error)
    {
        return {
            path: path, directory: directory, schema: schema, data: undefined, parseError: (error as Error).message
        };
    }
}

function* walk(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* walk(path); }
        else if (/\.ya?ml$/.test(entry)) { yield path; }
    }
}

export function readPackageDirectory(root: string): PackageDirectory
{
    const files: SourceFile[] = [];
    const unknown: string[] = [];
    let manifest: SourceFile | undefined;
    let ruleset: SourceFile | undefined;

    if (existsSync(join(root, "package.yaml"))) { manifest = readYaml(root, "package.yaml", "", "package"); }
    if (existsSync(join(root, "ruleset.yaml"))) { ruleset = readYaml(root, "ruleset.yaml", "", "ruleset"); }

    for (const entry of readdirSync(root).sort())
    {
        const path = join(root, entry);
        if (!statSync(path).isDirectory()) { continue; }

        const schema = (SCHEMA_FOR_DIRECTORY as Record<string, string | undefined>)[entry];
        if (schema === undefined)
        {
            unknown.push(entry);

            continue;
        }
        for (const file of walk(path))
        {
            files.push(readYaml(root, relative(root, file), entry, schema));
        }
    }

    return {
        root: root,
        ...(manifest ? { manifest: manifest } : {}),
        ...(ruleset ? { ruleset: ruleset } : {}),
        files: files,
        unknownDirectories: unknown
    };
}
