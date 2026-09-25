/**
 * Check a translation package against the package it translates (docs/phase-1/11-italian-content.md): the gate
 * the translating agents run on their files.
 *
 *   node tools/import/src/translation-check.ts --package <source dir> --translation <package dir>
 *       [--lang it] [--files <id>,<id>,…] [--json]
 *
 * Errors (exit 1): a file or a key that the source does not have, a key of the source missing, an empty string,
 * a different number of table rows, headings or list items, dice expressions that differ. Warnings: a string left
 * identical to the English, numbers of the English missing from the translation (distances and weights excepted:
 * they become metres and kilograms).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";

const args = process.argv.slice(2);
const option = (name: string): string | undefined =>
{
    const index = args.indexOf(`--${name}`);

    return index >= 0 ? args[index + 1] : undefined;
};
const SOURCE = resolve(option("package") ?? "packages/content/srd51");
const TRANSLATION = resolve(option("translation") ?? "packages/content/srd51-it");
const LANGUAGE = option("lang") ?? "it";
const ONLY = option("files")?.split(",")
    .map((f) => f.trim().replace(/\.yaml$/, ""));
const JSON_OUTPUT = args.includes("--json");

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

/** Every localised `{ en: … }` string of a document, by its path. */
function english(node: unknown, path: string, out: Map<string, string>): void
{
    if (Array.isArray(node))
    {
        node.forEach((item, i) => english(item, `${path}.${i}`, out));

        return;
    }
    if ((node === null) || (typeof node !== "object")) { return; }
    const record = node as Record<string, unknown>;
    if ((typeof record["en"] === "string") && Object.keys(record).every((k) => /^[a-z]{2}(-[A-Z]{2})?$/.test(k)))
    {
        out.set(path.replace(/^\./, ""), record["en"]);

        return;
    }
    for (const [key, value] of Object.entries(record)) { english(value, `${path}.${key}`, out); }
}

const count = (text: string, pattern: RegExp): number => (text.match(pattern) ?? []).length;
/** The dice of a text, as `d8`, `2d6`: plurals ("d8s") and a stray space ("10d 10") read as the English means them. */
const dice = (text: string): string[] => [...text.matchAll(/\b(\d*)d ?(\d+)s?\b/g)]
    .map((m) => `${m[1] === "1" ? "" : m[1]}d${m[2]}`)
    .sort();
/** Numbers that must survive translation: not those of a distance or a weight (converted), not ordinals. */
const numbersOf = (text: string, units: RegExp): string[] =>
    [...text.replace(units, " ").matchAll(/\b\d+\b/g)].map((m) => m[0]).sort();
const EN_UNITS = /\b\d+(?:[.,]\d+)?[\s-]*(?:feet|foot|ft\.?|miles?|pounds?|lb\.?|inch(?:es)?)\b/gi;
const IT_UNITS = /\b\d+(?:[.,]\d+)?[\s-]*(?:metri|metro|m\b|km|chilometri|chilometro|chili|kg|centimetri|cm)\b/gi;

interface Report { file: string, errors: string[], warnings: string[] }

const reports: Report[] = [];
const sources = new Map<string, Map<string, string>>();
for (const file of yamlFiles(SOURCE))
{
    const document = parse(readFileSync(file, "utf8")) as Record<string, unknown> | null;
    const id = document?.["id"];
    if (typeof id !== "string") { continue; }
    const strings = new Map<string, string>();
    english(document, "", strings);
    if (strings.size) { sources.set(id, strings); }
}

const dir = resolve(TRANSLATION, "translations", LANGUAGE);
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".yaml")) : [];
for (const file of files)
{
    const id = file.replace(/\.yaml$/, "");
    if (ONLY && !ONLY.includes(id)) { continue; }
    const report: Report = { file: file, errors: [], warnings: [] };
    reports.push(report);
    const source = sources.get(id);
    if (!source)
    {
        report.errors.push("no such entity, patch or ruleset in the source package");
        continue;
    }
    const translated = (parse(readFileSync(join(dir, file), "utf8")) ?? {}) as Record<string, unknown>;

    for (const key of Object.keys(translated))
    {
        if (!source.has(key)) { report.errors.push(`${key}: not a localised string of the source`); }
    }
    for (const [key, en] of source)
    {
        const value = translated[key];
        if (value === undefined)
        {
            report.errors.push(`${key}: missing`);
            continue;
        }
        if ((typeof value !== "string") || !value.trim())
        {
            report.errors.push(`${key}: empty`);
            continue;
        }

        const rows = [count(en, /^\s*\|.*\|\s*$/gm), count(value, /^\s*\|.*\|\s*$/gm)];
        if (rows[0] !== rows[1]) { report.errors.push(`${key}: table rows ${rows[1]}, expected ${rows[0]}`); }
        const headings = [count(en, /^#{1,6} /gm), count(value, /^#{1,6} /gm)];
        if (headings[0] !== headings[1]) { report.errors.push(`${key}: headings ${headings[1]}, expected ${headings[0]}`); }
        const items = [count(en, /^\s*[-*] /gm), count(value, /^\s*[-*] /gm)];
        if (items[0] !== items[1]) { report.errors.push(`${key}: list items ${items[1]}, expected ${items[0]}`); }
        if (dice(en).join() !== dice(value).join())
        {
            report.errors.push(`${key}: dice ${dice(value).join(" ")}, expected ${dice(en).join(" ")}`);
        }

        const missing = numbersOf(en, EN_UNITS).filter((n, i, all) =>
            numbersOf(value, IT_UNITS).filter((m) => m === n).length < all.filter((m) => m === n).length);
        if (missing.length) { report.warnings.push(`${key}: numbers not found: ${[...new Set(missing)].join(" ")}`); }
        if ((value === en) && (en.length > 24)) { report.warnings.push(`${key}: identical to the English`); }
    }
}
if (!ONLY)
{
    for (const id of sources.keys())
    {
        if (!files.includes(`${id}.yaml`)) { reports.push({ file: `${id}.yaml`, errors: ["file missing"], warnings: [] }); }
    }
}

const errors = reports.reduce((n, r) => n + r.errors.length, 0);
const warnings = reports.reduce((n, r) => n + r.warnings.length, 0);
const flagged = reports.filter((r) => r.errors.length || r.warnings.length);
if (JSON_OUTPUT) { console.log(JSON.stringify({ errors: errors, warnings: warnings, reports: flagged }, null, 2)); }
else
{
    for (const r of flagged)
    {
        console.log(r.file);
        for (const e of r.errors) { console.log(`  error    ${e}`); }
        for (const w of r.warnings) { console.log(`  warning  ${w}`); }
    }
    console.log(`${reports.length} file(s): ${errors} error(s), ${warnings} warning(s)`);
}
process.exit(errors ? 1 : 0);
