/**
 * `dnd validate <dir…> [--allow-missing] [--json]`
 *
 * Schema conformance of content package directories plus the cheap
 * structural checks of docs/phase-0/02-content-format.md. Referential
 * integrity between entities belongs to the engine's `validate` (M0.4).
 */

import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import { ENTITY_TYPE_FOR_DIRECTORY, SCHEMAS, checkFormula } from "@byloth/dnd-platform-schema";

import { readPackageDirectory } from "../io/read-package.js";
import type { PackageDirectory, SourceFile } from "../io/read-package.js";

export const DIAGNOSTIC_CODES = [
    "E_MANIFEST_MISSING",
    "E_PARSE",
    "E_SCHEMA",
    "E_FORMULA",
    "E_ID_MISMATCH",
    "E_PRIVATE_PUBLIC",
    "E_BASE_DEPENDENCIES",
    "E_MISSING_RULESET",
    "E_EXTENSION_RULESET",
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

function validatePackage(root: string, ajv: Ajv2020, out: Diagnostic[]): void
{
    const pkg = readPackageDirectory(root);
    const packageName = basename(root);
    if (pkg.manifest === undefined)
    {
        out.push({ severity: "error", code: "E_MANIFEST_MISSING", package: packageName, file: "package.yaml", path: "/", message: "package.yaml not found" });

        return;
    }

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

export interface ValidateOptions { readonly allowMissing?: boolean }

/** Validate package directories; returns every diagnostic found. */
export function validatePackages(dirs: readonly string[], options: ValidateOptions = {}): Diagnostic[]
{
    const ajv = createAjv();
    const out: Diagnostic[] = [];
    for (const dir of dirs)
    {
        const root = resolve(dir);
        if (!existsSync(root))
        {
            if (options.allowMissing) { continue; }
            out.push({ severity: "error", code: "E_MANIFEST_MISSING", package: basename(root), file: dir, path: "/", message: "directory not found" });

            continue;
        }
        validatePackage(root, ajv, out);
    }

    return out;
}

export function runValidate(argv: readonly string[]): number
{
    const json = argv.includes("--json");
    const allowMissing = argv.includes("--allow-missing");
    const dirs = argv.filter((arg) => !arg.startsWith("--"));
    if (dirs.length === 0)
    {
        process.stderr.write("dnd validate: at least one package directory is required\n");

        return 2;
    }

    const diagnostics = validatePackages(dirs, { allowMissing: allowMissing });
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
