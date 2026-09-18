/**
 * Download the pinned upstream files into tools/import/cache/ (git-ignored)
 * and record their sha256 in sources.lock.yaml.
 *
 *   node tools/import/src/fetch.ts [--force]
 */

import { existsSync, readFileSync } from "node:fs";

import { cachePath, readLock, sha256, writeFile, writeLock } from "./lib.ts";
import type { Source } from "./lib.ts";

const FORCE = process.argv.includes("--force");
const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

interface TreeEntry { path: string, type: "blob" | "tree" }

async function listFiles(source: Source): Promise<string[]>
{
    const response = await fetch(`${API}/repos/${source.repo}/git/trees/${source.commit}?recursive=1`, {
        headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) { throw new Error(`${source.repo}@${source.commit}: tree listing failed (${response.status})`); }

    const { tree, truncated } = await response.json() as { tree: TreeEntry[], truncated: boolean };
    if (truncated) { throw new Error(`${source.repo}: tree listing truncated; narrow the paths`); }

    return tree
        .filter((entry) => entry.type === "blob")
        .map((entry) => entry.path)
        .filter((path) => source.paths.some((prefix) => path.startsWith(prefix)))
        .filter((path) => !source.exclude.some((needle) => path.includes(needle)))
        .sort();
}

async function download(source: Source, file: string): Promise<Uint8Array>
{
    const response = await fetch(`${RAW}/${source.repo}/${source.commit}/${file}`);
    if (!response.ok)
    {
        throw new Error(`${source.repo}@${source.commit}/${file}: download failed (${response.status})`);
    }

    return new Uint8Array(await response.arrayBuffer());
}

async function fetchSource(source: Source): Promise<void>
{
    const files = await listFiles(source);
    const seen: Record<string, string> = {};
    let downloaded = 0;

    for (const file of files)
    {
        const target = cachePath(source, file);
        const expected = source.files[file];

        if (!FORCE && expected && existsSync(target) && sha256(readFileSync(target)) === expected)
        {
            seen[file] = expected;

            continue;
        }

        const data = await download(source, file);
        writeFile(target, data);
        seen[file] = sha256(data);
        downloaded += 1;
    }

    source.files = seen;

    console.log(`${source.id}: ${files.length} files, ${downloaded} downloaded`);
}

const lock = readLock();
for (const source of lock.sources) { await fetchSource(source); }
writeLock(lock);
