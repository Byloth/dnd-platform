import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { derive } from "@byloth/dnd-platform-engine";
import { loadPackages } from "@byloth/dnd-platform-loader";
import type { PackageSource } from "@byloth/dnd-platform-loader";

import { compose, diffTrees } from "../src/index.js";
import { fixture, ROOT, readPackage } from "./helpers.js";

/** The SRD with one change: what a package update would bring. */
function patched(change: (source: PackageSource) => PackageSource): PackageSource
{
    return change(readPackage(resolve(ROOT, "packages/content/srd51")));
}
const withEntity = (id: string, edit: (data: Record<string, unknown>) => Record<string, unknown>) =>
    (source: PackageSource): PackageSource => ({
        ...source,
        entities: source.entities
            .map((e) => (e.id === id ? { ...e, data: edit(e.data as Record<string, unknown>) } : e))
    });

describe("diffTrees", () =>
{
    const { character } = fixture("cleric-l5");
    const treeWith = (source: PackageSource, language = "en") =>
    {
        const packages = loadPackages([source]);

        return compose(derive(character, packages), { character: character, packages: packages, language: language });
    };
    const before = treeWith(readPackage(resolve(ROOT, "packages/content/srd51")));

    it("finds nothing between two equal sheets", () =>
    {
        expect(diffTrees(before, before)).toEqual([]);
    });

    it("names a number that changed, with both values", () =>
    {
        const heavier = patched(withEntity("srd51.item.chain-mail", (d) =>
            ({ ...d, ac: { base: 17, addDex: false } })));
        const changes = diffTrees(before, treeWith(heavier));

        expect(changes).toContainEqual(expect.objectContaining({ label: "Armor Class", before: "18", after: "19" }));
    });

    it("lists a feature that is gone, in the sheet's language", () =>
    {
        // Destroy Undead, the cleric's 5th-level feature, taken out of the class.
        const removed = patched(withEntity("srd51.class.cleric", (d) =>
        {
            const levels = { ...(d["levels"] as Record<string, Record<string, unknown>>) };
            levels["5"] = { ...levels["5"], features: [] };

            return { ...d, levels: levels };
        }));
        const changes = diffTrees(before, treeWith(removed));

        expect(changes).toContainEqual({ section: "Features & traits", label: "Destroy Undead", before: "" });
        expect(diffTrees(before, treeWith(removed, "it"), { language: "it" }).length).toBeGreaterThan(0);
    });
});
