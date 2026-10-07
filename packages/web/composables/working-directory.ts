import { filesOfSource, toBundle, toPackageSource, readPackageFiles } from "@byloth/dnd-platform-loader";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import type { Character } from "@byloth/dnd-platform-engine";
import type * as Yaml from "yaml";
import { stableStringify } from "@byloth/dnd-platform-schema";

import type { ExportDocument } from "./character-files";
import { exportFileName } from "./character-files";
import { PackageRefusedException } from "./packages";
import type { StorageMirror, StoredPackage } from "./storage";
import { setStorageMirror, WORKING_DIRECTORY_KEY } from "./storage";

/**
 * The working directory (docs/phase-1/02-content-and-character-stores.md, M1.8): a folder of the player's computer,
 * connected through the File System Access API where the browser has it (Chromium on a computer), that mirrors the
 * browser's store as plain files:
 *
 *   README.txt
 *   characters/<id>.yaml     each stored character, the document as it is
 *   exports/<name>.dnd.json  the character files the player saves here instead of downloading
 *   packages/<id>/…          each loaded package, unpacked, editable by hand
 *
 * The browser's store stays the source of truth of the running session; the folder is reconciled with it on
 * connecting, at start (when the browser still grants the permission) and on "Reload from folder": newest wins,
 * and what changed is reported. A file missing in the folder never deletes anything here. This is the only code
 * that touches the API: the rest of the application writes through `useBrowserStorage`, which tells the mirror.
 */

// ---- what the code needs of the API: the real handles in the browser, a tree in memory in the tests --------

export interface FileLike
{
    readonly kind: "file";
    readonly name: string;
    getFile(): Promise<{ readonly lastModified: number, text(): Promise<string> }>;
    createWritable(): Promise<{ write(data: string): Promise<void>, close(): Promise<void> }>;
}
export interface DirectoryLike
{
    readonly kind: "directory";
    readonly name: string;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryLike>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileLike>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
    values(): AsyncIterable<FileLike | DirectoryLike>;
    queryPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
    requestPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
}

/** Where the handle is kept between visits, and how a folder is picked: replaced in the tests. */
export interface WorkingDirectoryEnvironment
{
    pick(): Promise<DirectoryLike>;
    load(): Promise<DirectoryLike | undefined>;
    save(handle: DirectoryLike | undefined): Promise<void>;
}

interface PickerWindow { showDirectoryPicker?(options: { mode: "readwrite", id?: string }): Promise<DirectoryLike> }

const _browserEnvironment: WorkingDirectoryEnvironment = {
    pick: () => (window as unknown as PickerWindow).showDirectoryPicker!({ mode: "readwrite", id: "dnd-platform" }),
    load: async () => (await useBrowserStorage().handles.get(WORKING_DIRECTORY_KEY)) as DirectoryLike | undefined,
    save: async (handle) =>
    {
        const { handles } = useBrowserStorage();
        if (handle) { await handles.set(WORKING_DIRECTORY_KEY, handle); }
        else { await handles.remove(WORKING_DIRECTORY_KEY); }
    }
};

let _environment: WorkingDirectoryEnvironment | undefined;

/** The tests' picker and handle store; `undefined` goes back to the browser's. */
export function setWorkingDirectoryEnvironment(environment: WorkingDirectoryEnvironment | undefined): void
{
    _environment = environment;
}

const _env = (): WorkingDirectoryEnvironment => _environment ?? _browserEnvironment;

// ---- the state -----------------------------------------------------------------------------------------

export type WorkingDirectoryStatus = "unsupported" | "none" | "needs-permission" | "connected";

/** One line of the last reconciliation's report. */
export interface SyncChange
{
    readonly kind: "character" | "package";
    /** The character's or the package's name, else its file. */
    readonly name: string;
    /**
     * `imported`: new in the folder, now here; `updated-here`: changed in the folder, taken here;
     * `updated-folder`: changed here, written to the folder; `written`: here only, written to the folder;
     * `removed-folder`: deleted here while disconnected, deleted from the folder; `refused`: unreadable or invalid.
     */
    readonly action: "imported" | "updated-here" | "updated-folder" | "written" | "removed-folder" | "refused";
    readonly problems?: readonly string[];
}
export interface SyncReport
{
    readonly at: string;
    readonly changes: readonly SyncChange[];
}

/** What the last sync saw in the folder, kept in `meta`: how reconciliation tells "new" from "deleted". */
interface SyncRecord
{
    characters: Record<string, { mtime: number, at: number }>;
    packages: Record<string, string>;
}

export const SYNC_KEY = "working-directory-sync";

