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

export interface Preferences
{
    language: Language;
    helpLevel: HelpLevel;
    theme: Theme;
    contrast: Contrast;
    pageSize: PageSize;
}

export const PREFERENCES_KEY = "preferences";

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

export const usePreferencesStore = defineStore("preferences", () =>
{
    const storage = new JSONStorage();
    const initial = _read(storage);

    const language = ref<Language>(initial.language);
    const helpLevel = ref<HelpLevel>(initial.helpLevel);
    const theme = ref<Theme>(initial.theme);
    const contrast = ref<Contrast>(initial.contrast);
    const pageSize = ref<PageSize>(initial.pageSize);

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

    return { language, helpLevel, theme, contrast, pageSize };
});
