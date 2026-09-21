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

import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import { ENTITY_TYPE_FOR_DIRECTORY, SCHEMAS, checkFormula } from "@byloth/dnd-platform-schema";
import { loadPackages, validate as validateReferences } from "@byloth/dnd-platform-engine";
import type { PackageSource } from "@byloth/dnd-platform-engine";

import { readPackageDirectory } from "../io/read-package.js";
import type { PackageDirectory, SourceFile } from "../io/read-package.js";
import { PRIVATE_ROOT, PUBLIC_ROOT, discoverPackages, isUnderPrivateRoot, trackedPrivateFiles, tryRepositoryRoot } from "../io/repository.js";
import type { DiscoveredPackage } from "../io/repository.js";
import { toPackageSource } from "../io/to-package-source.js";

export const DIAGNOSTIC_CODES = [
    "E_MANIFEST_MISSING",
    "E_PARSE",
    "E_SCHEMA",
    "E_FORMULA",
    "E_ID_MISMATCH",
    "E_PRIVATE_PUBLIC",
    "E_PRIVATE_OUTSIDE_ROOT",
    "E_PRIVATE_TRACKED",
    "E_BASE_DEPENDENCIES",
    "E_MISSING_RULESET",
    "E_EXTENSION_RULESET",
    "E_REFERENCE",
    "W_REFERENCE",
    "W_UNKNOWN_DIRECTORY"

] as const;
export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

export interface Diagnostic
{
    readonly severity: "error" | "warning";
    readonly code: DiagnosticCode;
    readonly package: string;
    readonly file: string;
    readonly path: string;
    readonly message: string;
}

interface Manifest
{
    readonly id?: string;
    readonly kind?: string;
    readonly visibility?: string;
    readonly redistributable?: boolean;
    readonly dependencies?: readonly unknown[];
}

function createAjv(): Ajv2020
{
    const ajv = new Ajv2020({
        allErrors: true,
        strict: false,
        strictRequired: false,
        allowUnionTypes: true,
        discriminator: true
    });
    addFormats(ajv);
    ajv.addFormat("formula", {
        type: "string",
        validate: (value: string) => checkFormula(value).ok
    });
    for (const schema of Object.values(SCHEMAS)) { ajv.addSchema(schema as object); }

    return ajv;
}

function pointer(error: ErrorObject): string
{
    return error.instancePath || "/";
}

function describe(error: ErrorObject): string
{
    if (error.keyword === "additionalProperties")
    {
        return `unexpected property "${String((error.params as { additionalProperty: string }).additionalProperty)}"`;
    }
    if (error.keyword === "enum")
    {
        const allowed = (error.params as { allowedValues: unknown[] }).allowedValues.map(String);

        return `${error.message ?? "invalid value"}: ${allowed.join(", ")}`;
    }

    return error.message ?? error.keyword;
}

function validateFile(
    pkg: PackageDirectory,
    packageId: string,
    file: SourceFile,
    validator: ValidateFunction,
    out: Diagnostic[]
): void
{
    const base = { package: packageId, file: file.path };
    if (file.parseError !== undefined)
    {
        out.push({
            severity: "error", code: "E_PARSE", ...base, path: "/", message: file.parseError
        });

        return;
    }
    if (!validator(file.data))
    {
        // A `oneOf` on effects reports every branch; keep the errors that carry information.
        const errors = (validator.errors ?? []).filter((e) => e.keyword !== "oneOf" && e.keyword !== "const");
        for (const error of errors)
        {
            const formula = error.keyword === "format" && (error.params as { format?: string }).format === "formula";
            out.push({
                severity: "error",
                code: formula ? "E_FORMULA" : "E_SCHEMA",
                ...base,
                path: pointer(error),
                message: describe(error)
            });
        }
        if (errors.length === 0)
        {
            out.push({ severity: "error", code: "E_SCHEMA", ...base, path: "/", message: "does not match any known shape" });
        }
    }
    const entityType = (ENTITY_TYPE_FOR_DIRECTORY as Record<string, string | undefined>)[file.directory];
    const id = (file.data as { id?: unknown } | null)?.id;
    if (entityType !== undefined && typeof id === "string" && !id.startsWith(`${packageId}.${entityType}.`))
    {
        out.push({
            severity: "error",
            code: "E_ID_MISMATCH",
            ...base,
            path: "/id",
            message: `id "${id}" must start with "${packageId}.${entityType}." (package id and directory type)`
        });
    }
    void pkg;
}

