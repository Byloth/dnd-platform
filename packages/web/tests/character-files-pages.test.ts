/**
 * Characters as files on the pages (M1.5a): "Export" on a sheet and beside a stored character downloads its file;
 * the delete confirmation offers the copy first; the characters page imports a dropped file after showing what
 * happens to its packages, then opens the sheet; a file that is not a character is refused in plain words.
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import CharactersPage from "@/pages/index.vue";
import CharacterPage from "@/pages/characters/[id]/index.vue";

import { byName } from "./accessibility";
import { clearBrowserStorage, serveDemoCharacters, serveSite, waitFor } from "./helpers";

serveSite();
serveDemoCharacters(["cleric-l5"]);

let _mounted: VueWrapper[] = [];
const downloads: Blob[] = [];

beforeEach(() =>
{
    downloads.length = 0;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) =>
    {
        downloads.push(blob as Blob);

        return "blob:test";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});
afterEach(async () =>
{
    for (const wrapper of _mounted) { wrapper.unmount(); }
    _mounted = [];
    vi.restoreAllMocks();
    useContentStore().reset();
    await clearBrowserStorage();
});

async function open(component: Parameters<typeof mountSuspended>[0], route: string): Promise<VueWrapper>
{
    const wrapper = await mountSuspended(component, { route: route, attachTo: document.body });
    _mounted.push(wrapper);
    await flushPromises();

    return wrapper;
}

/** Waits for what an async component or a click sets going. */
async function settle(check: () => void): Promise<void>
{
    await waitFor(async () =>
    {
        await flushPromises();
        check();
    });
}

/** The heading of the open dialog. */
const dialogTitle = (): string | undefined => document.querySelector("dialog[open] h2")?.textContent?.trim();

const exported = async (): Promise<{ format: string, character: { name: string } }> =>
    JSON.parse(await downloads.at(-1)!.text()) as { format: string, character: { name: string } };

async function storeBrother(id = "character-mine"): Promise<void>
{
    const demo = await useCharacters().get("fixture-cleric-l5");
    await useBrowserStorage().characters.put({ ...demo!.character, id: id, name: "Brother Alric" });
}

describe("exporting from the pages", () =>
{
    it("downloads a demo character's file from its sheet", async () =>
    {
        const wrapper = await open(CharacterPage, "/characters/fixture-cleric-l5");

        byName(wrapper, "Export")!.click();
        await settle(() => expect(dialogTitle()).toContain("Export"));
        (document.querySelector("dialog[open] .confirm-dialog__actions button:last-child") as HTMLElement).click();
        await settle(() => expect(downloads.length).toBe(1));

        expect((await exported()).format).toBe("dnd-platform-export/1");
    });

    it("offers a copy before deleting", async () =>
    {
        await storeBrother();
        const wrapper = await open(CharacterPage, "/characters/character-mine");

        byName(wrapper, "Delete")!.click();
        await flushPromises();
        byName(wrapper, "Download a copy first")!.click();
        await settle(() => expect(downloads.length).toBe(1));

        expect((await exported()).character.name).toBe("Brother Alric");
        expect(await useBrowserStorage().characters.get("character-mine")).toBeDefined();
    });

    it("exports a stored character from the list", async () =>
    {
        await storeBrother();
        const wrapper = await open(CharactersPage, "/");

        byName(wrapper, "Export Brother Alric")!.click();
        await settle(() => expect(dialogTitle()).toBe("Export Brother Alric"));
    });
});

describe("importing on the characters page", () =>
{
    const drop = async (wrapper: VueWrapper, file: File): Promise<void> =>
    {
        await wrapper.find(".file-picker").trigger("drop", { dataTransfer: { types: ["Files"], files: [file] } });
    };

    it("shows what happens to the packages, imports, and opens the sheet", async () =>
    {
        await storeBrother();
        const wrapper = await open(CharacterPage, "/characters/character-mine");
        byName(wrapper, "Export")!.click();
        await settle(() => expect(document.querySelector("dialog[open]")).not.toBeNull());
        (document.querySelector("dialog[open] .confirm-dialog__actions button:last-child") as HTMLElement).click();
        await settle(() => expect(downloads.length).toBe(1));
        const text = await downloads[0]!.text();
        await clearBrowserStorage();

        const page = await open(CharactersPage, "/");
        await drop(page, new File([text], "Brother Alric.dnd.json", { type: "application/json" }));
        await settle(() => expect(dialogTitle()).toBe("Import Brother Alric?"));

        expect(document.querySelector("dialog[open]")!.textContent).toContain("srd51 On the site");
        (document.querySelector("dialog[open] .confirm-dialog__actions button:last-child") as HTMLElement).click();
        await settle(() => expect(useRouter().currentRoute.value.params["id"]).toBe("character-mine"));
        expect(await useBrowserStorage().characters.get("character-mine")).toBeDefined();
    });

    it("refuses a file that is not a character, in plain words", async () =>
    {
        const page = await open(CharactersPage, "/");
        await drop(page, new File(["hello"], "notes.txt"));

        await settle(() => expect(page.find("[role=alert]").text()).toContain("notes.txt cannot be read"));
    });
});
