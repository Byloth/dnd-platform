/**
 * `dnd build`: a bundle is the package's `PackageSource` in canonical JSON, so
 * loading it back gives every fixture character the same sheet as the YAML
 * directory does; non-redistributable packages never leave content-private/.
 */

import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { parse } from "yaml";
import { afterAll, describe, expect, it } from "vitest";

import { stableStringify } from "@byloth/dnd-platform-schema";
import { loadPackages } from "@byloth/dnd-platform-loader";
import { derive } from "@byloth/dnd-platform-engine";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import type { Character } from "@byloth/dnd-platform-engine";

import { buildPackages, bundleText } from "../src/commands/build.js";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "characters");
const PACKAGES = resolve(ROOT, "fixtures", "packages");

interface PackagesFile { readonly packages: readonly string[] }

const fixtures = readdirSync(FIXTURES)
    .filter((name) => ["packages.yaml", "character.yaml"].every((file) => existsSync(join(FIXTURES, name, file))))
    .map((name) =>
    {
        const packages = (parse(readFileSync(join(FIXTURES, name, "packages.yaml"), "utf8")) as PackagesFile).packages;

        return { name: name, paths: packages.map((p) => resolve(ROOT, p)) };
    })
    .filter((f) => f.paths.every((p) => existsSync(p)));

const bundles = new Map<string, PackageSource>();
const fromBundle = (path: string): PackageSource =>
{
    const cached = bundles.get(path);
    if (cached) { return cached; }
    const parsed = JSON.parse(bundleText(readPackageSource(path))) as PackageSource;
    bundles.set(path, parsed);

    return parsed;
};

describe("dnd build", () =>
{
    const out = mkdtempSync(join(tmpdir(), "dnd-build-"));
    afterAll(() => { rmSync(out, { recursive: true, force: true }); });

    it("writes one canonical bundle per public package", () =>
    {
        const dirs = ["srd51-excerpt", "homebrew-feline", "mini-ruleset-b"].map((d) => join(PACKAGES, d));
        const report = buildPackages({ dirs: dirs, out: out, repoRoot: ROOT });

        expect(report.errors).toEqual([]);
        expect(report.bundles.map((b) => b.id)).toEqual(["srd51", "homebrew.byloth", "minib"]);
        const text = readFileSync(join(out, "srd51.json"), "utf8");
        expect(text).toBe(stableStringify(JSON.parse(text)));
        const parsed = JSON.parse(text) as PackageSource;
        expect(parsed.manifest.id).toBe("srd51");
        const keys = parsed.entities.map((e) => [e.type, e.id] as const);
        const sorted = [...keys].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
        expect(keys).toEqual(sorted);
    });

    it("refuses a bundle of a non-redistributable package outside content-private/", () =>
    {
        // The public stub is redistributable by necessity; a copy marked private stands in for a real book.
        const dir = join(out, "private-stub");
        cpSync(join(PACKAGES, "phb14-stub"), dir, { recursive: true });
        const manifest = readFileSync(join(dir, "package.yaml"), "utf8")
            .replace(/redistributable: true/, "redistributable: false")
            .replace(/visibility: \w+/, "visibility: private");
        writeFileSync(join(dir, "package.yaml"), manifest);
        const report = buildPackages({ dirs: [dir], out: out, repoRoot: ROOT });

        expect(report.errors.map((e) => e.code)).toEqual(["E_PRIVATE_OUTSIDE_ROOT"]);
        expect(existsSync(join(out, "phb14.json"))).toBe(false);
        const allowed = buildPackages({ dirs: [dir], repoRoot: ROOT, write: false });
        expect(allowed.ok).toBe(true);
        expect(allowed.bundles[0]?.path).toBe(resolve(ROOT, "content-private", "build", "phb14.json"));
    });

    it("reports a package read twice instead of overwriting its bundle", () =>
    {
        const dir = join(PACKAGES, "homebrew-feline");
        const report = buildPackages({ dirs: [dir, dir], out: out, repoRoot: ROOT, write: false });

        expect(report.bundles).toHaveLength(1);
        expect(report.errors.map((e) => e.code)).toEqual(["E_DUPLICATE_PACKAGE"]);
    });

    it("reports a directory that is not a package", () =>
    {
        const report = buildPackages({ dirs: [FIXTURES], out: out, repoRoot: ROOT, write: false });

        expect(report.errors.map((e) => e.code)).toEqual(["E_READ"]);
    });

    describe("a bundle loads back to the same sheet", () =>
    {
        for (const fixture of fixtures)
        {
            it(fixture.name, () =>
            {
                const raw = readFileSync(join(FIXTURES, fixture.name, "character.yaml"), "utf8");
                const character = parse(raw) as Character;
                const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
                const fromYaml = derive(character, loadPackages(fixture.paths.map(readPackageSource), { pins: pins }));
                const fromJson = derive(character, loadPackages(fixture.paths.map(fromBundle), { pins: pins }));

                expect(stableStringify(fromJson)).toBe(stableStringify(fromYaml));
            });
        }
    });
});
