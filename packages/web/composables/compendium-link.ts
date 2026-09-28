import type { InjectionKey } from "vue";

/**
 * Where the links to the compendium sit (docs/phase-1/13-compendium.md): on the sheet they open in place, Back
 * returns to it; inside the wizard, its review's sheet included, they open a new tab, so creation is never left
 * mid-step. Provided by the wizard; the sheet is the default.
 */
export type CompendiumLinkFrom = "sheet" | "wizard";

export const COMPENDIUM_LINK_FROM: InjectionKey<CompendiumLinkFrom> = Symbol("compendium-link-from");

export function useCompendiumLinkFrom(): CompendiumLinkFrom
{
    return inject(COMPENDIUM_LINK_FROM, "sheet");
}
