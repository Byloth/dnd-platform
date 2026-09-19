/** Properties that must hold for every character fixture: idempotence, order independence, explain ≡ provenance. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { derive, explain, loadPackages, stableStringify } from "@byloth/dnd-platform-engine";
import type { Character, PackageSource } from "@byloth/dnd-platform-engine";

import { toPackageSource } from "../src/io/to-package-source.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "characters");

interface PackagesFile { readonly packages: readonly string[] }

const fixtures = readdirSync(FIXTURES)
    .filter((name) => ["packages.yaml", "character.yaml"].every((file) => existsSync(join(FIXTURES, name, file))))
    .map((name) =>
    {
        const packages = (parse(readFileSync(join(FIXTURES, name, "packages.yaml"), "utf8")) as PackagesFile).packages;

        return { name: name, paths: packages.map((p) => resolve(ROOT, p)) };
    })
    .filter((f) => f.paths.every((p) => existsSync(p)));

const cache = new Map<string, PackageSource>();
const source = (path: string): PackageSource =>
{
    const cached = cache.get(path);
    if (cached) { return cached; }
    const loaded = toPackageSource(path);
    cache.set(path, loaded);

    return loaded;
};

describe("properties of every character fixture", () =>
{
    it("finds fixtures", () =>
    {
        expect(fixtures.length).toBeGreaterThan(0);
    });

    for (const fixture of fixtures)
    {
        describe(fixture.name, () =>
        {
            const character = parse(readFileSync(join(FIXTURES, fixture.name, "character.yaml"), "utf8")) as Character;
            const sources = fixture.paths.map(source);
            const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
            const canonical = (inputs: readonly PackageSource[]): string =>
                stableStringify(derive(character, loadPackages(inputs, { pins: pins })));

            it("derive is idempotent", () =>
            {
                expect(canonical(sources)).toBe(canonical(sources));
            });

            it("derive does not depend on the order of the sources or of their entities", () =>
            {
                const reference = canonical(sources);
                const reversed = [...sources].reverse().map((s) => ({ ...s, entities: [...s.entities].reverse() }));

                expect(canonical(reversed)).toBe(reference);
            });

            it("explain returns the provenance stored in the sheet", () =>
            {
                const sheet = derive(character, loadPackages(sources, { pins: pins }));

                expect(explain(sheet, "ac")).toEqual(sheet.values["ac"]?.provenance);
                expect(explain(sheet, "hp.max")).toEqual(sheet.values["hp.max"]?.provenance);
                expect(explain(sheet, "no.such.value")).toEqual([]);
            });
        });
    }
});
