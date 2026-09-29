/**
 * Shared helpers of the web tests: fixture paths, packages as the files a user picks (a zip of a folder,
 * a bundle), and the site's content directory served by endpoints (the SRD from `build/content/`).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { zipSync } from "fflate";
import { parse } from "yaml";
import { vi } from "vitest";
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
const ITALIAN_PATH = resolve(ROOT, "build", "content", "srd51-it.json");
/** The Italian translation of the SRD (docs/phase-1/11), when built. */
export const SRD_IT = existsSync(ITALIAN_PATH) ?
    JSON.parse(readFileSync(ITALIAN_PATH, "utf8")) as PackageSource :
    undefined;

const CREATURES_PATH = resolve(ROOT, "build", "content", "srd51-creatures.json");
const CREATURES_IT_PATH = resolve(ROOT, "build", "content", "srd51-creatures-it.json");
/** The SRD's creatures, a catalogue package (docs/phase-1/13-compendium.md), when built. */
export const CREATURES = existsSync(CREATURES_PATH) ?
    JSON.parse(readFileSync(CREATURES_PATH, "utf8")) as PackageSource :
    undefined;
export const CREATURES_IT = existsSync(CREATURES_IT_PATH) ?
    JSON.parse(readFileSync(CREATURES_IT_PATH, "utf8")) as PackageSource :
    undefined;

const _site = { published: true, creatureFetches: 0 };

/**
 * Serves the site's `content/index.json`, `content/srd51.json` and, when built, the Italian translation and the
 * creatures (a catalogue, with its translation); the returned switch unpublishes the SRD, and `creatureFetches`
 * counts the requests for the creatures' bundle. Call once per test file, at the top level.
 */
export function serveSite(options: { olderSrd?: readonly PackageSource[] } = {}): {
    publish: (published: boolean) => void;
    creatureFetches: () => number;
}
{
    // Earlier releases of the SRD, for the update alert (DEC-21): listed in the index and served by version.
    const older = options.olderSrd ?? [];
    for (const release of older)
    {
        registerEndpoint(`/dnd-platform/content/srd51@${release.manifest.version}.json`, () => release);
    }
    registerEndpoint("/dnd-platform/content/srd51.changelog.md", () =>
        readFileSync(resolve(ROOT, "packages", "content", "srd51", "CHANGELOG.md"), "utf8"));

    registerEndpoint("/dnd-platform/content/index.json", () =>
    {
        const { version } = SRD.manifest;

        if (!_site.published) { return { packages: {} }; }
        const italian = SRD_IT ?
            {
                "srd51-it": {
                    latest: SRD_IT.manifest.version,
                    versions: [SRD_IT.manifest.version],
                    translation: { language: "it", of: ["srd51"] }
                }

            } :
            {};
        const creatures = CREATURES ?
            {
                "srd51-creatures": {
                    latest: CREATURES.manifest.version,
                    versions: [CREATURES.manifest.version],
                    catalogue: true
                },
                ...(CREATURES_IT ?
                    {
                        "srd51-creatures-it": {
                            latest: CREATURES_IT.manifest.version,
                            versions: [CREATURES_IT.manifest.version],
                            translation: { language: "it", of: CREATURES_IT.manifest.dependencies.map((d) => d.id) }
                        }

                    } :
                    {})

            } :
            {};

        const versions = [...older.map((r) => r.manifest.version), version];

        return { packages: { srd51: { latest: version, versions: versions }, ...italian, ...creatures } };
    });
    // Each bundle under its alias and its versioned name, which the application fetches (M1.5c).
    const serve = (source: PackageSource, answer: () => PackageSource = () => source): void =>
    {
        const { id, version } = source.manifest;
        registerEndpoint(`/dnd-platform/content/${id}.json`, answer);
        registerEndpoint(`/dnd-platform/content/${id}@${version}.json`, answer);
    };
    serve(SRD);
    if (SRD_IT) { serve(SRD_IT); }
    if (CREATURES)
    {
        serve(CREATURES, () =>
        {
            _site.creatureFetches += 1;

            return CREATURES;
        });
    }
    if (CREATURES_IT) { serve(CREATURES_IT); }

    return {
        publish: (published: boolean): void => { _site.published = published; },
        creatureFetches: (): number => _site.creatureFetches
    };
}

/**
 * Serves `content/characters/index.json` and one file per fixture, as `web:prepare-content` publishes the demo
 * characters. Call once per test file, at the top level.
 */
export function serveDemoCharacters(names: readonly string[]): void
{
    const characters = names.map((name) =>
        parse(readFileSync(resolve(ROOT, "fixtures", "characters", name, "character.yaml"), "utf8")) as {
            id: string; name: string;
        });

    registerEndpoint("/dnd-platform/content/characters/index.json", () =>
        characters.map((c) => ({ id: c.id, name: c.name, summary: "" })));
    for (const character of characters)
    {
        registerEndpoint(`/dnd-platform/content/characters/${character.id}.json`, () => character);
    }
}

/** Closes and deletes the browser database, between tests. */
export async function clearBrowserStorage(): Promise<void>
{
    await closeBrowserStorage();
    await IndexedDatabase.Delete(DATABASE_NAME);
}

/**
 * `vi.waitFor` with 5 s instead of 1: the hooks run the whole suite at once, and a page's asynchronous work (a
 * dialog loaded on first use, the bestiary fetched, a package update compared) can take longer then.
 */
export function waitFor<T>(check: () => T | Promise<T>): Promise<T>
{
    return vi.waitFor(check, { timeout: 5000, interval: 50 });
}
