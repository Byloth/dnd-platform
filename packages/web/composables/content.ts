import type { PackageSource } from "@byloth/dnd-platform-loader";

/** The site's index of its public packages: every released version of each (DEC-21). */
export interface ContentIndex
{
    readonly packages: Readonly<Record<string, {
        readonly latest: string;
        readonly versions: readonly string[];
        /** A translation package: its language and the packages it translates (docs/phase-1/11). */
        readonly translation?: { readonly language: string, readonly of: readonly string[] };
        /** Creatures only, for the catalogue (docs/19-catalogues.md): never offered, never loaded by the sheet. */
        readonly catalogue?: boolean;
    }>>;
}

/**
 * The public packages the site publishes (docs/phase-1/02-content-and-character-stores.md, DEC-21): every
 * released version as a static file, the latest also under the package id. The browser never stores them;
 * the HTTP cache is the only cache.
 */
export function useContent()
{
    const runtimeConfig = useRuntimeConfig();
    const base = runtimeConfig.app.baseURL;

    const fetchIndex = async (): Promise<ContentIndex> =>
        $fetch<ContentIndex>(`${base}content/index.json`, { responseType: "json" });

    /**
     * A released version of a public package, the latest by default. Always by its versioned file, which never
     * changes (DEC-21), so the service worker can keep it for good; the alias `<id>.json` is only a fallback for
     * a package the index does not list.
     */
    const fetchBundle = async (id: string, version?: string): Promise<PackageSource> =>
    {
        const wanted = version ?? (await fetchIndex()).packages[id]?.latest;
        const file = wanted === undefined ? `${id}.json` : `${id}@${wanted}.json`;

        return $fetch<PackageSource>(`${base}content/${file}`, { responseType: "json" });
    };

    return { fetchIndex, fetchBundle };
}
