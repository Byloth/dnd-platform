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

    it("translates inline features, patches before they apply, and the ruleset", () =>
    {
        const inline = `${MINI}.feature.fighter.second-wind`;
        const appended = "p.feature.fighter.action-surge";
        const base = miniPackage({ entities: [cls(FIGHTER, { 1: { features: [feature(inline, [])] } })] });
        const patch = {
            id: "p.patch.surge",
            target: FIGHTER,
            append: { "levels.1.features": [feature(appended, [])] }
        };
        const book = extension("p", [MINI], [{ type: "patch", id: "p.patch.surge", data: patch }]);
        const translation = (id: string, strings: Record<string, string>) =>
            ({ type: "translation" as const, id: id, data: { language: "it", strings: strings } });
        const it_ = extension("it", [MINI, "p"], [
            translation(FIGHTER, { "levels.1.features.0.name": "Recuperare Energie" }),
            translation("p.patch.surge", { "append.levels.1.features.0.name": "Azione Impetuosa" }),
            translation(`${MINI}.ruleset`, { "skills.1.name": "Furtività" })
        ]);
        const set = loadPackages([base, book, it_]);
        const name = (id: string): Record<string, string> =>
            (set.entities.get(id)!.data as { name: Record<string, string> }).name;
        const skill = set.ruleset.skills[1] as unknown as { name: Record<string, string> };

        expect(name(inline)).toEqual({ en: "second-wind", it: "Recuperare Energie" });
        expect(name(appended)).toEqual({ en: "action-surge", it: "Azione Impetuosa" });
        expect(skill.name).toEqual({ it: "Furtività" });
        expect(codes(set)).not.toContain("W_MISSING_ENTITY");
    });

    it("keeps a translation of the selected packages, never one of a package left out", () =>
    {
        const base = miniPackage({ entities: [cls(FIGHTER, { 1: { features: [] } })] });
        const book = extension("p", [MINI]);
        const translation = (id: string, deps: string[]): PackageSource => ({
            manifest: { ...makeManifest(id, "translation", deps.map((d) => ({ id: d, version: "^0.1.0" }))) },
            entities: []
        });
        const set = loadPackages([base, book, translation("mini-it", [MINI]), translation("p-it", ["p", "mini-it"])], {
            selection: { packages: [MINI] }
        });

        expect(set.order.map((m) => m.id)).toEqual([MINI, "mini-it"]);
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

describe("loadPackages: patches before indexing, overlapping patches", () =>
{
    const SPECIES = `${MINI}.species.elf`;

    interface Patch { id: string, target: string, set?: object, append?: object }
    function withPatch(patches: Patch[]): ReturnType<typeof loadPackages>
    {
        const data = { id: SPECIES, name: { en: "Elf" }, size: "medium", speed: { walk: 30 }, subspecies: [] };
        const elf = { type: "species" as const, data: data };
        const base = miniPackage({ entities: [elf] });
        const ext = miniPackage({
            id: "ext",
            kind: "extension",
            dependencies: [{ id: MINI, version: "^0.1.0" }],
            entities: patches.map((p) => ({ type: "patch" as const, id: p.id, data: p }))
        });

        return loadPackages([base, ext]);
    }

    it("indexes a subspecies and its inline feature appended by a patch", () =>
    {
        const fleet = feature(`${MINI}.feature.elf.wood.fleet`, []);
        const features = [{ ...fleet, source: "ext" }];
        const sub = { id: `${SPECIES}.wood`, name: { en: "Wood elf" }, source: "ext", features: features };
        const set = withPatch([{ id: "ext.patch.elf", target: SPECIES, append: { subspecies: [sub] } }]);

        expect(set.entities.get(`${SPECIES}.wood`)?.type).toBe("species");
        // the appended entry names the patching package as its source: it belongs to that package, not to the species'
        expect(set.entities.get(`${SPECIES}.wood`)?.package).toBe("ext");
        expect(set.entities.get(`${MINI}.feature.elf.wood.fleet`)?.package).toBe("ext");
        expect(set.entities.get(`${SPECIES}.wood`)?.inline).toEqual({ owner: SPECIES, path: "/subspecies/0" });
        const inline = set.entities.get(`${MINI}.feature.elf.wood.fleet`)?.inline;
        expect(inline).toEqual({ owner: `${SPECIES}.wood`, path: "/features/0" });
        expect(set.diagnostics.ok).toBe(true);
    });

    it("warns when two patches write the same path; the later one wins", () =>
    {
        const set = withPatch([
            { id: "ext.patch.a", target: SPECIES, set: { "speed.walk": 35 } },
            { id: "ext.patch.b", target: SPECIES, set: { "speed.walk": 40 } }
        ]);

        expect(codes(set)).toContain("W_PATCH_OVERLAP");
        expect((set.entities.get(SPECIES)!.data as { speed: { walk: number } }).speed.walk).toBe(40);
        expect(set.entities.get(SPECIES)!.patchedBy).toEqual(["ext.patch.a", "ext.patch.b"]);
    });
});
