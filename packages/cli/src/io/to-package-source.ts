import { basename, dirname } from "node:path";

import { ENTITY_TYPE_FOR_DIRECTORY } from "@byloth/dnd-platform-schema";
import type { PackageManifest, Ruleset } from "@byloth/dnd-platform-schema";
import type { PackageSource, SourceEntity } from "@byloth/dnd-platform-engine";

import { readPackageDirectory } from "./read-package.js";
import type { SourceFile } from "./read-package.js";

function entityOf(file: SourceFile): SourceEntity
{
    if (file.parseError !== undefined) { throw new Error(`${file.path}: ${file.parseError}`); }

    if (file.directory === "translations")
    {
        // translations/<lang>/<entity-id>.yaml
        const language = basename(dirname(file.path));
        const id = basename(file.path).replace(/\.ya?ml$/, "");

        return { type: "translation", id: id, data: { language: language, strings: file.data }, file: file.path };
    }

    const type = (ENTITY_TYPE_FOR_DIRECTORY as Record<string, SourceEntity["type"] | undefined>)[file.directory];
    if (type === undefined) { throw new Error(`${file.path}: unknown package directory "${file.directory}"`); }

    const id = (file.data as { id?: unknown } | null)?.id;
    if (typeof id !== "string") { throw new Error(`${file.path}: missing "id"`); }

    return { type: type, id: id, data: file.data, file: file.path };
}

/** Read a package directory into the engine's `PackageSource` (no validation: use `dnd validate` for that). */
export function toPackageSource(dir: string): PackageSource
{
    const pkg = readPackageDirectory(dir);
    if (pkg.manifest === undefined) { throw new Error(`${dir}: package.yaml not found`); }
    if (pkg.manifest.parseError !== undefined) { throw new Error(`${dir}/package.yaml: ${pkg.manifest.parseError}`); }
    if (pkg.ruleset?.parseError !== undefined) { throw new Error(`${dir}/ruleset.yaml: ${pkg.ruleset.parseError}`); }

    const manifest = pkg.manifest.data as PackageManifest;
    const ruleset = pkg.ruleset?.data as Ruleset | undefined;
    const entities = pkg.files.map(entityOf);

    return { manifest: manifest, ...(ruleset ? { ruleset: ruleset } : {}), entities: entities };
}
