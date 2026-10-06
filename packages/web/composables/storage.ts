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
/** 2 (M1.8): the `handles` store of the working directory. */
export const DATABASE_VERSION = 2;

/** The `meta` key holding the answer to the persistence request. */
export const PERSISTED_KEY = "storage-persisted";
/** The `meta` key holding when each character was last written here: `{ id: milliseconds }` (M1.8). */
export const CHARACTER_TIMES_KEY = "character-times";
/** The key of the working directory's handle in the `handles` store (M1.8). */
export const WORKING_DIRECTORY_KEY = "working-directory";

export interface StoredPackage
{
    readonly source: PackageSource;
    readonly loadedAt: string;
    /** `directory`: read from the working directory's `packages/` (M1.8). */
    readonly origin: "site" | "file" | "directory";
    readonly fileName?: string;
}

export interface StoreMap
{
    packages: StoredPackage;
    characters: Character;
    meta: JSONValue;
    /** File System Access handles, which IndexedDB can hold and JSON cannot. */
    handles: unknown;
}

/**
 * What is written here, told to the working directory when one is connected (M1.8). A mirror never makes a write
 * fail: it reports its own errors.
 */
export interface StorageMirror
{
    characterWritten(character: Character): Promise<void>;
    characterRemoved(id: string): Promise<void>;
    packageWritten(record: StoredPackage): Promise<void>;
    packageRemoved(id: string, version: string): Promise<void>;
}

/** How a write reaches the working directory: `mirror: false` for what the working directory itself brings. */
export interface WriteOptions
{
    readonly mirror?: boolean;
    /** When the character was last changed, in milliseconds; now when absent. */
    readonly at?: number;
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
    { name: "meta" },
    { name: "handles" }
];

let _connection: Promise<IndexedDatabase<StoreMap>> | undefined;
let _persistenceRequested = false;
let _mirror: StorageMirror | undefined;

/** The working directory's mirror while one is connected; `undefined` disconnects it. */
export function setStorageMirror(mirror: StorageMirror | undefined): void { _mirror = mirror; }

async function _setCharacterTime(database: IndexedDatabase<StoreMap>, id: string, at: number | undefined): Promise<void>
{
    const stored = (await database.get("meta", CHARACTER_TIMES_KEY)) as Record<string, number> | undefined;
    const times = Object.fromEntries(Object.entries(stored ?? {}).filter(([key]) => key !== id));
    if (at !== undefined) { times[id] = at; }

    await database.put("meta", times, CHARACTER_TIMES_KEY);
}

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

        put: async (record: StoredPackage, options: WriteOptions = {}): Promise<void> =>
        {
            const { id, version } = record.source.manifest;

            await (await _writable()).put("packages", record, packageKey(id, version));
            if (options.mirror !== false) { await _mirror?.packageWritten(record); }
        },

        remove: async (id: string, version: string, options: WriteOptions = {}): Promise<void> =>
        {
            await (await _open()).delete("packages", packageKey(id, version));
            if (options.mirror !== false) { await _mirror?.packageRemoved(id, version); }
        }
    };

    /** The stored characters, as documents: the wizard writes them (M1.4d3), the sheet deletes them (M1.4e2). */
    const characters = {
        get: async (id: string): Promise<Character | undefined> => (await _open()).get("characters", id),

        list: async (): Promise<Character[]> => (await _open()).getAll("characters"),

        put: async (character: Character, options: WriteOptions = {}): Promise<void> =>
        {
            // The time first: once the character is there, the write is complete.
            const database = await _writable();
            await _setCharacterTime(database, character.id, options.at ?? Date.now());
            await database.put("characters", character);
            if (options.mirror !== false) { await _mirror?.characterWritten(character); }
        },

        remove: async (id: string, options: WriteOptions = {}): Promise<void> =>
        {
            const database = await _open();
            await _setCharacterTime(database, id, undefined);
            await database.delete("characters", id);
            if (options.mirror !== false) { await _mirror?.characterRemoved(id); }
        },

        /** When each character was last written here, in milliseconds. */
        times: async (): Promise<Readonly<Record<string, number>>> =>
            ((await (await _open()).get("meta", CHARACTER_TIMES_KEY)) as Record<string, number> | undefined) ?? {}
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

    /** The working directory's handle (M1.8). */
    const handles = {
        get: async (key: string): Promise<unknown> => (await _open()).get("handles", key),

        set: async (key: string, handle: unknown): Promise<void> => (await _open()).put("handles", handle, key),

        remove: async (key: string): Promise<void> => (await _open()).delete("handles", key)
    };

    return { packages, characters, meta, handles, persistence };
}
