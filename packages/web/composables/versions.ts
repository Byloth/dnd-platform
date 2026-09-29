import { diffTrees } from "@byloth/dnd-platform-composer";
import type { SheetChange, Translate } from "@byloth/dnd-platform-composer";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import type { Character } from "@byloth/dnd-platform-engine";

/**
 * Package updates and a stored character (DEC-21, M1.5b): versions propagate by themselves, and the character
 * records the version it was last seen with. When that differs from the one loaded now, the sheet at the
 * recorded version (a public package's old release, which the site keeps) is compared with today's, and the
 * player is told what changed on it; then the recorded versions move on. A package the device holds in one
 * version only (the player's own) cannot be compared: the update is named without numbers.
 */

export interface PackageUpdate
{
    readonly id: string;
    readonly from: string;
    readonly to: string;
    /** False when the recorded version cannot be loaded any more, so nothing could be compared. */
    readonly compared: boolean;
    /** The site publishes this package's changelog. */
    readonly changelog: boolean;
}
export interface VersionCheck
{
    readonly updates: readonly PackageUpdate[];
    readonly changes: readonly SheetChange[];
}

/** The character with the versions of the loaded sources recorded, the base's included; others kept as they are. */
export function recordVersions(character: Character, sources: readonly PackageSource[]): Character
{
    const loaded = new Map(sources.map((s) => [s.manifest.id, s.manifest.version]));
    const packages = character.packages.map((p) => ({ ...p, version: loaded.get(p.id) ?? p.version }));
    const ruleset = { ...character.ruleset, version: loaded.get(character.ruleset.id) ?? character.ruleset.version };

    return { ...character, ruleset: ruleset, packages: packages as Character["packages"] };
}

/** The packages whose recorded version differs from the loaded one. */
export function outdated(
    character: Character, sources: readonly PackageSource[]
): { id: string, from: string, to: string }[]
{
    const loaded = new Map(sources.map((s) => [s.manifest.id, s.manifest.version]));

    return character.packages
        .filter((p) => loaded.has(p.id) && (loaded.get(p.id) !== p.version))
        .map((p) => ({ id: p.id, from: p.version, to: loaded.get(p.id)! }));
}

export function useVersionCheck()
{
    const content = useContentStore();
    const engine = useEngine();

    /**
     * What an update changed on the character's sheet: the recorded versions of the site's packages are fetched
     * from their releases, the sheet derived with them and compared with today's.
     */
    const check = async (
        character: Character,
        sources: readonly PackageSource[],
        options: { language: string, translate?: Translate }
    ): Promise<VersionCheck> =>
    {
        const found = outdated(character, sources);
        if (!found.length) { return { updates: [], changes: [] }; }

        const index = content.index ?? await useContent().fetchIndex();
        const old = new Map<string, PackageSource>();
        await Promise.all(found.map(async (u) =>
        {
            if (!index.packages[u.id]?.versions.includes(u.from)) { return; }
            try { old.set(u.id, await useContent().fetchBundle(u.id, u.from)); }
            catch { /* A release that cannot be fetched is an update without numbers. */ }
        }));

        const updates = found.map((u): PackageUpdate => ({
            ...u,
            compared: old.has(u.id),
            changelog: u.id in index.packages
        }));
        if (!old.size) { return { updates: updates, changes: [] }; }

        const composeOptions = {
            language: options.language,
            ...(options.translate ? { translate: options.translate } : {})
        };
        const before = engine.sheet(character, sources.map((s) => old.get(s.manifest.id) ?? s), composeOptions);
        const after = engine.sheet(character, sources, composeOptions);

        return { updates: updates, changes: diffTrees(before.tree, after.tree, options) };
    };

    return { check };
}
