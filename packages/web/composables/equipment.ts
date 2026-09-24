import { localize } from "@byloth/dnd-platform-composer";
import { matchesItemFilter } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";
import type { PackageSet } from "@byloth/dnd-platform-loader";
import type { EquipmentGrant, Item, ItemFilter } from "@byloth/dnd-platform-schema";

/**
 * The starting equipment of step 7 (docs/phase-1/04-character-creation.md), kept pure. The grants of the class
 * and the background are read as slots: fixed items, and the refs of the option chosen in each group. The
 * player's selections (which option, which item for a filter, what was removed or added, what is equipped) live
 * in the wizard's draft; the character's `choices.equipment` is always rebuilt from them, packs unpacked, so a
 * different option or pack swaps its items with nothing left behind (owner, 2026-09-24).
 */

type ItemRef = NonNullable<EquipmentGrant["fixed"]>[number];
type Entry = NonNullable<Character["choices"]["equipment"]>[number];

export interface EquipmentSelection
{
    /** The option of each choice group, by group key (`class#0`); the first when unset. */
    options: Record<string, number>;
    /** The item chosen for a filter slot, by slot key; the first match by name when unset. */
    picks: Record<string, string>;
    /** Slot keys of granted items the player took out. */
    removed: string[];
    /** Items added from the shop. */
    added: { item: string, quantity: number }[];
    /** An equipped state the player set, overriding the default (armor, shields and weapons are equipped). */
    equipped: Record<string, boolean>;
}

export const EMPTY_SELECTION: EquipmentSelection = { options: {}, picks: {}, removed: [], added: [], equipped: {} };

export type Source = "class" | "background";

export interface Slot
{
    readonly key: string;
    readonly source: Source;
    readonly ref: ItemRef;
    /** The item the slot resolves to: the ref's, the player's pick, or the first match by name. */
    readonly item: string | undefined;
    readonly quantity: number;
    readonly removed: boolean;
}

export interface Group
{
    readonly key: string;
    readonly source: Source;
    readonly options: readonly (readonly ItemRef[])[];
    readonly chosen: number;
}

const COPPER: Readonly<Record<string, number>> = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

/** The cost of one item in copper pieces; 0 when it has none. */
export function costInCopper(item: Item | undefined): number
{
    if (!item?.cost) { return 0; }

    return Math.round(item.cost.amount * (COPPER[item.cost.currency] ?? 100));
}

/** Copper counted as a player counts it: gold first, then silver and copper. */
export function coins(copper: number): { gold: number, silver: number, copper: number }
{
    const total = Math.max(0, Math.round(copper));

    return { gold: Math.floor(total / 100), silver: Math.floor((total % 100) / 10), copper: total % 10 };
}

