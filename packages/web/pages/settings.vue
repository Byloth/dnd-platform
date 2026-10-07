<script lang="ts" setup>
    import type { HelpLevel } from "@byloth/dnd-platform-composer";

    import LanguageFlag from "@/components/ui/LanguageFlag.vue";
    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";
    import type { Contrast, Hand, Language, PageSize, Theme, Units } from "@/stores/preferences";

    /**
     * The settings page (docs/phase-1/09-interface-revisions.md, owner 2026-10-07): every setting on one clear page,
     * each a group of cards with a sentence under each option. They stay in this browser and are never part of a
     * character. The bar keeps two quick switches, the theme and the language.
     */
    const { t, locales } = useI18n();
    const preferences = usePreferencesStore();
    const consent = useConsentStore();

    useHead({ title: () => t("settings.title") });

    interface Option { readonly value: string, readonly title: string, readonly summary?: string }
    interface Setting
    {
        readonly id: string;
        readonly options: readonly Option[];
        readonly current: string | undefined;
        readonly set: (value: string) => void;
        readonly flags?: boolean;
    }

    /** The options of a preference with titles from `preferences.<key>` and a sentence from `settings.<key>`. */
    const options = (key: string, values: readonly string[], titles = `preferences.${key}`): Option[] =>
        values.map((value) => ({
            value: value,
            title: t(`${titles}.${value}`),
            summary: t(`settings.${key}.options.${value}`)
        }));

    const settings = computed((): Setting[] => [
        {
            id: "language",
            options: locales.value.map((l) => ({ value: l.code as string, title: l.name ?? l.code })),
            current: preferences.language,
            set: (value) => { preferences.language = value as Language; },
            flags: true
        },
        {
            id: "helpLevel",
            options: options("helpLevel", ["newcomer", "regular", "expert"]),
            current: preferences.helpLevel,
            set: (value) => { preferences.helpLevel = value as HelpLevel; }
        },
        {
            id: "theme",
            options: options("theme", ["system", "light", "dark"]),
            current: preferences.theme,
            set: (value) => { preferences.theme = value as Theme; }
        },
        {
            id: "contrast",
            options: options("contrast", ["system", "more"]),
            current: preferences.contrast,
            set: (value) => { preferences.contrast = value as Contrast; }
        },
        {
            id: "units",
            options: options("units", ["auto", "imperial", "metric"], "settings.units.titles"),
            current: preferences.units,
            set: (value) => { preferences.units = value as Units; }
        },
        {
            id: "pageSize",
            options: options("pageSize", ["a4", "letter"]),
            current: preferences.pageSize,
            set: (value) => { preferences.pageSize = value as PageSize; }
        },
        {
            id: "hand",
            options: options("hand", ["handwriting", "print"]),
            current: preferences.hand,
            set: (value) => { preferences.hand = value as Hand; }
        },
        {
            id: "statistics",
            options: options("statistics", ["on", "off"], "consent"),
            current: { granted: "on", denied: "off", unset: undefined }[consent.analytics],
            set: (value) => (value === "on" ? consent.grant() : consent.deny())
        }
    ]);
</script>

<template>
    <article class="settings-page">
        <h1>{{ t("settings.title") }}</h1>
        <p class="settings-page__intro">
            {{ t("settings.intro") }}
        </p>

        <fieldset v-for="setting in settings"
                  :key="setting.id"
                  class="settings-page__setting">
            <legend class="settings-page__legend">
                <h2 class="settings-page__title">
                    {{ t(`settings.${setting.id}.title`) }}
                </h2>
            </legend>
            <p class="settings-page__text">
                {{ t(`settings.${setting.id}.text`) }}
                <NuxtLink v-if="setting.id === 'statistics'" :to="{ name: 'privacy' }">
                    {{ t("settings.statistics.privacy") }}
                </NuxtLink>
            </p>
            <div class="settings-page__options">
                <ChoiceCard v-for="option in setting.options"
                            :key="option.value"
                            :name="`settings-${setting.id}`"
                            :value="option.value"
                            :title="option.title"
                            :summary="option.summary"
                            :checked="option.value === setting.current"
                            help-level="newcomer"
                            @select="setting.set(option.value)">
                    <LanguageFlag v-if="setting.flags"
                                  class="settings-page__flag"
                                  :language="option.value" />
                </ChoiceCard>
            </div>
        </fieldset>
    </article>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .settings-page
    {
        display: grid;
        gap: var(--space-6);
        max-width: 56rem;

        &__intro,
        &__text
        {
            color: var(--color-ink-muted);
        }

        &__intro
        {
            margin: 0;
        }

        &__setting
        {
            border: 0;
            border-top: 1px solid var(--color-border);
            margin: 0;
            min-width: 0;
            padding: var(--space-5) 0 0;
        }

        &__legend
        {
            float: left;
            padding: 0;
            width: 100%;

            + *
            {
                clear: both;
            }
        }

        &__title
        {
            font-size: var(--text-lg);
            margin: 0;
        }

        &__text
        {
            margin: var(--space-2) 0 var(--space-4);
        }

        &__options
        {
            display: grid;
            gap: var(--space-3);

            @include mixins.from(variables.$tablet-min)
            {
                grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
            }
        }

        &__flag
        {
            font-size: 1.5rem;
            margin-top: var(--space-2);
        }
    }
</style>
