import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { parse, stringify } from "yaml";

export const IMPORT_DIR = resolve(import.meta.dirname, "..");
export const CACHE_DIR = resolve(IMPORT_DIR, "cache");
export const LOCK_PATH = resolve(IMPORT_DIR, "sources.lock.yaml");
export const REPO_ROOT = resolve(IMPORT_DIR, "..", "..");

export interface Source
{
    id: string;
    repo: string;
    ref: string;
    commit: string;
    license: string;
    paths: string[];
    exclude: string[];
    files: Record<string, string>;
}
export interface Lock { sources: Source[] }

export function readLock(): Lock
{
    return parse(readFileSync(LOCK_PATH, "utf8")) as Lock;
}
export function writeLock(lock: Lock): void
{
    const header = readFileSync(LOCK_PATH, "utf8")
        .split("\n")
        .filter((line) => line.startsWith("#"))
        .join("\n");

    writeFileSync(LOCK_PATH, `${header}\n${stringify(lock, { lineWidth: 0 })}`);
}

export function sha256(data: Uint8Array | string): string
{
    return createHash("sha256").update(data)
        .digest("hex");
}

export function writeFile(path: string, data: Uint8Array | string): void
{
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data);
}

export function cachePath(source: Source, file: string): string
{
    return resolve(CACHE_DIR, source.id, file);
}

export function readCachedJson<T>(sourceId: string, file: string): T
{
    return JSON.parse(readFileSync(resolve(CACHE_DIR, sourceId, file), "utf8")) as T;
}
