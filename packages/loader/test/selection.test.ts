/** Content selection (DEC-20): exclusions, hard closure, containment, soft pruning, cascade report. */

import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { stableStringify } from "@byloth/dnd-platform-schema";

import { loadPackages, validate } from "../src/index.js";
import type { PackageSource } from "../src/index.js";
import { MINI, makeManifest, readPackage } from "./helpers.js";
import {
    CANTRIP, ELF, ELF_FEAT, FIGHTER, FIXTURES, FLAME, HIGH_ELF, KEEN, LIST, LUCKY, SHIELD, SLAYER, SLEEP, SWORD,
    codes, inactiveIds, load, world
} from "./selection-world.js";

describe("content selection (DEC-20)", () =>
{
    it("returns an empty cascade and leaves everything active without exclusions", () =>
    {
        const plain = loadPackages([world()]);
        const empty = load({ exclude: [] });

        expect(plain.cascade.empty).toBe(true);
        expect(empty.cascade.empty).toBe(true);
        expect([...empty.entities.values()].every((e) => e.active)).toBe(true);
    });

    it("matches a filter with AND inside and OR across filters", () =>
    {
        const set = load({ exclude: [{ package: MINI, type: "spell" }, { ids: [SWORD] }] });

        expect(set.cascade.exclusions[0]!.matched).toEqual([SHIELD, SLEEP]);
        expect(set.cascade.exclusions[1]!.matched).toEqual([SWORD]);
        expect(load({ exclude: [{ package: "other", type: "spell" }] }).cascade.exclusions[0]!.matched).toEqual([]);
    });

    it("warns on a filter with no key and on a filter that matches nothing", () =>
    {
        const set = load({ exclude: [{}, { ids: [`${MINI}.spell.nope`] }] });

        expect(codes(set)).toContain("W_EMPTY_EXCLUSION");
        expect(codes(set)).toContain("W_UNKNOWN_EXCLUSION");
        expect(set.cascade.empty).toBe(true);
    });

    it("type: species also matches subspecies; excluding a species disables subspecies and inline features", () =>
    {
        const set = load({ exclude: [{ package: MINI, type: "species" }] });

        expect(set.cascade.exclusions[0]!.matched).toEqual([ELF, HIGH_ELF]);
        expect(inactiveIds(set)).toEqual([ELF_FEAT, CANTRIP, KEEN, ELF, HIGH_ELF]);
        const keen = set.cascade.inactive.find((e) => e.id === KEEN)!;
        expect(keen.via).toEqual({ requires: ELF, path: "/features/0", kind: "contains" });
        const feat = set.cascade.inactive.find((e) => e.id === ELF_FEAT)!;
        expect(feat.via).toEqual({ requires: ELF, path: "/prerequisites/species", kind: "hard" });
    });

    it("a feat whose prerequisite sits under any or not does not cascade", () =>
    {
        const set = load({ exclude: [{ ids: [ELF] }] });

        expect(inactiveIds(set)).not.toContain(LUCKY);
        expect(inactiveIds(set)).toContain(ELF_FEAT);
    });

    it("a subclass of an excluded class and an item whose base item is excluded become inactive", () =>
    {
        const set = load({ exclude: [{ ids: [FIGHTER, SWORD] }] });

        expect(inactiveIds(set)).toEqual([FIGHTER, FLAME, SWORD, SLAYER]);
        expect(set.cascade.inactive.find((e) => e.id === FLAME)!.via?.path).toBe("/baseItem");
        expect(set.cascade.inactive.find((e) => e.id === SLAYER)!.via?.path).toBe("/class");
    });

    it("excluding an inline feature splices it out of its owner, which stays active", () =>
    {
        const set = load({ exclude: [{ ids: [KEEN] }] });
        const elf = set.entities.get(ELF)!;

        expect(elf.active).toBe(true);
        expect((elf.data as { features: unknown[] }).features).toEqual([]);
        expect(set.cascade.pruned).toEqual([{ from: ELF, path: "/features/0", ref: KEEN }]);
        expect(set.entities.get(KEEN)!.active).toBe(false);
    });

    it("an excluded subspecies disappears from its parent's data", () =>
    {
        const set = load({ exclude: [{ ids: [HIGH_ELF] }] });
        const elf = set.entities.get(ELF)!;

        expect((elf.data as { subspecies: unknown[] }).subspecies).toEqual([]);
        expect(inactiveIds(set)).toEqual([CANTRIP, HIGH_ELF]);
    });

    it("an excluded spell is removed from the spell list and from grant-spells, which stay active (soft)", () =>
    {
        const set = load({ exclude: [{ ids: [SLEEP] }] });
        const list = set.entities.get(LIST)!;
        const cantrip = set.entities.get(CANTRIP)!;

        expect(list.active).toBe(true);
        expect((list.data as { spells: string[] }).spells).toEqual([SHIELD]);
        expect((cantrip.data as { effects: { spells: string[] }[] }).effects[0]!.spells).toEqual([SHIELD]);
        expect(set.cascade.pruned.map((p) => `${p.from}${p.path}`)).toEqual([
            `${CANTRIP}/effects/0/spells/0`,
            `${ELF}/subspecies/0/features/0/effects/0/spells/0`,
            `${HIGH_ELF}/features/0/effects/0/spells/0`,
            `${LIST}/spells/1`
        ]);
        expect(validate(set).entries.filter((d) => d.severity === "error")).toEqual([]);
    });

    it("a feature whose grant-spellcasting names an excluded list becomes inactive", () =>
    {
        const set = load({ exclude: [{ ids: [LIST] }] });

        expect(inactiveIds(set)).toEqual([`${MINI}.feature.wizard.spellcasting`, LIST]);
    });

    it("keeps excluded entities in the map with their data", () =>
    {
        const set = load({ exclude: [{ ids: [ELF] }] });
        const elf = set.entities.get(ELF)!;

        expect(elf.active).toBe(false);
        expect(elf.inactiveBecause).toEqual({ excludedBy: 0 });
        expect((elf.data as { features: unknown[] }).features).toHaveLength(1);
    });

    it("the cascade report does not depend on the order of the sources or of their entities", () =>
    {
        const reference = stableStringify(load({ exclude: [{ ids: [ELF, SLEEP] }] }).cascade);
        const base = world();
        for (let seed = 1; seed <= 8; seed += 1)
        {
            const shuffledEntities = [...base.entities].sort(() => ((seed * 7919) % 3) - 1);
            const set = load({ exclude: [{ ids: [ELF, SLEEP] }] }, [{ ...base, entities: shuffledEntities }]);

            expect(stableStringify(set.cascade)).toBe(reference);
        }
    });

    it("selection.order breaks ties before the id sort and never overrides dependencies", () =>
    {
        const ext = (id: string, deps: string[]): PackageSource => ({
            manifest: makeManifest(id, "extension", deps.map((d) => ({ id: d, version: "^0.1.0" }))),
            entities: []
        });
        const sources = [world(), ext("aaa", [MINI]), ext("bbb", [MINI]), ext("ccc", ["bbb"])];

        expect(load({ order: ["bbb", "aaa"] }, sources).order.map((m) => m.id)).toEqual([MINI, "bbb", "aaa", "ccc"]);
        expect(load({ order: ["ccc"] }, sources).order.map((m) => m.id)).toEqual([MINI, "aaa", "bbb", "ccc"]);
    });

    it("selection.packages drops unlisted sources but keeps required dependencies", () =>
    {
        const ext = (id: string, deps: string[]): PackageSource => ({
            manifest: makeManifest(id, "extension", deps.map((d) => ({ id: d, version: "^0.1.0" }))),
            entities: []
        });
        const set = load({ packages: ["ccc"] }, [world(), ext("aaa", [MINI]), ext("bbb", [MINI]), ext("ccc", ["bbb"])]);

        expect(set.order.map((m) => m.id)).toEqual([MINI, "bbb", "ccc"]);
        expect(codes(set).filter((c) => c === "I_EXCLUDED_PACKAGE")).toHaveLength(3);
        expect(set.diagnostics.ok).toBe(true);
    });
});

