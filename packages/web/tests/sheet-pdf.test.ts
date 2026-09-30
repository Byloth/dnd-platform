/**
 * The sheet as a PDF (M1.6a): "PDF" on a character's sheet draws the classic sheet in the browser and downloads
 * it, its fields filled from the sheet on the page; on a phone that can share files, the share sheet is offered
 * instead.
 */

import "fake-indexeddb/auto";

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import CharactersPage from "@/pages/index.vue";
import CharacterPage from "@/pages/characters/[id]/index.vue";

import { byName } from "./accessibility";
import { clearBrowserStorage, ROOT, serveDemoCharacters, serveSite } from "./helpers";

serveSite();
serveDemoCharacters(["cleric-l5"]);

const require = createRequire(import.meta.url);
/** The font files the composable fetches, read from the packages that ship them. */
function fontFile(url: string): Uint8Array
{
    const file = basename(new URL(url, "http://localhost").pathname).replace(/\.[\w-]+(\.woff)$/, "$1");
    const family = file.startsWith("atkinson") ? "atkinson-hyperlegible" : file.split("-latin")[0]!;

    return readFileSync(require.resolve(`@fontsource/${family}/files/${file}`));
}

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
    const original = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
    {
        const url = String(input instanceof Request ? input.url : input);
        if (url.endsWith(".woff")) { return Promise.resolve(new Response(fontFile(url) as Uint8Array<ArrayBuffer>)); }

        return original(input, init);
    });
});
afterEach(async () =>
{
    for (const wrapper of _mounted) { wrapper.unmount(); }
    _mounted = [];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useContentStore().reset();
    await clearBrowserStorage();
});

async function open(route: string, component: Parameters<typeof mountSuspended>[0] = CharacterPage):
Promise<VueWrapper>
{
    const wrapper = await mountSuspended(component, { route: route, attachTo: document.body });
    _mounted.push(wrapper);
    await flushPromises();

    return wrapper;
}

describe("the sheet as a PDF", { timeout: 60_000 }, () =>
{
    it("downloads the character's sheet, its fields filled", async () =>
    {
        const wrapper = await open("/characters/fixture-cleric-l5");

        byName(wrapper, "PDF")!.click();
        await vi.waitFor(async () =>
        {
            await flushPromises();
            expect(downloads.length).toBe(1);

        }, { timeout: 30_000, interval: 50 });

        const blob = downloads[0]!;
        expect(blob.type).toBe("application/pdf");
        const pdf = await PDFDocument.load(await blob.arrayBuffer());
        const form = pdf.getForm();
        // The cards and the credits after the three pages, as the print fixture counts them (fixtures/print).
        const counts = JSON.parse(readFileSync(resolve(ROOT, "fixtures", "print", "page-counts.json"), "utf8")) as
            Record<string, { a4: number }>;
        expect(pdf.getPageCount()).toBe(counts["cleric-l5"]!.a4);
        expect(form.getTextField("class-level").getText()).toContain("Cleric 5");
        expect(form.getTextField("caster-1-class").getText()).toBe("Cleric");
        expect(form.getTextField("ac").getText()).toMatch(/^\d+$/);
        expect(byName(wrapper, "PDF")).toBeTruthy();
    });

    it("offers the share sheet on a phone that can share files", async () =>
    {
        const share = vi.fn(() => Promise.resolve());
        vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(pointer: coarse)" }));
        Object.assign(navigator, { canShare: () => true, share: share });
        const wrapper = await open("/characters/fixture-cleric-l5");

        byName(wrapper, "PDF")!.click();
        await vi.waitFor(async () =>
        {
            await flushPromises();
            expect(share).toHaveBeenCalledTimes(1);

        }, { timeout: 30_000, interval: 50 });

        const shared = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files[0]!;
        expect(shared.name).toMatch(/\.pdf$/);
        expect(downloads.length).toBe(0);
        Object.assign(navigator, { canShare: undefined, share: undefined });
    });

    it("downloads the blank sheet from the characters page, in the hand of the preferences", async () =>
    {
        usePreferencesStore().hand = "print";
        const wrapper = await open("/", CharactersPage);

        byName(wrapper, "Blank sheet (PDF)")!.click();
        await vi.waitFor(async () =>
        {
            await flushPromises();
            expect(downloads.length).toBe(1);

        }, { timeout: 30_000, interval: 50 });

        const pdf = await PDFDocument.load(await downloads[0]!.arrayBuffer());
        expect(pdf.getPageCount()).toBe(3);
        const texts = pdf.getForm().getFields()
            .filter((f) => f instanceof PDFTextField);
        expect(texts.every((f) => ((f as PDFTextField).getText() ?? "") === "")).toBe(true);
        usePreferencesStore().hand = "handwriting";
    });
});
