/**
 * New versions of the application without a pop-up (M1.5c, owner 2026-09-29). The service worker downloads a new
 * version in the background and keeps it waiting; at the next change of page the new worker takes over and the
 * page is loaded for real, already on the new version. To the player it is an ordinary page change: the
 * wizard's draft saves itself and characters are stored, so nothing is lost. Without a change of page, the new
 * version starts the next time the site is opened. The content needs none of this: its index is fetched from the
 * network first, and a newer package is explained on the sheet (M1.5b).
 */

export interface AppUpdateDeps
{
    /** Lets the waiting worker take over (`updateSW(false)` of vite-plugin-pwa). */
    readonly activate: () => Promise<void>;
    /** Resolves once the new worker controls the page, or after the timeout. */
    readonly controlled: (timeout: number) => Promise<void>;
    /** Loads a page for real. */
    readonly assign: (url: string) => void;
}

/** How long a page change waits for the new worker before loading anyway. */
export const TAKEOVER_TIMEOUT = 3000;
/** How often an open page asks whether there is a new version. */
export const CHECK_INTERVAL = 60 * 60 * 1000;

export function createAppUpdate(deps: AppUpdateDeps, base: string)
{
    let waiting = false;

    return {
        get waiting(): boolean { return waiting; },
        /** A new version is downloaded and waits. */
        markWaiting(): void { waiting = true; },
        /**
         * Before a page change: true to let the application change page as usual; false when the new version was
         * started and the page is being loaded for real instead.
         */
        async beforeNavigate(from: string, to: string, toFullPath: string): Promise<boolean>
        {
            if (!waiting || (from === to)) { return true; }
            waiting = false;
            await deps.activate();
            await deps.controlled(TAKEOVER_TIMEOUT);
            deps.assign(`${base.replace(/\/$/, "")}${toFullPath}`);

            return false;
        }
    };
}

/** Asks for a new version every hour and whenever the page is shown again; returns the way to stop. */
export function watchForUpdates(check: () => void, target: Document = document): () => void
{
    const timer = setInterval(check, CHECK_INTERVAL);
    const onVisible = (): void =>
    {
        if (target.visibilityState === "visible") { check(); }
    };
    target.addEventListener("visibilitychange", onVisible);

    return () =>
    {
        clearInterval(timer);
        target.removeEventListener("visibilitychange", onVisible);
    };
}
