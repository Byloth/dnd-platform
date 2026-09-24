import type { Item, ItemFilter } from "@byloth/dnd-platform-schema";

/**
 * Whether an item meets a grant's filter (common.schema.json, `itemFilter`): every key the filter gives must hold.
 * `weapon` and `armor` read the item's type and category (`any` takes any of its kind), `tool` the item's short id
 * or tags, `category` its tags (the import tags items with the categories grants name: holy symbols, arcane foci,
 * melee weapons…).
 */
export function matchesItemFilter(id: string, item: Item, filter: ItemFilter): boolean
{
    const tags = item.tags ?? [];
    if (filter.weapon !== undefined)
    {
        if (item.type !== "weapon") { return false; }
        if ((filter.weapon !== "any") && (item.category !== filter.weapon)) { return false; }
    }
    if (filter.armor !== undefined)
    {
        if (item.type !== "armor") { return false; }
        if ((filter.armor !== "any") && (item.category !== filter.armor)) { return false; }
    }
    if ((filter.tool !== undefined) && (id.split(".").pop() !== filter.tool) && !tags.includes(filter.tool))
    {
        return false;
    }
    if ((filter.category !== undefined) && !tags.includes(filter.category)) { return false; }

    return true;
}
