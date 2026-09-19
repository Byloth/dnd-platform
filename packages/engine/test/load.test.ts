/** Package loading: order, patches, translations, indexing, diagnostics. */

import { describe, expect, it } from "vitest";

import { loadPackages } from "../src/index.js";
import type { PackageSource } from "../src/index.js";
import { MINI, cls, feature, makeManifest, miniPackage } from "./helpers.js";

const FIGHTER = `${MINI}.class.fighter`;

function extension(id: string, deps: string[], entities: PackageSource["entities"] = []): PackageSource
{
    const manifest = makeManifest(id, "extension", deps.map((d) => ({ id: d, version: "^0.1.0" })));

    return { manifest: manifest, entities: entities };
}

const codes = (set: ReturnType<typeof loadPackages>): string[] => set.diagnostics.entries.map((d) => d.code);

describe("loadPackages", () =>
{
    it("orders packages topologically with ties broken by id, whatever the input order", () =>
    {
        const base = miniPackage();
        const b = extension("bbb", [MINI]);
        const a = extension("aaa", [MINI]);
        const c = extension("ccc", ["bbb"]);

        expect(loadPackages([c, b, a, base]).order.map((m) => m.id)).toEqual([MINI, "aaa", "bbb", "ccc"]);
        expect(loadPackages([base, a, b, c]).order.map((m) => m.id)).toEqual([MINI, "aaa", "bbb", "ccc"]);
    });

    it("reports a dependency cycle and still returns every package", () =>
    {
        const set = loadPackages([miniPackage(), extension("x", [MINI, "y"]), extension("y", ["x"])]);

        expect(codes(set)).toContain("E_DEPENDENCY_CYCLE");
        expect(set.order.map((m) => m.id).sort()).toEqual([MINI, "x", "y"]);
        expect(set.diagnostics.ok).toBe(false);
    });

    it("reports a package loaded twice and a missing base", () =>
    {
        expect(codes(loadPackages([miniPackage(), miniPackage()]))).toContain("E_DUPLICATE_PACKAGE");
        expect(codes(loadPackages([extension("only", [])]))).toContain("E_NO_BASE");
    });

    it("applies patch set and append in order and records patchedBy", () =>
    {
        const a = feature(`${MINI}.feature.fighter.a`, []);
        const base = miniPackage({ entities: [cls(FIGHTER, { 1: { features: [a] } })] });
        const patch = (id: string, data: Record<string, unknown>): PackageSource["entities"][number] =>
            ({ type: "patch", id: id, data: { id: id, target: FIGHTER, ...data } });
        const first = extension("p1", [MINI], [patch("p1.patch.name", { set: { "name.en": "Champion" } })]);
        const b = feature("p2.feature.fighter.b", []);
        const second = extension("p2", ["p1"], [patch("p2.patch.features", { append: { "levels.1.features": [b] } })]);
        const set = loadPackages([second, first, base]);
        const fighter = set.entities.get(FIGHTER)!;
        const data = fighter.data as { name: { en: string }, levels: { 1: { features: { id: string }[] } } };

        expect(fighter.patchedBy).toEqual(["p1.patch.name", "p2.patch.features"]);
        expect(data.name.en).toBe("Champion");
        expect(data.levels[1].features.map((f) => f.id)).toEqual([`${MINI}.feature.fighter.a`, "p2.feature.fighter.b"]);
        expect(codes(set)).not.toContain("E_PATCH_TARGET");
    });

    it("reports a patch on an unknown target", () =>
    {
        const data = { id: "p.patch.x", target: `${MINI}.class.nope`, set: { "name.en": "X" } };
        const bad = extension("p", [MINI], [{ type: "patch", id: "p.patch.x", data: data }]);

        expect(codes(loadPackages([miniPackage(), bad]))).toContain("E_PATCH_TARGET");
    });

    it("merges translations into localised fields and warns on unknown entities", () =>
    {
        const base = miniPackage({ entities: [cls(FIGHTER, { 1: { features: [] } })] });
        const it_ = extension("it", [MINI], [
            { type: "translation", id: FIGHTER, data: { language: "it", strings: { name: "Guerriero" } } },
            { type: "translation", id: `${MINI}.class.nope`, data: { language: "it", strings: { name: "Niente" } } }
        ]);
        const set = loadPackages([base, it_]);
        const name = (set.entities.get(FIGHTER)!.data as { name: Record<string, string> }).name;

        expect(name).toEqual({ en: "fighter", it: "Guerriero" });
        expect(codes(set)).toContain("W_MISSING_ENTITY");
        expect(set.diagnostics.ok).toBe(true);
    });

    it("indexes inline features and subspecies as entities of their own", () =>
    {
        const base = miniPackage({
            entities: [
                cls(FIGHTER, { 1: { features: [feature(`${MINI}.feature.fighter.inline`, [])] } }),
                {
                    type: "species",
                    data: {
                        id: `${MINI}.species.elf`,
                        name: { en: "Elf" },
                        features: [feature(`${MINI}.feature.elf.trance`, [])],
                        subspecies: [{
                            id: `${MINI}.species.elf.high-elf`,
                            name: { en: "High elf" },
                            features: [feature(`${MINI}.feature.high-elf.cantrip`, [])]
                        }]
                    }
                }
            ]
        });
        const set = loadPackages([base]);

        expect(set.entities.get(`${MINI}.feature.fighter.inline`)?.type).toBe("feature");
        expect(set.entities.get(`${MINI}.feature.elf.trance`)?.type).toBe("feature");
        expect(set.entities.get(`${MINI}.feature.high-elf.cantrip`)?.type).toBe("feature");
        expect(set.entities.get(`${MINI}.species.elf.high-elf`)?.type).toBe("species");
        const highElf = set.entities.get(`${MINI}.species.elf.high-elf`)?.data as { parent: string };

        expect(highElf.parent).toBe(`${MINI}.species.elf`);
    });

    it("reports duplicate ids, keeping the first definition", () =>
    {
        const base = miniPackage({ entities: [cls(FIGHTER, { 1: {} }, { hitDie: 10 })] });
        const data = { ...cls(FIGHTER, { 1: {} }, { hitDie: 6 }).data };
        const dup = extension("dup", [MINI], [{ type: "class", id: FIGHTER, data: data }]);
        const set = loadPackages([base, dup]);

        expect(codes(set)).toContain("E_DUPLICATE_ID");
        expect((set.entities.get(FIGHTER)?.data as { hitDie: number }).hitDie).toBe(10);
    });

    it("warns on a pin mismatch only for the pinned package", () =>
    {
        const pins = { ext: "0.2.0", [MINI]: "0.1.0" };
        const set = loadPackages([miniPackage(), extension("ext", [MINI])], { pins: pins });

        const mismatches = set.diagnostics.entries.filter((d) => d.code === "W_VERSION_MISMATCH");

        expect(mismatches.map((d) => d.package)).toEqual(["ext"]);
    });

    it("exposes the base ruleset and its package", () =>
    {
        const set = loadPackages([miniPackage()]);

        expect(set.rulesetPackage).toBe(MINI);
        expect(set.ruleset.id).toBe(`${MINI}.ruleset`);
    });
});
