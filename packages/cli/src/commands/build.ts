/**
 * `dnd build [dirs…] [--out <dir>] [--json]`
 *
 * YAML packages → one canonical JSON bundle per package. A bundle is the
 * engine's `PackageSource` (manifest, ruleset, entities sorted by type and
 * id) serialised with sorted keys, so that `JSON.parse(bundle)` is a valid
 * input of `loadPackages`: patches and translations are applied by the
 * loader, never merged here (docs/phase-0/02-content-format.md).
 *
 * Without directories every package under `packages/content/` and
 * `content-private/` is built. Redistributable packages land in
 * `build/content/<id>.json`; a non-redistributable one in
 * `content-private/build/<id>.json`, and never outside `content-private/`.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { stableStringify } from "@byloth/dnd-platform-engine";
import type { PackageSource } from "@byloth/dnd-platform-engine";

import { PRIVATE_ROOT, discoverPackages, isUnderPrivateRoot, tryRepositoryRoot } from "../io/repository.js";
import { toPackageSource } from "../io/to-package-source.js";

export const PUBLIC_BUILD_DIR = "build/content";
export const PRIVATE_BUILD_DIR = `${PRIVATE_ROOT}/build`;

export interface BuiltBundle
{
    readonly id: string;
    readonly directory: string;
    /** Absolute path of the written file. */
    readonly path: string;
    readonly entities: number;
}
export interface BuildError
{
    readonly code: "E_READ" | "E_DUPLICATE_PACKAGE" | "E_PRIVATE_OUTSIDE_ROOT";
    readonly directory: string;
    readonly message: string;
}
export interface BuildReport
{
    readonly ok: boolean;
    readonly bundles: readonly BuiltBundle[];
    readonly errors: readonly BuildError[];
}
export interface BuildOptions
{
    readonly dirs?: readonly string[];
    /** Output directory; default per package visibility. */
    readonly out?: string;
    readonly repoRoot?: string;
    /** When false the bundles are computed but not written. */
    readonly write?: boolean;
}

const TYPE_ORDER = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** The bundle of a package source: entities sorted by type then id, every key sorted by the serialiser. */
export function toBundle(source: PackageSource): PackageSource
{
    const entities = [...source.entities].sort((a, b) => TYPE_ORDER(a.type, b.type) || TYPE_ORDER(a.id, b.id));

    return { ...source, entities: entities };
}

export function bundleText(source: PackageSource): string
{
    return stableStringify(toBundle(source));
}

export function buildPackages(options: BuildOptions = {}): BuildReport
{
    const repoRoot = options.repoRoot ?? tryRepositoryRoot();
    const explicit = (options.dirs ?? []).map((d) => resolve(d));
    const discovered = (explicit.length === 0 && repoRoot !== undefined) ?
        discoverPackages(repoRoot).map((p) => p.directory) :
        [];
    const dirs = [...discovered, ...explicit];

    const bundles: BuiltBundle[] = [];
    const errors: BuildError[] = [];
    const seen = new Map<string, string>();
    for (const directory of dirs)
    {
        let source: PackageSource;
        try { source = toPackageSource(directory); }
        catch (error)
        {
            errors.push({ code: "E_READ", directory: directory, message: (error as Error).message });

            continue;
        }
        const id = source.manifest.id;
        const first = seen.get(id);
        if (first !== undefined)
        {
            errors.push({
                code: "E_DUPLICATE_PACKAGE",
                directory: directory,
                message: `package "${id}" is also read from ${first}; bundle names would collide`
            });

            continue;
        }
        seen.set(id, directory);

        const isPrivate = source.manifest.redistributable === false;
        const base = repoRoot ?? process.cwd();
        const outDir = resolve(base, options.out ?? (isPrivate ? PRIVATE_BUILD_DIR : PUBLIC_BUILD_DIR));
        if (isPrivate && ((repoRoot === undefined) || !isUnderPrivateRoot(repoRoot, outDir)))
        {
            errors.push({
                code: "E_PRIVATE_OUTSIDE_ROOT",
                directory: directory,
                message: `the bundle of a non-redistributable package must be written under ${PRIVATE_ROOT}/ (docs/phase-0/06-private-packages.md)`
            });

            continue;
        }

        const path = join(outDir, `${id}.json`);
        if (options.write !== false)
        {
            if (!existsSync(outDir)) { mkdirSync(outDir, { recursive: true }); }
            writeFileSync(path, bundleText(source));
        }
        bundles.push({ id: id, directory: directory, path: path, entities: source.entities.length });
    }

    return { ok: errors.length === 0, bundles: bundles, errors: errors };
}

export function runBuild(argv: readonly string[]): number
{
    const json = argv.includes("--json");
    const outIndex = argv.indexOf("--out");
    const out = outIndex >= 0 ? argv[outIndex + 1] : undefined;
    if ((outIndex >= 0) && ((out === undefined) || out.startsWith("--")))
    {
        process.stderr.write("dnd build: --out needs a directory\n");

        return 2;
    }
    const dirs = argv.filter((arg, index) => !arg.startsWith("--") && (index !== outIndex + 1));
    const repoRoot = tryRepositoryRoot();
    if ((dirs.length === 0) && (repoRoot === undefined))
    {
        process.stderr.write("dnd build: not inside the repository; pass the package directories to build\n");

        return 2;
    }

    const report = buildPackages({
        dirs: dirs,
        ...(out !== undefined ? { out: out } : {}),
        ...(repoRoot ? { repoRoot: repoRoot } : {})
    });
    const shown = (path: string): string =>
    {
        const rel = repoRoot ? relative(repoRoot, path) : path;

        return rel.startsWith("..") ? path : rel;
    };
    if (json)
    {
        const output = {
            ok: report.ok,
            bundles: report.bundles.map((b) => ({ id: b.id, path: shown(b.path), entities: b.entities })),
            errors: report.errors
        };
        process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    }
    else
    {
        for (const bundle of report.bundles)
        {
            const count = String(bundle.entities).padStart(5);
            process.stdout.write(`${bundle.id.padEnd(20)} ${count} entities  → ${shown(bundle.path)}\n`);
        }
        for (const error of report.errors)
        {
            process.stdout.write(`${shown(error.directory)}: ${error.code} ${error.message}\n`);
        }
        process.stdout.write(`${report.bundles.length} bundle(s) written, ${report.errors.length} error(s)\n`);
    }

    return report.ok ? 0 : 1;
}
