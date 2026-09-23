/**
 * The ways into a package agree: a directory, a zip of it (at the root or under a folder) and its bundle
 * read into the same files, the same source and the same diagnostics; the pausing variants give the
 * same results as the direct ones.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { createAjv } from "@byloth/dnd-platform-schema/validate";

import {
    bundleText,
    checkPackage,
    checkPackageAsync,
    filesOfSource,
    parseBundle,
    readPackageZip,
    readPackageZipAsync,
    toPackageSource
} from "../src/index.js";
import { readPackageDirectory } from "../src/node.js";

const FIXTURES = resolve(import.meta.dirname, "..", "..", "..", "fixtures", "packages");
const ajv = createAjv();

function* walk(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir))
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* walk(path); }
        else { yield path; }
    }
}

function zip(dir: string, folder?: string): Uint8Array
{
    const entries: Record<string, Uint8Array> = {};
    for (const path of walk(dir))
    {
        const name = relative(dir, path).replaceAll("\\", "/");
        entries[folder ? `${folder}/${name}` : name] = new Uint8Array(readFileSync(path));
    }

    return zipSync(entries);
}

const PACKAGES = ["srd51-excerpt", "homebrew-feline", "phb14-stub", "invalid/unknown-kind", "invalid/id-mismatch"];

describe("package files", () =>
{
    for (const name of PACKAGES)
    {
        const dir = join(FIXTURES, name);

        it(`reads ${name} the same from its directory and from a zip`, () =>
        {
            const fromDirectory = readPackageDirectory(dir);

            expect(readPackageZip(zip(dir))).toEqual(fromDirectory);
            expect(readPackageZip(zip(dir, "folder"))).toEqual(fromDirectory);
        });

        it(`reports the same diagnostics for ${name} directly and pausing`, async () =>
        {
            const files = readPackageDirectory(dir);
            let pauses = 0;
            const pause = async (): Promise<void> => { pauses += 1; };

            expect(await readPackageZipAsync(zip(dir), { pause: pause, every: 1 })).toEqual(files);
            expect(await checkPackageAsync(files, name, ajv, { pause: pause, every: 1 }))
                .toEqual(checkPackage(files, name, ajv));
            expect(pauses).toBeGreaterThanOrEqual(2 * files.files.length);
        });
    }

    for (const name of ["srd51-excerpt", "homebrew-feline", "phb14-stub"])
    {
        it(`checks the bundle of ${name} like its directory`, () =>
        {
            const files = readPackageDirectory(join(FIXTURES, name));
            const source = toPackageSource(files, name);
            const bundle = parseBundle(bundleText(source), `${name}.json`);

            expect(checkPackage(filesOfSource(bundle), name, ajv)).toEqual(checkPackage(files, name, ajv));
            expect(bundleText(toPackageSource(filesOfSource(bundle), name))).toBe(bundleText(source));
        });
    }

    it("refuses text that is not a bundle", () =>
    {
        expect(() => parseBundle("{", "broken.json")).toThrow(/not a JSON bundle/);
        expect(() => parseBundle("[]", "list.json")).toThrow(/not a bundle/);
        expect(() => parseBundle("{\"manifest\":{}}", "empty.json")).toThrow(/no entities/);
    });
});