const status = ref<WorkingDirectoryStatus>("none");
const folder = ref<string>();
const report = ref<SyncReport>();
const syncing = ref(false);
/** How far the running sync has gone: items done of the items counted when it started. */
const progress = ref<{ done: number, total: number }>({ done: 0, total: 0 });
/** The last error of a write to the folder, for the page: the browser's store was written anyway. */
const failure = ref<string>();
let _handle: DirectoryLike | undefined;

/** Forgets the session's state; for the tests. */
export function resetWorkingDirectory(): void
{
    status.value = "none";
    folder.value = undefined;
    report.value = undefined;
    syncing.value = false;
    progress.value = { done: 0, total: 0 };
    failure.value = undefined;
    _handle = undefined;
    setStorageMirror(undefined);
}

const _supported = (): boolean => (_environment !== undefined) ||
    ((typeof window !== "undefined") &&
        (typeof (window as unknown as PickerWindow).showDirectoryPicker === "function"));

// ---- files -------------------------------------------------------------------------------------------

const CHARACTERS = "characters";
const EXPORTS = "exports";
const PACKAGES = "packages";

type YamlModule = typeof Yaml;
let _yaml: Promise<YamlModule> | undefined;
const _yamlModule = (): Promise<YamlModule> => (_yaml ??= import("yaml"));

async function _writeText(directory: DirectoryLike, name: string, text: string): Promise<FileLike>
{
    const file = await directory.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await writable.write(text);
    await writable.close();

    return file;
}

async function _entries(directory: DirectoryLike): Promise<(FileLike | DirectoryLike)[]>
{
    const entries: (FileLike | DirectoryLike)[] = [];
    for await (const entry of directory.values()) { entries.push(entry); }

    return entries.sort((a, b) => (a.name < b.name ? -1 : 1));
}

/** Every file under `directory`, by `/`-separated path, with its text. */
async function _readTree(
    directory: DirectoryLike, prefix = "", into = new Map<string, string>()
): Promise<Map<string, string>>
{
    for (const entry of await _entries(directory))
    {
        if (entry.kind === "directory") { await _readTree(entry, `${prefix}${entry.name}/`, into); }
        else { into.set(`${prefix}${entry.name}`, await (await entry.getFile()).text()); }
    }

    return into;
}

async function _writePath(root: DirectoryLike, path: string, text: string): Promise<void>
{
    const segments = path.split("/");
    let directory = root;
    for (const segment of segments.slice(0, -1))
    {
        directory = await directory.getDirectoryHandle(segment, { create: true });
    }

    await _writeText(directory, segments[segments.length - 1]!, text);
}

async function _remove(directory: DirectoryLike, name: string): Promise<void>
{
    try { await directory.removeEntry(name, { recursive: true }); }
    catch (error) { if ((error as DOMException).name !== "NotFoundError") { throw error; } }
}

function _readme(key: string): string
{
    const { t } = useNuxtApp().$i18n;

    return `${t(`workingDirectory.readme.${key}`)}\n`;
}

async function _writeReadmes(root: DirectoryLike): Promise<void>
{
    await _writeText(root, "README.txt", _readme("root"));
    for (const name of [CHARACTERS, EXPORTS, PACKAGES])
    {
        await _writeText(await root.getDirectoryHandle(name, { create: true }), "README.txt", _readme(name));
    }
}

// ---- characters and packages as files ----------------------------------------------------------------

const _characterFile = (id: string): string => `${id}.yaml`;

async function _characterText(character: Character): Promise<string>
{
    const { stringify } = await _yamlModule();

    return stringify(character);
}

async function _writeCharacter(root: DirectoryLike, character: Character): Promise<number>
{
    const directory = await root.getDirectoryHandle(CHARACTERS, { create: true });
    const file = await _writeText(directory, _characterFile(character.id), await _characterText(character));

    return (await file.getFile()).lastModified;
}

/** The package's files as YAML texts, by path relative to its root (its manifest, ruleset and entities). */
async function _packageTexts(source: PackageSource): Promise<Map<string, string>>
{
    const { stringify } = await _yamlModule();
    const files = filesOfSource(source);
    const texts = new Map<string, string>();
    for (const file of [files.manifest, files.ruleset, ...files.files])
    {
        if (file) { texts.set(file.path, stringify(file.data)); }
    }

    return texts;
}

async function _writePackage(root: DirectoryLike, source: PackageSource): Promise<void>
{
    const packages = await root.getDirectoryHandle(PACKAGES, { create: true });
    await _remove(packages, source.manifest.id);

    const directory = await packages.getDirectoryHandle(source.manifest.id, { create: true });
    for (const [path, text] of await _packageTexts(source)) { await _writePath(directory, path, text); }
}

