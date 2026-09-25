import type { Character } from "@byloth/dnd-platform-engine";

/**
 * The characters the application can show (docs/phase-1/02-content-and-character-stores.md): the ones stored in
 * this browser, made with the creation wizard (M1.4d3), then the site's demo characters, SRD-only fixtures
 * published by `web:prepare-content`. A stored character can be deleted (owner, 2026-09-25); export and import are
 * M1.5.
 *
 * The characters page loads this module first, so the content store, the engine, the loader and the wizard are
 * imported only when a stored character needs them: they would otherwise weigh on the page's first load (the
 * Lighthouse guard of the characters page).
 */

export interface CharacterEntry
{
    readonly id: string;
    readonly name: string;
    /** Classes and levels, e.g. `Cleric 5`. */
    readonly summary: string;
    readonly origin: "stored" | "demo";
}

export function useCharacters()
{
    const base = useRuntimeConfig().app.baseURL;

    /** `Cleric 1`, in the interface language; "" when its packages cannot be loaded here. */
    const summarise = async (character: Character): Promise<string> =>
    {
        try
        {
            const [{ useEngine }, { useEntities }, { useContentStore }] = await Promise.all([
                import("./engine"),
                import("./entities"),
                import("@/stores/content")
            ]);
            const sources = await useContentStore().sources(character.packages.map((p) => p.id));
            const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
            const entities = useEntities(useEngine().packageSet(sources, pins), useNuxtApp().$i18n.locale.value);

            return (character.choices.classes ?? []).map((c) => `${entities.name(c.class)} ${c.levels}`).join(" / ");
        }
        catch
        {
            return "";
        }
    };

    const _demos = async (): Promise<Omit<CharacterEntry, "origin">[]> =>
        $fetch<Omit<CharacterEntry, "origin">[]>(`${base}content/characters/index.json`, { responseType: "json" });

    const list = async (): Promise<CharacterEntry[]> =>
    {
        // The player's own characters are listed even when the site's demo list cannot be fetched.
        const [stored, demos] = await Promise.all([
            useBrowserStorage().characters.list(),
            _demos().catch(() => [])
        ]);
        const own = await Promise.all([...stored]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(async (c): Promise<CharacterEntry> =>
                ({ id: c.id, name: c.name, summary: await summarise(c), origin: "stored" })));

        return [...own, ...demos.map((d): CharacterEntry => ({ ...d, origin: "demo" }))];
    };

    /** The character with this id and where it lives, stored first, or `undefined` when there is none. */
    const get = async (id: string): Promise<{ character: Character, origin: CharacterEntry["origin"] } | undefined> =>
    {
        const stored = await useBrowserStorage().characters.get(id);
        if (stored) { return { character: stored, origin: "stored" }; }
        if (!(await _demos()).some((c) => c.id === id)) { return undefined; }

        const url = `${base}content/characters/${encodeURIComponent(id)}.json`;

        return { character: await $fetch<Character>(url, { responseType: "json" }), origin: "demo" };
    };

    /**
     * Deletes a stored character, with what belongs to it: its edit draft and its sheet layout. Packages are
     * never deleted with it (docs/phase-1/02-content-and-character-stores.md).
     */
    const remove = async (id: string): Promise<void> =>
    {
        const { EDIT_KEY, useWizardStore } = await import("@/stores/wizard");
        const wizard = useWizardStore();
        if (wizard.editing === id) { await wizard.discard(); }
        else if (await wizard.stored(id)) { await useBrowserStorage().meta.set(EDIT_KEY, null); }

        await useBrowserStorage().characters.remove(id);
        usePreferencesStore().forgetSheet(id);
    };

    return { list, get, remove };
}
