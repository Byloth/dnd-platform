/** Referential integrity on top of loading diagnostics. */

import { describe, expect, it } from "vitest";

import { loadPackages, validate } from "../src/index.js";
import { MINI, cls, feature, item, miniPackage, spell } from "./helpers.js";

const FIGHTER = `${MINI}.class.fighter`;

function errorsOf(effects: unknown[], extra = []): string[]
{
    const x = feature(`${MINI}.feature.fighter.x`, effects);
    const set = loadPackages([miniPackage({ entities: [cls(FIGHTER, { 1: { features: [x] } }), ...extra] })]);

    return validate(set).entries.filter((d) => d.severity === "error").map((d) => `${d.code}:${d.message}`);
}

describe("validate", () =>
{
    it("reports a dangling spell id", () =>
    {
        const errors = errorsOf([{ kind: "grant-spells", spells: [`${MINI}.spell.nope`], as: "known" }]);

        // Reported once per owner: the class that embeds the feature and the feature indexed on its own.
        expect(errors).toHaveLength(2);
        expect(errors.every((e) => e.includes(`E_MISSING_REFERENCE:"${MINI}.spell.nope"`))).toBe(true);
    });

    it("accepts a spell id that is loaded", () =>
    {
        const grant = { kind: "grant-spells", spells: [`${MINI}.spell.aid`], as: "known" };

        expect(errorsOf([grant], [spell(`${MINI}.spell.aid`, 2)] as never)).toEqual([]);
    });

    it("reports an unknown global table inside a formula", () =>
    {
        const formula = `10 + table(${MINI}.table.nope)`;
        const errors = errorsOf([{ kind: "modify", target: "ac", op: "set-formula", formula: formula }]);

        expect(errors).toHaveLength(2);
        expect(errors.every((e) => e.startsWith("E_MISSING_REFERENCE") && e.includes(`${MINI}.table.nope`))).toBe(true);
    });

    it("does not read modify targets or the ruleset's own table as references", () =>
    {
        expect(errorsOf([
            { kind: "modify", target: "attack.spell.bonus", op: "add", value: 1 },
            { kind: "modify", target: "ac", op: "set-formula", formula: `table(${MINI}.table.proficiency-bonus)` }
        ])).toEqual([]);
    });

    it("reports an item a pack holds that no package defines", () =>
    {
        const pack = item(`${MINI}.item.pack`, {
            type: "gear",
            contents: [{ item: `${MINI}.item.torch`, quantity: 10 }, { item: `${MINI}.item.nope` }]
        });
        const torch = item(`${MINI}.item.torch`, { type: "gear" });
        const set = loadPackages([miniPackage({ entities: [pack, torch] })]);
        const errors = validate(set).entries.filter((d) => d.severity === "error").map((d) => `${d.code}:${d.message}`);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain(`E_MISSING_REFERENCE:"${MINI}.item.nope"`);
    });

    it("keeps the loading diagnostics and reports a patch target as a reference too", () =>
    {
        const patch = { id: "e.patch.x", target: `${MINI}.class.nope`, set: {} };
        const ext = miniPackage({
            id: "e",
            kind: "extension",
            dependencies: [{ id: MINI, version: "^0.1.0" }],
            entities: [{ type: "patch", id: "e.patch.x", data: patch }]
        });
        const set = loadPackages([miniPackage(), ext]);
        const codes = validate(set).entries.map((d) => d.code);

        expect(codes).toContain("E_PATCH_TARGET");
        expect(validate(set).ok).toBe(false);
    });
});
