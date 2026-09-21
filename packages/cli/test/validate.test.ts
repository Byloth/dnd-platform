import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { parse } from "yaml";
import { afterAll, describe, expect, it } from "vitest";

import { validatePackages } from "../src/commands/validate.js";
import { discoverPackages, isUnderPrivateRoot, trackedPrivateFiles } from "../src/io/repository.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "packages");
const INVALID = resolve(FIXTURES, "invalid");

const valid = readdirSync(FIXTURES)
    .filter((name) => name !== "invalid")
    .filter((name) => existsSync(join(FIXTURES, name, "package.yaml")));
const invalid = existsSync(INVALID) ?
    readdirSync(INVALID).filter((name) => existsSync(join(INVALID, name, "package.yaml"))) :
    [];

const PRIVATE_MANIFEST = `formatVersion: 0
id: leak
name: { en: "Leak" }
version: 0.1.0
kind: extension
defaultLanguage: en
languages: [en]
visibility: private
redistributable: false
dependencies:
  - { id: srd51, version: "^0.1.0" }
sources:
  - id: leak
    title: "Leak"
    publisher: "Nobody"
    edition: "2014"
    license: all-rights-reserved
    attribution: "test"
`;

const temporaryRoots: string[] = [];
afterAll(() =>
{
    for (const root of temporaryRoots) { rmSync(root, { recursive: true, force: true }); }
});

/** A throw-away repository root with `pnpm-workspace.yaml`, the given files and, optionally, a git index. */
function temporaryRepository(files: Readonly<Record<string, string>>, tracked: readonly string[] = []): string
{
    const root = mkdtempSync(join(tmpdir(), "dnd-validate-"));
    temporaryRoots.push(root);
    writeFileSync(join(root, "pnpm-workspace.yaml"), "packages: []\n");
    for (const [path, content] of Object.entries(files))
    {
        mkdirSync(join(root, path, ".."), { recursive: true });
        writeFileSync(join(root, path), content);
    }
    if (tracked.length > 0)
    {
        execFileSync("git", ["init", "-q"], { cwd: root });
        execFileSync("git", ["add", "--", ...tracked], { cwd: root });
    }

    return root;
}

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

    it("resolves every reference of the base package with --references", () =>
    {
        const diagnostics = validatePackages([resolve(ROOT, "packages", "content", "srd51")], { references: true });

        expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    });

    it("reports an unresolved reference with --references", () =>
    {
        const manifest = PRIVATE_MANIFEST
            .replace("redistributable: false", "redistributable: true")
            .replace("id: leak", "id: dangling");
        const ghost = [
            "id: dangling.feat.ghost",
            "name: { en: Ghost }",
            "source: dangling",
            "text: { en: x }",
            "prerequisites: { species: srd51.species.nobody }",
            ""

        ].join("\n");
        const root = temporaryRepository({
            "packages/content/dangling/package.yaml": manifest,
            "packages/content/dangling/feats/ghost.yaml": ghost
        });

        const dir = join(root, "packages/content/dangling");
        const diagnostics = validatePackages([dir], { repoRoot: ROOT, references: true });
        const errors = diagnostics.filter((d) => d.severity === "error");

        expect(errors.map((d) => d.code)).toEqual(["E_REFERENCE"]);
        expect(errors[0]?.message).toContain("srd51.species.nobody");
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

describe("private-root guards (docs/phase-0/06-private-packages.md)", () =>
{
    it("discovers the public root of this repository", () =>
    {
        const found = discoverPackages(ROOT);
        const base = found.find((p) => p.id === "srd51");

        expect(base?.root).toBe("packages/content");
        expect(base?.visibility).toBe("public");
        expect(base?.relative).toBe("packages/content/srd51");
    });

    it("ignores a private root without packages and a missing one", () =>
    {
        const withSources = temporaryRepository({ "content-private/sources/notes.txt": "x\n" });
        const without = temporaryRepository({});

        expect(discoverPackages(withSources)).toEqual([]);
        expect(discoverPackages(without)).toEqual([]);
    });

    it("tells private-root directories apart", () =>
    {
        expect(isUnderPrivateRoot(ROOT, join(ROOT, "content-private/phb14"))).toBe(true);
        expect(isUnderPrivateRoot(ROOT, join(ROOT, "content-private"))).toBe(false);
        expect(isUnderPrivateRoot(ROOT, join(ROOT, "packages/content/srd51"))).toBe(false);
        expect(isUnderPrivateRoot(ROOT, join(ROOT, "content-private-not/x"))).toBe(false);
    });

    it("flags a non-redistributable package outside content-private/", () =>
    {
        const root = temporaryRepository({
            "packages/content/leak/package.yaml": PRIVATE_MANIFEST,
            "content-private/leak/package.yaml": PRIVATE_MANIFEST
        });

        const outside = validatePackages([join(root, "packages/content/leak")], { repoRoot: root }).map((d) => d.code);
        const inside = validatePackages([join(root, "content-private/leak")], { repoRoot: root }).map((d) => d.code);

        expect(outside).toContain("E_PRIVATE_OUTSIDE_ROOT");
        expect(inside).toEqual([]);
    });

    it("flags tracked files under content-private/ except its README", () =>
    {
        const root = temporaryRepository(
            {
                "content-private/README.md": "# private\n",
                "content-private/leak/package.yaml": PRIVATE_MANIFEST
            },
            ["content-private/README.md", "content-private/leak/package.yaml"]
        );

        expect(trackedPrivateFiles(root)).toEqual(["content-private/leak/package.yaml"]);
        expect(validatePackages([], { repoRoot: root }).map((d) => `${d.code} ${d.file}`))
            .toEqual(["E_PRIVATE_TRACKED content-private/leak/package.yaml"]);
    });

    it("is quiet when only the README is tracked, and outside a git repository", () =>
    {
        const readme = "content-private/README.md";
        const tracked = temporaryRepository({ [readme]: "# private\n" }, [readme]);
        const plain = temporaryRepository({});

        expect(trackedPrivateFiles(tracked)).toEqual([]);
        expect(validatePackages([], { repoRoot: tracked })).toEqual([]);
        expect(trackedPrivateFiles(plain)).toEqual([]);
    });
});
