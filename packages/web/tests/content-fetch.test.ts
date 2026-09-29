/**
 * The site's packages are fetched by their versioned file (M1.5c): `content/<id>@<version>.json` never changes
 * (DEC-21), so the service worker can keep it for good. The alias `content/<id>.json`, which moves with every
 * release, is not asked for when the index lists the package.
 */

import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";

import { clearBrowserStorage, serveSite, SRD } from "./helpers";

serveSite();
let _aliasAsked = 0;
registerEndpoint("/dnd-platform/content/srd51.json", () =>
{
    _aliasAsked += 1;

    return SRD;
});

afterEach(async () =>
{
    useContentStore().reset();
    await clearBrowserStorage();
});

describe("fetching the site's packages", () =>
{
    it("asks for the latest release by its version, never the alias", async () =>
    {
        const store = useContentStore();
        await store.refresh();
        const [source] = await store.sources(["srd51"]);
        await useContent().fetchBundle("srd51");

        expect(source?.manifest.version).toBe(SRD.manifest.version);
        expect(_aliasAsked).toBe(0);
    });
});
