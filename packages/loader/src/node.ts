/**
 * `@byloth/dnd-platform-loader/node`: a package read from a directory on disk, for the command-line
 * tools and the tests. The only module of the loader that touches the file system.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { readPackageFiles, toPackageSource } from "./files.js";
import type { PackageFiles } from "./files.js";
import type { PackageSource } from "./types.js";

function* walk(root: string, prefix = ""): Generator<string>
{
    for (const entry of readdirSync(join(root, prefix)))
    {
        const path = `${prefix}${entry}`;
        if (statSync(join(root, path)).isDirectory())
        {
            yield `${path}/`;
            yield* walk(root, `${path}/`);
        }
        else { yield path; }
    }
}

/** Every file of a package directory, read as the layout says (see `readPackageFiles`). */
export function readPackageDirectory(root: string): PackageFiles
{
    return readPackageFiles(walk(root), (path) => readFileSync(join(root, path), "utf8"));
}

/** Read a package directory into a `PackageSource` (no validation: `checkPackage` does that). */
export function readPackageSource(dir: string): PackageSource
{
    return toPackageSource(readPackageDirectory(dir), dir);
}