describe("content selection on the fixture packages", () =>
{
    const srd51 = readPackage(join(FIXTURES, "srd51-excerpt"));
    const stub = readPackage(join(FIXTURES, "phb14-stub"));
    const feline = readPackage(join(FIXTURES, "homebrew-feline"));

    it("excluding the species of the private package cascades to its subspecies, inline features and feat", () =>
    {
        const set = load({ exclude: [{ package: "phb14", type: "species" }] }, [srd51, stub, feline]);
        const kin = "phb14.species.placeholder-kin";

        expect(set.cascade.exclusions[0]!.matched).toEqual([kin, `${kin}.highland`]);
        expect(inactiveIds(set)).toEqual([
            "phb14.feat.kin-born",
            "phb14.feature.kin-born.second-wind-of-the-hills",
            "phb14.feature.placeholder-kin.ability-score-increase",
            "phb14.feature.placeholder-kin.highland.sure-footed",
            "phb14.feature.placeholder-kin.keen-nose",
            kin,
            `${kin}.highland`
        ]);
        const untouched = [
            "homebrew.byloth.species.feline",
            "homebrew.byloth.species.feline.puma",
            "srd51.class.monk",
            "phb14.subclass.monk.way-of-shadow"
        ];
        for (const id of untouched)
        {
            expect(set.entities.get(id)?.active).toBe(true);
        }
        expect(validate(set).entries.filter((d) => d.severity === "error")).toEqual([]);
    });

    it("excluding one spell prunes it from the wizard list and from Way of Shadow, both staying active", () =>
    {
        const set = load({ exclude: [{ ids: ["srd51.spell.darkness"] }] }, [srd51, stub, feline]);
        const list = set.entities.get("srd51.spell-list.wizard")!;
        const shadowArts = set.entities.get("phb14.feature.way-of-shadow.shadow-arts")!;

        expect(list.active).toBe(true);
        expect((list.data as { spells: string[] }).spells).not.toContain("srd51.spell.darkness");
        expect(shadowArts.active).toBe(true);
        expect(JSON.stringify(shadowArts.data)).not.toContain("srd51.spell.darkness");
        expect(set.cascade.pruned.some((p) => p.from === "srd51.spell-list.wizard")).toBe(true);
        expect(validate(set).entries.filter((d) => d.severity === "error")).toEqual([]);
    });
});
