import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadPackages, validate } from "@byloth/dnd-platform-loader";

import { readPackageSource } from "@byloth/dnd-platform-loader/node";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

describe("the real base package", () =>
{
    it("loads into the engine with every reference resolved", () =>
    {
        const set = loadPackages([readPackageSource(resolve(ROOT, "packages/content/srd51"))]);
        const diagnostics = validate(set);
        const errors = diagnostics.entries
            .filter((d) => d.severity === "error")
            .map((d) => `${d.entity ?? d.package}${d.path ?? ""}: ${d.code} ${d.message}`);

        expect(errors).toEqual([]);
        expect(set.entities.size).toBeGreaterThan(1000);
    });
});
