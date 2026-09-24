/**
 * Applies the preferences at start and whenever they change: the interface language, the theme (`data-theme`
 * light | dark on the root element, following the device while `system`) and the contrast (`data-contrast`
 * more, following the device's `prefers-contrast` while `system`) and the document's `lang`; the tokens of
 * assets/scss/_tokens.scss do the rest.
 */
export default defineNuxtPlugin((nuxtApp) =>
{
    const preferences = usePreferencesStore(nuxtApp.$pinia as never);
    const i18n = nuxtApp.$i18n;
    const root = document.documentElement;

    const dark = window.matchMedia?.("(prefers-color-scheme: dark)");
    const more = window.matchMedia?.("(prefers-contrast: more)");
    const apply = (): void =>
    {
        const isDark = preferences.theme === "dark" || (preferences.theme === "system" && dark?.matches === true);
        root.dataset["theme"] = isDark ? "dark" : "light";

        if (preferences.contrast === "more" || more?.matches === true) { root.dataset["contrast"] = "more"; }
        else { delete root.dataset["contrast"]; }
    };
    dark?.addEventListener?.("change", apply);
    more?.addEventListener?.("change", apply);

    watch(() => [preferences.theme, preferences.contrast], apply, { immediate: true });
    watch(() => preferences.language, (language) =>
    {
        if (i18n.locale.value !== language) { void i18n.setLocale(language); }

    }, { immediate: true });
    // The document's language follows the interface's, for screen readers and hyphenation.
    watch(i18n.locale, (locale) => { root.lang = locale; }, { immediate: true });
});
