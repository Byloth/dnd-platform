/**
 * Loading packages in the browser (docs/phase-1/02-content-and-character-stores.md): zips of the fixture
 * packages load and are stored, a bundle loads like its directory, and every invalid fixture is refused
 * with the codes `dnd validate` reports for it (the repository guards aside, which need a repository).
 * The SRD they depend on comes from the site (DEC-21), here endpoints serving the built bundle.
 */

import "fake-indexeddb/auto";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bundleText } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import { PackageRefusedException, usePackageLoader } from "@/composables/packages";
import { useBrowserStorage } from "@/composables/storage";

import { bundleOf, clearBrowserStorage, FIXTURES, serveSite, zipOf } from "./helpers";

const INVALID = resolve(FIXTURES, "invalid");

/** Codes that only a repository can raise: `dnd validate` reports them, the browser cannot. */
const REPOSITORY_CODES = new Set(["E_PRIVATE_OUTSIDE_ROOT", "E_PRIVATE_TRACKED"]);

const site = serveSite();

beforeEach(() =>
{
    site.publish(true);
});
afterEach(clearBrowserStorage);

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

    it("keeps one version per package: a newer one replaces the stored one", async () =>
    {
        const source = readPackageSource(join(FIXTURES, "homebrew-feline"));
        const newer = { ...source, manifest: { ...source.manifest, version: "0.2.0" } };
        const { load } = usePackageLoader();

        await load(bundleOf(source, "homebrew.byloth.json"));
        await load(bundleOf(newer, "homebrew.byloth-0.2.0.json"));

        const versions = (await useBrowserStorage().packages.list()).map((p) => p.source.manifest.version);
        expect(versions).toEqual(["0.2.0"]);
    });

    it("refuses a package whose dependency is neither on the site nor stored", async () =>
    {
        site.publish(false);

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

