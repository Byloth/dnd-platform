import type { ChoiceView } from "@byloth/dnd-platform-engine";
import type { PackageSet } from "@byloth/dnd-platform-loader";

/**
 * Where a choice the sheet asks is answered in the creation wizard (docs/phase-1/14-wizard-steps-revision.md,
 * point 6): in the step of what makes it. Kept pure, for the store (which steps are offered) and the steps.
 */
export type ChoiceStep = "species" | "class" | "background" | "spells" | "choices";

/** The species, class, subclass or background a choice belongs to: its owner, up the inline owners. */
export function rootOwner(choice: ChoiceView, set: PackageSet | undefined): string
{
    let id = choice.owner;
    for (let parent = set?.entities.get(id)?.inline?.owner; parent; parent = set?.entities.get(id)?.inline?.owner)
    {
        id = parent;
    }

    return id;
}

/**
 * The step of a choice: every spell and cantrip to Spells, whatever gives it (the high elf's cantrip too); the
 * subclass and what a class or subclass gives to Class; a species' to Species; a background's to Background;
 * anything else (a feat's own choices) to Other choices. A choice of a later level (an ability increase or a feat)
 * belongs to none: the wizard creates level 1 characters, the level up is Phase 3's.
 */
export function choiceStep(choice: ChoiceView, set: PackageSet | undefined): ChoiceStep | undefined
{
    if (choice.of === "asi-or-feat") { return undefined; }
    if (choice.of === "spell") { return "spells"; }
    if (choice.of === "subclass") { return "class"; }

    switch (set?.entities.get(rootOwner(choice, set))?.type)
    {
        case "species": return "species";
        case "class":
        case "subclass": return "class";
        case "background": return "background";
        default: return "choices";
    }
}
