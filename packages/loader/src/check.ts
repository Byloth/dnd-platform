/**
 * The checks of `dnd validate` that need nothing but the package itself:
 * schema conformance and the cheap structural rules of
 * docs/phase-0/02-content-format.md, then referential integrity against the
 * other packages. The repository guards of docs/phase-0/06-private-packages.md
 * (`E_PRIVATE_OUTSIDE_ROOT`, `E_PRIVATE_TRACKED`) are the CLI's, which reads
 * the repository; their codes are listed here so every consumer shares one set.
 */

import { checkManifest, entityIdMismatch, validateDocument } from "@byloth/dnd-platform-schema/validate";
import type { SchemaValidator } from "@byloth/dnd-platform-schema/validate";

import type { PackageFiles, SourceFile } from "./files.js";
import { loadPackages } from "./load/index.js";
import { validate } from "./references/validate.js";
import type { PackageSource } from "./types.js";

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

/** A problem of a package, pointing at a file of it and a JSON pointer inside that file. */
export interface PackageDiagnostic
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
    readonly redistributable?: boolean;
}

export interface CheckOptions
{
    /**
     * Further rules on the manifest, reported right after the manifest's own (the CLI's repository guard).
     * Receives the parsed manifest and the package id.
     */
    readonly manifestRules?: (manifest: unknown, packageId: string) => readonly PackageDiagnostic[];
}

function checkFile(packageId: string, file: SourceFile, ajv: SchemaValidator, out: PackageDiagnostic[]): void
{
    const base = { package: packageId, file: file.path };
    if (file.parseError !== undefined)
    {
        out.push({
            severity: "error", code: "E_PARSE", ...base, path: "/", message: file.parseError
        });

        return;
    }
    for (const problem of validateDocument(ajv, file.schema, file.data))
    {
        out.push({
            severity: "error",
            code: problem.formula ? "E_FORMULA" : "E_SCHEMA",
            ...base,
            path: problem.path,
            message: problem.message
        });
    }
    const id = (file.data as { id?: unknown } | null)?.id;
    const mismatch = entityIdMismatch(packageId, file.directory, id);
    if (mismatch !== undefined)
    {
        out.push({ severity: "error", code: "E_ID_MISMATCH", ...base, path: "/id", message: mismatch });
    }
}

/**
 * Every schema and structural problem of one package. `name` stands for the package id until the manifest
 * gives one (a directory or file name).
 */
export function checkPackage(
    pkg: PackageFiles, name: string, ajv: SchemaValidator, options: CheckOptions = {}
): PackageDiagnostic[]
{
    const out: PackageDiagnostic[] = [];
    if (pkg.manifest === undefined)
    {
        out.push({
            severity: "error",
            code: "E_MANIFEST_MISSING",
            package: name,
            file: "package.yaml",
            path: "/",
            message: "package.yaml not found"
        });

        return out;
    }

    checkFile(name, pkg.manifest, ajv, out);

    const manifest = (pkg.manifest.data ?? {}) as Manifest;
    const packageId = manifest.id ?? name;

    for (const problem of checkManifest(pkg.manifest.data, pkg.ruleset !== undefined))
    {
        out.push({
            severity: "error",
            code: problem.code,
            package: packageId,
            file: problem.file,
            path: problem.path,
            message: problem.message
        });
    }
    if (options.manifestRules) { out.push(...options.manifestRules(pkg.manifest.data, packageId)); }
    if (pkg.ruleset !== undefined) { checkFile(packageId, pkg.ruleset, ajv, out); }
    for (const dir of pkg.unknownDirectories)
    {
        out.push({
            severity: "warning",
            code: "W_UNKNOWN_DIRECTORY",
            package: packageId,
            file: `${dir}/`,
            path: "/",
            message: "not part of the package layout; ignored"
        });
    }
    for (const file of pkg.files) { checkFile(packageId, file, ajv, out); }

    return out;
}

/**
 * Load the sources together (a base package among them) and report unresolved references and load errors;
 * informational entries are dropped.
 */
export function checkReferences(sources: readonly PackageSource[]): PackageDiagnostic[]
{
    if (sources.length === 0) { return []; }

    const out: PackageDiagnostic[] = [];
    for (const d of validate(loadPackages(sources)).entries)
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

    return out;
}
