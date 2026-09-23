import { PromiseQueue, ValueException, yieldToEventLoop } from "@byloth/core";
import {
    checkPackageAsync,
    checkReferences,
    compareVersions,
    filesOfSource,
    parseBundle,
    readPackageZipAsync,
    toBundle,
    toPackageSource
} from "@byloth/dnd-platform-loader";
import type { PackageDiagnostic, PackageFiles, PackageSource } from "@byloth/dnd-platform-loader";
import type { SchemaValidator } from "@byloth/dnd-platform-schema/validate";

import type { StoredPackage } from "./storage";

/**
 * Loading a package the user picks (docs/phase-1/02-content-and-character-stores.md): a zip of its
 * directory or a bundle is read, checked like `dnd validate` does, resolved against the packages it
 * depends on (the site's public ones, the SRD, and the stored ones), and stored as a bundle. One load at a
 * time; the page stays responsive during long checks.
 */

/** A package refused by the checks; `diagnostics` are the ones `dnd validate` would print. */
export class PackageRefusedException extends ValueException
{
    public readonly diagnostics: readonly PackageDiagnostic[];

    public constructor(fileName: string, diagnostics: readonly PackageDiagnostic[])
    {
        const errors = diagnostics.filter((d) => d.severity === "error").length;
        super(`${fileName}: refused with ${errors} error(s).`, undefined, "PackageRefusedException");

        this.diagnostics = diagnostics;
    }
}

export interface LoadedPackage
{
    readonly record: StoredPackage;
    /** Warnings of the checks; errors refuse the package instead. */
    readonly warnings: readonly PackageDiagnostic[];
}

/** The part of a file the loader reads: its name and its bytes. */
export interface PackageFile
{
    readonly name: string;
    arrayBuffer(): Promise<ArrayBuffer>;
}

const _queue = new PromiseQueue();
let _ajv: Promise<SchemaValidator> | undefined;

/** Ajv and the schemas load with the first package, never with the pages that only read the store. */
function _validator(): Promise<SchemaValidator>
{
    _ajv ??= import("@byloth/dnd-platform-schema/validate").then(({ createAjv }) => createAjv());

    return _ajv;
}

const _PAUSE = { pause: () => yieldToEventLoop(), every: 16 };

async function _read(file: PackageFile): Promise<{ files: PackageFiles, source?: PackageSource }>
{
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (/\.json$/i.test(file.name))
    {
        const source = parseBundle(new TextDecoder().decode(bytes), file.name);

        return { files: filesOfSource(source), source: source };
    }

    return { files: await readPackageZipAsync(bytes, _PAUSE) };
}

/**
 * The packages the new one needs next to it for the reference check, its dependencies recursively: the
 * site's latest release of a public package (the SRD, DEC-21), otherwise the newest stored version of a
 * package the user loaded.
 */
async function _dependencies(source: PackageSource, stored: readonly StoredPackage[]): Promise<PackageSource[]>
{
    const byId = new Map<string, PackageSource>();
    for (const { source: s } of stored)
    {
        const current = byId.get(s.manifest.id);
        const newer = !current || compareVersions(current.manifest.version, s.manifest.version) < 0;
        if (newer) { byId.set(s.manifest.id, s); }
    }

    const { fetchIndex, fetchBundle } = useContent();
    const published = (await fetchIndex()).packages;
    const needed = new Map<string, PackageSource>();
    const visit = async (manifest: PackageSource["manifest"]): Promise<void> =>
    {
        for (const dependency of manifest.dependencies ?? [])
        {
            if (needed.has(dependency.id)) { continue; }

            const found = (dependency.id in published) ? await fetchBundle(dependency.id) : byId.get(dependency.id);
            if (!found) { continue; }

            needed.set(dependency.id, found);
            await visit(found.manifest);
        }
    };
    await visit(source.manifest);

    return [...needed.values()];
}

async function _load(file: PackageFile): Promise<LoadedPackage>
{
    const name = file.name.replace(/\.(zip|json)$/i, "");
    const { files, source: bundled } = await _read(file);

    const diagnostics = await checkPackageAsync(files, name, await _validator(), _PAUSE);
    if (diagnostics.some((d) => d.severity === "error")) { throw new PackageRefusedException(file.name, diagnostics); }

    const source = bundled ?? toPackageSource(files, file.name);
    const storage = useBrowserStorage();

    // Only what concerns the new package: its own references, and set-wide errors (no base, a missing dependency).
    const references = checkReferences([...(await _dependencies(source, await storage.packages.list())), source])
        .filter((d) => d.package === source.manifest.id || d.package === "");
    const all = [...diagnostics, ...references];
    if (references.some((d) => d.severity === "error")) { throw new PackageRefusedException(file.name, all); }

    const record: StoredPackage = {
        source: toBundle(source),
        loadedAt: new Date().toISOString(),
        origin: "file",
        fileName: file.name
    };
    await storage.packages.put(record);

    // One version per package (DEC-21): characters follow the newest, and are told what it changed.
    const { id, version } = source.manifest;
    for (const { source: other } of await storage.packages.list())
    {
        if ((other.manifest.id === id) && (other.manifest.version !== version))
        {
            await storage.packages.remove(id, other.manifest.version);
        }
    }

    return { record: record, warnings: all };
}

export function usePackageLoader()
{
    /** Loads one file (`.zip` of a package directory, or a `.json` bundle); loads never overlap. */
    const load = (file: PackageFile): Promise<LoadedPackage> => _queue.enqueue(() => _load(file));

    return { load };
}
