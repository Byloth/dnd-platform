<script lang="ts" setup>
    import type { HelpLevel } from "@byloth/dnd-platform-composer";

    import type { Language, Theme } from "@/stores/preferences";

    const { t, locales } = useI18n();
    const preferences = usePreferencesStore();

    const HELP_LEVELS: HelpLevel[] = ["newcomer", "regular", "expert"];
    const THEMES: Theme[] = ["system", "light", "dark"];

    const language = computed({
        get: (): Language => preferences.language,
        set: (value: Language): void => { preferences.language = value; }
    });
    const helpLevel = computed({
        get: (): HelpLevel => preferences.helpLevel,
        set: (value: HelpLevel): void => { preferences.helpLevel = value; }
    });
    const theme = computed({
        get: (): Theme => preferences.theme,
        set: (value: Theme): void => { preferences.theme = value; }
    });
</script>

<template>
    <nav class="navigation-bar" :aria-label="t('nav.main')">
        <div class="container bar">
            <div class="links">
                <RouterLink :to="{ name: 'index' }" class="link bold">
                    {{ t("app.title") }}
                </RouterLink>
                <RouterLink :to="{ name: 'index' }" class="link">
                    {{ t("nav.characters") }}
                </RouterLink>
                <RouterLink :to="{ name: 'packages' }" class="link">
                    {{ t("nav.packages") }}
                </RouterLink>
            </div>
            <details class="settings">
                <summary class="link">
                    {{ t("nav.settings") }}
                </summary>
                <div class="settings-panel">
                    <label>
                        <span>{{ t("nav.language") }}</span>
                        <select v-model="language">
                            <option v-for="l in locales"
                                    :key="l.code"
                                    :value="l.code">
                                {{ l.name }}
                            </option>
                        </select>
                    </label>
                    <label>
                        <span>{{ t("nav.helpLevel") }}</span>
                        <select v-model="helpLevel">
                            <option v-for="level in HELP_LEVELS"
                                    :key="level"
                                    :value="level">
                                {{ t(`preferences.helpLevel.${level}`) }}
                            </option>
                        </select>
                    </label>
                    <label>
                        <span>{{ t("nav.theme") }}</span>
                        <select v-model="theme">
                            <option v-for="value in THEMES"
                                    :key="value"
                                    :value="value">
                                {{ t(`preferences.theme.${value}`) }}
                            </option>
                        </select>
                    </label>
                </div>
            </details>
        </div>
    </nav>
</template>

<style lang="scss" scoped>
    .navigation-bar
    {
        background-color: rgba(var(--bs-body-bg-rgb), 0.75);
        box-shadow: 0px 0px 1em rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(10px);
        position: fixed;
        top: 0px;
        width: 100%;
        z-index: 1;

        .bar
        {
            align-items: center;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            min-height: var(--navigation-bar-height);
        }

        .links
        {
            display: flex;
            flex-wrap: wrap;
        }

        .link
        {
            align-items: center;
            cursor: pointer;
            display: inline-flex;
            min-height: 44px;
            padding: 0.5em 0.75em;

            &.bold
            {
                font-weight: bold;
            }

            &.router-link-exact-active:not(.bold)
            {
                text-decoration: underline;
            }
        }

        .settings
        {
            position: relative;

            .settings-panel
            {
                background-color: var(--bs-body-bg);
                border: 1px solid var(--bs-border-color);
                border-radius: 0.5em;
                display: flex;
                flex-direction: column;
                gap: 0.75em;
                padding: 1em;
                position: absolute;
                right: 0px;
                z-index: 2;

                label
                {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25em;
                }

                select
                {
                    min-height: 44px;
                    min-width: 12em;
                }
            }
        }
    }
</style>
