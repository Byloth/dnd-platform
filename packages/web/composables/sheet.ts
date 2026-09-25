import { compose } from "@byloth/dnd-platform-composer";
import type { HelpLevel, SectionTree, Translate } from "@byloth/dnd-platform-composer";
import type { PackageSet } from "@byloth/dnd-platform-loader";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character, ComputedSheet } from "@byloth/dnd-platform-engine";

export interface ComposedSheet
{
    readonly sheet: ComputedSheet;
    readonly tree: SectionTree;
    /** The package set the sheet was derived with (names, texts and the explanations of the drawer). */
    readonly packages: PackageSet;
}

export interface ComposeSheetOptions
{
    readonly language?: string;
    readonly helpLevel?: HelpLevel;
    readonly translate?: Translate;
    /** Default: metric in Italian, imperial otherwise, until the units setting (docs/phase-1/09). */
    readonly units?: "imperial" | "metric";
}

/** Derive a character and compose its section tree; pure, memoised by `useEngine`. */
export function composeSheet(
    character: Character, packages: PackageSet, options: ComposeSheetOptions = {}
): ComposedSheet
{
    const { language, helpLevel, translate } = options;
    const units = options.units ?? (language === "it" ? "metric" : "imperial");
    const sheet = derive(character, packages, language !== undefined ? { language } : {});
    const tree = compose(sheet, {
        character: character,
        packages: packages,
        ...(language !== undefined ? { language: language } : {}),
        ...(helpLevel !== undefined ? { helpLevel: helpLevel } : {}),
        ...(translate !== undefined ? { translate: translate } : {}),
        units: units
    });

    return { sheet, tree, packages };
}

/** vue-i18n's `t`, in the two forms the adapter uses. */
export interface VueI18nTranslate
{
    (key: string, named: Record<string, unknown>): string;
    (key: string, plural: number, options: { named: Record<string, unknown> }): string;
}

/**
 * The composer's `Translate` over vue-i18n's `t`: a `count` parameter chooses the plural form, as the composer's
 * own translator does.
 */
export function sheetTranslate(t: VueI18nTranslate): Translate
{
    return (key, params = {}) =>
    {
        const count = params["count"];

        return typeof count === "number" ? t(key, count, { named: { ...params } }) : t(key, { ...params });
    };
}

/** `sheetTranslate` over the component's `useI18n()`; call it in a component's setup. */
export function useSheetTranslate(): Translate
{
    return sheetTranslate(useI18n().t as VueI18nTranslate);
}
