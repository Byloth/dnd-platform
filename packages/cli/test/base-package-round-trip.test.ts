/** Every YAML file of the base package round-trips through JSON and back through YAML without loss. */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse, stringify } from "yaml";
import { describe, expect, it } from "vitest";

const BASE = resolve(import.meta.dirname, "..", "..", "..", "packages", "content", "srd51");

function* yamlFiles(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* yamlFiles(path); }
        else if (entry.endsWith(".yaml")) { yield path; }
    }
}

const directories = readdirSync(BASE).filter((entry) => statSync(join(BASE, entry)).isDirectory())
    .sort();

describe("base package round trip", () =>
{
    it("has the entity directories", () =>
    {
        const expected = ["classes", "spells", "items", "conditions", "rules", "tables"];

        expect(directories).toEqual(expect.arrayContaining(expected));
    });

    it("package.yaml and ruleset.yaml round-trip", () =>
    {
        for (const name of ["package.yaml", "ruleset.yaml"])
        {
            const original = parse(readFileSync(join(BASE, name), "utf8")) as unknown;

            expect(JSON.parse(JSON.stringify(original))).toEqual(original);
            expect(parse(stringify(original))).toEqual(original);
        }
    });

    for (const directory of directories)
    {
        it(`${directory}/ round-trips through JSON and YAML`, () =>
        {
            let count = 0;
            for (const file of yamlFiles(join(BASE, directory)))
            {
                const original = parse(readFileSync(file, "utf8")) as unknown;

                expect(JSON.parse(JSON.stringify(original)), file).toEqual(original);
                expect(parse(stringify(original, { lineWidth: 0 })), file).toEqual(original);
                count += 1;
            }

            expect(count).toBeGreaterThan(0);
        });
    }
});
