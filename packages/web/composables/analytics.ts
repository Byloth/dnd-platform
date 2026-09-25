/**
 * Usage events for the statistics (DEC-22, docs/phase-1/12-analytics.md). An event is sent only with the
 * visitor's consent and once Umami's script is there; otherwise `track` does nothing, and it never throws.
 * Its data are coarse public facts only (a step, an SRD id, a count, a yes or no): never a character's name or
 * contents, never anything the player typed, never an id of a package loaded from a file.
 */

export type EventData = Readonly<Record<string, string | number | boolean>>;

interface Umami { track: (name: string, data?: EventData) => unknown }

export function useAnalytics()
{
    const consent = useConsentStore();

    const track = (name: string, data?: EventData): void =>
    {
        if (consent.analytics !== "granted") { return; }
        const umami = (globalThis as { umami?: Umami }).umami;
        if (typeof umami?.track !== "function") { return; }

        try { void umami.track(name, data); }
        catch { /* Statistics never break the application. */ }
    };

    /**
     * An entity id as the statistics may carry it: the id itself when it belongs to a package the site
     * publishes, `other` otherwise (a private or homebrew package stays in the browser).
     */
    const publicId = (id: string | undefined): string =>
    {
        if (!id) { return "none"; }
        const site = useContentStore().site.map((p) => p.manifest.id);
        const packageId = id.split(".")[0] ?? "";

        return site.includes(packageId) ? id : "other";
    };

    return { track, publicId };
}

export interface UmamiConfig
{
    readonly scriptUrl: string;
    readonly websiteId: string;
    readonly domains: string;
}

/** Adds Umami's script to the page: deferred, limited to the published domains, honouring Do Not Track. */
export function injectUmami(config: UmamiConfig): HTMLScriptElement
{
    const script = document.createElement("script");
    script.defer = true;
    script.src = config.scriptUrl;
    script.dataset["websiteId"] = config.websiteId;
    if (config.domains) { script.dataset["domains"] = config.domains; }
    script.dataset["doNotTrack"] = "true";
    script.dataset["analytics"] = "umami";
    document.head.appendChild(script);

    return script;
}
