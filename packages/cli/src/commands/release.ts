/**
 * `dnd release [dirs…] [--check] [--json]`
 *
 * Every released version of a public package is published as a static file
 * (DEC-21): `releases/content/<id>@<version>.json`, the canonical bundle of
 * `dnd build`, written once and never rewritten. A version therefore always
 * means the same bytes, which is what lets the application derive a
 * character with the version it last saw and tell the user what an update
 * changed.
 *
 * Without directories every package under `packages/content/` is released.
 * A package must be public and redistributable, and its `CHANGELOG.md` must
 * have a `## <version>` section. `--check` writes nothing and also fails when
 * the current version has not been released (CI).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { bundleText } from "@byloth/dnd-platform-loader";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import { discoverPackages, PUBLIC_ROOT, tryRepositoryRoot } from "../io/repository.js";

export const RELEASES_DIR = "releases/content";

export type ReleaseCode =
    "E_READ" | "E_PRIVATE" | "E_CHANGELOG_MISSING" | "E_RELEASE_CHANGED" | "E_RELEASE_MISSING";

export interface ReleaseResult
{
    readonly id: string;
    readonly version: string;
    readonly directory: string;
    /** Absolute path of the release file. */
    readonly path: string;
    /** `released`: written now; `unchanged`: already released with the same bytes. */
    readonly status: "released" | "unchanged";
}
export interface ReleaseError
{
    readonly code: ReleaseCode;
    readonly directory: string;
    readonly message: string;
}
export interface ReleaseReport
{
    readonly ok: boolean;
    readonly releases: readonly ReleaseResult[];
    readonly errors: readonly ReleaseError[];
}
export interface ReleaseOptions
{
    readonly dirs?: readonly string[];
    /** Where the release files live; default `<repoRoot>/releases/content`. */
    readonly releasesDir?: string;
    readonly repoRoot?: string;
    /** Write nothing; a version without its release file is an error. */
    readonly check?: boolean;
}

function escapeRegExp(text: string): string
{
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whether the package's `CHANGELOG.md` has a `## <version>` section. */
function hasChangelogSection(directory: string, version: string): boolean
{
    const path = join(directory, "CHANGELOG.md");
    if (!existsSync(path)) { return false; }

    return new RegExp(`^## ${escapeRegExp(version)}(\\s|$)`, "m").test(readFileSync(path, "utf8"));
}

function releaseOne(directory: string, releasesDir: string, check: boolean): ReleaseResult | ReleaseError
{
    let source: PackageSource;
    try { source = readPackageSource(directory); }
    catch (error) { return { code: "E_READ", directory: directory, message: (error as Error).message }; }

    const { id, version, visibility, redistributable } = source.manifest;
    if ((redistributable === false) || (visibility !== "public"))
    {
        return {
            code: "E_PRIVATE",
            directory: directory,
            message: `"${id}" is not public and redistributable; only public packages are released on the site`
        };
    }
    if (!hasChangelogSection(directory, version))
    {
        return {
            code: "E_CHANGELOG_MISSING",
            directory: directory,
            message: `CHANGELOG.md has no "## ${version}" section; describe the release before publishing it`
        };
    }

    const text = bundleText(source);
    const path = join(releasesDir, `${id}@${version}.json`);
    if (existsSync(path))
    {
        if (readFileSync(path, "utf8") === text)
        {
            return { id: id, version: version, directory: directory, path: path, status: "unchanged" };
        }

        return {
            code: "E_RELEASE_CHANGED",
            directory: directory,
            message: `the content of "${id}" changed but its version is still ${version}, which is already released; bump the version and add a changelog section`
        };
    }
    if (check)
    {
        return {
            code: "E_RELEASE_MISSING",
            directory: directory,
            message: `"${id}@${version}" is not released; run \`pnpm release:content\` and commit the release file`
        };
    }

    mkdirSync(releasesDir, { recursive: true });
    writeFileSync(path, text);

    return { id: id, version: version, directory: directory, path: path, status: "released" };
}

export function releasePackages(options: ReleaseOptions = {}): ReleaseReport
{
    const repoRoot = options.repoRoot ?? tryRepositoryRoot();
    const explicit = (options.dirs ?? []).map((d) => resolve(d));
    const discovered = (explicit.length === 0 && repoRoot !== undefined) ?
        discoverPackages(repoRoot)
            .filter((p) => p.root === PUBLIC_ROOT)
            .map((p) => p.directory) :
        [];
    const releasesDir = resolve(options.releasesDir ?? resolve(repoRoot ?? process.cwd(), RELEASES_DIR));

    const releases: ReleaseResult[] = [];
    const errors: ReleaseError[] = [];
    for (const directory of [...discovered, ...explicit])
    {
        const result = releaseOne(directory, releasesDir, options.check === true);
        if ("code" in result) { errors.push(result); }
        else { releases.push(result); }
    }

    return { ok: errors.length === 0, releases: releases, errors: errors };
}

export function runRelease(argv: readonly string[]): number
{
    const json = argv.includes("--json");
    const check = argv.includes("--check");
    const dirs = argv.filter((arg) => !arg.startsWith("--"));
    const repoRoot = tryRepositoryRoot();
    if ((dirs.length === 0) && (repoRoot === undefined))
    {
        process.stderr.write("dnd release: not inside the repository; pass the package directories to release\n");

        return 2;
    }

    const report = releasePackages({ dirs: dirs, check: check, ...(repoRoot ? { repoRoot: repoRoot } : {}) });
    const shown = (path: string): string =>
    {
        const rel = repoRoot ? relative(repoRoot, path) : path;

        return rel.startsWith("..") ? path : rel;
    };
    if (json)
    {
        const output = {
            ok: report.ok,
            releases: report.releases.map((r) => ({
                id: r.id, version: r.version, path: shown(r.path), status: r.status
            })),
            errors: report.errors.map((e) => ({ ...e, directory: shown(e.directory) }))
        };
        process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    }
    else
    {
        for (const release of report.releases)
        {
            const name = `${release.id}@${release.version}`;
            process.stdout.write(`${name.padEnd(20)} ${release.status.padEnd(9)} → ${shown(release.path)}\n`);
        }
        for (const error of report.errors)
        {
            process.stdout.write(`${shown(error.directory)}: ${error.code} ${error.message}\n`);
        }
        const released = report.releases.filter((r) => r.status === "released").length;
        process.stdout.write(`${released} release(s) written, ${report.errors.length} error(s)\n`);
    }

    return report.ok ? 0 : 1;
}
