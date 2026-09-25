/**
 * The usage statistics (DEC-22, docs/phase-1/12-analytics.md): Umami's script is added to the page only once the
 * visitor has accepted, and only when a website id is configured. It reports only from the published domain
 * (`data-domains`) and honours Do Not Track. Withdrawing consent after the script is loaded sets Umami's own
 * switch (`umami.disabled` in the browser's storage), which stops every page view and event at once.
 *
 * In development nothing is ever loaded, whatever the answer (owner, 2026-09-25): the banner still asks, so it
 * can be seen and tested, but the script is never added.
 */

export const UMAMI_DISABLED_KEY = "umami.disabled";

export default defineNuxtPlugin((nuxtApp) =>
{
    const consent = useConsentStore(nuxtApp.$pinia as never);
    const { scriptUrl, websiteId, domains } = useRuntimeConfig().public.analytics as {
        scriptUrl: string;
        websiteId: string;
        domains: string;
    };
    if (!websiteId || !scriptUrl) { return; }
    const tracking = !import.meta.dev;

    let loaded = false;
    const load = (): void =>
    {
        if (loaded) { return; }
        loaded = true;
        injectUmami({ scriptUrl, websiteId, domains });
    };

    watch(() => consent.analytics, (value) =>
    {
        try
        {
            if (value === "granted") { localStorage.removeItem(UMAMI_DISABLED_KEY); }
            else { localStorage.setItem(UMAMI_DISABLED_KEY, "1"); }
        }
        catch { /* Storage unavailable: the script is not loaded without consent anyway. */ }

        if ((value === "granted") && tracking) { load(); }

    }, { immediate: true });
});
