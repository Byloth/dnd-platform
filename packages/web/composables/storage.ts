import { IndexedDatabase } from "@byloth/core";
import type { JSONValue, StoreDefinition } from "@byloth/core";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import type { Character } from "@byloth/dnd-platform-engine";

/**
 * The browser's storage of the application (docs/phase-1/02-content-and-character-stores.md):
 * one IndexedDB database through `IndexedDatabase` of `@byloth/core`. It is not called
 * `useStorage` because VueUse auto-imports a composable of that name.
 */

export const DATABASE_NAME = "dnd-platform";
export const DATABASE_VERSION = 1;

/** The `meta` key holding the answer to the persistence request. */
export const PERSISTED_KEY = "storage-persisted";

export interface StoredPackage
{
    readonly source: PackageSource;
    readonly loadedAt: string;
    readonly origin: "site" | "file";
    readonly fileName?: string;
}

export interface StoreMap
{
    packages: StoredPackage;
    characters: Character;
    meta: JSONValue;
}

export type Persisted = boolean | "unknown";

export interface PersistenceState
{
    readonly persisted: Persisted;
    readonly usage?: number;
    readonly quota?: number;
}

const STORES: readonly StoreDefinition<keyof StoreMap>[] = [
    { name: "packages" },
    { name: "characters", keyPath: "id" },
    { name: "meta" }
];

let _connection: Promise<IndexedDatabase<StoreMap>> | undefined;
let _persistenceRequested = false;

function _open(): Promise<IndexedDatabase<StoreMap>>
{
    if (_connection) { return _connection; }

    const connection = IndexedDatabase.Open<StoreMap>(DATABASE_NAME, STORES, DATABASE_VERSION)
        .then((database) =>
        {
            // Another tab upgrading the database closes this connection: the next call reopens it.
            database.onClose(() =>
            {
                if (_connection === connection) { _connection = undefined; }
            });

            return database;
        });

    connection.catch(() =>
    {
        if (_connection === connection) { _connection = undefined; }
    });

    _connection = connection;

    return connection;
}

function _storageManager(): StorageManager | undefined
{
    return (typeof navigator !== "undefined") ? navigator.storage : undefined;
}

/** Asks the browser not to evict the data, once per session, at the first write; the answer goes to `meta`. */
async function _requestPersistence(database: IndexedDatabase<StoreMap>): Promise<void>
{
    if (_persistenceRequested) { return; }
    _persistenceRequested = true;

    const storage = _storageManager();

    let answer: Persisted = "unknown";
    if (typeof storage?.persist === "function")
    {
        try { answer = await storage.persist(); }
        catch { answer = "unknown"; }
    }

    await database.put("meta", answer, PERSISTED_KEY);
}

async function _writable(): Promise<IndexedDatabase<StoreMap>>
{
    const database = await _open();
    await _requestPersistence(database);

    return database;
}

export function packageKey(id: string, version: string): string { return `${id}@${version}`; }

/** Closes the connection and forgets the session's persistence request; for tests and for "delete all data". */
export async function closeBrowserStorage(): Promise<void>
{
    const connection = _connection;

    _connection = undefined;
    _persistenceRequested = false;

    if (connection)
    {
        try { (await connection).close(); }
        catch { /* It never opened: nothing to close. */ }
    }
}

export function useBrowserStorage()
{
    const packages = {
        get: async (id: string, version: string): Promise<StoredPackage | undefined> =>
            (await _open()).get("packages", packageKey(id, version)),

        list: async (): Promise<StoredPackage[]> => (await _open()).getAll("packages"),

        put: async (record: StoredPackage): Promise<void> =>
        {
            const { id, version } = record.source.manifest;

            await (await _writable()).put("packages", record, packageKey(id, version));
        },

        remove: async (id: string, version: string): Promise<void> =>
            (await _open()).delete("packages", packageKey(id, version))
    };

    /** The stored characters, as documents: the wizard writes them (M1.4d3), the sheet deletes them (M1.4e2). */
    const characters = {
        get: async (id: string): Promise<Character | undefined> => (await _open()).get("characters", id),

        list: async (): Promise<Character[]> => (await _open()).getAll("characters"),

        put: async (character: Character): Promise<void> => (await _writable()).put("characters", character),

        remove: async (id: string): Promise<void> => (await _open()).delete("characters", id)
    };

    const meta = {
        get: async <T extends JSONValue>(key: string): Promise<T | undefined> =>
            (await _open()).get("meta", key) as Promise<T | undefined>,

        set: async (key: string, value: JSONValue): Promise<void> => (await _writable()).put("meta", value, key)
    };

    /** Whether the browser keeps the data, and how much of the quota it uses; `unknown` without the Storage API. */
    const persistence = async (): Promise<PersistenceState> =>
    {
        const storage = _storageManager();

        const persisted: Persisted = (typeof storage?.persisted === "function") ? await storage.persisted() : "unknown";
        const estimate = (typeof storage?.estimate === "function") ? await storage.estimate() : { };

        return {
            persisted,
            ...(estimate.usage !== undefined ? { usage: estimate.usage } : { }),
            ...(estimate.quota !== undefined ? { quota: estimate.quota } : { })
        };
    };

    return { packages, characters, meta, persistence };
}
