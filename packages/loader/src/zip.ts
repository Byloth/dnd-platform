/**
 * A package loaded from a zip archive of its directory: the package at the root of the archive,
 * or under its single top-level directory (what zipping a folder produces).
 */

import { strFromU8, unzipSync } from "fflate";

import { readPackageFiles } from "./files.js";
import type { PackageFiles } from "./files.js";

export function readPackageZip(bytes: Uint8Array): PackageFiles
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

    return readPackageFiles(names, (path) => strFromU8(entries[`${prefix}${path}`]!));
}
