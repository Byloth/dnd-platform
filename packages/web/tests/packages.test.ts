/**
 * Loading packages in the browser (docs/phase-1/02-content-and-character-stores.md): zips of the fixture
 * packages load and are stored, a bundle loads like its directory, and every invalid fixture is refused
 * with the codes `dnd validate` reports for it (the repository guards aside, which need a repository).
 * The SRD they depend on comes from the site (DEC-21), here endpoints serving the built bundle.
 */

import "fake-indexeddb/auto";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { zipSync } from "fflate";
import { parse } from "yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";

import { IndexedDatabase } from "@byloth/core";
import { bundleText } from "@byloth/dnd-platform-loader";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import { PackageRefusedException, usePackageLoader } from "@/composables/packages";
import type { PackageFile } from "@/composables/packages";
import { closeBrowserStorage, DATABASE_NAME, useBrowserStorage } from "@/composables/storage";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FIXTURES = resolve(ROOT, "fixtures", "packages");
const INVALID = resolve(FIXTURES, "invalid");

/** Codes that only a repository can raise: `dnd validate` reports them, the browser cannot. */
const REPOSITORY_CODES = new Set(["E_PRIVATE_OUTSIDE_ROOT", "E_PRIVATE_TRACKED"]);

function* files(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir))
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* files(path); }
        else { yield path; }
    }
}

/** A zip of a package directory, under a top-level folder as "compress this folder" makes it, or at the root. */
function zipOf(dir: string, folder?: string): PackageFile
{
    const entries: Record<string, Uint8Array> = {};
    for (const path of files(dir))
    {
        const name = relative(dir, path).replaceAll("\\", "/");
        entries[folder ? `${folder}/${name}` : name] = new Uint8Array(readFileSync(path));
    }
    const bytes = zipSync(entries);

    return { name: `${folder ?? "package"}.zip`, arrayBuffer: async () => bytes.slice().buffer };
}

function bundleOf(source: PackageSource, name: string): PackageFile
{
    const bytes = new TextEncoder().encode(bundleText(source));

    return { name: name, arrayBuffer: async () => bytes.slice().buffer };
}

const SRD = JSON.parse(readFileSync(resolve(ROOT, "build", "content", "srd51.json"), "utf8")) as PackageSource;

/** Whether the site publishes the SRD; the endpoints below read it at each request. */
let published = true;

registerEndpoint("/dnd-platform/content/index.json", () =>
{
    const { version } = SRD.manifest;

    return { packages: published ? { srd51: { latest: version, versions: [version] } } : {} };
});
registerEndpoint("/dnd-platform/content/srd51.json", () => SRD);

beforeEach(() =>
{
    published = true;
});
afterEach(async () =>
{
    await closeBrowserStorage();
    await IndexedDatabase.Delete(DATABASE_NAME);
});

describe("usePackageLoader", () =>
{
    it("loads and stores the zip of a package folder", async () =>
    {
        const { load } = usePackageLoader();
        const { record } = await load(zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline"));

        expect(record.origin).toBe("file");
        expect(record.fileName).toBe("homebrew-feline.zip");
        expect(record.source).toEqual(JSON.parse(bundleText(readPackageSource(join(FIXTURES, "homebrew-feline")))));

        const { id, version } = record.source.manifest;
        const stored = await useBrowserStorage().packages.get(id, version);
        expect(stored?.source.entities.length).toBe(record.source.entities.length);
    });

    it("loads a zip with the package at its root, and keeps the private package's flags", async () =>
    {
        const { load } = usePackageLoader();
        const { record } = await load(zipOf(join(FIXTURES, "phb14-stub")));

        expect(record.source.manifest.id).toBe("phb14");
        expect(record.source.manifest.visibility).toBe("private");
    });

    it("loads a bundle like the directory it was built from", async () =>
    {
        const source = readPackageSource(join(FIXTURES, "homebrew-feline"));
        const { record } = await usePackageLoader().load(bundleOf(source, "homebrew.byloth.json"));

        expect(bundleText(record.source)).toBe(bundleText(source));
    });

    it("loads one file at a time when several arrive together", async () =>
    {
        const { load } = usePackageLoader();
        const [feline, stub] = await Promise.all([
            load(zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline")),
            load(zipOf(join(FIXTURES, "phb14-stub"), "phb14-stub"))
        ]);

        const ids = [feline.record.source.manifest.id, stub.record.source.manifest.id];
        expect(ids).toEqual(["homebrew.byloth", "phb14"]);
        expect((await useBrowserStorage().packages.list()).length).toBe(2);
    });

    it("refuses a package whose dependency is neither on the site nor stored", async () =>
    {
        published = false;

        const refusal = await usePackageLoader().load(zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline"))
            .catch((error: unknown) => error);

        expect(refusal).toBeInstanceOf(PackageRefusedException);
        expect((refusal as PackageRefusedException).diagnostics.some((d) => d.code === "E_REFERENCE")).toBe(true);
        expect(await useBrowserStorage().packages.list()).toEqual([]);
    });

    for (const name of readdirSync(INVALID).filter((n) => statSync(join(INVALID, n)).isDirectory()))
    {
        it(`refuses the invalid fixture ${name} with the codes of dnd validate`, async () =>
        {
            const text = readFileSync(join(INVALID, name, "expected-diagnostics.yaml"), "utf8");
            const expected = (parse(text) as { diagnostics: { code: string, file: string }[] }).diagnostics
                .filter((d) => !REPOSITORY_CODES.has(d.code))
                .map((d) => `${d.code} ${d.file}`);

            const refusal = await usePackageLoader().load(zipOf(join(INVALID, name), name))
                .catch((error: unknown) => error);

            expect(refusal).toBeInstanceOf(PackageRefusedException);
            const codes = (refusal as PackageRefusedException).diagnostics
                .filter((d) => d.severity === "error")
                .map((d) => `${d.code} ${d.file}`);
            expect([...new Set(codes)].sort()).toEqual([...new Set(expected)].sort());
        });
    }
});

