/**
 * Validate overlay files in isolation: merge each overlay onto its generated
 * entity, write the merged entities into a temporary package directory
 * (with the base manifest, ruleset and tables) and run `dnd validate` on it.
 *
 *   node tools/import/src/check-overlay.ts <entity-id>... | --all
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { parse, stringify } from "yaml";

import { CONTENT_DIR } from "./emit.ts";
import { IMPORT_DIR, REPO_ROOT } from "./lib.ts";
import { applyOverlays, readOverlays } from "./overlay.ts";

const args = process.argv.slice(2);
const overlays = readOverlays();
const wanted = args.includes("--all") ? [...overlays.keys()] : args.filter((a) => !a.startsWith("--"));
if (wanted.length === 0)
{
    console.error("usage: node tools/import/src/check-overlay.ts <entity-id>... | --all");
    process.exit(2);
}

// Index generated files by every id they contain (inline features live inside their owner's file).
const fileOfId = new Map<string, string>();
function* yamlFiles(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* yamlFiles(path); }
        else if (entry.endsWith(".yaml") && entry !== "package.yaml" && entry !== "ruleset.yaml") { yield path; }
    }
}
const collect = (node: unknown, file: string): void =>
{
    if (Array.isArray(node)) { node.forEach((n) => collect(n, file)); }
    else if (node && typeof node === "object")
    {
        const id = (node as { id?: unknown }).id;
        if (typeof id === "string" && !fileOfId.has(id)) { fileOfId.set(id, file); }
        Object.values(node).forEach((v) => collect(v, file));
    }
};
for (const file of yamlFiles(CONTENT_DIR)) { collect(parse(readFileSync(file, "utf8")), file); }

const missing = wanted.filter((id) => !overlays.has(id));
const unknown = wanted.filter((id) => overlays.has(id) && !fileOfId.has(id));
for (const id of missing) { console.error(`no overlay file for ${id}`); }
for (const id of unknown) { console.error(`overlay ${id} targets an id that does not exist in the generated package`); }

const files = new Set(wanted.filter((id) => fileOfId.has(id)).map((id) => fileOfId.get(id)!));
const work = resolve(IMPORT_DIR, "work", `check-${process.pid}`);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
for (const name of ["package.yaml", "ruleset.yaml"]) { cpSync(resolve(CONTENT_DIR, name), resolve(work, name)); }
if (existsSync(resolve(CONTENT_DIR, "tables"))) { cpSync(resolve(CONTENT_DIR, "tables"), resolve(work, "tables"), { recursive: true }); }
const selected = new Map([...overlays].filter(([id]) => wanted.includes(id)));
const used = new Set<string>();
for (const file of files)
{
    const entity = parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const merged = applyOverlays(entity, selected, used);
    const target = resolve(work, relative(CONTENT_DIR, file));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, stringify(merged, { lineWidth: 0, blockQuote: "literal" }));
}

const result = spawnSync("node", [resolve(REPO_ROOT, "packages/cli/dist/index.js"), "validate", work], { encoding: "utf8" });
process.stdout.write(result.stdout.replace(new RegExp(work.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "<merged>"));
process.stderr.write(result.stderr);
rmSync(work, { recursive: true, force: true });
const ok = result.status === 0 && missing.length === 0 && unknown.length === 0;
console.log(ok ? `OK: ${used.size} overlay(s) checked` : "FAILED");
process.exit(ok ? 0 : 1);
