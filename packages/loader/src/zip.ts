/**
 * A package loaded from a zip archive of its directory: the package at the root of the archive,
 * or under its single top-level directory (what zipping a folder produces).
 */

import { strFromU8, unzipSync } from "fflate";

import { readPackageFiles, readPackageFilesAsync } from "./files.js";
import type { PackageFiles } from "./files.js";
import type { PauseOptions } from "./steps.js";

export function readPackageZip(bytes: Uint8Array): PackageFiles
{
    const { names, read } = unzipPackage(bytes);

    return readPackageFiles(names, read);
}

/** `readPackageZip`, pausing between files (the unzipping itself runs in one go). */
export function readPackageZipAsync(bytes: Uint8Array, options: PauseOptions = {}): Promise<PackageFiles>
{
    const { names, read } = unzipPackage(bytes);

    return readPackageFilesAsync(names, read, options);
}

function unzipPackage(bytes: Uint8Array): { names: string[], read: (path: string) => string }
{
    const entries = unzipSync(bytes);
    let names = Object.keys(entries);

    const tops = new Set(names.map((n) => n.split("/")[0]));
    const top = [...tops][0];
    const nested = !names.includes("package.yaml") && tops.size === 1 &&
        names.some((n) => n.startsWith(`${top}/`));
    const prefix = nested ? `${top}/` : "";
    if (nested)
    {
        names = names.filter((n) => n.startsWith(prefix) && n !== prefix).map((n) => n.slice(prefix.length));
    }

    return { names: names, read: (path) => strFromU8(entries[`${prefix}${path}`]!) };
}
