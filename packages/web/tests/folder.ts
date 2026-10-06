import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import type { DirectoryLike, FileLike, WorkingDirectoryEnvironment } from "@/composables/working-directory";

/**
 * A folder in memory with the part of the File System Access API the working directory uses (M1.8), and an
 * environment that picks it and keeps it, so the tests never touch the browser's picker nor IndexedDB's clone of a
 * handle (which a fake one cannot pass).
 */

let _clock = 0;
/** A file's modification time: the clock, always later than the previous one, as a real disk would give. */
const tick = (): number => (_clock = Math.max(_clock + 1, Date.now()));

export class MemoryFile implements FileLike
{
    public readonly kind = "file";
    public text: string;
    public lastModified: number;

    public constructor(public readonly name: string, text = "")
    {
        this.text = text;
        this.lastModified = tick();
    }

    public getFile(): Promise<{ lastModified: number, text(): Promise<string> }>
    {
        const { text, lastModified } = this;

        return Promise.resolve({ lastModified: lastModified, text: () => Promise.resolve(text) });
    }

    public createWritable(): Promise<{ write(data: string): Promise<void>, close(): Promise<void> }>
    {
        let buffer = "";

        return Promise.resolve({
            write: (data: string) => { buffer += data; return Promise.resolve(); },
            close: () =>
            {
                this.text = buffer;
                this.lastModified = tick();

                return Promise.resolve();
            }
        });
    }

    /** The player edits the file by hand. */
    public edit(text: string): void
    {
        this.text = text;
        this.lastModified = tick();
    }
}

const notFound = (name: string): DOMException => new DOMException(`${name} not found`, "NotFoundError");

export class MemoryFolder implements DirectoryLike
{
    public readonly kind = "directory";
    public readonly entries = new Map<string, MemoryFile | MemoryFolder>();
    public permission: PermissionState = "granted";
    /** What `requestPermission` answers, as the player would in the browser's prompt. */
    public answer: PermissionState = "granted";

    public constructor(public readonly name: string) { }

    public getDirectoryHandle(name: string, options: { create?: boolean } = {}): Promise<DirectoryLike>
    {
        const entry = this.entries.get(name);
        if (entry instanceof MemoryFolder) { return Promise.resolve(entry); }
        if (entry || !options.create) { return Promise.reject(notFound(name)); }

        const folder = new MemoryFolder(name);
        this.entries.set(name, folder);

        return Promise.resolve(folder);
    }

    public getFileHandle(name: string, options: { create?: boolean } = {}): Promise<FileLike>
    {
        const entry = this.entries.get(name);
        if (entry instanceof MemoryFile) { return Promise.resolve(entry); }
        if (entry || !options.create) { return Promise.reject(notFound(name)); }

        const file = new MemoryFile(name);
        this.entries.set(name, file);

        return Promise.resolve(file);
    }

    public removeEntry(name: string): Promise<void>
    {
        if (!this.entries.delete(name)) { return Promise.reject(notFound(name)); }

        return Promise.resolve();
    }

    public async *values(): AsyncIterable<FileLike | DirectoryLike>
    {
        for (const entry of [...this.entries.values()]) { yield entry; }
    }

    public queryPermission(): Promise<PermissionState> { return Promise.resolve(this.permission); }

    public requestPermission(): Promise<PermissionState>
    {
        this.permission = this.answer;

        return Promise.resolve(this.permission);
    }

    /** The entry at a `/`-separated path, or `undefined`. */
    public at(path: string): MemoryFile | MemoryFolder | undefined
    {
        const [first, ...rest] = path.split("/");
        const entry = this.entries.get(first!);
        if (!rest.length) { return entry; }

        return (entry instanceof MemoryFolder) ? entry.at(rest.join("/")) : undefined;
    }

    /** The file at a path, created with its folders when missing. */
    public put(path: string, text: string): MemoryFile
    {
        const segments = path.split("/");
        if (segments.length > 1)
        {
            let next = this.entries.get(segments[0]!);
            if (!(next instanceof MemoryFolder))
            {
                next = new MemoryFolder(segments[0]!);
                this.entries.set(next.name, next);
            }

            return next.put(segments.slice(1).join("/"), text);
        }

        const file = new MemoryFile(path, text);
        this.entries.set(file.name, file);

        return file;
    }

    /** Every file's path, sorted. */
    public paths(prefix = ""): string[]
    {
        return [...this.entries.values()]
            .flatMap((e) => (e instanceof MemoryFolder ? e.paths(`${prefix}${e.name}/`) : [`${prefix}${e.name}`]))
            .sort();
    }
}

/** A copy of a folder on disk (a fixture package) under `path` of the folder in memory. */
export function copyInto(folder: MemoryFolder, path: string, dir: string): void
{
    for (const name of readdirSync(dir))
    {
        const source = join(dir, name);
        if (statSync(source).isDirectory()) { copyInto(folder, `${path}/${name}`, source); }
        else { folder.put(`${path}/${name}`, readFileSync(source, "utf8")); }
    }
}

/** An environment whose picker gives `folder` (or refuses, with `undefined`) and that keeps the handle in memory. */
export function memoryEnvironment(folder: MemoryFolder | undefined): WorkingDirectoryEnvironment & {
    kept: DirectoryLike | undefined;
}
{
    const environment = {
        kept: undefined as DirectoryLike | undefined,
        pick: (): Promise<DirectoryLike> => (folder ?
            Promise.resolve(folder) :
            Promise.reject(new DOMException("The user aborted a request.", "AbortError"))),
        load: (): Promise<DirectoryLike | undefined> => Promise.resolve(environment.kept),
        save: (handle: DirectoryLike | undefined): Promise<void> =>
        {
            environment.kept = handle;

            return Promise.resolve();
        }
    };

    return environment;
}
