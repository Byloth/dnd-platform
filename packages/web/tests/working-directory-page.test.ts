/**
 * The working folder on the pages (M1.8): the packages page's section in its states (the browser cannot, no folder,
 * connected with the last check's changes, the folder of a previous visit waiting for a click), in English and in
 * Italian, accessible; the characters page's notice; the export dialog saving into the folder.
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import type { Character } from "@byloth/dnd-platform-engine";

import FolderNotice from "@/components/characters/FolderNotice.vue";
import ExportDialog from "@/components/characters/ExportDialog.vue";
import { useBrowserStorage } from "@/composables/storage";
import {
    resetWorkingDirectory,
    setWorkingDirectoryEnvironment,
    useWorkingDirectory
} from "@/composables/working-directory";
import PackagesPage from "@/pages/packages/index.vue";

import { expectKeyboardOperable, expectNoAxeViolations } from "./accessibility";
import { MemoryFolder, memoryEnvironment } from "./folder";
import { clearBrowserStorage, serveSite, waitFor } from "./helpers";

serveSite();

let folder: MemoryFolder;
beforeEach(() =>
{
    useContentStore().reset();
    folder = new MemoryFolder("my-characters");
});
afterEach(async () =>
{
    resetWorkingDirectory();
    setWorkingDirectoryEnvironment(undefined);
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

let _mounted: VueWrapper | undefined;
afterEach(() =>
{
    _mounted?.unmount();
    _mounted = undefined;
});

/** Attached to the document, which axe needs. */
async function mountPage(): Promise<VueWrapper>
{
    const wrapper = await mountSuspended(PackagesPage, { attachTo: document.body });
    _mounted = wrapper;
    await flushPromises();

    return wrapper;
}

const section = (wrapper: VueWrapper) => wrapper.find("section[aria-labelledby='packages-folder-heading']");

describe("the packages page's working folder", () =>
{
    it("says which browsers can, where this one cannot", async () =>
    {
        const wrapper = await mountPage();

        expect(section(wrapper).find("h2")
            .text()).toBe("Working folder");
        expect(section(wrapper).text()).toContain("Chrome or Edge on a computer can.");
        expect(section(wrapper).find("button")
            .exists()).toBe(false);
    });

    it("connects a folder and lists what the check changed", async () =>
    {
        setWorkingDirectoryEnvironment(memoryEnvironment(folder));
        const wrapper = await mountPage();

        const choose = section(wrapper).findAll("button")
            .find((b) => b.text() === "Choose a folder")!;
        await choose.trigger("click");
        await waitFor(() => expect(section(wrapper).text())
            .toContain("Nothing to change: the folder and this browser match."));

        expect(section(wrapper).text()).toContain("Connected to the folder my-characters.");
        const names = section(wrapper).findAll("button")
            .map((b) => b.text());
        expect(names).toEqual(["Read the folder again", "Disconnect"]);
        await expectNoAxeViolations(wrapper);
        expectKeyboardOperable(wrapper);
    });

    it("offers the folder of a previous visit again, in Italian", async () =>
    {
        await useNuxtApp().$i18n.setLocale("it");
        const environment = memoryEnvironment(folder);
        setWorkingDirectoryEnvironment(environment);
        await useWorkingDirectory().connect();
        resetWorkingDirectory();
        setWorkingDirectoryEnvironment(environment);
        folder.permission = "prompt";
        await useWorkingDirectory().restore();

        const wrapper = await mountPage();

        expect(section(wrapper).find("h2")
            .text()).toBe("Cartella di lavoro");
        expect(section(wrapper).text()).toContain("La cartella my-characters non è collegata in questa visita");
        const reconnect = section(wrapper).findAll("button")
            .find((b) => b.text() === "Ricollega my-characters")!;
        await reconnect.trigger("click");
        await waitFor(() => expect(section(wrapper).text()).toContain("Niente da cambiare"));
        expect(section(wrapper).text()).toContain("Collegato alla cartella my-characters.");
        await expectNoAxeViolations(wrapper);
    });
});

describe("the characters page's notice", () =>
{
    it("appears only while the folder waits for a click", async () =>
    {
        const environment = memoryEnvironment(folder);
        setWorkingDirectoryEnvironment(environment);
        const notice = await mountSuspended(FolderNotice);
        expect(notice.text()).toBe("");

        await useWorkingDirectory().connect();
        resetWorkingDirectory();
        setWorkingDirectoryEnvironment(environment);
        folder.permission = "prompt";
        await useWorkingDirectory().restore();
        await flushPromises();

        expect(notice.text()).toContain("The folder my-characters is not connected in this visit.");
        expect(notice.find("button").text()).toBe("Connect my-characters again");
    });
});

describe("the export dialog", () =>
{
    it("saves into the folder's exports/ when one is connected", async () =>
    {
        setWorkingDirectoryEnvironment(memoryEnvironment(folder));
        await useWorkingDirectory().connect();
        const character = {
            id: "hero-1",
            name: "Iron Sparrow",
            formatVersion: 0,
            ruleset: { id: "srd51", version: "0.9.0" },
            packages: [{ id: "srd51", version: "0.9.0" }],
            choices: { classes: [] }

        } as unknown as Character;

        const dialog = await mountSuspended(ExportDialog, { props: { open: true, character: character } });
        await flushPromises();

        expect(dialog.text()).toContain("Save it in the folder my-characters instead of downloading it");
        const save = dialog.findAll("button").find((b) => b.text() === "Save")!;
        await save.trigger("click");
        await waitFor(() => expect(folder.at("exports/Iron Sparrow.dnd.json")).toBeDefined());
        expect(await useBrowserStorage().characters.get("hero-1")).toBeUndefined();
    });
});
