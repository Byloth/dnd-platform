/**
 * Package updates and stored characters (DEC-21, M1.5b): a character last seen with an older SRD is told what the
 * update changed on its sheet, "Got it" records the new versions; when nothing changed they are recorded at once;
 * an earlier version the site no longer has gives the update without numbers; demo characters are left alone.
 * The changelog page shows what came after the character's version.
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import type { Character } from "@byloth/dnd-platform-engine";
import type { PackageSource } from "@byloth/dnd-platform-loader";

import CharacterPage from "@/pages/characters/[id]/index.vue";
import ChangelogPage from "@/pages/changelog/[id].vue";
import { recordVersions } from "@/composables/versions";

import { byName } from "./accessibility";
import { clearBrowserStorage, serveDemoCharacters, serveSite, SRD, waitFor } from "./helpers";

/** An earlier SRD in which chain mail gave 17: the cleric's armour class was one higher then. */
const HEAVIER: PackageSource = {
    ...SRD,
    manifest: { ...SRD.manifest, version: "0.0.1" },
    entities: SRD.entities.map((e) => (e.id === "srd51.item.chain-mail" ?
        { ...e, data: { ...(e.data as object), ac: { base: 17, addDex: false } } } :
        e))
};
/** An earlier SRD identical to today's. */
const SAME: PackageSource = { ...SRD, manifest: { ...SRD.manifest, version: "0.0.2" } };

serveSite({ olderSrd: [HEAVIER, SAME] });
serveDemoCharacters(["cleric-l5"]);

let _mounted: VueWrapper[] = [];
afterEach(async () =>
{
    for (const wrapper of _mounted) { wrapper.unmount(); }
    _mounted = [];
    useContentStore().reset();
    useEngine().clear();
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

async function open(route: string, component: Parameters<typeof mountSuspended>[0] = CharacterPage): Promise<VueWrapper>
{
    const wrapper = await mountSuspended(component, { route: route });
    _mounted.push(wrapper);
    await flushPromises();

    return wrapper;
}

/** The demo cleric stored as the player's, last seen with the given SRD version. */
async function storeAt(version: string, id = "character-old"): Promise<Character>
{
    const demo = (await useCharacters().get("fixture-cleric-l5"))!.character;
    const character = {
        ...demo,
        id: id,
        name: "Brother Alric",
        ruleset: { ...demo.ruleset, version: version },
        packages: demo.packages.map((p) => ({ ...p, version: version }))

    } as Character;
    await useBrowserStorage().characters.put(character);

    return character;
}

const stored = async (id = "character-old"): Promise<string | undefined> =>
    (await useBrowserStorage().characters.get(id))?.packages[0]?.version;

describe("an updated package on a stored character's sheet", () =>
{
    it("says what changed, links the changelog, and records the versions when told", async () =>
    {
        await storeAt("0.0.1");
        const wrapper = await open("/characters/character-old");
        await waitFor(async () =>
        {
            await flushPromises();
            expect(wrapper.find(".update-notice").exists()).toBe(true);
        });
        const notice = wrapper.find(".update-notice");

        expect(notice.find("h2").text()).toBe("The rules were updated");
        expect(notice.text()).toContain(`0.0.1 → ${SRD.manifest.version}`);
        expect(notice.text()).toContain("Armor Class: 19 → 18");
        expect(notice.find(".update-notice__changelog").attributes("href"))
            .toMatch(/\/changelog\/srd51\?from=0\.0\.1$/);
        expect(wrapper.find(".sheet-view").exists()).toBe(true);

        byName(wrapper, "Got it")!.click();
        await waitFor(async () =>
        {
            await flushPromises();
            expect(await stored()).toBe(SRD.manifest.version);
        });
        expect(wrapper.find(".update-notice").exists()).toBe(false);
    });

    it("records the versions at once when nothing on the sheet changed", async () =>
    {
        await storeAt("0.0.2");
        const wrapper = await open("/characters/character-old");
        await waitFor(async () =>
        {
            await flushPromises();
            expect(await stored()).toBe(SRD.manifest.version);
        });

        expect(wrapper.find(".update-notice").exists()).toBe(false);
    });

    it("names an update it cannot compare, without numbers", async () =>
    {
        await storeAt("0.0.9");
        const wrapper = await open("/characters/character-old");
        await waitFor(async () =>
        {
            await flushPromises();
            expect(wrapper.find(".update-notice").exists()).toBe(true);
        });

        expect(wrapper.find(".update-notice").text()).toContain("cannot be shown");
    });

    it("leaves the demo characters alone", async () =>
    {
        const wrapper = await open("/characters/fixture-cleric-l5");
        await flushPromises();

        expect(wrapper.find(".update-notice").exists()).toBe(false);
    });

    it("records the loaded versions and keeps the others", () =>
    {
        const character = {
            id: "c",
            name: "C",
            ruleset: { id: "srd51", version: "0.1.0" },
            packages: [{ id: "srd51", version: "0.1.0" }, { id: "phb14", version: "0.3.0" }],
            choices: {},
            state: {}

        } as unknown as Character;
        const recorded = recordVersions(character, [SRD]);

        expect(recorded.ruleset.version).toBe(SRD.manifest.version);
        expect(recorded.packages).toEqual([
            { id: "srd51", version: SRD.manifest.version },
            { id: "phb14", version: "0.3.0" }
        ]);
    });
});

describe("the changelog page", () =>
{
    it("opens the versions after the character's, the earlier ones behind a disclosure", async () =>
    {
        const wrapper = await open("/changelog/srd51?from=0.6.0", ChangelogPage);
        const open_ = wrapper.findAll(".changelog-page > .changelog-page__release h2").map((h) => h.text());

        expect(open_[0]).toMatch(/^0\.7\.1/);
        expect(open_.some((h) => h.startsWith("0.6.0"))).toBe(false);
        expect(wrapper.find(".changelog-page__earlier").text()).toContain("0.6.0");
        expect(wrapper.text()).not.toContain("pnpm release:content");
    });

    it("says when a package publishes no changelog", async () =>
    {
        const wrapper = await open("/changelog/nothing", ChangelogPage);

        expect(wrapper.find(".changelog-page__intro").text()).toBe("This package publishes no list of changes.");
    });
});
