/**
 * The packages page (docs/phase-1/02-content-and-character-stores.md): the SRD comes with the site and cannot
 * be removed; loaded packages are listed, private ones flagged; a refused file is explained in plain words
 * with its codes only in the details; removal asks first; both languages render without raw keys.
 */

import "fake-indexeddb/auto";

import { join } from "node:path";

import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import PackagesPage from "@/pages/packages/index.vue";

import { bundleOf, clearBrowserStorage, FIXTURES, serveSite, zipOf } from "./helpers";

serveSite();

beforeEach(() =>
{
    useContentStore().reset();
});
afterEach(async () =>
{
    await useNuxtApp().$i18n.setLocale("en");
    await clearBrowserStorage();
});

async function mountPage(): Promise<Awaited<ReturnType<typeof mountSuspended>>>
{
    const wrapper = await mountSuspended(PackagesPage);
    await flushPromises();

    return wrapper;
}

/** The list item of a package, by its heading. */
function packageItem(wrapper: Awaited<ReturnType<typeof mountSuspended>>, name: string)
{
    return wrapper.findAll("li.package").find((li) => li.find("h3").text() === name);
}

describe("the packages page", () =>
{
    it("lists the SRD as coming with the site, without a remove action", async () =>
    {
        const wrapper = await mountPage();
        const srd = packageItem(wrapper, "System Reference Document 5.1");

        expect(srd).toBeDefined();
        expect(srd!.text()).toContain("Comes with the site");
        expect(srd!.findAll("button").length).toBe(0);
    });

    it("lists a loaded package and flags a non-redistributable one as private", async () =>
    {
        const wrapper = await mountPage();
        const store = useContentStore();

        const stub = readPackageSource(join(FIXTURES, "phb14-stub"));
        const locked = { ...stub, manifest: { ...stub.manifest, redistributable: false } };
        await store.loadFiles([
            zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline"),
            bundleOf(locked, "phb14.json")
        ]);
        await flushPromises();

        const feline = packageItem(wrapper, "Byloth's homebrew")!;
        expect(feline.text()).toContain("Added from homebrew-feline.zip");
        expect(feline.text()).not.toContain("Private, loaded on this device");

        const phb = wrapper.findAll("li.package").find((li) => li.text().includes("phb14.json"))!;
        expect(phb.text()).toContain("Private, loaded on this device");
        expect(wrapper.findAll("li.load.done").length).toBe(2);
    });

    it("explains a refused file in plain words, with the codes only in the details", async () =>
    {
        const wrapper = await mountPage();
        await useContentStore().loadFiles([zipOf(join(FIXTURES, "invalid", "unknown-kind"), "unknown-kind")]);
        await flushPromises();

        const load = wrapper.find("li.load.refused");
        expect(load.find("[role=status]").text()).toContain("unknown-kind.zip is not a valid package");
        expect(load.find("[role=status]").text()).not.toContain("E_");
        expect(load.find("details").text()).toContain("E_SCHEMA");
    });

    it("asks before removing a package, then removes it", async () =>
    {
        const wrapper = await mountPage();
        await useContentStore().loadFiles([zipOf(join(FIXTURES, "homebrew-feline"), "homebrew-feline")]);
        await flushPromises();

        const remove = packageItem(wrapper, "Byloth's homebrew")!.find("button");
        expect(remove.text()).toContain("Remove");
        await remove.trigger("click");

        const confirm = packageItem(wrapper, "Byloth's homebrew")!.find("[role=group]");
        expect(confirm.text()).toContain("Remove Byloth's homebrew from this browser?");
        await confirm.findAll("button")[0]!.trigger("click");

        await vi.waitFor(() => expect(packageItem(wrapper, "Byloth's homebrew")).toBeUndefined());
    });

    it("renders in Italian without raw catalogue keys", async () =>
    {
        await useNuxtApp().$i18n.setLocale("it");
        const wrapper = await mountPage();

        expect(wrapper.find("h1").text()).toBe("Pacchetti");
        expect(wrapper.text()).toContain("Incluso nel sito");
        expect(wrapper.text()).not.toMatch(/packages\.[a-z]/);
    });
});
