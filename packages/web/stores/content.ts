import { defineStore } from "pinia";

import type { PackageDiagnostic, PackageSource } from "@byloth/dnd-platform-loader";
import type { PackageManifest } from "@byloth/dnd-platform-schema";

import type { ContentIndex } from "@/composables/content";
import type { PackageFile } from "@/composables/packages";
import type { PersistenceState, StoredPackage } from "@/composables/storage";

/**
 * The content store of the application (docs/phase-1/02-content-and-character-stores.md): the packages the
 * site publishes and the ones the user loaded, the loads in progress, and the state of the browser's
 * storage. Only manifests and counts are reactive; bundles stay out of the reactive state.
 */

/** One package as the packages page lists it. */
export interface PackageEntry
{
    readonly manifest: PackageManifest;
    readonly entities: number;
    /** `site`: published with the application (never removable); `file`: loaded by the user. */
    readonly origin: "site" | "file";
    readonly fileName?: string;
}

export interface LoadEntry
{
    readonly id: number;
    readonly fileName: string;
    status: "checking" | "done" | "refused" | "failed";
    /** Warnings of a successful load, or the diagnostics of a refusal. */
    diagnostics: readonly PackageDiagnostic[];
    /** The package id and name of a successful load. */
    manifest?: PackageManifest;
    /** The reason of a failure that is not a refusal (an unreadable file). */
    message?: string;
}

export interface RemoveResult
{
    readonly removed: boolean;
    /** Names of the stored characters that use the package, when it was not removed. */
    readonly usedBy: readonly string[];
}

/** Site bundles fetched in this page load; the HTTP cache keeps them across loads. */
const _siteBundles = new Map<string, Promise<PackageSource>>();

export const useContentStore = defineStore("content", () =>
{
    const index = shallowRef<ContentIndex>();
    const site = shallowRef<PackageEntry[]>([]);
    const stored = shallowRef<PackageEntry[]>([]);
    const persistence = shallowRef<PersistenceState>();
    const loads = ref<LoadEntry[]>([]);
    let _nextLoad = 1;

    const _siteBundle = (id: string): Promise<PackageSource> =>
    {
        let bundle = _siteBundles.get(id);
        if (!bundle)
        {
            bundle = useContent().fetchBundle(id);
            bundle.catch(() => _siteBundles.delete(id));
            _siteBundles.set(id, bundle);
        }

        return bundle;
    };

    const _entry = (record: StoredPackage): PackageEntry => ({
        manifest: record.source.manifest,
        entities: record.source.entities.length,
        origin: "file",
        ...(record.fileName !== undefined ? { fileName: record.fileName } : {})
    });

    /** Reads the site's index and latest bundles, the stored packages and the storage state. */
    const refresh = async (): Promise<void> =>
    {
        const storage = useBrowserStorage();
        const [published, records, state] = await Promise.all([
            useContent().fetchIndex(),
            storage.packages.list(),
            storage.persistence()
        ]);

        const bundles = await Promise.all(Object.keys(published.packages).sort()
            .map(_siteBundle));
        index.value = published;
        site.value = bundles.map((b) => ({ manifest: b.manifest, entities: b.entities.length, origin: "site" }));
        stored.value = records.map(_entry).sort((a, b) => (a.manifest.id < b.manifest.id ? -1 : 1));
        persistence.value = state;
    };

    /** Loads files one after the other (the loader's queue), each tracked in `loads`. */
    const loadFiles = async (files: readonly PackageFile[]): Promise<void> =>
    {
        const { load } = usePackageLoader();
        const entries = files.map((file) =>
        {
            loads.value.unshift({ id: _nextLoad++, fileName: file.name, status: "checking", diagnostics: [] });

            return loads.value[0]!;
        });

        await Promise.all(files.map(async (file, i) =>
        {
            const entry = entries[i]!;
            try
            {
                const { record, warnings } = await load(file);
                entry.status = "done";
                entry.manifest = record.source.manifest;
                entry.diagnostics = warnings;
            }
            catch (error)
            {
                if (error instanceof PackageRefusedException)
                {
                    entry.status = "refused";
                    entry.diagnostics = error.diagnostics;
                }
                else
                {
                    entry.status = "failed";
                    entry.message = (error as Error).message;
                }
            }
        }));

        await refresh();
    };

    const dismissLoad = (id: number): void =>
    {
        loads.value = loads.value.filter((l) => l.id !== id);
    };

    /** Removes a loaded package, unless a stored character uses it. */
    const remove = async (id: string, version: string): Promise<RemoveResult> =>
    {
        const storage = useBrowserStorage();
        const usedBy = (await storage.characters.list())
            .filter((c) => c.packages.some((p) => p.id === id))
            .map((c) => c.name);
        if (usedBy.length > 0) { return { removed: false, usedBy: usedBy }; }

        await storage.packages.remove(id, version);
        await refresh();

        return { removed: true, usedBy: [] };
    };

    /** The sources of the given package ids: the site's latest for published packages, the stored ones otherwise. */
    const sources = async (ids: readonly string[]): Promise<PackageSource[]> =>
    {
        const published = index.value ?? await useContent().fetchIndex();
        const records = await useBrowserStorage().packages.list();

        return Promise.all(ids.map(async (id) =>
        {
            if (id in published.packages) { return _siteBundle(id); }

            const record = records.find((r) => r.source.manifest.id === id);
            if (!record) { throw new Error(`the package "${id}" is not on the site nor loaded in this browser`); }

            return record.source;
        }));
    };

    /** Forgets everything read so far (a setup store has no `$reset`); the next `refresh` reads again. */
    const reset = (): void =>
    {
        index.value = undefined;
        site.value = [];
        stored.value = [];
        persistence.value = undefined;
        loads.value = [];
    };

    return { index, site, stored, persistence, loads, refresh, loadFiles, dismissLoad, remove, sources, reset };
});
