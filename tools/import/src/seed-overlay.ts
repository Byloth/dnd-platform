/**
 * One-off seeding of the overlay from the hand-authored excerpt fixture:
 * copies the mechanical fields (effects, choices, toggles, play effects,
 * condition levels) of every entity of fixtures/packages/srd51-excerpt whose
 * id also exists in the generated base package. Safe to re-run: existing
 * overlay files are kept unless --force.
 *
 *   node tools/import/src/seed-overlay.ts [--force]
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";

import { CONTENT_DIR } from "./emit.ts";
import { REPO_ROOT } from "./lib.ts";
import { OVERLAY_DIR, writeOverlay } from "./overlay.ts";

const EXCERPT = resolve(REPO_ROOT, "fixtures/packages/srd51-excerpt");
const FORCE = process.argv.includes("--force");
const MECHANICAL: Record<string, string[]> = {
    feature: ["effects", "choices", "toggle", "onRest", "onTurnStart"],
    condition: ["effects", "levels", "cumulative"],
    spell: ["effects", "onCast"],
    feat: ["prerequisites"]
};

function* yamlFiles(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* yamlFiles(path); }
        else if (entry.endsWith(".yaml") && entry !== "package.yaml" && entry !== "ruleset.yaml") { yield path; }
    }
}

const generatedIds = new Set<string>();
for (const file of yamlFiles(CONTENT_DIR))
{
    const visit = (node: unknown): void =>
    {
        if (Array.isArray(node)) { node.forEach(visit); }
        else if (node && typeof node === "object")
        {
            const id = (node as { id?: unknown }).id;
            if (typeof id === "string") { generatedIds.add(id); }
            Object.values(node).forEach(visit);
        }
    };
    visit(parse(readFileSync(file, "utf8")));
}

let written = 0;
let skipped = 0;
function consider(node: unknown, type: string | undefined): void
{
    if (Array.isArray(node))
    {
        node.forEach((n) => consider(n, type));

        return;
    }
    if (!node || typeof node !== "object") { return; }
    const record = node as Record<string, unknown>;
    const id = record["id"];
    const kind = typeof id === "string" ? id.split(".")[1] : undefined;
    const keys = kind ? MECHANICAL[kind] : undefined;
    if (typeof id === "string" && keys && generatedIds.has(id))
    {
        const overlay = Object.fromEntries(keys.filter((k) => record[k] !== undefined).map((k) => [k, record[k]]));
        if (Object.keys(overlay).length)
        {
            const target = resolve(OVERLAY_DIR, `${id}.yaml`);
            if (existsSync(target) && !FORCE) { skipped += 1; }
            else
            {
                writeOverlay(id, overlay);
                written += 1;
            }
        }
    }
    for (const [key, value] of Object.entries(record))
    {
        if ((key === "effects") || ((key === "levels") && (kind === "condition"))) { continue; }
        consider(value, type);
    }
}
for (const file of yamlFiles(EXCERPT)) { consider(parse(readFileSync(file, "utf8")), undefined); }
console.log(`overlay: ${written} written, ${skipped} kept`);
