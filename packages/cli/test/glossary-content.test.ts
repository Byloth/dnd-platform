/**
 * The translated content keeps the glossary (docs/phase-1/06-localisation.md, "glossary check on the translation"):
 * a name of srd51 that is a game term of docs/03-glossary.md in English is the glossary's Italian term in srd51-it.
 * Case and abbreviations in brackets are ignored: "Dadi Vita" and "Dadi vita" are the same term.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const SOURCE = join(ROOT, "packages", "content", "srd51");
const TRANSLATION = join(ROOT, "packages", "content", "srd51-it", "translations", "it");

const normal = (term: string): string => term.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** English term → the Italian terms it may be: `A / B | C / D` pairs A with C and B with D. */
function glossary(): Map<string, Set<string>>
{
    const text = readFileSync(join(ROOT, "docs", "03-glossary.md"), "utf8");
    const start = text.indexOf("## Game terms");
    const table = text.slice(start, text.indexOf("\n## ", start + 1));
    const terms = new Map<string, Set<string>>();
    for (const line of table.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| English")))
    {
        const [englishCell = "", italianCell = ""] = line.split("|").slice(1, 3);
        const english = englishCell.split("/").map(normal);
        const italian = italianCell.split("/").map(normal);
        english.forEach((term, i) =>
        {
            const set = terms.get(term) ?? new Set<string>();
            // Unpaired alternatives ("Species (2024) / Race (2014)" and "Specie / Razza") pair by position.
            set.add(italian[i] ?? italian[0] ?? "");
            terms.set(term, set);
        });
    }

    return terms;
}

function* yamlFiles(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* yamlFiles(path); }
        else if (entry.endsWith(".yaml") && (entry !== "package.yaml")) { yield path; }
    }
}

/** Every `name` of an entity (its own and its inline features'), by translation key, in English. */
function names(node: unknown, path: string, out: [string, string][]): void
{
    if (Array.isArray(node)) { node.forEach((item, i) => names(item, path ? `${path}.${i}` : String(i), out)); }
    else if (node && (typeof node === "object"))
    {
        for (const [key, value] of Object.entries(node))
        {
            const at = path ? `${path}.${key}` : key;
            const english = (value as { en?: unknown } | null)?.en;
            if ((key === "name") && (typeof english === "string")) { out.push([at, english]); }
            else { names(value, at, out); }
        }
    }
}

describe("the Italian content keeps the glossary", () =>
{
    it("names every glossary term of srd51 with the glossary's Italian", () =>
    {
        const terms = glossary();
        const differences: string[] = [];
        let checked = 0;
        for (const file of yamlFiles(SOURCE))
        {
            const entity = parse(readFileSync(file, "utf8")) as { id?: string } | null;
            if (!entity?.id) { continue; }
            const found: [string, string][] = [];
            names(entity, "", found);
            let translation: Record<string, string> | undefined;
            for (const [key, english] of found)
            {
                const expected = terms.get(normal(english));
                if (!expected) { continue; }
                translation ??= (parse(readFileSync(join(TRANSLATION, `${entity.id}.yaml`), "utf8")) ?? {}) as
                    Record<string, string>;
                const italian = translation[key];
                checked += 1;
                if (!italian || !expected.has(normal(italian)))
                {
                    differences.push(`${entity.id} ${key}: "${english}" is "${italian ?? ""}", the glossary says ` +
                        `"${[...expected].join(" / ")}"`);
                }
            }
        }
        expect(checked).toBeGreaterThan(0);
        expect(differences).toEqual([]);
    });
});
