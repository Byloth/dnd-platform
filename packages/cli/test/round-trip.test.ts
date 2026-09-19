import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { parse, stringify } from "yaml";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "packages");

function* walk(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* walk(path); }
        else if (/\.ya?ml$/.test(entry)) { yield path; }
    }
}

const files = readdirSync(FIXTURES)
    .filter((name) => name !== "invalid")
    .filter((name) => statSync(join(FIXTURES, name)).isDirectory())
    .flatMap((name) => [...walk(join(FIXTURES, name))])
    .map((file) => relative(ROOT, file));

describe("YAML → JSON → YAML round trip (docs/phase-0/02-content-format.md, DEC-03)", () =>
{
    it("finds fixture files", () =>
    {
        expect(files.length).toBeGreaterThan(0);
    });

    for (const file of files)
    {
        it(`${file} survives the round trip without loss`, () =>
        {
            const original = parse(readFileSync(join(ROOT, file), "utf8")) as unknown;
            const viaJson = JSON.parse(JSON.stringify(original)) as unknown;
            const viaYaml = parse(stringify(original)) as unknown;

            expect(viaJson).toEqual(original);
            expect(viaYaml).toEqual(original);
        });
    }
});
