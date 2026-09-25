/**
 * Usage statistics (DEC-22, docs/phase-1/12-analytics.md): opt-in consent remembered and changeable; nothing loads
 * or is sent without it; in development nothing loads even with it; events carry coarse public facts only.
 */

import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";

import ConsentBanner from "@/components/globals/ConsentBanner.vue";
import PrivacyPage from "@/pages/privacy.vue";
import WizardPage from "@/pages/characters/new.vue";
import { CONSENT_KEY } from "@/stores/consent";
import { UMAMI_DISABLED_KEY } from "@/plugins/analytics.client";

import { byName } from "./accessibility";
import { clearBrowserStorage, serveSite } from "./helpers";

serveSite();

const umamiTrack = vi.fn();
let _mounted: VueWrapper | undefined;

beforeEach(() =>
{
    useConsentStore().reset();
    umamiTrack.mockClear();
    (globalThis as { umami?: unknown }).umami = { track: umamiTrack };
});
afterEach(async () =>
{
    _mounted?.unmount();
    _mounted = undefined;
    delete (globalThis as { umami?: unknown }).umami;
    document.head.querySelectorAll("script[data-analytics]").forEach((s) => s.remove());
    useConsentStore().reset();
    await clearBrowserStorage();
});

async function settle(): Promise<void>
{
    for (let i = 0; i < 5; i += 1)
    {
        await flushPromises();
        await new Promise((done) => setTimeout(done, 5));
    }
}

describe("usage statistics", () =>
{
    it("remembers the answer, and forgets it when asked", async () =>
    {
        const consent = useConsentStore();
        expect(consent.analytics).toBe("unset");

        consent.grant();
        await settle();
        expect(JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "{}")).toMatchObject({ analytics: "granted" });
        expect(localStorage.getItem(UMAMI_DISABLED_KEY)).toBeNull();

        consent.deny();
        await settle();
        expect(JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "{}")).toMatchObject({ analytics: "denied" });
        expect(localStorage.getItem(UMAMI_DISABLED_KEY)).toBe("1");

        consent.reset();
        expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
    });

    it("loads no script in development, even with consent (owner, 2026-09-25)", async () =>
    {
        useConsentStore().grant();
        await settle();

        expect(document.head.querySelector("script[data-analytics]")).toBeNull();
    });

    it("adds Umami's script limited to the published domain and honouring Do Not Track", () =>
    {
        const script = injectUmami({ scriptUrl: "https://example.test/script.js", websiteId: "id", domains: "a.b" });

        expect(script.defer).toBe(true);
        expect(script.getAttribute("src")).toBe("https://example.test/script.js");
        expect(script.dataset).toMatchObject({ websiteId: "id", domains: "a.b", doNotTrack: "true" });
    });

    it("sends an event only with consent, and never throws", () =>
    {
        const { track } = useAnalytics();

        track("wizard-step", { step: "class" });
        expect(umamiTrack).not.toHaveBeenCalled();

        useConsentStore().grant();
        track("wizard-step", { step: "class" });
        expect(umamiTrack).toHaveBeenCalledWith("wizard-step", { step: "class" });

        umamiTrack.mockImplementationOnce(() => { throw new Error("offline"); });
        expect(() => track("wizard-step", { step: "species" })).not.toThrow();

        useConsentStore().deny();
        track("wizard-step", { step: "background" });
        expect(umamiTrack).toHaveBeenCalledTimes(2);
    });

    it("names only what the site publishes", async () =>
    {
        await useContentStore().refresh();
        const { publicId } = useAnalytics();

        expect(publicId("srd51.class.cleric")).toBe("srd51.class.cleric");
        expect(publicId("phb14.species.human-variant")).toBe("other");
        expect(publicId(undefined)).toBe("none");
    });

    it("asks with two answers of the same weight, and hides once answered", async () =>
    {
        _mounted = await mountSuspended(ConsentBanner);
        expect(_mounted.find("#consent-banner-title").text()).toBe("Usage statistics");
        const accept = byName(_mounted, "Accept")!;
        const decline = byName(_mounted, "Decline")!;
        expect(accept.className).toBe(decline.className);

        decline.click();
        await settle();
        expect(useConsentStore().analytics).toBe("denied");
        expect(_mounted.find(".consent-banner").exists()).toBe(false);
    });

    it("lets the choice be changed on the privacy page", async () =>
    {
        _mounted = await mountSuspended(PrivacyPage);
        expect(_mounted.find("[role=status]").text()).toContain("not chosen yet");

        byName(_mounted, "Accept")!.click();
        await settle();
        expect(useConsentStore().analytics).toBe("granted");
        expect(_mounted.find("[role=status]").text()).toBe("You accepted the usage statistics.");
    });

    it("counts a wizard's steps and class without anything the player typed", async () =>
    {
        useConsentStore().grant();
        await useWizardStore().discard();
        _mounted = await mountSuspended(WizardPage, { route: "/characters/new?step=class", attachTo: document.body });
        for (let i = 0; (i < 100) && !_mounted.find("input[value='srd51.class.fighter']").exists(); i += 1)
        {
            await settle();
        }
        await _mounted.find("input[value='srd51.class.fighter']").setValue(true);
        useWizardStore().setName("Secret Name");
        byName(_mounted, "Next")!.click();
        await settle();

        const calls = umamiTrack.mock.calls.map(([name, data]) => [name, data]);
        expect(calls).toContainEqual(["wizard-class", { class: "srd51.class.fighter" }]);
        expect(calls).toContainEqual(["wizard-step", { step: "background" }]);
        expect(JSON.stringify(calls)).not.toContain("Secret Name");
        await useWizardStore().discard();
    });
});
