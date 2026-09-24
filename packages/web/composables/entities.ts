import { firstSentence, localize } from "@byloth/dnd-platform-composer";
import type { EntityType, LocalizedString } from "@byloth/dnd-platform-schema";
import type { PackageSet, ResolvedEntity } from "@byloth/dnd-platform-loader";

/**
 * The entities of a package set as the creation wizard lists them (docs/phase-1/04-character-creation.md): the
 * active top-level entities of a type, the subspecies of a species, and their names and summaries in a language,
 * localized by the composer's rule so the wizard and the sheet name things alike.
 */

interface Named { readonly name?: LocalizedString, readonly text?: LocalizedString }

export function useEntities(set: PackageSet, language: string)
{
    const data = <T>(id: string): (T & Named) | undefined => set.entities.get(id)?.data as (T & Named) | undefined;

    /** The name of an entity; the last segment of its id when it is unknown or unnamed. */
    const name = (id: string): string => localize(data(id)?.name, language) || (id.split(".").pop() ?? id);

    /** The first sentence of an entity's text, "" when it has none. */
    const summary = (id: string): string => firstSentence(localize(data(id)?.text, language));

    const byName = (a: ResolvedEntity, b: ResolvedEntity): number => name(a.id).localeCompare(name(b.id), language);

    /** The active entities of a type that stand on their own (not a subspecies or a feature inside another). */
    const list = (type: EntityType): ResolvedEntity[] =>
        [...set.entities.values()]
            .filter((e) => (e.type === type) && e.active && (e.inline === undefined))
            .sort(byName);

    /** The subspecies of a species: species entities declared inside it. */
    const subspeciesOf = (species: string): ResolvedEntity[] =>
        [...set.entities.values()]
            .filter((e) => (e.type === "species") && e.active && (e.inline?.owner === species))
            .sort(byName);

    return { data, name, summary, list, subspeciesOf };
}
