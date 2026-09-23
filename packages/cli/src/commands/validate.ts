/**
 * `dnd validate [dirs…] [--all] [--references] [--allow-missing] [--json]`
 *
 * Schema conformance of content package directories plus the cheap
 * structural checks of docs/phase-0/02-content-format.md, and the two guards
 * of docs/phase-0/06-private-packages.md around `content-private/`.
 * With no directory, or with `--all`, the two package roots
 * (`packages/content/*`, `content-private/*`) are discovered. With
 * `--references` the packages are also loaded into the engine next to the
 * base package and every cross-entity reference must resolve.
 */

import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { createAjv } from "@byloth/dnd-platform-schema/validate";
import type { SchemaValidator } from "@byloth/dnd-platform-schema/validate";
import { checkPackage, checkReferences as checkLoadedReferences } from "@byloth/dnd-platform-loader";
import type { PackageDiagnostic, PackageSource } from "@byloth/dnd-platform-loader";
import { readPackageDirectory, readPackageSource } from "@byloth/dnd-platform-loader/node";

import { PRIVATE_ROOT, PUBLIC_ROOT, discoverPackages, isUnderPrivateRoot, trackedPrivateFiles, tryRepositoryRoot } from "../io/repository.js";
import type { DiscoveredPackage } from "../io/repository.js";

// The checks and their codes are the loader's, shared with the web application; the CLI adds the
// repository guards (E_PRIVATE_OUTSIDE_ROOT, E_PRIVATE_TRACKED) and reads the disk.
export { DIAGNOSTIC_CODES } from "@byloth/dnd-platform-loader";
export type { DiagnosticCode } from "@byloth/dnd-platform-loader";
export type Diagnostic = PackageDiagnostic;

interface Manifest
{
    readonly redistributable?: boolean;
}

interface Context
{
    readonly ajv: SchemaValidator;
    readonly repoRoot?: string;
}

function validatePackage(root: string, context: Context, out: Diagnostic[]): void
{
    const outsidePrivateRoot = context.repoRoot !== undefined && !isUnderPrivateRoot(context.repoRoot, root);
    const privateRootGuard = (manifest: unknown, packageId: string): Diagnostic[] =>
    {
        if ((manifest as Manifest | null)?.redistributable !== false || !outsidePrivateRoot) { return []; }

        return [{
            severity: "error",
            code: "E_PRIVATE_OUTSIDE_ROOT",
            package: packageId,
            file: "package.yaml",
            path: "/redistributable",
            message: `a non-redistributable package must live under ${PRIVATE_ROOT}/ (docs/phase-0/06-private-packages.md)`
        }];
    };

    const pkg = readPackageDirectory(root);
    out.push(...checkPackage(pkg, basename(root), context.ajv, { manifestRules: privateRootGuard }));
}

/**
 * Load the packages into the engine next to the base package and report
 * unresolved references and load errors as diagnostics.
 */
function checkReferences(dirs: readonly string[], repoRoot: string | undefined, out: Diagnostic[]): void
{
    const sources: PackageSource[] = [];
    const seen = new Set<string>();
    const add = (dir: string): void =>
    {
        let source: PackageSource;
        try { source = readPackageSource(dir); }
        catch { return; } // parse errors are already reported by the schema pass

        if (seen.has(source.manifest.id)) { return; }
        seen.add(source.manifest.id);
        sources.push(source);
    };
    for (const dir of dirs) { add(dir); }

    const base = repoRoot === undefined ? undefined : resolve(repoRoot, PUBLIC_ROOT, "srd51");
    if (base !== undefined && existsSync(base) && !sources.some((s) => s.manifest.kind === "base")) { add(base); }
    out.push(...checkLoadedReferences(sources));
}

export interface ValidateOptions
{
    readonly allowMissing?: boolean;
    /** Repository root for the private-root guards; discovered from the working directory when omitted. */
    readonly repoRoot?: string;
    /** Also load the packages into the engine and resolve every reference. */
    readonly references?: boolean;
}

/** Validate package directories; returns every diagnostic found. */
export function validatePackages(dirs: readonly string[], options: ValidateOptions = {}): Diagnostic[]
{
    const repoRoot = options.repoRoot ?? tryRepositoryRoot();
    const context: Context = { ajv: createAjv(), ...(repoRoot !== undefined ? { repoRoot: repoRoot } : {}) };
    const out: Diagnostic[] = [];
    const present: string[] = [];
    for (const dir of dirs)
    {
        const root = resolve(dir);
        if (!existsSync(root))
        {
            if (options.allowMissing) { continue; }
            out.push({ severity: "error", code: "E_MANIFEST_MISSING", package: basename(root), file: dir, path: "/", message: "directory not found" });

            continue;
        }
        present.push(root);
        validatePackage(root, context, out);
    }
    if (repoRoot !== undefined)
    {
        for (const file of trackedPrivateFiles(repoRoot))
        {
            out.push({
                severity: "error",
                code: "E_PRIVATE_TRACKED",
                package: PRIVATE_ROOT,
                file: file,
                path: "/",
                message: "tracked by git; nothing under content-private/ may be committed"
            });
        }
    }
    if (options.references) { checkReferences(present, repoRoot, out); }

    return out;
}

function describeRoots(found: readonly DiscoveredPackage[], repoRoot: string): string
{
    const lines: string[] = [];
    for (const root of [PUBLIC_ROOT, PRIVATE_ROOT] as const)
    {
        const packages = found.filter((p) => p.root === root);
        const state = existsSync(resolve(repoRoot, root)) ? `${packages.length} package(s)` : "absent";
        lines.push(`${root}/: ${state}`);
        for (const p of packages)
        {
            lines.push(`  ${p.id ?? basename(p.directory)}  ${p.visibility ?? "?"}${p.redistributable === false ? ", not redistributable" : ""}  (${p.relative})`);
        }
    }

    return `${lines.join("\n")}\n`;
}

export function runValidate(argv: readonly string[]): number
{
    const json = argv.includes("--json");
    const allowMissing = argv.includes("--allow-missing");
    const references = argv.includes("--references");
    const explicit = argv.filter((arg) => !arg.startsWith("--"));
    const all = argv.includes("--all") || (explicit.length === 0);

    let dirs = explicit;
    if (all)
    {
        const repoRoot = tryRepositoryRoot();
        if (repoRoot === undefined)
        {
            process.stderr.write("dnd validate: not inside the repository; pass package directories explicitly\n");

            return 2;
        }
        const found = discoverPackages(repoRoot);
        if (!json) { process.stdout.write(describeRoots(found, repoRoot)); }
        dirs = [...found.map((p) => p.directory), ...explicit];
    }

    const diagnostics = validatePackages(dirs, { allowMissing: allowMissing, references: references });
    const errors = diagnostics.filter((d) => d.severity === "error").length;
    if (json)
    {
        process.stdout.write(`${JSON.stringify({ ok: errors === 0, diagnostics: diagnostics }, null, 2)}\n`);
    }
    else
    {
        for (const d of diagnostics)
        {
            process.stdout.write(`${d.package}/${d.file}:${d.path}: ${d.code} ${d.message}\n`);
        }
        process.stdout.write(`${dirs.length} package director${dirs.length === 1 ? "y" : "ies"}, ${errors} error(s), ${diagnostics.length - errors} warning(s)\n`);
    }

    return errors === 0 ? 0 : 1;
}
