/**
 * The reference Monk in the browser (M1.2 done criterion, docs/phase-1/07-testing-accessibility-performance.md):
 * phb14 loaded from a zip like a user would, the SRD from the site, the homebrew from a zip; the sheet and the
 * section tree equal the CLI's snapshot and tree. Private: skipped without the book (CI, public checkouts).
 */

import "fake-indexeddb/auto";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parse } from "yaml";
import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import type { Character } from "@byloth/dnd-platform-engine";
import { stableStringify } from "@byloth/dnd-platform-schema";

import { usePackageLoader } from "@/composables/packages";
import EditPage from "@/pages/characters/[id]/edit.vue";

import { clearBrowserStorage, FIXTURES, PRIVATE, serveSite, zipOf } from "../helpers";

const BOOK = join(PRIVATE, "phb14");
const FIXTURE = join(PRIVATE, "fixtures", "reference-monk");
const available = existsSync(join(BOOK, "package.yaml")) && existsSync(join(FIXTURE, "snapshot.json"));

serveSite();
afterEach(clearBrowserStorage);

describe("the reference Monk in the browser", () =>
{
    it.skipIf(!available)("computes with phb14 loaded from a zip, equal to the CLI snapshot", async () =>
    {
        const { load } = usePackageLoader();
        const phb14 = await load(zipOf(BOOK, "phb14"));
        await load(zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline"));

        expect(phb14.record.source.manifest.redistributable).toBe(false);

        const character = parse(readFileSync(join(FIXTURE, "character.yaml"), "utf8")) as Character;
        const sources = await useContentStore().sources(character.packages.map((p) => p.id));
        const { sheet, tree } = useEngine().sheet(character, sources, { language: "en" });

        expect(`${stableStringify(sheet)}\n`).toBe(readFileSync(join(FIXTURE, "snapshot.json"), "utf8"));
        expect(stableStringify(tree)).toBe(readFileSync(join(FIXTURE, "section-tree.json"), "utf8"));

        const credits = JSON.stringify(tree.sections.find((s) => s.id === "credits"));
        expect(credits).toContain("phb14");

    }, 60_000);

    it.skipIf(!available)("offers Way of Shadow with the class when reopened at level 3, saved unchanged", async () =>
    {
        const { load } = usePackageLoader();
        await load(zipOf(BOOK, "phb14"));
        await load(zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline"));
        const character = parse(readFileSync(join(FIXTURE, "character.yaml"), "utf8")) as Character;
        await useBrowserStorage().characters.put(character);

        const wrapper = await mountSuspended(EditPage, { route: `/characters/${character.id}/edit?step=class` });
        for (let i = 0; (i < 100) && !wrapper.find(".step-class__subclass").exists(); i += 1)
        {
            await flushPromises();
            await new Promise((done) => setTimeout(done, 10));
        }

        const subclass = wrapper.find(".step-class__subclass");
        const shadow = subclass.find<HTMLInputElement>("input[value='phb14.subclass.monk.way-of-shadow']");
        expect(shadow.exists()).toBe(true);
        expect(shadow.element.checked).toBe(true);
        expect(subclass.find("input[value='srd51.subclass.monk.way-of-the-open-hand']").exists()).toBe(true);

        expect(await useWizardStore().finish()).toBe(character.id);
        const saved = await useBrowserStorage().characters.get(character.id);
        const sources = await useContentStore().sources(saved!.packages.map((p) => p.id));
        const { sheet } = useEngine().sheet(saved!, sources, { language: "en" });
        expect(`${stableStringify(sheet)}\n`).toBe(readFileSync(join(FIXTURE, "snapshot.json"), "utf8"));
        wrapper.unmount();

    }, 60_000);
});
