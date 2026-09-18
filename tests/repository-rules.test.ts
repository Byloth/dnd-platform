import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");

function walk(dir: string, out: string[] = []): string[]
{
    for (const entry of readdirSync(dir))
    {
        if (entry === "node_modules" || entry === "dist" || entry === ".git") { continue; }

        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { walk(path, out); }
        else { out.push(path); }
    }

    return out;
}

describe("repository rules (docs/phase-0/01-monorepo.md)", () =>
{
    it("content packages contain no code", () =>
    {
        const files = walk(join(ROOT, "packages/content")).map((f) => relative(ROOT, f));
        const offenders = files.filter((f) => !/\.(ya?ml|md|json)$/.test(f) && !f.endsWith(".gitkeep"));

        expect(offenders).toEqual([]);
    });

    it("no non-redistributable package lives outside content-private/", () =>
    {
        const manifests = walk(ROOT)
            .filter((f) => f.endsWith("/package.yaml"))
            .map((f) => relative(ROOT, f))
            .filter((f) => !f.startsWith("content-private/"))
            .filter((f) => !f.startsWith("fixtures/packages/invalid/")); // deliberately broken packages

        const isPrivate = (f: string) => /^\s*redistributable:\s*false\s*$/m.test(readFileSync(join(ROOT, f), "utf8"));
        const offenders = manifests.filter(isPrivate);

        expect(offenders).toEqual([]);
    });

    it("nothing under content-private/ is tracked by git", () =>
    {
        const tracked = execFileSync("git", ["ls-files", "content-private"], { cwd: ROOT, encoding: "utf8" }).trim();

        expect(tracked).toBe("");
    });
});