interface Context
{
    readonly ajv: Ajv2020;
    readonly repoRoot?: string;
}

function validatePackage(root: string, context: Context, out: Diagnostic[]): void
{
    const pkg = readPackageDirectory(root);
    const packageName = basename(root);
    if (pkg.manifest === undefined)
    {
        out.push({ severity: "error", code: "E_MANIFEST_MISSING", package: packageName, file: "package.yaml", path: "/", message: "package.yaml not found" });

        return;
    }

    const { ajv } = context;
    const manifestValidator = ajv.getSchema("https://dnd-platform.byloth.dev/schema/v0/package.schema.json");
    if (manifestValidator === undefined) { throw new Error("package schema not registered"); }
    validateFile(pkg, packageName, pkg.manifest, manifestValidator, out);

    const manifest = (pkg.manifest.data ?? {}) as Manifest;
    const packageId = manifest.id ?? packageName;
    const manifestBase = { package: packageId, file: "package.yaml" };

    if (manifest.redistributable === false && manifest.visibility !== "private")
    {
        out.push({ severity: "error", code: "E_PRIVATE_PUBLIC", ...manifestBase, path: "/visibility", message: "a non-redistributable package must be private" });
    }
    const outsidePrivateRoot = context.repoRoot !== undefined && !isUnderPrivateRoot(context.repoRoot, root);
    if (manifest.redistributable === false && outsidePrivateRoot)
    {
        out.push({
            severity: "error",
            code: "E_PRIVATE_OUTSIDE_ROOT",
            ...manifestBase,
            path: "/redistributable",
            message: `a non-redistributable package must live under ${PRIVATE_ROOT}/ (docs/phase-0/06-private-packages.md)`
        });
    }
    if (manifest.kind === "base")
    {
        if ((manifest.dependencies ?? []).length > 0)
        {
            out.push({ severity: "error", code: "E_BASE_DEPENDENCIES", ...manifestBase, path: "/dependencies", message: "a base package has no dependencies" });
        }
        if (pkg.ruleset === undefined)
        {
            out.push({ severity: "error", code: "E_MISSING_RULESET", ...manifestBase, path: "/", message: "a base package must ship ruleset.yaml" });
        }
    }
    else if (pkg.ruleset !== undefined)
    {
        out.push({ severity: "error", code: "E_EXTENSION_RULESET", package: packageId, file: "ruleset.yaml", path: "/", message: "only a base package may ship ruleset.yaml" });
    }
    if (pkg.ruleset !== undefined)
    {
        const rulesetValidator = ajv.getSchema("https://dnd-platform.byloth.dev/schema/v0/ruleset.schema.json");
        if (rulesetValidator === undefined) { throw new Error("ruleset schema not registered"); }
        validateFile(pkg, packageId, pkg.ruleset, rulesetValidator, out);
    }
    for (const dir of pkg.unknownDirectories)
    {
        out.push({ severity: "warning", code: "W_UNKNOWN_DIRECTORY", package: packageId, file: `${dir}/`, path: "/", message: "not part of the package layout; ignored" });
    }
    for (const file of pkg.files)
    {
        const validator = ajv.getSchema(`https://dnd-platform.byloth.dev/schema/v0/${file.schema}.schema.json`);
        if (validator === undefined) { throw new Error(`schema "${file.schema}" not registered`); }
        validateFile(pkg, packageId, file, validator, out);
    }
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
        try { source = toPackageSource(dir); }
        catch { return; } // parse errors are already reported by the schema pass

        if (seen.has(source.manifest.id)) { return; }
        seen.add(source.manifest.id);
        sources.push(source);
    };
    for (const dir of dirs) { add(dir); }

    const base = repoRoot === undefined ? undefined : resolve(repoRoot, PUBLIC_ROOT, "srd51");
    if (base !== undefined && existsSync(base) && !sources.some((s) => s.manifest.kind === "base")) { add(base); }
    if (sources.length === 0) { return; }

    const set = loadPackages(sources);
    for (const d of validateReferences(set).entries)
    {
        if (d.severity === "info") { continue; }
        out.push({
            severity: d.severity,
            code: d.severity === "error" ? "E_REFERENCE" : "W_REFERENCE",
            package: d.package ?? "",
            file: d.entity ?? "",
            path: d.path ?? "/",
            message: `${d.code} ${d.message}`
        });
    }
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
