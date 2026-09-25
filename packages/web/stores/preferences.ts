import { JSONStorage } from "@byloth/core";
import { defineStore } from "pinia";

import type { HelpLevel } from "@byloth/dnd-platform-composer";

/**
 * The user's preferences (docs/phase-1/01-web-application.md): language, help level, theme and page size, kept
 * in the browser's storage and applied at render time only. Never part of a character, never exported.
 */

export type Language = "en" | "it";
export type Theme = "system" | "light" | "dark";
/** `system` follows the device's `prefers-contrast`; `more` always uses the high-contrast variant. */
export type Contrast = "system" | "more";
export type PageSize = "a4" | "letter";

/** How one character's sheet is arranged: sections pinned to the top, sections collapsed. Never exported. */
export interface SheetLayout
{
    pinned: string[];
    collapsed: string[];
}

export interface Preferences
{
    language: Language;
    helpLevel: HelpLevel;
    theme: Theme;
    contrast: Contrast;
    pageSize: PageSize;
}

export const PREFERENCES_KEY = "preferences";
export const SHEETS_KEY = "sheet-layouts";

/** The platform is for newcomers first (docs/01-vision.md): the default help level explains everything. */
export const DEFAULT_PREFERENCES: Readonly<Preferences> = {
    language: "en",
    helpLevel: "newcomer",
    theme: "system",
    contrast: "system",
    pageSize: "a4"
};

const ALLOWED: { readonly [K in keyof Preferences]: readonly Preferences[K][] } = {
    language: ["en", "it"],
    helpLevel: ["newcomer", "regular", "expert"],
    theme: ["system", "light", "dark"],
    contrast: ["system", "more"],
    pageSize: ["a4", "letter"]
};

/** The stored preferences, each checked against its allowed values; anything else falls back to the default. */
function _read(storage: JSONStorage): Preferences
{
    const stored = storage.get<Record<string, unknown>>(PREFERENCES_KEY) ?? {};
    const pick = <K extends keyof Preferences>(key: K): Preferences[K] =>
    {
        const value = stored[key] as Preferences[K];

        return ALLOWED[key].includes(value) ? value : DEFAULT_PREFERENCES[key];
    };

    return {
        language: pick("language"),
        helpLevel: pick("helpLevel"),
        theme: pick("theme"),
        contrast: pick("contrast"),
        pageSize: pick("pageSize")
    };
}

/** The stored sheet layouts, keeping only well-formed entries. */
function _readSheets(storage: JSONStorage): Record<string, SheetLayout>
{
    const stored = storage.get<Record<string, unknown>>(SHEETS_KEY) ?? {};
    const strings = (value: unknown): string[] =>
        (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

    return Object.fromEntries(Object.entries(stored).map(([id, layout]) =>
    {
        const l = (layout ?? {}) as Record<string, unknown>;

        return [id, { pinned: strings(l["pinned"]), collapsed: strings(l["collapsed"]) }];
    }));
}

export const usePreferencesStore = defineStore("preferences", () =>
{
    const storage = new JSONStorage();
    const initial = _read(storage);

    const language = ref<Language>(initial.language);
    const helpLevel = ref<HelpLevel>(initial.helpLevel);
    const theme = ref<Theme>(initial.theme);
    const contrast = ref<Contrast>(initial.contrast);
    const pageSize = ref<PageSize>(initial.pageSize);
    const sheets = ref<Record<string, SheetLayout>>(_readSheets(storage));

    watch([language, helpLevel, theme, contrast, pageSize], () =>
    {
        storage.set(PREFERENCES_KEY, {
            language: language.value,
            helpLevel: helpLevel.value,
            theme: theme.value,
            contrast: contrast.value,
            pageSize: pageSize.value
        });
    });
    watch(sheets, () => storage.set(SHEETS_KEY, sheets.value), { deep: true });

    /** The layout of one character's sheet (created empty on first use). */
    const sheetLayout = (characterId: string): SheetLayout =>
    {
        sheets.value[characterId] ??= { pinned: [], collapsed: [] };

        return sheets.value[characterId];
    };
    const toggle = (list: string[], section: string): void =>
    {
        const at = list.indexOf(section);
        if (at >= 0) { list.splice(at, 1); }
        else { list.push(section); }
    };
    const togglePinned = (characterId: string, section: string): void =>
        toggle(sheetLayout(characterId).pinned, section);
    const toggleCollapsed = (characterId: string, section: string): void =>
        toggle(sheetLayout(characterId).collapsed, section);

    /** Forgets a character's layout, when the character is deleted. */
    const forgetSheet = (characterId: string): void =>
    {
        const { [characterId]: _forgotten, ...rest } = sheets.value;
        sheets.value = rest;
    };

    return {
        language, helpLevel, theme, contrast, pageSize, sheets, sheetLayout, togglePinned, toggleCollapsed, forgetSheet
    };
});
