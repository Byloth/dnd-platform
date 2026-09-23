import type { PackageSource } from "@byloth/dnd-platform-loader";

/** The site's index of its public packages: every released version of each (DEC-21). */
export interface ContentIndex
{
    readonly packages: Readonly<Record<string, { readonly latest: string, readonly versions: readonly string[] }>>;
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

    /** The latest version of a public package, or the given released version. */
    const fetchBundle = async (id: string, version?: string): Promise<PackageSource> =>
    {
        const file = version === undefined ? `${id}.json` : `${id}@${version}.json`;

        return $fetch<PackageSource>(`${base}content/${file}`, { responseType: "json" });
    };

    return { fetchIndex, fetchBundle };
}