export function useEquipment(set: PackageSet, language: string)
{
    const item = (id: string): Item | undefined => set.entities.get(id)?.data as Item | undefined;
    const name = (id: string): string => localize(item(id)?.name, language) || (id.split(".").pop() ?? id);

    /** The mundane items a filter matches, by name. */
    const candidates = (filter: ItemFilter): string[] =>
        [...set.entities.values()]
            .filter((e) => (e.type === "item") && e.active && (e.inline === undefined))
            .filter((e) => !(e.data as Item).magical && matchesItemFilter(e.id, e.data as Item, filter))
            .map((e) => e.id)
            .sort((a, b) => name(a).localeCompare(name(b), language));

    /** The class's `startingEquipment` or the background's `equipment`. */
    const grantOf = (character: Character, source: Source): EquipmentGrant | undefined =>
    {
        const id = source === "class" ? character.choices.classes?.[0]?.class : character.choices.background;
        type Holder = Record<string, EquipmentGrant | undefined>;
        const data = id ? set.entities.get(id)?.data as Holder | undefined : undefined;

        return data?.[source === "class" ? "startingEquipment" : "equipment"];
    };

    const groups = (character: Character, selection: EquipmentSelection): Group[] =>
        (["class", "background"] as const).flatMap((source) =>
            (grantOf(character, source)?.choices ?? []).map((choice, i) => ({
                key: `${source}#${i}`,
                source: source,
                options: choice.options,
                chosen: Math.min(selection.options[`${source}#${i}`] ?? 0, choice.options.length - 1)
            })));

    const slot = (key: string, source: Source, ref: ItemRef, selection: EquipmentSelection): Slot =>
    {
        const resolved = "item" in ref ? ref.item : (selection.picks[key] ?? candidates(ref.filter)[0]);

        return {
            key: key,
            source: source,
            ref: ref,
            item: resolved,
            quantity: ref.quantity ?? 1,
            removed: selection.removed.includes(key)
        };
    };

    /** Every granted slot: the fixed items, then the refs of the chosen option of each group. */
    const slots = (character: Character, selection: EquipmentSelection): Slot[] =>
        (["class", "background"] as const).flatMap((source) =>
        {
            const grant = grantOf(character, source);
            const fixed = (grant?.fixed ?? []).map((ref, k) => slot(`${source}#fixed#${k}`, source, ref, selection));
            const chosen = groups(character, selection).filter((g) => g.source === source)
                .flatMap((g) => (g.options[g.chosen] ?? []).map((ref, k) =>
                    slot(`${g.key}#${g.chosen}#${k}`, source, ref, selection)));

            return [...fixed, ...chosen];
        });

    /** An item and its quantity, a pack as the items it holds. */
    const unpack = (id: string, quantity: number): { item: string, quantity: number }[] =>
    {
        const contents = item(id)?.contents;

        return contents?.length ?
            contents.map((c) => ({ item: c.item, quantity: (c.quantity ?? 1) * quantity })) :
            [{ item: id, quantity: quantity }];
    };

    const equippable = (id: string): boolean => ["armor", "shield", "weapon"].includes(item(id)?.type ?? "");

    /** The character's equipment: every kept slot and added item, unpacked, merged by item. */
    const build = (character: Character, selection: EquipmentSelection): Entry[] =>
    {
        const counts = new Map<string, number>();
        const kept = slots(character, selection).filter((s) => !s.removed && (s.item !== undefined));
        const refs = [...kept.map((s) => ({ item: s.item!, quantity: s.quantity })), ...selection.added];
        for (const part of refs.flatMap((ref) => unpack(ref.item, ref.quantity)))
        {
            counts.set(part.item, (counts.get(part.item) ?? 0) + part.quantity);
        }

        return [...counts].map(([id, quantity]) => ({
            item: id,
            quantity: quantity,
            equipped: selection.equipped[id] ?? equippable(id)
        }));
    };

    /** The suggested purse in copper: the grants' gold, plus what the removed items cost, minus what was added. */
    const suggestedCopper = (character: Character, selection: EquipmentSelection): number =>
    {
        const gold = (["class", "background"] as const)
            .reduce((total, source) => total + (grantOf(character, source)?.gold ?? 0), 0);
        const refunded = slots(character, selection).filter((s) => s.removed && (s.item !== undefined))
            .reduce((total, s) => total + (costInCopper(item(s.item!)) * s.quantity), 0);
        const spent = selection.added.reduce((total, a) => total + (costInCopper(item(a.item)) * a.quantity), 0);

        return Math.max(0, (gold * 100) + refunded - spent);
    };

    /** The items a player may buy: mundane, with a cost, not packs. */
    const shop = (): string[] =>
        [...set.entities.values()]
            .filter((e) => (e.type === "item") && e.active && (e.inline === undefined))
            .filter((e) =>
            {
                const data = e.data as Item;

                return !data.magical && (costInCopper(data) > 0) && !data.contents?.length;
            })
            .map((e) => e.id)
            .sort((a, b) => name(a).localeCompare(name(b), language));

    return { item, name, candidates, groups, slots, unpack, build, suggestedCopper, shop, equippable };
}
