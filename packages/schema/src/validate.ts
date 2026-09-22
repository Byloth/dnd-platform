/**
 * Schema validation shared by the CLI (`dnd validate`) and the browser (a
 * package loaded from a file): the Ajv instance with every schema and the
 * `formula` format, document validation with the error filtering the
 * diagnostics rely on, and the structural rules of a manifest that need no
 * filesystem. Published as `@byloth/dnd-platform-schema/validate` so that
 * Ajv never enters a bundle that only needs the types and the enumerations.
 */

import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import { checkFormula } from "./formula.js";
import { SCHEMAS } from "./generated/schemas.js";
import { ENTITY_TYPE_FOR_DIRECTORY } from "./index.js";

export type SchemaValidator = Ajv2020;

export interface AjvOptions
{
    /** Ajv's strict mode; the CLI runs with it off, the schema tests with it on. */
    readonly strict?: boolean;
}

/** Every schema of the format registered by its `$id`, with the `formula` format. */
export function createAjv(options: AjvOptions = {}): SchemaValidator
{
    const ajv = new Ajv2020({
        allErrors: true,
        strict: options.strict === true,
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

export function schemaId(name: string): string
{
    return `https://dnd-platform.byloth.dev/schema/v0/${name}.schema.json`;
}

export function validatorFor(ajv: SchemaValidator, name: string): ValidateFunction
{
    const validate = ajv.getSchema(schemaId(name));
    if (validate === undefined) { throw new Error(`schema "${name}" is not registered`); }

    return validate;
}

export interface DocumentProblem
{
    /** JSON pointer of the offending value, `/` for the whole document. */
    readonly path: string;
    readonly message: string;
    /** True when a formula failed to parse (the `formula` format). */
    readonly formula: boolean;
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

/** The problems of a document against a schema; empty when it validates. */
export function validateDocument(ajv: SchemaValidator, schemaName: string, data: unknown): DocumentProblem[]
{
    const validator = validatorFor(ajv, schemaName);
    if (validator(data)) { return []; }
    // A `oneOf` on effects reports every branch; keep the errors that carry information.
    const errors = (validator.errors ?? []).filter((e) => e.keyword !== "oneOf" && e.keyword !== "const");
    if (errors.length === 0) { return [{ path: "/", message: "does not match any known shape", formula: false }]; }

    return errors.map((error) => ({
        path: error.instancePath || "/",
        message: describe(error),
        formula: error.keyword === "format" && (error.params as { format?: string }).format === "formula"
    }));
}

/** The message of an entity whose id does not match its package and directory; `undefined` when it does. */
export function entityIdMismatch(packageId: string, directory: string, id: unknown): string | undefined
{
    const entityType = (ENTITY_TYPE_FOR_DIRECTORY as Record<string, string | undefined>)[directory];
    if (entityType === undefined || typeof id !== "string") { return undefined; }
    if (id.startsWith(`${packageId}.${entityType}.`)) { return undefined; }

    return `id "${id}" must start with "${packageId}.${entityType}." (package id and directory type)`;
}

export type ManifestRuleCode = "E_PRIVATE_PUBLIC" | "E_BASE_DEPENDENCIES" | "E_MISSING_RULESET" | "E_EXTENSION_RULESET";
export interface ManifestProblem
{
    readonly code: ManifestRuleCode;
    readonly file: "package.yaml" | "ruleset.yaml";
    readonly path: string;
    readonly message: string;
}
interface ManifestShape
{
    readonly kind?: string;
    readonly visibility?: string;
    readonly redistributable?: boolean;
    readonly dependencies?: readonly unknown[];
}

/** The structural rules of a manifest that need nothing but the manifest and whether a ruleset ships with it. */
export function checkManifest(manifest: unknown, hasRuleset: boolean): ManifestProblem[]
{
    const m = (manifest ?? {}) as ManifestShape;
    const out: ManifestProblem[] = [];
    if (m.redistributable === false && m.visibility !== "private")
    {
        out.push({
            code: "E_PRIVATE_PUBLIC",
            file: "package.yaml",
            path: "/visibility",
            message: "a non-redistributable package must be private"
        });
    }
    if (m.kind === "base")
    {
        if ((m.dependencies ?? []).length > 0)
        {
            out.push({
                code: "E_BASE_DEPENDENCIES",
                file: "package.yaml",
                path: "/dependencies",
                message: "a base package has no dependencies"
            });
        }
        if (!hasRuleset)
        {
            out.push({
                code: "E_MISSING_RULESET",
                file: "package.yaml",
                path: "/",
                message: "a base package must ship ruleset.yaml"
            });
        }
    }
    else if (hasRuleset)
    {
        out.push({
            code: "E_EXTENSION_RULESET",
            file: "ruleset.yaml",
            path: "/",
            message: "only a base package may ship ruleset.yaml"
        });
    }

    return out;
}