let _validate: Promise<(value: unknown) => readonly string[]> | undefined;
function _characterValidator(): Promise<(value: unknown) => readonly string[]>
{
    _validate ??= import("@byloth/dnd-platform-schema/validate").then(({ createAjv, validatorFor }) =>
    {
        const check = validatorFor(createAjv(), "character");

        return (value: unknown): readonly string[] =>
            (check(value) ? [] : (check.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? ""}`.trim()));
    });

    return _validate;
}

// ---- reconciliation ----------------------------------------------------------------------------------

/** One item of the sync done; the count never passes the total counted at the start. */
function _step(): void
{
    const { done, total } = progress.value;
    progress.value = { done: Math.min(done + 1, total), total: total };
}

/** The items a sync goes through, counted before it starts: every package and character, in the folder and here. */
async function _countItems(root: DirectoryLike): Promise<number>
{
    const storage = useBrowserStorage();
    const packages = await root.getDirectoryHandle(PACKAGES, { create: true });
    const characters = await root.getDirectoryHandle(CHARACTERS, { create: true });

    const folders = (await _entries(packages)).filter((e) => e.kind === "directory").length;
    const files = (await _entries(characters)).filter((e) => (e.kind === "file") && e.name.endsWith(".yaml")).length;

    return folders + files + (await storage.packages.list()).length + (await storage.characters.list()).length;
}

async function _syncCharacters(root: DirectoryLike, record: SyncRecord, changes: SyncChange[]): Promise<void>
{
    const storage = useBrowserStorage();
    const { parse } = await _yamlModule();
    const validate = await _characterValidator();

    const here = new Map((await storage.characters.list()).map((c) => [c.id, c]));
    const times = await storage.characters.times();
    const directory = await root.getDirectoryHandle(CHARACTERS, { create: true });

    const there = new Map<string, { character: Character, mtime: number, file: string }>();
    const refused = new Set<string>();
    for (const entry of await _entries(directory))
    {
        if ((entry.kind !== "file") || !entry.name.endsWith(".yaml")) { continue; }

        _step();
        const file = await entry.getFile();
        let value: unknown;
        let problems: readonly string[];
        try
        {
            value = parse(await file.text());
            problems = await validate(value);
        }
        catch (error) { problems = [(error as Error).message]; }

        const id = entry.name.replace(/\.yaml$/, "");
        if (problems.length)
        {
            refused.add(id);
            changes.push({ kind: "character", name: entry.name, action: "refused", problems: problems });

            continue;
        }

        const character = value as Character;
        there.set(character.id, { character: character, mtime: file.lastModified, file: entry.name });
    }

    const next: SyncRecord["characters"] = {};
    const now = Date.now();
    for (const id of new Set([...here.keys(), ...there.keys()]))
    {
        _step();
        const mine = here.get(id);
        const theirs = there.get(id);
        const seen = record.characters[id];

        if (!mine && theirs)
        {
            if (seen)
            {
                // Deleted here while the folder was not connected.
                await _remove(directory, theirs.file);
                changes.push({ kind: "character", name: theirs.character.name, action: "removed-folder" });

                continue;
            }

            await storage.characters.put(theirs.character, { mirror: false, at: theirs.mtime });
            changes.push({ kind: "character", name: theirs.character.name, action: "imported" });
            next[id] = { mtime: theirs.mtime, at: now };

            continue;
        }

        if (mine && !theirs)
        {
            // A file that does not read is left as the player wrote it: nothing overwrites it.
            if (refused.has(id)) { continue; }

            next[id] = { mtime: await _writeCharacter(root, mine), at: now };
            changes.push({ kind: "character", name: mine.name, action: "written" });

            continue;
        }

        if (!mine || !theirs) { continue; }

        if (stableStringify(mine) === stableStringify(theirs.character))
        {
            next[id] = { mtime: theirs.mtime, at: now };

            continue;
        }

        const changedHere = (times[id] ?? 0) > (seen?.at ?? 0);
        const changedThere = theirs.mtime !== seen?.mtime;
        const takeTheirs = (changedThere && !changedHere) ||
            ((changedThere === changedHere) && (theirs.mtime > (times[id] ?? 0)));
        if (takeTheirs)
        {
            await storage.characters.put(theirs.character, { mirror: false, at: theirs.mtime });
            changes.push({ kind: "character", name: theirs.character.name, action: "updated-here" });
            next[id] = { mtime: theirs.mtime, at: now };
        }
        else
        {
            next[id] = { mtime: await _writeCharacter(root, mine), at: now };
            changes.push({ kind: "character", name: mine.name, action: "updated-folder" });
        }
    }

    record.characters = next;
}

async function _syncPackages(root: DirectoryLike, record: SyncRecord, changes: SyncChange[]): Promise<void>
{
    const storage = useBrowserStorage();
    const { loadDirectory } = usePackageLoader();
    const packages = await root.getDirectoryHandle(PACKAGES, { create: true });

    const stored = new Map<string, StoredPackage>();
    for (const r of await storage.packages.list()) { stored.set(r.source.manifest.id, r); }

    const seen = new Set<string>();
    const folders = new Set<string>();
    for (const entry of await _entries(packages))
    {
        if (entry.kind !== "directory") { continue; }
        _step();
        folders.add(entry.name);

        const texts = await _readTree(entry);
        texts.delete("README.txt");
        const path = `${PACKAGES}/${entry.name}`;

        // Unchanged since it was written: nothing to check again.
        let source: PackageSource | undefined;
        try { source = toPackageSource(readPackageFiles(texts.keys(), (p) => texts.get(p)!), path); }
        catch { source = undefined; }
        const id = source?.manifest.id;
        if (id !== undefined) { seen.add(id); }

        const current = (id !== undefined) ? stored.get(id) : undefined;
        if (source && current && (stableStringify(toBundle(source)) === stableStringify(current.source))) { continue; }

        try
        {
            const { record: loaded } = await loadDirectory(path, texts);
            const loadedId = loaded.source.manifest.id;
            seen.add(loadedId);
            stored.set(loadedId, loaded);
            record.packages[loadedId] = loaded.source.manifest.version;
            changes.push({
                kind: "package", name: _packageName(loaded.source), action: current ? "updated-here" : "imported"
            });
        }
        catch (error)
        {
            const problems = (error instanceof PackageRefusedException) ?
                error.diagnostics.filter((d) => d.severity === "error").map((d) => `${d.file}: ${d.message}`) :
                [(error as Error).message];
            changes.push({ kind: "package", name: path, action: "refused", problems: problems });
        }
    }

    for (const [id, r] of stored)
    {
        _step();
        // A folder of that name that does not read is the player's work in progress: nothing overwrites it.
        if (seen.has(id) || folders.has(id)) { continue; }

        await _writePackage(root, r.source);
        record.packages[id] = r.source.manifest.version;
        changes.push({ kind: "package", name: _packageName(r.source), action: "written" });
    }
}

function _packageName(source: PackageSource): string
{
    const names = source.manifest.name as Record<string, string | undefined>;

    return names[useNuxtApp().$i18n.locale.value] ?? names["en"] ?? source.manifest.id;
}

async function _reconcile(): Promise<SyncReport | undefined>
{
    const root = _handle;
    if (!root || syncing.value) { return undefined; }

    syncing.value = true;
    progress.value = { done: 0, total: 0 };
    try
    {
        progress.value = { done: 0, total: await _countItems(root) };
        const storage = useBrowserStorage();
        const record: SyncRecord = {
            characters: {},
            packages: {},
            ...((await storage.meta.get(SYNC_KEY)) as SyncRecord | undefined)
        };
        const changes: SyncChange[] = [];

        await _writeReadmes(root);
        await _syncPackages(root, record, changes);
        await _syncCharacters(root, record, changes);
        await storage.meta.set(SYNC_KEY, record as never);
        progress.value = { done: progress.value.total, total: progress.value.total };

        const done: SyncReport = { at: new Date().toISOString(), changes: changes };
        report.value = done;
        failure.value = undefined;

        if (changes.some((c) => (c.action === "imported") || (c.action === "updated-here")))
        {
            clearNuxtData("characters");
            await useContentStore().refresh();
        }

        return done;
    }
    catch (error)
    {
        failure.value = (error as Error).message;

        return undefined;
    }
    finally { syncing.value = false; }
}

// ---- the mirror: what is written here goes to the folder ------------------------------------------------

async function _guard(write: (root: DirectoryLike) => Promise<void>): Promise<void>
{
    const root = _handle;
    if (!root || (status.value !== "connected")) { return; }

    try
    {
        await write(root);
        failure.value = undefined;
    }
    catch (error) { failure.value = (error as Error).message; }
}

function _without<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T>
{
    return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

async function _remember(update: (record: SyncRecord) => void): Promise<void>
{
    const meta = useBrowserStorage().meta;
    const record: SyncRecord = {
        characters: {}, packages: {}, ...((await meta.get(SYNC_KEY)) as SyncRecord | undefined)
    };
    update(record);
    await meta.set(SYNC_KEY, record as never);
}

const _mirror: StorageMirror = {
    characterWritten: (character) => _guard(async (root) =>
    {
        const mtime = await _writeCharacter(root, character);
        await _remember((r) => { r.characters[character.id] = { mtime: mtime, at: Date.now() }; });
    }),
    characterRemoved: (id) => _guard(async (root) =>
    {
        await _remove(await root.getDirectoryHandle(CHARACTERS, { create: true }), _characterFile(id));
        await _remember((r) => { r.characters = _without(r.characters, id); });
    }),
    packageWritten: (record) => _guard(async (root) =>
    {
        await _writePackage(root, record.source);
        await _remember((r) => { r.packages[record.source.manifest.id] = record.source.manifest.version; });
    }),
    packageRemoved: (id) => _guard(async (root) =>
    {
        // A newer version of the same package replaced this one: its folder holds the newer files.
        if ((await useBrowserStorage().packages.list()).some((r) => r.source.manifest.id === id)) { return; }

        await _remove(await root.getDirectoryHandle(PACKAGES, { create: true }), id);
        await _remember((r) => { r.packages = _without(r.packages, id); });
    })
};

async function _attach(handle: DirectoryLike): Promise<void>
{
    _handle = handle;
    folder.value = handle.name;
    status.value = "connected";
    setStorageMirror(_mirror);
}

// ---- the composable ------------------------------------------------------------------------------------

export function useWorkingDirectory()
{
    /** At start: the folder of the last visit, connected again when the browser still grants it. */
    const restore = async (): Promise<void> =>
    {
        if (!_supported())
        {
            status.value = "unsupported";

            return;
        }

        const handle = await _env().load();
        if (!handle)
        {
            status.value = "none";

            return;
        }

        _handle = handle;
        folder.value = handle.name;
        const permission = await handle.queryPermission?.({ mode: "readwrite" }) ?? "granted";
        if (permission !== "granted")
        {
            status.value = "needs-permission";

            return;
        }

        await _attach(handle);
        await _reconcile();
    };

    /** Asks for a folder and mirrors everything into it; `false` when the player closes the picker. */
    const connect = async (): Promise<boolean> =>
    {
        let handle: DirectoryLike;
        try { handle = await _env().pick(); }
        catch (error)
        {
            if ((error as DOMException).name === "AbortError") { return false; }
            throw error;
        }

        // A new folder starts with no memory of the previous one's files.
        await useBrowserStorage().meta.set(SYNC_KEY, null);
        await _env().save(handle);
        await _attach(handle);
        await _reconcile();

        return true;
    };

    /** The browser asks again for the folder of the last visit; it must follow a click. */
    const reconnect = async (): Promise<boolean> =>
    {
        const handle = _handle;
        if (!handle) { return false; }

        const permission = await handle.requestPermission?.({ mode: "readwrite" }) ?? "granted";
        if (permission !== "granted") { return false; }

        await _attach(handle);
        await _reconcile();

        return true;
    };

    /** Reads the folder again: the player changed files in it. */
    const reload = (): Promise<SyncReport | undefined> => _reconcile();

    /** Forgets the folder; its files stay where they are. */
    const disconnect = async (): Promise<void> =>
    {
        setStorageMirror(undefined);
        _handle = undefined;
        folder.value = undefined;
        report.value = undefined;
        failure.value = undefined;
        status.value = _supported() ? "none" : "unsupported";
        await _env().save(undefined);
        await useBrowserStorage().meta.set(SYNC_KEY, null);
    };

    /** Saves a character file into `exports/` instead of downloading it; the file's name. */
    const saveExport = async (document: ExportDocument): Promise<string | undefined> =>
    {
        const name = exportFileName(document.character.name);
        let saved: string | undefined;
        await _guard(async (root) =>
        {
            await _writeText(await root.getDirectoryHandle(EXPORTS, { create: true }), name, stableStringify(document));
            saved = name;
        });

        return saved;
    };

    return {
        supported: computed(() => _supported()),
        // Where the browser has no folders the plugin never runs: the state says so by itself.
        status: computed((): WorkingDirectoryStatus => (_supported() ? status.value : "unsupported")),
        folder: readonly(folder),
        report: readonly(report),
        syncing: readonly(syncing),
        progress: readonly(progress),
        failure: readonly(failure),
        restore: restore,
        connect: connect,
        reconnect: reconnect,
        reload: reload,
        disconnect: disconnect,
        saveExport: saveExport
    };
}
