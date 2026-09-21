/**
 * Repository layout known to the CLI: the two package roots of
 * docs/phase-0/06-private-packages.md and the guards around the private one.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { parse } from "yaml";

/** Public packages, committed. */
export const PUBLIC_ROOT = "packages/content";
/** Private packages, git-ignored; absent in CI. */
export const PRIVATE_ROOT = "content-private";
/** The only paths under the private root that git may track. */
export const PRIVATE_TRACKED_ALLOWED: readonly string[] = [`${PRIVATE_ROOT}/README.md`];

/** Walk up from `from` to the directory holding `pnpm-workspace.yaml`. */
export function findRepositoryRoot(from: string = process.cwd()): string
{
    let dir = resolve(from);
    for (;;)
    {
        if (existsSync(join(dir, "pnpm-workspace.yaml"))) { return dir; }

        const parent = dirname(dir);
        if (parent === dir) { throw new Error(`repository root (pnpm-workspace.yaml) not found above ${from}`); }
        dir = parent;
    }
}

/** `findRepositoryRoot`, or `undefined` outside a repository. */
export function tryRepositoryRoot(from: string = process.cwd()): string | undefined
{
    try { return findRepositoryRoot(from); }
    catch { return undefined; }
}

export type PackageRoot = typeof PUBLIC_ROOT | typeof PRIVATE_ROOT;

export interface DiscoveredPackage
{
    readonly root: PackageRoot;
    /** Absolute path of the package directory. */
    readonly directory: string;
    /** Path relative to the repository root, e.g. `packages/content/srd51`. */
    readonly relative: string;
    readonly id?: string;
    readonly visibility?: string;
    readonly redistributable?: boolean;
}

interface ManifestHead
{
    readonly id?: unknown;
    readonly visibility?: unknown;
    readonly redistributable?: unknown;
}

function manifestHead(directory: string): ManifestHead
{
    try { return (parse(readFileSync(join(directory, "package.yaml"), "utf8")) ?? {}) as ManifestHead; }
    catch { return {}; }
}

/**
 * Every directory with a `package.yaml` directly under the two roots, public
 * root first, sorted by name inside each root. An absent root is not an error.
 */
export function discoverPackages(repoRoot: string): DiscoveredPackage[]
{
    const found: DiscoveredPackage[] = [];
    for (const root of [PUBLIC_ROOT, PRIVATE_ROOT] as const)
    {
        const base = resolve(repoRoot, root);
        if (!existsSync(base) || !statSync(base).isDirectory()) { continue; }
        for (const name of readdirSync(base).sort())
        {
            const directory = join(base, name);
            if (!statSync(directory).isDirectory() || !existsSync(join(directory, "package.yaml"))) { continue; }

            const head = manifestHead(directory);
            found.push({
                root: root,
                directory: directory,
                relative: `${root}/${name}`,
                ...(typeof head.id === "string" ? { id: head.id } : {}),
                ...(typeof head.visibility === "string" ? { visibility: head.visibility } : {}),
                ...(typeof head.redistributable === "boolean" ? { redistributable: head.redistributable } : {})
            });
        }
    }

    return found;
}

/** Whether `directory` lies under `<repoRoot>/content-private/`. */
export function isUnderPrivateRoot(repoRoot: string, directory: string): boolean
{
    const rel = relative(resolve(repoRoot, PRIVATE_ROOT), resolve(directory));

    return (rel !== "") && !rel.startsWith("..") && !isAbsolute(rel);
}

/**
 * Paths under `content-private/` that git tracks and that are not allowed to
 * be tracked. Empty outside a git repository.
 */
export function trackedPrivateFiles(repoRoot: string): string[]
{
    let output: string;
    try
    {
        output = execFileSync("git", ["ls-files", "--", PRIVATE_ROOT], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    }
    catch { return []; }

    return output
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .filter((line) => !PRIVATE_TRACKED_ALLOWED.includes(line));
}
