import type { Character } from "@byloth/dnd-platform-engine";

/**
 * The characters the application can show (docs/phase-1/02-content-and-character-stores.md). Until the character
 * store (M1.5) these are the site's demo characters, SRD-only fixtures published by `web:prepare-content`; the
 * stored ones will join behind the same two functions.
 */

export interface CharacterEntry
{
    readonly id: string;
    readonly name: string;
    /** Classes and levels, e.g. `Cleric 5`. */
    readonly summary: string;
    readonly origin: "demo";
}

export function useCharacters()
{
    const base = useRuntimeConfig().app.baseURL;

    const list = async (): Promise<CharacterEntry[]> =>
    {
        const demos = await $fetch<Omit<CharacterEntry, "origin">[]>(`${base}content/characters/index.json`, {
            responseType: "json"
        });

        return demos.map((d) => ({ ...d, origin: "demo" }));
    };

    /** The character with this id, or `undefined` when there is none. */
    const get = async (id: string): Promise<Character | undefined> =>
    {
        if (!(await list()).some((c) => c.id === id)) { return undefined; }

        return $fetch<Character>(`${base}content/characters/${encodeURIComponent(id)}.json`, { responseType: "json" });
    };

    return { list, get };
}
