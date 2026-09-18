/**
 * The YAML examples of docs/phase-0/02-content-format.md must validate against
 * the schemas they illustrate. Blocks that are fragments (ellipses, comments
 * marking omitted content, or partial objects) are skipped and listed.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { createAjv, validatorFor } from "./helpers.js";

const DOC = resolve(import.meta.dirname, "..", "..", "..", "docs", "phase-0", "02-content-format.md");

interface Block { readonly line: number, readonly source: string }
interface Example { readonly line: number, readonly schema: string, readonly data: unknown, readonly asList?: boolean }

function blocks(markdown: string): Block[]
{
    const out: Block[] = [];
    const pattern = /```ya?ml\n([\s\S]*?)```/g;
    for (let match = pattern.exec(markdown); match !== null; match = pattern.exec(markdown))
    {
        out.push({ line: markdown.slice(0, match.index).split("\n").length + 1, source: match[1]! });
    }

    return out;
}

function isFragment(source: string): boolean
{
    return source.split("\n").some((line) => (line.trim() === "...") || line.includes("# ..."));
}

const COMMON_FIELDS = ["id", "name", "text", "source", "tags", "page"];
const ENTITY_TYPES = ["class", "subclass", "species", "background", "feat", "feature", "spell", "spell-list", "item",
    "condition", "rule", "table", "archetype", "patch"];
const PACKAGE_KINDS = ["base", "extension", "translation"];

function example(block: Block, schema: string, data: unknown, asList = false): Example
{
    return { line: block.line, schema: schema, data: data, asList: asList };
}

function entityType(id: string): string | undefined
{
    const segments = id.split(".");

    const inner = (index: number): boolean => (index > 0) && (index < segments.length - 1);

    return segments.find((segment, index) => inner(index) && ENTITY_TYPES.includes(segment));
}

function classify(block: Block): Example | null
{
    if (isFragment(block.source)) { return null; }

    let data: unknown;
    try { data = parse(block.source); }
    catch { return null; }
    if ((data === null) || (typeof data !== "object")) { return null; }

    const record = data as Record<string, unknown>;
    const keys = Object.keys(record);

    // The "common fields" illustration is not a complete entity.
    if (keys.every((key) => COMMON_FIELDS.includes(key))) { return null; }
    if ((keys.length === 1) && (keys[0] === "effects")) { return example(block, "effect", record["effects"], true); }
    if (PACKAGE_KINDS.includes(String(record["kind"]))) { return example(block, "package", data); }
    if ("abilities" in record) { return example(block, "ruleset", data); }
    if (("choices" in record) && ("state" in record)) { return example(block, "character", data); }
    if (typeof record["id"] === "string")
    {
        const type = entityType(record["id"]);
        if (type) { return example(block, type === "condition" ? "condition-entity" : type, data); }
    }

    return null;
}

describe("examples of 02-content-format.md", () =>
{
    const ajv = createAjv();
    const all = blocks(readFileSync(DOC, "utf8"));
    const examples = all.map(classify).filter((x): x is Example => x !== null);

    it("finds the examples it expects", () =>
    {
        const summary = examples.map((e) => `${e.line}:${e.schema}`);

        expect(summary.length).toBeGreaterThanOrEqual(8);
        expect(summary.some((s) => s.endsWith(":package"))).toBe(true);
        expect(summary.some((s) => s.endsWith(":feature"))).toBe(true);
        expect(summary.some((s) => s.endsWith(":subclass"))).toBe(true);
        expect(summary.some((s) => s.endsWith(":species"))).toBe(true);
        expect(summary.some((s) => s.endsWith(":spell"))).toBe(true);
        expect(summary.some((s) => s.endsWith(":condition-entity"))).toBe(true);
        expect(summary.some((s) => s.endsWith(":character"))).toBe(true);
        expect(summary.some((s) => s.endsWith(":effect"))).toBe(true);
    });

    it.each(examples.map((e) => [`line ${e.line} (${e.schema})`, e] as const))("%s validates", (_label, current) =>
    {
        const validate = validatorFor(ajv, current.schema);
        const items = current.asList ? (current.data as unknown[]) : [current.data];
        for (const item of items)
        {
            const ok = validate(item);

            expect(ok, JSON.stringify(validate.errors, null, 2)).toBe(true);
        }
    });
});
