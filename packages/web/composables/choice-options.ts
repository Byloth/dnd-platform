import { firstSentence, localize } from "@byloth/dnd-platform-composer";
import type { ChoiceView, ComputedSheet } from "@byloth/dnd-platform-engine";
import type { PackageSet } from "@byloth/dnd-platform-loader";
import type { LocalizedString, Spell, SpellList, Subclass } from "@byloth/dnd-platform-schema";

/**
 * The options of a choice the sheet asks, named for the player (docs/phase-1/04-character-creation.md, step 6):
 * skills and abilities by the interface's words, tools by their items, languages by the ruleset's list,
 * spells by their list and level, subclasses by their class, inline options by the details the engine carries.
 */

export interface ChoiceOption
{
    readonly id: string;
    readonly name: string;
    readonly summary: string;
    readonly facts: readonly string[];
    /** For grouping a long list: a spell's level, or "exotic" for a language. */
    readonly group?: string;
}

/** What a choice is about, for its heading and its explanation. */
export type ChoiceKind =
    "language" | "tool" | "skill" | "expertise" | "cantrip" | "spell" | "option" | "subclass" | "ability" | "other";

type Translate = (key: string, params?: Record<string, unknown>) => string;

const words = (id: string): string => id.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

export function choiceKind(choice: ChoiceView): ChoiceKind
{
    if (choice.of === "spell")
    {
        return (choice.filter?.level === 0) || (choice.choice === "cantrips") ? "cantrip" : "spell";
    }
    if (choice.of === "skill") { return choice.choice.startsWith("expertise") ? "expertise" : "skill"; }
    if ((choice.of === "option") || (choice.of === "fighting-style")) { return "option"; }
    if (["language", "tool", "subclass", "ability"].includes(choice.of)) { return choice.of as ChoiceKind; }

    return "other";
}

export function useChoiceOptions(set: PackageSet, sheet: ComputedSheet, language: string, t: Translate)
{
    const text = (label: LocalizedString | undefined): string => localize(label, language);
    const data = <T>(id: string): T | undefined => set.entities.get(id)?.data as T | undefined;
    const name = (id: string): string =>
        text(data<{ name?: LocalizedString }>(id)?.name) || words(id.split(".").pop() ?? id);

    /** Items by their short id (`thieves-tools` → the item entity), for tool choices. */
    const items = new Map([...set.entities.values()]
        .filter((e) => (e.type === "item") && (e.inline === undefined))
        .map((e) => [e.id.split(".").pop()!, e.id]));

    const known = (type: string): Set<string> =>
        new Set(sheet.proficiencies.filter((p) => p.type === type).map((p) => p.item));

    const spells = (choice: ChoiceView): ChoiceOption[] =>
    {
        const filter = choice.filter ?? {};
        const pool = filter.list ?
            (data<SpellList>(filter.list)?.spells ?? []) :
            [...set.entities.values()].filter((e) => e.type === "spell").map((e) => e.id);
        const casting = sheet.spellcasting.find((s) => s.class === choice.owner);
        const highest = Math.max(1, casting?.pact?.level ?? 0, ...(casting?.slots ?? [])
            .filter((s) => s.max > 0)
            .map((s) => s.level));
        const maxLevel = typeof filter.maxLevel === "number" ? Math.min(filter.maxLevel, highest) : highest;

        return pool.map((id) => ({ id: id, spell: data<Spell>(id) }))
            .filter(({ spell }) => spell !== undefined)
            .filter(({ spell }) => (filter.level !== undefined ?
                spell!.level === filter.level :
                (spell!.level >= 1) && (spell!.level <= maxLevel)))
            .filter(({ spell }) => (filter.school === undefined) || (spell!.school === filter.school))
            .filter(({ spell }) => (filter.ritual === undefined) || (Boolean(spell!.ritual) === filter.ritual))
            .map(({ id, spell }) => ({
                id: id,
                name: name(id),
                summary: firstSentence(text(spell!.text)),
                facts: [
                    `${spell!.level === 0 ? t("wizard.choices.cantrip") : t(`sheet.spellLevels.${spell!.level}`)} · ` +
                    t(`wizard.choices.schools.${spell!.school}`),
                    ...(spell!.duration?.concentration ? [t("wizard.choices.concentration")] : []),
                    ...(spell!.ritual ? [t("wizard.choices.ritual")] : [])
                ],
                group: String(spell!.level)
            }))
            .sort((a, b) => (Number(a.group) - Number(b.group)) || a.name.localeCompare(b.name, language));
    };

    const languages = (choice: ChoiceView): ChoiceOption[] =>
    {
        const already = known("language");
        const mine = new Set(choice.answers);

        return (set.ruleset.languages ?? [])
            .filter((l) => mine.has(l.id) || !already.has(l.id))
            .map((l) => ({
                id: l.id,
                name: text(l.name),
                summary: "",
                facts: [],
                ...(l.exotic ? { group: "exotic" } : {})
            }));
    };

    const subclasses = (choice: ChoiceView): ChoiceOption[] =>
        (choice.options.length ?
            choice.options :
            [...set.entities.values()]
                .filter((e) => (e.type === "subclass") && e.active)
                .filter((e) => data<Subclass>(e.id)?.class === choice.owner)
                .map((e) => e.id))
            .map((id) => ({
                id: id,
                name: name(id),
                summary: firstSentence(text(data<Subclass>(id)?.text)),
                facts: []
            }));

    const listed = (choice: ChoiceView, named: (id: string) => ChoiceOption): ChoiceOption[] =>
        choice.options.map(named);

    const options = (choice: ChoiceView): ChoiceOption[] =>
    {
        switch (choiceKind(choice))
        {
            case "skill":
            case "expertise":
                return listed(choice, (id) => ({ id: id, name: t(`sheet.skills.${id}`), summary: "", facts: [] }));
            case "ability":
                return listed(choice, (id) => ({ id: id, name: t(`sheet.abilities.${id}`), summary: "", facts: [] }));
            case "tool":
                return listed(choice, (id) =>
                {
                    const item = items.get(id);

                    return { id: id, name: item ? name(item) : words(id), summary: "", facts: [] };
                });
            case "language": return choice.options.length ?
                listed(choice, (id) => ({ id: id, name: words(id), summary: "", facts: [] })) :
                languages(choice);
            case "cantrip":
            case "spell": return choice.options.length ?
                listed(choice, (id) => ({ id: id, name: name(id), summary: "", facts: [] })) :
                spells(choice);
            case "subclass": return subclasses(choice);
            case "option":
                return listed(choice, (id) => ({
                    id: id,
                    name: text(choice.optionDetails?.[id]?.name) || words(id),
                    summary: firstSentence(text(choice.optionDetails?.[id]?.text)),
                    facts: []
                }));
            default: return listed(choice, (id) => ({ id: id, name: name(id), summary: "", facts: [] }));
        }
    };

    /** The name of the entity that asks the choice, and of the species, class or background it belongs to. */
    const owner = (choice: ChoiceView): { name: string, root: string } =>
    {
        let root = choice.owner;
        for (let parent = set.entities.get(root)?.inline?.owner; parent; parent = set.entities.get(root)?.inline?.owner)
        {
            root = parent;
        }

        return { name: name(choice.owner), root: name(root) };
    };

    return { options, owner };
}
