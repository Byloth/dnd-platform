/**
 * Generate the skeleton of a translation package for the base package: one
 * file per entity under tools/import/work/translations/<lang>/<entity-id>.yaml
 * mapping every localised field path to an empty string.
 *
 *   node tools/import/src/translation-skeleton.ts [lang=it]
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse, stringify } from "yaml";

import { CONTENT_DIR } from "./emit.ts";
import { IMPORT_DIR } from "./lib.ts";

const language = process.argv[2] ?? "it";
const OUT = resolve(IMPORT_DIR, "work", "translations", language);
mkdirSync(OUT, { recursive: true });

function* yamlFiles(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* yamlFiles(path); }
        else if (entry.endsWith(".yaml") && entry !== "package.yaml" && entry !== "ruleset.yaml") { yield path; }
    }
}

function localisedPaths(node: unknown, path: string, out: string[]): void
{
    if (Array.isArray(node))
    {
        node.forEach((item, index) => localisedPaths(item, `${path}.${index}`, out));

        return;
    }
    if ((node === null) || (typeof node !== "object")) { return; }
    const record = node as Record<string, unknown>;
    if ((typeof record["en"] === "string") && Object.keys(record).every((k) => /^[a-z]{2}(-[A-Z]{2})?$/.test(k)))
    {
        out.push(path.replace(/^\./, ""));

        return;
    }
    for (const [key, value] of Object.entries(record)) { localisedPaths(value, `${path}.${key}`, out); }
}

let files = 0;
let strings = 0;
for (const file of yamlFiles(CONTENT_DIR))
{
    const entity = parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const paths: string[] = [];
    localisedPaths(entity, "", paths);
    if (paths.length === 0) { continue; }
    writeFileSync(resolve(OUT, `${String(entity["id"])}.yaml`), stringify(Object.fromEntries(paths.map((p) => [p, ""]))));
    files += 1;
    strings += paths.length;
}
console.log(`translation skeleton (${language}): ${files} files, ${strings} strings in ${OUT}`);
