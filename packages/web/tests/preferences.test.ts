/**
 * Preferences (docs/phase-1/01-web-application.md): defaults for a newcomer, kept in the browser's storage,
 * unknown stored values dropped, the colour mode applied to the root element.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { DEFAULT_PREFERENCES, PREFERENCES_KEY, usePreferencesStore } from "@/stores/preferences";

beforeEach(() =>
{
    localStorage.clear();
    setActivePinia(createPinia());
});
afterEach(() =>
{
    localStorage.clear();
});

describe("preferences", () =>
{
    it("default to a newcomer in English, following the device's theme", () =>
    {
        const preferences = usePreferencesStore();

        const { language, helpLevel, theme, contrast, pageSize } = preferences;
        expect({ language, helpLevel, theme, contrast, pageSize }).toEqual({ ...DEFAULT_PREFERENCES });
        expect(preferences.helpLevel).toBe("newcomer");
    });

    it("are written on every change and read back by a new store", async () =>
    {
        const preferences = usePreferencesStore();
        preferences.language = "it";
        preferences.helpLevel = "expert";
        preferences.theme = "dark";
        await nextTick();

        expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toEqual({
            language: "it", helpLevel: "expert", theme: "dark", contrast: "system", pageSize: "a4"
        });

        setActivePinia(createPinia());
        const again = usePreferencesStore();
        expect([again.language, again.helpLevel, again.theme]).toEqual(["it", "expert", "dark"]);
    });

    it("start in the browser's language, until one is chosen", () =>
    {
        const languages = vi.spyOn(navigator, "languages", "get").mockReturnValue(["it-IT", "en-US"]);
        expect(usePreferencesStore().language).toBe("it");

        languages.mockReturnValue(["fr-FR", "de-DE"]);
        setActivePinia(createPinia());
        expect(usePreferencesStore().language).toBe("en");

        languages.mockReturnValue(["it-IT"]);
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ language: "en" }));
        setActivePinia(createPinia());
        expect(usePreferencesStore().language).toBe("en");
        languages.mockRestore();
    });

    it("drop stored values they do not know", () =>
    {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ language: "fr", helpLevel: "wizard", theme: "dark" }));

        const preferences = usePreferencesStore();
        expect([preferences.language, preferences.helpLevel, preferences.theme]).toEqual(["en", "newcomer", "dark"]);
    });
});
