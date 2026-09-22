import { compose } from "@byloth/dnd-platform-composer";
import type { SectionTree } from "@byloth/dnd-platform-composer";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character, ComputedSheet, PackageSet } from "@byloth/dnd-platform-engine";

export interface ComposedSheet
{
    readonly sheet: ComputedSheet;
    readonly tree: SectionTree;
}

/** Derive a character and compose its section tree; pure, memoised by the caller's reactivity. */
export function composeSheet(character: Character, packages: PackageSet, language?: string): ComposedSheet
{
    const options = language !== undefined ? { language } : {};
    const sheet = derive(character, packages, options);
    const tree = compose(sheet, { character, packages, ...options });

    return { sheet, tree };
}
