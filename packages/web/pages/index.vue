<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    // The characters page: the player's own characters, stored in this browser, then the site's demo characters,
    // each linking its sheet.

    const { t } = useI18n();
    const { list } = useCharacters();

    const { data: characters, status } = await useAsyncData("characters", () => list());
    const groups = computed(() => (["stored", "demo"] as const)
        .map((origin) => ({ origin: origin, characters: (characters.value ?? []).filter((c) => c.origin === origin) }))
        .filter((g) => g.characters.length > 0));
</script>

<template>
    <div class="characters-page">
        <header class="characters-page__header">
            <h1 class="characters-page__title">
                {{ t("characters.heading") }}
            </h1>
            <p class="characters-page__intro">
                {{ t("characters.intro") }}
            </p>
            <AppButton :to="{ name: 'characters-new' }">
                <FontAwesome icon="dice-d20" aria-hidden="true" />
                {{ t("wizard.create") }}
            </AppButton>
        </header>
        <p v-if="status === 'pending'" role="status">
            {{ t("characters.loading") }}
        </p>
        <p v-else-if="status === 'error'" role="alert">
            {{ t("characters.failed") }}
        </p>
        <template v-else>
            <section v-for="group in groups"
                     :key="group.origin"
                     class="characters-page__section"
                     :aria-labelledby="`characters-${group.origin}-heading`">
                <h2 :id="`characters-${group.origin}-heading`" class="characters-page__subtitle">
                    {{ t(`characters.${group.origin}`) }}
                </h2>
                <ul class="characters-page__list">
                    <li v-for="character in group.characters"
                        :key="character.id"
                        class="characters-page__item">
                        <NuxtLink :to="{ name: 'characters-id', params: { id: character.id } }"
                                  class="character-card">
                            <span class="character-card__crest" aria-hidden="true">
                                {{ character.name.charAt(0) }}
                            </span>
                            <span class="character-card__text">
                                <strong class="character-card__name">{{ character.name }}</strong>
                                <span class="character-card__summary">{{ character.summary }}</span>
                            </span>
                            <FontAwesome class="character-card__go"
                                         icon="chevron-right"
                                         aria-hidden="true" />
                        </NuxtLink>
                    </li>
                </ul>
            </section>
        </template>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .characters-page
    {
        &__header
        {
            margin-bottom: var(--space-6);
            max-width: 46rem;
        }

        &__intro
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
        }

        &__section + &__section
        {
            margin-top: var(--space-7);
        }

        &__subtitle
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        &__list
        {
            display: grid;
            gap: var(--space-4);
            grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
            list-style: none;
            margin: 0;
            padding: 0;
        }
    }

    .character-card
    {
        @include mixins.card(1);

        align-items: center;
        color: var(--color-ink);
        display: flex;
        gap: var(--space-4);
        min-height: 5.5rem;
        padding: var(--space-4);
        text-decoration: none;
        transition:
            transform var(--duration-fast) var(--easing),
            box-shadow var(--duration-fast) var(--easing),
            border-color var(--duration-fast) var(--easing);

        &:hover
        {
            border-color: var(--color-border-strong);
            box-shadow: var(--shadow-2);
            text-decoration: none;
            transform: translateY(-2px);

            .character-card__go
            {
                color: var(--color-accent);
                transform: translateX(2px);
            }
        }

        &__crest
        {
            align-items: center;
            background: linear-gradient(145deg, var(--color-accent), var(--color-brass));
            border-radius: var(--radius-round);
            box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-surface-raised) 35%, transparent);
            color: var(--color-accent-ink);
            display: inline-flex;
            flex: none;
            font-family: var(--font-display);
            font-size: var(--text-2xl);
            font-weight: 700;
            height: 3.25rem;
            justify-content: center;
            width: 3.25rem;
        }

        &__text
        {
            display: grid;
            flex: 1;
            min-width: 0;
        }

        &__name
        {
            font-family: var(--font-display);
            font-size: var(--text-lg);
        }

        &__summary
        {
            color: var(--color-ink-muted);
        }

        &__go
        {
            color: var(--color-ink-muted);
            transition: transform var(--duration-fast) var(--easing), color var(--duration-fast) var(--easing);
        }
    }
</style>
