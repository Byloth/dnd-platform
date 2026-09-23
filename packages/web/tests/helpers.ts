/**
 * Shared helpers of the web tests: fixture paths, packages as the files a user picks (a zip of a folder,
 * a bundle), and the site's content directory served by endpoints (the SRD from `build/content/`).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { zipSync } from "fflate";
import { registerEndpoint } from "@nuxt/test-utils/runtime";

import { IndexedDatabase } from "@byloth/core";
import { bundleText } from "@byloth/dnd-platform-loader";
import type { PackageSource } from "@byloth/dnd-platform-loader";

import type { PackageFile } from "@/composables/packages";
import { closeBrowserStorage, DATABASE_NAME } from "@/composables/storage";

export const ROOT = resolve(import.meta.dirname, "..", "..", "..");
export const FIXTURES = resolve(ROOT, "fixtures", "packages");
export const PRIVATE = resolve(ROOT, "content-private");

function* files(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir))
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* files(path); }
        else { yield path; }
    }
}

/** A zip of a package directory, under a top-level folder as "compress this folder" makes it, or at the root. */
export function zipOf(dir: string, folder?: string): PackageFile
{
    const entries: Record<string, Uint8Array> = {};
    for (const path of files(dir))
    {
        const name = relative(dir, path).replaceAll("\\", "/");
        entries[folder ? `${folder}/${name}` : name] = new Uint8Array(readFileSync(path));
    }
    const bytes = zipSync(entries);

    return { name: `${folder ?? "package"}.zip`, arrayBuffer: async () => bytes.slice().buffer };
}

export function bundleOf(source: PackageSource, name: string): PackageFile
{
    const bytes = new TextEncoder().encode(bundleText(source));

    return { name: name, arrayBuffer: async () => bytes.slice().buffer };
}

export const SRD = JSON.parse(readFileSync(resolve(ROOT, "build", "content", "srd51.json"), "utf8")) as PackageSource;

const _site = { published: true };

/**
 * Serves the site's `content/index.json` and `content/srd51.json`; the returned switch unpublishes the SRD.
 * Call once per test file, at the top level.
 */
export function serveSite(): { publish: (published: boolean) => void }
{
    registerEndpoint("/dnd-platform/content/index.json", () =>
    {
        const { version } = SRD.manifest;

        return { packages: _site.published ? { srd51: { latest: version, versions: [version] } } : {} };
    });
    registerEndpoint("/dnd-platform/content/srd51.json", () => SRD);

    return { publish: (published: boolean): void => { _site.published = published; } };
}

/** Closes and deletes the browser database, between tests. */
export async function clearBrowserStorage(): Promise<void>
{
    await closeBrowserStorage();
    await IndexedDatabase.Delete(DATABASE_NAME);
}
