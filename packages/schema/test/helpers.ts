import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ValidateFunction } from "ajv";

import { createAjv as createSharedAjv } from "../src/validate.js";
import type { SchemaValidator } from "../src/validate.js";

export const SCHEMAS_DIR = resolve(import.meta.dirname, "..", "schemas");

export function readSchema(name: string): Record<string, unknown>
{
    return JSON.parse(readFileSync(resolve(SCHEMAS_DIR, `${name}.schema.json`), "utf8")) as Record<string, unknown>;
}

export function schemaFiles(): string[]
{
    return readdirSync(SCHEMAS_DIR)
        .filter((file) => file.endsWith(".schema.json"))
        .map((file) => file.replace(/\.schema\.json$/, ""))
        .sort();
}

export function createAjv(): SchemaValidator
{
    return createSharedAjv({ strict: true });
}

export function validatorFor(ajv: SchemaValidator, name: string): ValidateFunction
{
    const validate = ajv.getSchema(`https://dnd-platform.byloth.dev/schema/v0/${name}.schema.json`);
    if (!validate) { throw new Error(`schema "${name}" is not registered`); }

    return validate;
}
