import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_FIXTURE_DIRS, runFixtures } from "../src/commands/fixtures.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

/** Every fixture under the default roots; the private root is absent in CI. */
const fixtures = DEFAULT_FIXTURE_DIRS.flatMap((dir) =>
{
    const absolute = resolve(ROOT, dir);
    if (!existsSync(absolute)) { return []; }

    return readdirSync(absolute)
        .filter((name) => existsSync(join(absolute, name, "character.yaml")))
        .sort()
        .map((name) => ({ dir: dir, name: name }));
});

describe("golden character fixtures", () =>
{
    it("finds fixtures", () =>
    {
        expect(fixtures.length).toBeGreaterThan(0);
    });

    for (const { dir, name } of fixtures)
    {
        it(`${dir}/${name}`, (ctx) =>
        {
            const [report] = runFixtures({ root: ROOT, dirs: [dir], filter: name });

            expect(report).toBeDefined();
            if (report!.status === "skip")
            {
                ctx.skip(`${name}: ${report!.details[0]}`);

                return;
            }

            expect(report!.details).toEqual([]);
            expect(report!.status).toBe("pass");
        });
    }
});
