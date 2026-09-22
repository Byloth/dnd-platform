/**
 * The unstyled sheet: SheetTree renders every section of a composed tree
 * with its heading, the core values and the warnings, in the Nuxt
 * environment (docs/phase-1/07-testing-accessibility-performance.md).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import type { Character, PackageSource } from "@byloth/dnd-platform-engine";

import SheetTree from "@/components/sheet/SheetTree.vue";
import { composeSheet } from "@/composables/sheet";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

function sample(): { character: Character, bundle: PackageSource }
{
    const characterPath = resolve(ROOT, "fixtures", "characters", "cleric-l5", "character.yaml");
    const character = parse(readFileSync(characterPath, "utf8")) as Character;
    const bundle = JSON.parse(readFileSync(resolve(ROOT, "build", "content", "srd51.json"), "utf8")) as PackageSource;

    return { character, bundle };
}

describe("SheetTree", () =>
{
    it("renders the composed sheet of the sample character", async () =>
    {
        const { character, bundle } = sample();
        const { load } = useContent();
        const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
        const { sheet, tree } = composeSheet(character, load([bundle], pins));
        const wrapper = await mountSuspended(SheetTree, { props: { tree } });

        const headings = wrapper.findAll("h2").map((h) => h.text());
        expect(headings).toContain("Core");
        expect(headings).toContain("Spells");
        expect(headings).toContain("Credits");
        expect(wrapper.find("h1").text()).toBe(sheet.meta.name);
        expect(wrapper.find('[aria-label="Armor Class, 18"]').exists()).toBe(true);
        expect(wrapper.find("#section-warnings").exists()).toBe(sheet.warnings.length > 0);
        expect(wrapper.findAll("section").length).toBe(tree.sections.filter((s) => s.blocks.length > 0).length);
    });
});
