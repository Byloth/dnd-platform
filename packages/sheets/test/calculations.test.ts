/**
 * The sheet's formulas (calculations.ts), run as a PDF viewer runs them: the calculate actions read from the PDF,
 * in the document's calculation order, against a stand-in of the viewer's `getField` and `event`.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { PDFArray, PDFCheckBox, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString, PDFTextField } from "pdf-lib";
import type { PDFRef } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { compose } from "@byloth/dnd-platform-composer";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";
import { loadPackages } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import { parseShown } from "../src/calculations.js";
import { renderSheet } from "../src/index.js";
import type { SheetFonts, SheetInput } from "../src/index.js";

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const font = (file: string): Uint8Array => readFileSync(require.resolve(`@fontsource/${file}`));
const FONTS: SheetFonts = {
    display: font("cinzel/files/cinzel-latin-700-normal.woff"),
    text: font("atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff"),
    textBold: font("atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff"),
    textItalic: font("atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-italic.woff"),
    hand: font("patrick-hand/files/patrick-hand-latin-400-normal.woff")
};

function fixture(name: string): SheetInput
{
    const dir = join(ROOT, "fixtures", "characters", name);
    const file = parse(readFileSync(join(dir, "packages.yaml"), "utf8")) as { packages: readonly string[] };
    const character = parse(readFileSync(join(dir, "character.yaml"), "utf8")) as Character;
    const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
    const packages = loadPackages(file.packages.map((p) => readPackageSource(resolve(ROOT, p))), { pins: pins });

    const tree = compose(derive(character, packages), { character: character, packages: packages });

    return { language: "en", tree: tree, character: character };
}

/** A PDF form as a viewer holds it: every field's value, and the formulas in their calculation order. */
class Viewer
{
    public readonly values = new Map<string, string>();
    private readonly _formulas: { name: string, script: string }[] = [];

    public static async open(bytes: Uint8Array): Promise<Viewer>
    {
        const viewer = new Viewer();
        const doc = await PDFDocument.load(bytes);
        const form = doc.getForm();
        const names = new Map<PDFRef, string>();
        for (const field of form.getFields())
        {
            names.set(field.ref, field.getName());
            if (field instanceof PDFTextField) { viewer.values.set(field.getName(), field.getText() ?? ""); }
            else if (field instanceof PDFCheckBox)
            {
                viewer.values.set(field.getName(), field.isChecked() ? "Yes" : "Off");
            }
        }
        const order = form.acroForm.dict.lookup(PDFName.of("CO"), PDFArray);
        for (const ref of order.asArray() as PDFRef[])
        {
            const action = doc.context.lookup(ref, PDFDict).lookup(PDFName.of("AA"), PDFDict)
                .lookup(PDFName.of("C"), PDFDict);
            const js = action.lookup(PDFName.of("JS"));
            const script = js instanceof PDFHexString || js instanceof PDFString ? js.decodeText() : "";
            viewer._formulas.push({ name: names.get(ref)!, script: script });
        }

        return viewer;
    }

    public get formulas(): readonly string[] { return this._formulas.map((f) => f.name); }

    /** Sets a field, then runs every formula in order, as a viewer does after a change. */
    public set(name: string, value: string): this
    {
        this.values.set(name, value);
        for (const { name: field, script } of this._formulas)
        {
            const event = { value: this.values.get(field) ?? "" };
            runInNewContext(script, {
                event: event,
                getField: (n: string) => (this.values.has(n) ? { value: this.values.get(n) } : null)
            });
            this.values.set(field, String(event.value));
        }

        return this;
    }

    public get(name: string): string | undefined { return this.values.get(name); }
}

describe("the sheet's formulas", { timeout: 60_000 }, () =>
{
    it.each(["monk-l3-base", "multiclass-caster", "cleric-l5"])("give back the site's own numbers (%s)", async (name) =>
    {
        const viewer = await Viewer.open((await renderSheet(fixture(name), { fonts: FONTS })).bytes);
        const before = new Map(viewer.values);
        viewer.set("proficiency-bonus", before.get("proficiency-bonus")!);
        for (const field of viewer.formulas) { expect(viewer.get(field), field).toBe(before.get(field)); }
        expect(viewer.formulas).toContain("skill-stealth-bonus");
        expect(viewer.formulas.indexOf("ability-dex-modifier")).toBeLessThan(viewer.formulas.indexOf("save-dex-bonus"));
    });

    it("follow a score, the proficiency bonus and the proficiency boxes", async () =>
    {
        const viewer = await Viewer.open((await renderSheet(fixture("monk-l3-base"), { fonts: FONTS })).bytes);
        // Dexterity 17 → +3, Stealth proficient +5, save proficient +5.
        viewer.set("ability-dex-score", "20");
        expect(viewer.get("ability-dex-modifier")).toBe("+5");
        expect(viewer.get("skill-stealth-bonus")).toBe("+7");
        expect(viewer.get("save-dex-bonus")).toBe("+7");
        expect(viewer.get("initiative")).toBe("+5");
        viewer.set("proficiency-bonus", "+3");
        expect(viewer.get("skill-stealth-bonus")).toBe("+8");
        viewer.set("skill-stealth-proficient", "Off");
        expect(viewer.get("skill-stealth-bonus")).toBe("+5");
    });

    it("fill the blank sheet as it is filled, and leave empty what they cannot know", async () =>
    {
        const viewer = await Viewer.open((await renderSheet({ language: "en" }, { fonts: FONTS })).bytes);
        expect(viewer.get("ability-dex-modifier")).toBe("");
        viewer.set("ability-dex-score", "14");
        expect(viewer.get("ability-dex-modifier")).toBe("+2");
        expect(viewer.get("skill-stealth-bonus")).toBe("+2");
        viewer.set("proficiency-bonus", "+2").set("skill-stealth-proficient", "Yes");
        expect(viewer.get("skill-stealth-bonus")).toBe("+4");
        expect(viewer.get("passive-perception")).toBe("");
        viewer.set("ability-wis-score", "8");
        expect(viewer.get("ability-wis-modifier")).toBe("−1");
        expect(viewer.get("passive-perception")).toBe("9");
    });

    it("read a minus typed as a hyphen as the sheet's own minus", () =>
    {
        expect(parseShown("-1")).toBe(-1);
        expect(parseShown("\u22121")).toBe(-1);
        expect(parseShown("+3")).toBe(3);
        expect(parseShown("")).toBeUndefined();
    });
});
