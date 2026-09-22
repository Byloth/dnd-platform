import type { PackageSet, PackageSource } from "@byloth/dnd-platform-engine";
import { loadPackages } from "@byloth/dnd-platform-engine";

/**
 * The packages available to the application. In M1.1 only the SRD bundle
 * shipped with the site (docs/phase-1/02-content-and-character-stores.md
 * adds the browser store and the packages the user loads).
 */
export function useContent()
{
    const runtimeConfig = useRuntimeConfig();
    const base = runtimeConfig.app.baseURL;

    const fetchBundle = async (id: string): Promise<PackageSource> =>
        $fetch<PackageSource>(`${base}content/${id}.json`, { responseType: "json" });

    const load = (sources: readonly PackageSource[], pins: Readonly<Record<string, string>>): PackageSet =>
        loadPackages(sources, { pins: pins });

    return { fetchBundle, load };
}
