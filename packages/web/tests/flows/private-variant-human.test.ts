/**
 * The variant human of the Player's Handbook in the creation wizard (reported by the owner, 2026-09-24): its
 * choices of two ability scores and of a feat list no options, which the format allows; step 6 must offer the
 * six abilities and the loaded feats, never an empty list. Removing the book under it clears what it gave
 * (docs/phase-1/10-wizard-integrity.md, point 10). Private: skipped without the book.
 */

import "fake-indexeddb/auto";

import { existsSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { usePackageLoader } from "@/composables/packages";
import { useChoiceOptions } from "@/composables/choice-options";

import { clearBrowserStorage, PRIVATE, serveSite, zipOf } from "../helpers";

const BOOK = join(PRIVATE, "phb14");
const available = existsSync(join(BOOK, "package.yaml"));

serveSite();
afterEach(async () =>
{
    await useWizardStore().discard();
    await clearBrowserStorage();
});

describe("the variant human in the creation wizard", () =>
{
    it.skipIf(!available)("offers the abilities and the feats its choices leave unlisted", async () =>
    {
        const phb14 = await usePackageLoader().load(zipOf(BOOK, "phb14"));
        const wizard = useWizardStore();
        await wizard.start();
        await wizard.choosePackages([{ id: "phb14", version: phb14.record.source.manifest.version }]);
        wizard.chooseSpecies("phb14.species.human-variant");
        wizard.chooseClass("srd51.class.fighter");

        const sheet = useEngine().sheet(wizard.character!, wizard.sources, { language: "en" }).sheet;
        const { t } = useNuxtApp().$i18n;
        const naming = useChoiceOptions(wizard.packageSet!, sheet, "en", (key, params) => t(key, params ?? {}));
        const choice = (key: string) => sheet.choices.find((c) => c.key === key)!;

        const abilities = naming.options(choice("phb14.feature.human-variant.ability-score-increase#ability-scores"));
        const feats = naming.options(choice("phb14.feature.human-variant.feat#feat"));

        expect(abilities).toHaveLength(6);
        expect(feats.length).toBeGreaterThan(1);
        expect(feats.map((f) => f.name)).toContain("Grappler");

    }, 60_000);

    it.skipIf(!available)("clears what the book gave when the book is removed under it (owner, 2026-09-25)", async () =>
    {
        const phb14 = await usePackageLoader().load(zipOf(BOOK, "phb14"));
        const wizard = useWizardStore();
        await wizard.start();
        await wizard.choosePackages([{ id: "phb14", version: phb14.record.source.manifest.version }]);
        wizard.chooseSpecies("phb14.species.human-variant");
        wizard.chooseClass("srd51.class.fighter");
        wizard.answer("phb14.feature.human-variant.feat#feat", ["phb14.feat.grappler"]);
        wizard.answer("phb14.feature.human-variant.ability-score-increase#ability-scores", ["str", "con"]);
        wizard.answer("srd51.class.fighter#skills", ["athletics", "perception"]);

        const uses = wizard.usesOf(["phb14"]);
        expect(uses.map((u) => `${u.kind} ${u.id}`)).toEqual([
            "species phb14.species.human-variant",
            "answer phb14.feature.human-variant.feat#feat",
            "answer phb14.feature.human-variant.ability-score-increase#ability-scores"
        ]);

        await wizard.dropPackages([], uses);
        expect(wizard.character!.choices.species).toBeUndefined();
        expect(wizard.character!.choices.answers)
            .toEqual({ "srd51.class.fighter#skills": ["athletics", "perception"] });
        expect(stepDone("species")).toBe(false);

    }, 60_000);
});
