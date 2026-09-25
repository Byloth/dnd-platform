/**
 * Generate (or refresh) the skeleton of a translation package: one file per entity, patch and ruleset of a source
 * package under `<out>/translations/<lang>/<id>.yaml`, mapping every localised field path to its translation, an
 * empty string until it is written (docs/phase-1/11-italian-content.md). Strings already translated in an existing
 * file are kept; paths that no longer exist in the source are dropped and counted.
 *
 *   node tools/import/src/translation-skeleton.ts [lang=it] [--package <source dir>] [--out <package dir>]
 *
 * Without options: the base package into tools/import/work/translations/<lang>/ (the original behaviour).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse, stringify } from "yaml";

import { CONTENT_DIR } from "./emit.ts";
import { IMPORT_DIR } from "./lib.ts";

const args = process.argv.slice(2);
const option = (name: string): string | undefined =>
{
    const index = args.indexOf(`--${name}`);

    return index >= 0 ? args[index + 1] : undefined;
};
const language = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")) ?? "it";
const SOURCE = resolve(option("package") ?? CONTENT_DIR);
const PACKAGE = option("out");
const OUT = PACKAGE ?
    resolve(PACKAGE, "translations", language) :
    resolve(IMPORT_DIR, "work", "translations", language);
mkdirSync(OUT, { recursive: true });

function* yamlFiles(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory())
        {
            if (entry !== "translations") { yield* yamlFiles(path); }
        }
        else if (entry.endsWith(".yaml") && (entry !== "package.yaml")) { yield path; }
    }
}

/** The paths of the localised strings (`{ en: … }` maps) in a document, relative to it. */
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
let kept = 0;
let dropped = 0;
for (const file of yamlFiles(SOURCE))
{
    const document = parse(readFileSync(file, "utf8")) as Record<string, unknown> | null;
    const id = document?.["id"];
    if (typeof id !== "string") { continue; }
    const paths: string[] = [];
    localisedPaths(document, "", paths);
    if (paths.length === 0) { continue; }

    const target = resolve(OUT, `${id}.yaml`);
    const previous = existsSync(target) ?
        (parse(readFileSync(target, "utf8")) as Record<string, string> | null) ?? {} :
        {};
    const strings_ = Object.fromEntries(paths.map((p) => [p, previous[p] ?? ""]));
    kept += paths.filter((p) => previous[p]).length;
    dropped += Object.keys(previous).filter((p) => !paths.includes(p)).length;

    writeFileSync(target, stringify(strings_, { lineWidth: 0 }));
    files += 1;
    strings += paths.length;
}
console.log(`translation skeleton (${language}) of ${SOURCE}: ${files} files, ${strings} strings ` +
    `(${kept} already translated, ${dropped} dropped) in ${OUT}`);
