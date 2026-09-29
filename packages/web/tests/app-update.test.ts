/**
 * New versions of the application without a pop-up (M1.5c): a waiting version takes over at the next change of
 * page, loaded for real under the site's base; nothing happens without one or on the same page; a page left open
 * asks for new versions each hour and when it is shown again.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { CHECK_INTERVAL, createAppUpdate, TAKEOVER_TIMEOUT, watchForUpdates } from "@/composables/app-update";

function deps()
{
    return {
        activate: vi.fn(async () => undefined),
        controlled: vi.fn(async (_timeout: number) => undefined),
        assign: vi.fn((_url: string) => undefined)
    };
}

afterEach(() => { vi.useRealTimers(); });

describe("applying a new version", () =>
{
    it("lets every page change through while no version waits", async () =>
    {
        const d = deps();
        const update = createAppUpdate(d, "/dnd-platform/");

        expect(await update.beforeNavigate("/", "/packages", "/packages")).toBe(true);
        expect(d.activate).not.toHaveBeenCalled();
    });

    it("keeps the same page as it is, even with a version waiting", async () =>
    {
        const d = deps();
        const update = createAppUpdate(d, "/dnd-platform/");
        update.markWaiting();

        expect(await update.beforeNavigate("/compendium/spells", "/compendium/spells", "/compendium/spells?q=fire"))
            .toBe(true);
        expect(update.waiting).toBe(true);
    });

    it("starts the waiting version at the next page change and loads the target for real", async () =>
    {
        const d = deps();
        const update = createAppUpdate(d, "/dnd-platform/");
        update.markWaiting();

        expect(await update.beforeNavigate("/", "/compendium/spells", "/compendium/spells?level=3")).toBe(false);
        expect(d.activate).toHaveBeenCalledOnce();
        expect(d.controlled).toHaveBeenCalledWith(TAKEOVER_TIMEOUT);
        expect(d.assign).toHaveBeenCalledWith("/dnd-platform/compendium/spells?level=3");
        expect(update.waiting).toBe(false);
        expect(await update.beforeNavigate("/compendium/spells", "/", "/")).toBe(true);
    });
});

describe("asking for new versions", () =>
{
    it("asks each hour and when the page is shown again, until stopped", () =>
    {
        vi.useFakeTimers();
        const check = vi.fn();
        const target = new EventTarget() as unknown as Document & { visibilityState: string };
        Object.defineProperty(target, "visibilityState", { value: "visible", writable: true });
        const stop = watchForUpdates(check, target);

        vi.advanceTimersByTime(CHECK_INTERVAL);
        expect(check).toHaveBeenCalledTimes(1);
        target.dispatchEvent(new Event("visibilitychange"));
        expect(check).toHaveBeenCalledTimes(2);

        stop();
        vi.advanceTimersByTime(CHECK_INTERVAL);
        target.dispatchEvent(new Event("visibilitychange"));
        expect(check).toHaveBeenCalledTimes(2);
    });
});
