import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { validatePackages } from "../src/commands/validate.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "packages");
const INVALID = resolve(FIXTURES, "invalid");

const valid = readdirSync(FIXTURES)
    .filter((name) => name !== "invalid")
    .filter((name) => existsSync(join(FIXTURES, name, "package.yaml")));
const invalid = existsSync(INVALID) ?
    readdirSync(INVALID).filter((name) => existsSync(join(INVALID, name, "package.yaml"))) :
    [];

describe("dnd validate", () =>
{
    it("finds the fixture packages", () =>
    {
        expect(valid.length).toBeGreaterThan(0);
        expect(invalid.length).toBeGreaterThan(0);
    });

    it("validates the real srd51 manifest", () =>
    {
        const diagnostics = validatePackages([resolve(ROOT, "packages", "content", "srd51")]);

        expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    });

    it("skips missing directories only with --allow-missing", () =>
    {
        expect(validatePackages(["/nonexistent/package"], { allowMissing: true })).toEqual([]);
        expect(validatePackages(["/nonexistent/package"]).map((d) => d.code)).toEqual(["E_MANIFEST_MISSING"]);
    });

    for (const name of valid)
    {
        it(`accepts fixtures/packages/${name}`, () =>
        {
            const diagnostics = validatePackages([join(FIXTURES, name)]);

            expect(diagnostics.map((d) => `${d.file}:${d.path}: ${d.code} ${d.message}`)).toEqual([]);
        });
    }

    for (const name of invalid)
    {
        it(`rejects fixtures/packages/invalid/${name} with the expected codes`, () =>
        {
            const expected = parse(readFileSync(join(INVALID, name, "expected-diagnostics.yaml"), "utf8")) as {
                diagnostics: { code: string, file: string }[];
            };
            const actual = validatePackages([join(INVALID, name)])
                .filter((d) => d.severity === "error")
                .map((d) => `${d.code} ${d.file}`);
            const wanted = expected.diagnostics.map((d) => `${d.code} ${d.file}`);

            expect([...new Set(actual)].sort()).toEqual([...new Set(wanted)].sort());
        });
    }
});
