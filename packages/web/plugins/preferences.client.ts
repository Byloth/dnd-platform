/**
 * Applies the preferences at start and whenever they change: the interface language, and the colour mode of
 * Bootstrap (`data-bs-theme` on the root element), following the device while the theme is `system`.
 */
export default defineNuxtPlugin((nuxtApp) =>
{
    const preferences = usePreferencesStore(nuxtApp.$pinia as never);
    const i18n = nuxtApp.$i18n;

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const applyTheme = (): void =>
    {
        const dark = preferences.theme === "dark" || (preferences.theme === "system" && media?.matches === true);
        document.documentElement.dataset["bsTheme"] = dark ? "dark" : "light";
    };
    media?.addEventListener?.("change", applyTheme);

    watch(() => preferences.theme, applyTheme, { immediate: true });
    watch(() => preferences.language, (language) =>
    {
        if (i18n.locale.value !== language) { void i18n.setLocale(language); }

    }, { immediate: true });
});
