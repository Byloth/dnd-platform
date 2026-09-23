<script lang="ts" setup>
    import type { HelpLevel } from "@byloth/dnd-platform-composer";

    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { Contrast, Language, Theme } from "@/stores/preferences";

    const { t, locales } = useI18n();
    const preferences = usePreferencesStore();

    const HELP_LEVELS: HelpLevel[] = ["newcomer", "regular", "expert"];
    const THEMES: Theme[] = ["system", "light", "dark"];
    const CONTRASTS: Contrast[] = ["system", "more"];

    const bind = <K extends "language" | "helpLevel" | "theme" | "contrast">(key: K) => computed({
        get: () => preferences[key],
        set: (value) => { preferences[key] = value; }
    });
    const language = bind("language");
    const helpLevel = bind("helpLevel");
    const theme = bind("theme");
    const contrast = bind("contrast");

    const languages = computed(() => locales.value.map((l) => ({ code: l.code as Language, name: l.name ?? l.code })));
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
                    {{ t("nav.characters") }}
                </RouterLink>
                <RouterLink :to="{ name: 'packages' }" class="navigation-bar__link">
                    {{ t("nav.packages") }}
                </RouterLink>
            </div>
            <details class="navigation-bar__settings">
                <summary class="navigation-bar__link navigation-bar__toggle">
                    <FontAwesome icon="sliders" aria-hidden="true" />
                    <span class="navigation-bar__toggle-label">{{ t("nav.settings") }}</span>
                </summary>
                <div class="navigation-bar__panel">
                    <label class="navigation-bar__field">
                        <span class="navigation-bar__label">{{ t("nav.language") }}</span>
                        <select v-model="language">
                            <option v-for="l in languages"
                                    :key="l.code"
                                    :value="l.code">
                                {{ l.name }}
                            </option>
                        </select>
                    </label>
                    <label class="navigation-bar__field">
                        <span class="navigation-bar__label">{{ t("nav.helpLevel") }}</span>
                        <select v-model="helpLevel">
                            <option v-for="level in HELP_LEVELS"
                                    :key="level"
                                    :value="level">
                                {{ t(`preferences.helpLevel.${level}`) }}
                            </option>
                        </select>
                    </label>
                    <label class="navigation-bar__field">
                        <span class="navigation-bar__label">{{ t("nav.theme") }}</span>
                        <select v-model="theme">
                            <option v-for="value in THEMES"
                                    :key="value"
                                    :value="value">
                                {{ t(`preferences.theme.${value}`) }}
                            </option>
                        </select>
                    </label>
                    <label class="navigation-bar__field">
                        <span class="navigation-bar__label">{{ t("nav.contrast") }}</span>
                        <select v-model="contrast">
                            <option v-for="value in CONTRASTS"
                                    :key="value"
                                    :value="value">
                                {{ t(`preferences.contrast.${value}`) }}
                            </option>
                        </select>
                    </label>
                </div>
            </details>
        </div>
    </nav>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

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

            @media (max-width: variables.$phone-max) { @include mixins.sr-only; }
        }

        &__links
        {
            display: flex;
            gap: var(--space-1);
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
        }

        &__toggle
        {
            list-style: none;

            &::-webkit-details-marker { display: none; }
        }

        &__toggle-label
        {
            @media (max-width: variables.$phone-max) { @include mixins.sr-only; }
        }

        &__settings
        {
            position: relative;

            &[open] > .navigation-bar__toggle
            {
                background-color: var(--color-surface-sunken);
                color: var(--color-ink);
            }
        }

        &__panel
        {
            @include mixins.card(3);

            display: grid;
            gap: var(--space-3);
            padding: var(--space-4);
            position: absolute;
            right: 0;
            top: calc(100% + var(--space-2));
            width: min(20rem, calc(100vw - 2 * var(--space-3)));
        }

        &__field
        {
            display: grid;
            gap: var(--space-1);
        }

        &__label
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            font-weight: 700;
        }
    }
</style>
