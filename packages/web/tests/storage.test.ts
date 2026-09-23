/**
 * The browser storage (docs/phase-1/02-content-and-character-stores.md): packages keyed by
 * id@version, the meta store, the persistence request at the first write. happy-dom has no
 * IndexedDB, so fake-indexeddb provides it, as in @byloth/core's own tests.
 */

import "fake-indexeddb/auto";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { IndexedDatabase } from "@byloth/core";
import type { PackageSource } from "@byloth/dnd-platform-loader";

import {
    closeBrowserStorage,
    DATABASE_NAME,
    PERSISTED_KEY,
    packageKey,
    useBrowserStorage
} from "@/composables/storage";
import type { StoredPackage } from "@/composables/storage";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

function srd(): PackageSource
{
    return JSON.parse(readFileSync(resolve(ROOT, "build", "content", "srd51.json"), "utf8")) as PackageSource;
}

function stored(source: PackageSource): StoredPackage
{
    return { source: source, loadedAt: "2026-09-23T12:00:00.000Z", origin: "site" };
}

function withVersion(source: PackageSource, version: string): PackageSource
{
    return { ...source, manifest: { ...source.manifest, version } };
}

/** Replaces `navigator.storage` for one test; `undefined` removes it. */
function stubStorageManager(storage: Partial<StorageManager> | undefined): void
{
    Object.defineProperty(navigator, "storage", { value: storage, configurable: true });
}

afterEach(async () =>
{
    await closeBrowserStorage();
    await IndexedDatabase.Delete(DATABASE_NAME);

    stubStorageManager(undefined);
    vi.restoreAllMocks();
});

describe("useBrowserStorage", () =>
{
    it("stores, gets, lists and removes a package by id and version", async () =>
    {
        const { packages } = useBrowserStorage();
        const source = srd();
        const { id, version } = source.manifest;

        await packages.put(stored(source));

        const record = await packages.get(id, version);
        expect(record?.source.manifest.id).toBe(id);
        expect(record?.source.entities.length).toBe(source.entities.length);
        expect(record?.origin).toBe("site");

        expect((await packages.list()).map((p) => packageKey(p.source.manifest.id, p.source.manifest.version)))
            .toEqual([packageKey(id, version)]);

        await packages.remove(id, version);
        expect(await packages.get(id, version)).toBeUndefined();
        expect(await packages.list()).toEqual([]);
    });

    it("keeps two versions of the same package side by side", async () =>
    {
        const { packages } = useBrowserStorage();
        const source = srd();

        await packages.put(stored(withVersion(source, "0.1.0")));
        await packages.put(stored(withVersion(source, "0.2.0")));

        const versions = (await packages.list()).map((p) => p.source.manifest.version).sort();
        expect(versions).toEqual(["0.1.0", "0.2.0"]);
    });

    it("round-trips meta values", async () =>
    {
        const { meta } = useBrowserStorage();

        expect(await meta.get("srd51-version")).toBeUndefined();

        await meta.set("srd51-version", "0.1.0");
        expect(await meta.get<string>("srd51-version")).toBe("0.1.0");
    });

    it("keeps the data across connections", async () =>
    {
        const source = srd();
        await useBrowserStorage().packages.put(stored(source));

        await closeBrowserStorage();

        const record = await useBrowserStorage().packages.get(source.manifest.id, source.manifest.version);
        expect(record?.source.manifest.id).toBe(source.manifest.id);
    });

    it("requests persistence once, at the first write, and records the answer", async () =>
    {
        const persist = vi.fn(async () => true);
        stubStorageManager({ persist });

        const { meta, packages } = useBrowserStorage();

        await packages.list();
        expect(persist).not.toHaveBeenCalled();

        await packages.put(stored(srd()));
        await meta.set("srd51-version", "0.1.0");

        expect(persist).toHaveBeenCalledTimes(1);
        expect(await meta.get(PERSISTED_KEY)).toBe(true);
    });

    it("records an unknown answer without the Storage API", async () =>
    {
        stubStorageManager(undefined);

        const { meta, persistence } = useBrowserStorage();

        await meta.set("srd51-version", "0.1.0");

        expect(await meta.get(PERSISTED_KEY)).toBe("unknown");
        expect(await persistence()).toEqual({ persisted: "unknown" });
    });

    it("reports persistence and the quota estimate", async () =>
    {
        stubStorageManager({
            persisted: async () => false,
            estimate: async () => ({ usage: 1_024, quota: 1_048_576 })
        });

        expect(await useBrowserStorage().persistence()).toEqual({ persisted: false, usage: 1_024, quota: 1_048_576 });
    });
});
