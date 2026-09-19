import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { runFixtures } from "../src/commands/fixtures.js";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const DIR = resolve(ROOT, "fixtures", "characters");
const names = existsSync(DIR) ?
    readdirSync(DIR)
        .filter((name) => existsSync(join(DIR, name, "character.yaml")))
        .sort() :
    [];

describe("golden character fixtures", () =>
{
    it("finds fixtures", () =>
    {
        expect(names.length).toBeGreaterThan(0);
    });

    for (const name of names)
    {
        it(`fixtures/characters/${name}`, (ctx) =>
        {
            const [report] = runFixtures({ root: ROOT, filter: name });

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
