/**
 * Build the work partitions for the mechanics-authoring agents: every
 * generated entity that still lacks mechanics, with its text and the
 * classification record from docs/phase-0/inventory as guidance.
 *
 *   node tools/import/src/authoring-work.ts
 */

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse, stringify } from "yaml";

import { CONTENT_DIR } from "./emit.ts";
import { IMPORT_DIR, REPO_ROOT } from "./lib.ts";

const OUT = resolve(IMPORT_DIR, "work", "authoring");
mkdirSync(OUT, { recursive: true });
const INVENTORY = resolve(REPO_ROOT, "docs/phase-0/inventory");

interface Classified
{
    id: string;
    mechanics?: string[];
    targets?: string[];
    resource?: string;
    activation?: string;
    confidence?: string;
    note?: string;
}
function classified(file: string): Map<string, Classified>
{
    const records = (parse(readFileSync(resolve(INVENTORY, file), "utf8")) as { records: Classified[] }).records;

    return new Map(records.map((r) => [r.id, r]));
}
const featureClass = classified("classification.yaml");
const spellClass = classified("spells-classified.yaml");
const itemClass = classified("magic-items-classified.yaml");

interface Record_ { id: string, owner: string, name: string, text: string, [k: string]: unknown }
function* yamlFiles(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* yamlFiles(path); }
        else if (entry.endsWith(".yaml")) { yield path; }
    }
}
const guidance = (c: Classified | undefined): Record<string, unknown> =>
{
    if (!c) { return { classification: null }; }

    return {
        classification: {
            mechanics: c.mechanics,
            targets: c.targets,
            resource: c.resource,
            activation: c.activation,
            confidence: c.confidence,
            note: c.note
        }
    };
};

// Features without mechanics, grouped by owner.
const features = new Map<string, Record_[]>();
for (const dir of ["classes", "subclasses", "species", "backgrounds", "feats"])
{
    for (const file of yamlFiles(resolve(CONTENT_DIR, dir)))
    {
        const entity = parse(readFileSync(file, "utf8")) as Record<string, unknown>;
        const owner = String(entity["id"]);
        const visit = (node: unknown, level: number | undefined): void =>
        {
            if (Array.isArray(node))
            {
                node.forEach((n) => visit(n, level));

                return;
            }
            if (!node || typeof node !== "object") { return; }
            const r = node as Record<string, unknown>;
            const id = r["id"];
            if (typeof id === "string" && id.startsWith("srd51.feature.") && !r["effects"] && !r["choices"])
            {
                const name = (r["name"] as { en?: string } | undefined)?.en ?? id;
                const text = (r["text"] as { en?: string } | undefined)?.en ?? "";
                const record: Record_ = {
                    id: id,
                    owner: owner,
                    name: name,
                    level: level,
                    text: text,
                    ...guidance(featureClass.get(id))
                };
                features.set(owner, [...(features.get(owner) ?? []), record]);
            }
            for (const [k, v] of Object.entries(r))
            {
                if (k === "levels" && v && typeof v === "object")
                {
                    for (const [lvl, content] of Object.entries(v as Record<string, unknown>))
                    {
                        visit(content, Number(lvl));
                    }
                }
                else if (k !== "effects") { visit(v, level); }
            }
        };
        visit(entity, undefined);
    }
}

const PARTS: Record<string, (owner: string) => boolean> = {
    "features-1": (o) => /\.(barbarian|bard|cleric)(\.|$)/.test(o) || /subclass\.(barbarian|bard|cleric)\./.test(o),
    "features-2": (o) => /\.(druid|fighter|monk)(\.|$)/.test(o) || /subclass\.(druid|fighter|monk)\./.test(o),
    "features-3": (o) => /\.(paladin|ranger|rogue)(\.|$)/.test(o) || /subclass\.(paladin|ranger|rogue)\./.test(o),
    "features-4": (o) => /\.(sorcerer|warlock|wizard)(\.|$)/.test(o) || /subclass\.(sorcerer|warlock|wizard)\./.test(o),
    "features-5": (o) => o.includes(".species.") || o.includes(".background.") || o.includes(".feat.")
};
const assigned = new Set<string>();
for (const [name, filter] of Object.entries(PARTS))
{
    const records = [...features.entries()].filter(([owner]) => filter(owner)).flatMap(([, list]) => list);
    records.forEach((r) => assigned.add(r.id));
    writeFileSync(resolve(OUT, `${name}.yaml`), stringify({ records: records }, { lineWidth: 0, blockQuote: "literal" }));
    console.log(`${name}: ${records.length} features`);
}
const left = [...features.values()].flat().filter((r) => !assigned.has(r.id));
if (left.length) { throw new Error(`unassigned features: ${left.map((r) => r.id).join(", ")}`); }

// Spells whose classification asks for engine effects beyond rolls.
const NEEDS = new Set(["buff-modify", "condition", "healing", "summon"]);
const spellRecords: Record<string, unknown>[] = [];
for (const file of yamlFiles(resolve(CONTENT_DIR, "spells")))
{
    const spell = parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const id = String(spell["id"]);
    const c = spellClass.get(id);
    const mechanics = c?.mechanics ?? [];
    if (spell["effects"] || spell["onCast"]) { continue; }
    if (!mechanics.some((m) => NEEDS.has(m) || m.startsWith("needs-new-kind"))) { continue; }
    spellRecords.push({
        id: id,
        name: (spell["name"] as { en: string }).en,
        level: spell["level"],
        duration: spell["duration"],
        rolls: spell["rolls"],
        text: (spell["text"] as { en: string }).en,
        higherLevel: (spell["higherLevel"] as { en: string } | undefined)?.en,
        ...guidance(c)
    });
}
const half = Math.ceil(spellRecords.length / 2);
writeFileSync(resolve(OUT, "spells-1.yaml"), stringify({ records: spellRecords.slice(0, half) }, { lineWidth: 0, blockQuote: "literal" }));
writeFileSync(resolve(OUT, "spells-2.yaml"), stringify({ records: spellRecords.slice(half) }, { lineWidth: 0, blockQuote: "literal" }));
console.log(`spells: ${spellRecords.length} in two parts`);

// Magic items: everything not classified text-only.
const itemRecords: Record<string, unknown>[] = [];
for (const file of yamlFiles(resolve(CONTENT_DIR, "items")))
{
    const item = parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    if (item["magical"] !== true) { continue; }
    const id = String(item["id"]);
    const c = itemClass.get(id);
    const mechanics = c?.mechanics ?? [];
    if (mechanics.length === 1 && mechanics[0] === "text-only") { continue; }
    itemRecords.push({ id: id, name: (item["name"] as { en: string }).en, type: item["type"], rarity: item["rarity"], attunement: item["attunement"], text: (item["text"] as { en: string }).en, ...guidance(c) });
}
const third = Math.ceil(itemRecords.length / 3);
for (let i = 0; i < 3; i += 1)
{
    writeFileSync(resolve(OUT, `items-${i + 1}.yaml`), stringify({ records: itemRecords.slice(i * third, (i + 1) * third) }, { lineWidth: 0, blockQuote: "literal" }));
}
console.log(`magic items: ${itemRecords.length} in three parts`);
