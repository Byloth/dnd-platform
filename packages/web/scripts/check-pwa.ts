/**
 * What the tests cannot check of the service worker (M1.5c; a worker does not run in happy-dom), read from the
 * generated site:
 * - `sw.js` precaches the application shell (the base page, the manifest, the icons) and no `content/` file;
 * - navigations fall back to the base page, which is precached;
 * - the content is cached at run time: releases cache-first, the index network-first, pages stale-while-revalidate;
 * - `manifest.webmanifest` is installable: name, start URL and scope under the base, standalone, its icons present.
 * The precache's size is reported. Exit code 1 when something is missing. Run after `nuxt generate`.
 *
 *   node scripts/check-pwa.ts
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC = resolve(import.meta.dirname, "..", ".output", "public");
const BASE = process.env["NUXT_APP_BASE_URL"] ?? "/dnd-platform/";

const problems: string[] = [];
const expect = (ok: boolean, problem: string): void =>
{
    if (!ok) { problems.push(problem); }
};

const worker = resolve(PUBLIC, "sw.js");
expect(existsSync(worker), "sw.js is missing");
const code = existsSync(worker) ? readFileSync(worker, "utf8") : "";
const precached = [...code.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]!);

expect(precached.length > 0, "the precache is empty");
expect(precached.includes(BASE), `the base page ${BASE} is not precached`);
expect(precached.includes("manifest.webmanifest"), "the manifest is not precached");
expect(!precached.some((u) => u.includes("content/")), "content files are precached");
expect(new Set(precached).size === precached.length, "the precache lists a file twice");
expect(code.includes(`createHandlerBoundToURL("${BASE}")`), `navigations do not fall back to ${BASE}`);
for (const [cache, handler] of [
    ["content-releases", "CacheFirst"],
    ["content-index", "NetworkFirst"],
    ["content-pages", "StaleWhileRevalidate"]

] as const)
{
    expect(new RegExp(`${handler}\\(\\{cacheName:"${cache}"`).test(code), `no ${handler} route for ${cache}`);
}

const manifestPath = resolve(PUBLIC, "manifest.webmanifest");
expect(existsSync(manifestPath), "manifest.webmanifest is missing");
if (existsSync(manifestPath))
{
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        name?: string;
        start_url?: string;
        scope?: string;
        display?: string;
        icons?: { src: string, sizes: string, purpose?: string }[];
    };
    expect(!!manifest.name, "the manifest has no name");
    expect(manifest.start_url === BASE, `the start URL is not ${BASE}`);
    expect(manifest.scope === BASE, `the scope is not ${BASE}`);
    expect(manifest.display === "standalone", "the manifest is not standalone");
    for (const size of ["192x192", "512x512"])
    {
        expect(manifest.icons?.some((i) => i.sizes === size) ?? false, `no ${size} icon`);
    }
    expect(manifest.icons?.some((i) => i.purpose === "maskable") ?? false, "no maskable icon");
    for (const icon of manifest.icons ?? [])
    {
        expect(existsSync(resolve(PUBLIC, icon.src)), `${icon.src} is missing`);
    }
}

const size = precached.reduce((total, url) =>
{
    const path = resolve(PUBLIC, url.startsWith(BASE) ? url.slice(BASE.length) : url);

    return total + ((existsSync(path) && statSync(path).isFile()) ? statSync(path).size : 0);

}, 0);
process.stdout.write(`service worker: ${precached.length} files precached, ${(size / 1024).toFixed(0)} KB\n`);

if (problems.length)
{
    for (const problem of problems) { process.stderr.write(`✗ ${problem}\n`); }
    process.exit(1);
}
process.stdout.write("✓ the service worker and the manifest are in place\n");
