/**
 * DEC-20 guard (docs/phase-0/06-private-packages.md, task 10): every official package
 * present on this machine loads next to the base with an empty selection and an empty
 * cascade, and every reference resolves. Without private packages this degenerates to
 * the base package alone; it strengthens automatically when content-private/ has one.
 */

import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadPackages, validate } from "@byloth/dnd-platform-loader";

import { discoverPackages } from "../src/io/repository.js";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

describe("content selection over every package present", () =>
{
    const found = discoverPackages(ROOT);

    it("loads with an empty selection, no cascade, every entity active and every reference resolved", () =>
    {
        const sources = found.map((p) => readPackageSource(p.directory));
        const set = loadPackages(sources, { selection: { exclude: [] } });
        const errors = validate(set).entries
            .filter((d) => d.severity === "error")
            .map((d) => `${d.entity ?? d.package}${d.path ?? ""}: ${d.code} ${d.message}`);

        expect(found.map((p) => p.id)).toContain("srd51");
        expect(set.cascade.empty).toBe(true);
        expect(set.cascade.inactive).toEqual([]);
        expect(set.cascade.pruned).toEqual([]);
        expect([...set.entities.values()].every((e) => e.active)).toBe(true);
        expect(errors).toEqual([]);
    });
});
