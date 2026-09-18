import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import { checkFormula } from "../src/formula.js";

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

export function createAjv(): Ajv2020
{
    const ajv = new Ajv2020({
        allErrors: true,
        strict: true,
        strictRequired: false,
        discriminator: true,
        allowUnionTypes: true
    });
    addFormats.default(ajv);
    ajv.addFormat("formula", { type: "string", validate: (value: string) => checkFormula(value).ok });
    for (const name of schemaFiles()) { ajv.addSchema(readSchema(name)); }

    return ajv;
}

export function validatorFor(ajv: Ajv2020, name: string): ValidateFunction
{
    const validate = ajv.getSchema(`https://dnd-platform.byloth.dev/schema/v0/${name}.schema.json`);
    if (!validate) { throw new Error(`schema "${name}" is not registered`); }

    return validate;
}
