<script lang="ts" setup>
    import DropdownMenu from "@/components/ui/DropdownMenu.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import LanguageFlag from "@/components/ui/LanguageFlag.vue";
    import type { Language, Theme } from "@/stores/preferences";

    /**
     * The navigation bar (docs/phase-1/09-interface-revisions.md, owner 2026-10-07): Characters, Compendium,
     * Packages and Settings, each with its icon; then two quick switches, the colour mode and the language. Every
     * other setting is on the settings page.
     */
    const { t, locales } = useI18n();
    const preferences = usePreferencesStore();

    const THEME_ICONS: Readonly<Record<Theme, string>> = { system: "circle-half-stroke", light: "sun", dark: "moon" };
    const themes = computed(() => (Object.keys(THEME_ICONS) as Theme[])
        .map((value) => ({ value: value, label: t(`preferences.theme.${value}`) })));
    const theme = computed({
        get: (): string => preferences.theme,
        set: (value: string) => { preferences.theme = value as Theme; }
    });

    const languages = computed(() => locales.value.map((l) => ({ value: l.code as string, label: l.name ?? l.code })));
    const language = computed({
        get: (): string => preferences.language,
        set: (value: string) => { preferences.language = value as Language; }
    });
    const languageName = computed(() => languages.value.find((l) => l.value === language.value)?.label ?? "");
</script>

<template>
    <nav class="navigation-bar" :aria-label="t('nav.main')">
        <div class="navigation-bar__inner">
            <RouterLink :to="{ name: 'index' }" class="navigation-bar__brand">
                <FontAwesome class="navigation-bar__mark"
                             icon="dice-d20"
                             aria-hidden="true" />
                <span class="navigation-bar__name">{{ t("app.title") }}</span>
            </RouterLink>
            <div class="navigation-bar__links">
                <RouterLink :to="{ name: 'index' }" class="navigation-bar__link">
                    <FontAwesome class="navigation-bar__icon"
                                 icon="users"
                                 aria-hidden="true" />
                    <span class="navigation-bar__text">{{ t("nav.characters") }}</span>
                </RouterLink>
                <RouterLink :to="{ name: 'compendium' }" class="navigation-bar__link">
                    <FontAwesome class="navigation-bar__icon"
                                 icon="book-open"
                                 aria-hidden="true" />
                    <span class="navigation-bar__text">{{ t("nav.compendium") }}</span>
                </RouterLink>
                <RouterLink :to="{ name: 'packages' }" class="navigation-bar__link">
                    <FontAwesome class="navigation-bar__icon"
                                 icon="box-archive"
                                 aria-hidden="true" />
                    <span class="navigation-bar__text">{{ t("nav.packages") }}</span>
                </RouterLink>
                <RouterLink :to="{ name: 'settings' }" class="navigation-bar__link">
                    <FontAwesome class="navigation-bar__icon"
                                 icon="sliders"
                                 aria-hidden="true" />
                    <span class="navigation-bar__text">{{ t("nav.settings") }}</span>
                </RouterLink>
            </div>
            <div class="navigation-bar__switches">
                <DropdownMenu v-model="theme"
                              :label="t('nav.themeSwitch', { value: t(`preferences.theme.${theme}`) })"
                              :items="themes">
                    <template #button>
                        <FontAwesome :icon="THEME_ICONS[preferences.theme]" />
                    </template>
                    <template #item="{ item }">
                        <FontAwesome :icon="THEME_ICONS[item.value as Theme]" />
                    </template>
                </DropdownMenu>
                <DropdownMenu v-model="language"
                              :label="t('nav.languageSwitch', { value: languageName })"
                              :items="languages">
                    <template #button>
                        <LanguageFlag :language="language" />
                    </template>
                    <template #item="{ item }">
                        <LanguageFlag :language="item.value" />
                    </template>
                </DropdownMenu>
            </div>
        </div>
    </nav>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    // Four links and two switches, narrowing step by step: under $named-max the brand keeps only its mark; under
    // $compact-max each link is its icon over a short label; under $icons-only-max the labels go to the screen
    // reader and the icons stay; under $tiny-max the brand gives way too (Characters is the home page). The bar
    // never scrolls sideways (WCAG 1.4.10; M1.8b). Measured with the Italian labels, the longest.
    $named-max: 991px;
    $compact-max: 719px;
    $icons-only-max: 559px;
    $tiny-max: 359px;

    .navigation-bar
    {
        backdrop-filter: blur(12px) saturate(1.2);
        background-color: color-mix(in srgb, var(--color-surface) 82%, transparent);
        border-bottom: 1px solid var(--color-border);
        inset: 0 0 auto;
        position: fixed;
        z-index: 10;

        &__inner
        {
            align-items: center;
            display: flex;
            gap: var(--space-2);
            margin: 0 auto;
            max-width: var(--content-max-width);
            min-height: var(--navigation-bar-height);
            padding: 0 var(--space-3);
        }

        &__brand
        {
            @include mixins.tap-target;

            align-items: center;
            color: var(--color-ink);
            display: inline-flex;
            gap: var(--space-2);
            margin-right: auto;
            text-decoration: none;

            @media (max-width: $tiny-max) { display: none; }
        }

        &__mark
        {
            color: var(--color-accent);
            font-size: 1.6rem;
        }

        &__name
        {
            font-family: var(--font-display);
            font-size: var(--text-lg);
            font-weight: 700;
            letter-spacing: 0.04em;

            @media (max-width: $named-max) { @include mixins.sr-only; }
        }

        &__links
        {
            display: flex;
            gap: var(--space-1);

            @media (max-width: $tiny-max) { margin-right: auto; }
        }

        &__link
        {
            @include mixins.tap-target;

            align-items: center;
            border-radius: var(--radius-md);
            color: var(--color-ink-muted);
            cursor: pointer;
            display: inline-flex;
            font-weight: 700;
            gap: var(--space-2);
            justify-content: center;
            padding: 0 var(--space-3);
            text-decoration: none;
            transition: background-color var(--duration-fast) var(--easing), color var(--duration-fast) var(--easing);

            &:hover
            {
                background-color: var(--color-surface-sunken);
                color: var(--color-ink);
            }

            &.router-link-exact-active
            {
                background-color: var(--color-accent-soft);
                color: var(--color-accent);
            }

            @media (max-width: $compact-max)
            {
                flex-direction: column;
                font-size: var(--text-xs);
                gap: 2px;
                padding: var(--space-1) var(--space-2);
            }
        }

        &__text
        {
            @media (max-width: $icons-only-max) { @include mixins.sr-only; }
        }

        &__icon
        {
            font-size: 1.1rem;
        }

        // The colour mode and the language: smaller than the links, a quick switch (owner, 2026-10-07).
        &__switches
        {
            border-left: 1px solid var(--color-border);
            display: flex;
            gap: 2px;
            margin-left: var(--space-1);
            padding-left: var(--space-1);
        }
    }
</style>
