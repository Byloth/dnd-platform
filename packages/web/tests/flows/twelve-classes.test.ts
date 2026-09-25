/**
 * The twelve SRD classes through the wizard (M1.4 acceptance, docs/phase-1/04-character-creation.md): for every
 * archetype of srd51, one per class, a newcomer chooses it and presses "Next" through the steps, answers every
 * choice still open with its first options, types a name, finds nothing open at the review and saves. The stored
 * character equals its fixture (`fixtures/characters/created-<class>/character.yaml`), and the sheet the browser
 * derives equals the snapshot the CLI derives for that fixture (`dnd fixtures`), without a warning.
 *
 * `UPDATE_FLOW_FIXTURES=1` writes the twelve fixtures instead; `pnpm fixtures --update` then writes their snapshots.
 */

import "fake-indexeddb/auto";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse, stringify } from "yaml";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import type { Archetype } from "@byloth/dnd-platform-schema";
import type { Character } from "@byloth/dnd-platform-engine";
import { stableStringify } from "@byloth/dnd-platform-schema";

import WizardPage from "@/pages/characters/new.vue";

import { byName } from "../accessibility";
import { clearBrowserStorage, ROOT, serveSite, SRD } from "../helpers";

serveSite();

const UPDATE = process.env["UPDATE_FLOW_FIXTURES"] === "1";
const CHARACTERS = resolve(ROOT, "fixtures", "characters");
/** The snapshot's time, fixed so the fixture does not change with the clock. */
const CREATED_AT = "2026-09-25T00:00:00.000Z";

const ARCHETYPES = SRD.entities
    .filter((e) => e.type === "archetype")
    .map((e) => e.data as Archetype)
    .sort((a, b) => (a.recommends.class ?? "").localeCompare(b.recommends.class ?? ""));

let _mounted: VueWrapper | undefined;

async function until(ready: () => boolean): Promise<void>
{
    for (let i = 0; (i < 200) && !ready(); i += 1)
    {
        await flushPromises();
        await new Promise((done) => setTimeout(done, 10));
    }
}

async function settle(): Promise<void>
{
    await flushPromises();
    await new Promise((done) => setTimeout(done, 0));
    await flushPromises();
}

/** "Next", then the next step's heading. */
async function next(wrapper: VueWrapper): Promise<void>
{
    const before = useWizardStore().step;
    byName(wrapper, "Next")!.click();
    await until(() => useWizardStore().step !== before);
    await settle();
}

/** Every group of step 6 not yet full takes its first options that can still be chosen. */
async function answerEverything(wrapper: VueWrapper): Promise<void>
{
    for (let i = 0; i < 60; i += 1)
    {
        const open = wrapper.findAll(".choice-group")
            .find((g) => !g.find(".choice-group__progress--done").exists());
        if (!open) { return; }
        const option = open.findAll<HTMLInputElement>("input.choice-card__input")
            .find((o) => !o.element.checked && !o.element.disabled);
        if (!option) { throw new Error(`nothing left to choose in ${open.find(".choice-group__title").text()}`); }
        await option.setValue(true);
        await settle();
    }
    throw new Error("step 6 never filled up");
}

/** The stored document as the fixture keeps it: a stable id and snapshot time. */
function normalised(character: Character, slug: string): Character
{
    return {
        ...character,
        id: `fixture-created-${slug}`,
        snapshots: (character.snapshots ?? []).map((s) => ({ ...s, at: CREATED_AT }))
    };
}

beforeEach(async () =>
{
    useContentStore().reset();
    await useWizardStore().discard();
    usePreferencesStore().$patch({ language: "en", helpLevel: "newcomer" });
});
afterEach(async () =>
{
    _mounted?.unmount();
    _mounted = undefined;
    document.body.innerHTML = "";
    await clearBrowserStorage();
});

describe("the twelve SRD classes through the wizard", () =>
{
    it("has one archetype per class", () =>
    {
        expect(new Set(ARCHETYPES.map((a) => a.recommends.class)).size).toBe(12);
    });

    for (const archetype of ARCHETYPES)
    {
        const slug = archetype.recommends.class?.split(".").pop() ?? archetype.id;
        const name = archetype.name["en"]!;

        it(`${slug}: ${name}, created with Next alone, nothing open at the review`, async () =>
        {
            _mounted = await mountSuspended(WizardPage, {
                route: "/characters/new?step=concept",
                attachTo: document.body
            });
            const wrapper = _mounted;
            await until(() => wrapper.find(".wizard-step").exists());

            await wrapper.find(`input[value='${archetype.id}']`).setValue(true);
            await settle();
            while (useWizardStore().step !== "personality")
            {
                if (useWizardStore().step === "choices") { await answerEverything(wrapper); }
                await next(wrapper);
            }
            await wrapper.find(".step-personality__input").setValue(name);
            await next(wrapper);
            await until(() => wrapper.find(".step-review__status").exists());

            const issues = wrapper.findAll(".step-review__issue-text").map((i) => i.text());
            expect(issues).toEqual([]);
            expect(wrapper.find(".step-review__status--ready").exists()).toBe(true);

            byName(wrapper, "Save the character")!.click();
            await until(() => useRouter().currentRoute.value.name === "characters-id");
            const [stored] = await useBrowserStorage().characters.list();
            const character = normalised(stored!, slug);

            const dir = join(CHARACTERS, `created-${slug}`);
            if (UPDATE)
            {
                mkdirSync(dir, { recursive: true });
                const header = `# ${name}: written by packages/web/tests/flows/twelve-classes.test.ts ` +
                    "(UPDATE_FLOW_FIXTURES=1); do not edit by hand.\n";
                writeFileSync(join(dir, "character.yaml"), header + stringify(character, { lineWidth: 0 }));
                writeFileSync(join(dir, "packages.yaml"), "packages:\n  - packages/content/srd51\n");

                return;
            }

            expect(character).toEqual(parse(readFileSync(join(dir, "character.yaml"), "utf8")));
            expect(existsSync(join(dir, "snapshot.json")), "run pnpm fixtures --update").toBe(true);
            const sources = await useContentStore().sources(["srd51"]);
            const { sheet } = useEngine().sheet(character, sources, { language: "en" });
            expect(sheet.warnings).toEqual([]);
            expect(`${stableStringify(sheet)}\n`).toBe(readFileSync(join(dir, "snapshot.json"), "utf8"));

        }, 60_000);
    }
});
