/**
 * `dnd release` (DEC-21): a released version is written once and never rewritten; changed content
 * needs a new version with a changelog section; only public, redistributable packages are released.
 */

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import { bundleText } from "../src/commands/build.js";
import { RELEASES_DIR, releasePackages } from "../src/commands/release.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const FELINE = resolve(ROOT, "fixtures", "packages", "homebrew-feline");
const temporary: string[] = [];

afterAll(() =>
{
    for (const dir of temporary) { rmSync(dir, { recursive: true, force: true }); }
});

/** A copy of homebrew-feline with a changelog section for its version, and an empty releases directory. */
function workspace(): { pkg: string, releases: string }
{
    const dir = mkdtempSync(join(tmpdir(), "dnd-release-"));
    temporary.push(dir);
    const pkg = join(dir, "homebrew-feline");
    cpSync(FELINE, pkg, { recursive: true });
    writeFileSync(join(pkg, "CHANGELOG.md"), "# Changelog\n\n## 0.1.0 — 2026-09-23\n\nFirst release.\n");

    return { pkg: pkg, releases: join(dir, "releases") };
}

function setManifest(pkg: string, from: string, to: string): void
{
    const path = join(pkg, "package.yaml");
    writeFileSync(path, readFileSync(path, "utf8").replace(from, to));
}

function editContent(pkg: string): void
{
    const path = join(pkg, "package.yaml");
    writeFileSync(path, readFileSync(path, "utf8").replace(/^name: .*$/m, "name: { en: \"Feline, edited\" }"));
}

describe("dnd release", () =>
{
    it("writes the canonical bundle once, then leaves it alone", () =>
    {
        const { pkg, releases } = workspace();

        const first = releasePackages({ dirs: [pkg], releasesDir: releases });
        expect(first.ok).toBe(true);
        expect(first.releases.map((r) => r.status)).toEqual(["released"]);

        const path = join(releases, "homebrew.byloth@0.1.0.json");
        expect(readFileSync(path, "utf8")).toBe(bundleText(readPackageSource(pkg)));

        const again = releasePackages({ dirs: [pkg], releasesDir: releases });
        expect(again.releases.map((r) => r.status)).toEqual(["unchanged"]);
        expect(releasePackages({ dirs: [pkg], releasesDir: releases, check: true }).ok).toBe(true);
    });

    it("refuses changed content under a released version, and accepts it under a new one", () =>
    {
        const { pkg, releases } = workspace();
        releasePackages({ dirs: [pkg], releasesDir: releases });

        editContent(pkg);
        const changed = releasePackages({ dirs: [pkg], releasesDir: releases });
        expect(changed.errors.map((e) => e.code)).toEqual(["E_RELEASE_CHANGED"]);
        expect(releasePackages({ dirs: [pkg], releasesDir: releases, check: true }).errors.map((e) => e.code))
            .toEqual(["E_RELEASE_CHANGED"]);

        setManifest(pkg, "version: 0.1.0", "version: 0.1.1");
        const withoutChangelog = releasePackages({ dirs: [pkg], releasesDir: releases });
        expect(withoutChangelog.errors.map((e) => e.code)).toEqual(["E_CHANGELOG_MISSING"]);

        writeFileSync(join(pkg, "CHANGELOG.md"), "# Changelog\n\n## 0.1.1 — 2026-09-24\n\nRenamed.\n\n## 0.1.0\n");
        expect(releasePackages({ dirs: [pkg], releasesDir: releases, check: true }).errors.map((e) => e.code))
            .toEqual(["E_RELEASE_MISSING"]);

        const bumped = releasePackages({ dirs: [pkg], releasesDir: releases });
        expect(bumped.ok).toBe(true);
        expect(existsSync(join(releases, "homebrew.byloth@0.1.0.json"))).toBe(true);
        expect(existsSync(join(releases, "homebrew.byloth@0.1.1.json"))).toBe(true);
    });

    it("never releases a package that is not public and redistributable", () =>
    {
        const { pkg, releases } = workspace();
        setManifest(pkg, "visibility: public", "visibility: private");

        const report = releasePackages({ dirs: [pkg], releasesDir: releases });
        expect(report.errors.map((e) => e.code)).toEqual(["E_PRIVATE"]);
        expect(existsSync(releases)).toBe(false);
    });

    it("has released the current version of every public package of the repository", () =>
    {
        const report = releasePackages({ repoRoot: ROOT, check: true });

        const { version } = readPackageSource(resolve(ROOT, "packages", "content", "srd51")).manifest;

        expect(report.errors).toEqual([]);
        expect(report.releases.map((r) => `${r.id}@${r.version}`)).toContain(`srd51@${version}`);
        // Every earlier release stays published (DEC-21).
        for (const earlier of ["0.1.0", version])
        {
            expect(existsSync(resolve(ROOT, RELEASES_DIR, `srd51@${earlier}.json`)), earlier).toBe(true);
        }
    });
});
