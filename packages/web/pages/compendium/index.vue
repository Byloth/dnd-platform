<script lang="ts" setup>
    import CompendiumSearch from "@/components/compendium/CompendiumSearch.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import { COMPENDIUM_KINDS, entriesOf, search } from "@/composables/compendium";
    import type { CompendiumKind } from "@/composables/compendium";

    /**
     * The compendium's front page (docs/phase-1/13-compendium.md): a search over everything and a card per section.
     * The creatures are fetched only once a search starts, as the bestiary does; the sheet never fetches them.
     */
    const { t, locale } = useI18n();
    const route = useRoute();
    const router = useRouter();

    useHead({ title: () => t("compendium.title") });

    const ICONS: Readonly<Record<CompendiumKind, string>> = {
        spells: "wand-sparkles",
        items: "shield-halved",
        creatures: "dragon",
        conditions: "heart-crack"
    };
    const PREVIEW = 5;

    const query = computed(() => (typeof route.query["q"] === "string" ? route.query["q"] : ""));
    const onSearch = (q: string): void =>
    {
        router.replace({ query: q ? { q: q } : {} });
    };

    // Once asked for, the creatures stay: going back to an empty search does not drop the bestiary's count.
    const withCreatures = ref(query.value !== "");
    watch(query, (q) =>
    {
        if (q) { withCreatures.value = true; }
    });

    const { data, status } = await useAsyncData(
        () => `compendium-home-${locale.value}-${withCreatures.value}`,
        () => useCompendium().set({ creatures: withCreatures.value }),
        { watch: [locale, withCreatures] }
    );

    const hasCreatures = computed(() =>
        [...data.value?.packages.entities.values() ?? []].some((e) => e.type === "creature"));
    const count = (kind: CompendiumKind): number | undefined =>
    {
        if (!data.value || ((kind === "creatures") && !hasCreatures.value)) { return undefined; }

        return entriesOf(data.value.packages, kind, locale.value).length;
    };

    const groups = computed(() =>
    {
        if (!data.value || !query.value) { return []; }

        return COMPENDIUM_KINDS.map((kind) =>
        {
            const found = search(entriesOf(data.value!.packages, kind, locale.value), query.value);

            return { kind: kind, total: found.length, entries: found.slice(0, PREVIEW) };
        }).filter((g) => g.total > 0);
    });
    const loadingCreatures = computed(() => withCreatures.value && !hasCreatures.value && (status.value === "pending"));

    // Statistics: how many results a search over everything found, once the bestiary is in; never the words.
    const { track } = useAnalytics();
    let _counted = "";
    watch([query, hasCreatures], ([q, ready]) =>
    {
        if (!q || !ready || (q === _counted)) { return; }
        _counted = q;
        track("compendium-search", { kind: "all", results: groups.value.reduce((sum, g) => sum + g.total, 0) });

    }, { immediate: true });
</script>

<template>
    <div class="compendium-home">
        <header class="compendium-home__header">
            <h1 class="compendium-home__title">
                <FontAwesome icon="book-open" aria-hidden="true" />
                {{ t("compendium.title") }}
            </h1>
            <p class="compendium-home__intro">
                {{ t("compendium.intro") }}
            </p>
        </header>

        <CompendiumSearch :model-value="query"
                          :label="t('compendium.search.everywhere')"
                          :placeholder="t('compendium.search.placeholder')"
                          @update:model-value="onSearch" />

        <p v-if="loadingCreatures"
           class="compendium-home__loading"
           role="status">
            <FontAwesome icon="spinner" aria-hidden="true" />
            {{ t("compendium.loadingCreatures") }}
        </p>

        <section v-if="query"
                 class="compendium-home__results"
                 aria-live="polite">
            <p v-if="!groups.length && !loadingCreatures" class="compendium-home__empty">
                {{ t("compendium.noResults") }}
            </p>
            <section v-for="group in groups"
                     :key="group.kind"
                     class="compendium-home__group"
                     :aria-labelledby="`results-${group.kind}`">
                <h2 :id="`results-${group.kind}`" class="compendium-home__group-title">
                    <FontAwesome :icon="ICONS[group.kind]" aria-hidden="true" />
                    {{ t(`compendium.kinds.${group.kind}.name`) }}
                </h2>
                <ul class="compendium-home__hits">
                    <li v-for="entry in group.entries" :key="entry.id">
                        <NuxtLink class="compendium-home__hit"
                                  :to="{ name: 'compendium-kind-id', params: { kind: group.kind, id: entry.id } }">
                            <span class="compendium-home__hit-name">{{ entry.name }}</span>
                            <span class="compendium-home__hit-subtitle">{{ entry.subtitle }}</span>
                        </NuxtLink>
                    </li>
                </ul>
                <NuxtLink v-if="group.total > group.entries.length"
                          class="compendium-home__all"
                          :to="{ name: 'compendium-kind', params: { kind: group.kind }, query: { q: query } }">
                    {{ t("compendium.seeAll", { count: group.total }) }}
                </NuxtLink>
            </section>
        </section>

        <ul v-else class="compendium-home__kinds">
            <li v-for="kind in COMPENDIUM_KINDS"
                :key="kind"
                class="compendium-home__kind">
                <NuxtLink class="compendium-home__card" :to="{ name: 'compendium-kind', params: { kind: kind } }">
                    <span class="compendium-home__icon" aria-hidden="true">
                        <FontAwesome :icon="ICONS[kind]" />
                    </span>
                    <span class="compendium-home__name">{{ t(`compendium.kinds.${kind}.name`) }}</span>
                    <span class="compendium-home__description">{{ t(`compendium.kinds.${kind}.description`) }}</span>
                    <span v-if="count(kind) !== undefined" class="compendium-home__count">
                        {{ t(`compendium.count.${kind}`, count(kind)!) }}
                    </span>
                </NuxtLink>
            </li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .compendium-home
    {
        display: grid;
        gap: var(--space-5);

        &__header
        {
            max-width: 46rem;
        }

        &__title
        {
            align-items: center;
            display: flex;
            gap: var(--space-3);
            margin: 0;

            :deep(svg)
            {
                color: var(--color-brass);
            }
        }

        &__intro
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
            margin: var(--space-2) 0 0;
        }

        &__loading,
        &__empty
        {
            color: var(--color-ink-muted);
            margin: 0;
        }

        &__kinds
        {
            display: grid;
            gap: var(--space-4);
            list-style: none;
            margin: 0;
            padding: 0;

            @include mixins.from(variables.$tablet-min)
            {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        &__card
        {
            @include mixins.card(1);

            color: inherit;
            display: grid;
            gap: var(--space-1) var(--space-4);
            grid-template-columns: auto 1fr;
            height: 100%;
            padding: var(--space-5);
            text-decoration: none;
            transition:
                border-color var(--duration-fast) var(--easing),
                box-shadow var(--duration-fast) var(--easing),
                transform var(--duration-fast) var(--easing);

            &:hover
            {
                border-color: var(--color-accent);
                box-shadow: var(--shadow-2);
                transform: translateY(-2px);
            }

            &:focus-visible
            {
                @include mixins.focus-ring;
            }
        }

        &__icon
        {
            align-items: center;
            background-color: var(--color-accent);
            border-radius: var(--radius-md);
            color: var(--color-accent-ink);
            display: inline-flex;
            font-size: var(--text-xl);
            grid-row: span 3;
            height: 3rem;
            justify-content: center;
            width: 3rem;
        }

        &__name
        {
            color: var(--color-accent);
            font-family: var(--font-display);
            font-size: var(--text-xl);
            font-weight: 700;
        }

        &__description
        {
            color: var(--color-ink-muted);
        }

        &__count
        {
            color: var(--color-brass);
            font-size: var(--text-sm);
            font-weight: 700;
        }

        &__results
        {
            display: grid;
            gap: var(--space-5);
        }

        &__group
        {
            @include mixins.card(1);

            padding: var(--space-4) var(--space-5);
        }

        &__group-title
        {
            align-items: center;
            color: var(--color-brass);
            display: flex;
            font-size: var(--text-lg);
            gap: var(--space-2);
            margin: 0 0 var(--space-2);
        }

        &__hits
        {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__hit
        {
            @include mixins.tap-target;

            border-bottom: 1px solid var(--color-border);
            color: inherit;
            display: flex;
            flex-wrap: wrap;
            gap: 0 var(--space-3);
            justify-content: space-between;
            padding: var(--space-2) 0;
            text-decoration: none;

            &:hover .compendium-home__hit-name
            {
                text-decoration: underline;
            }

            &:focus-visible
            {
                @include mixins.focus-ring;
            }
        }

        &__hit-name
        {
            color: var(--color-accent);
            font-weight: 700;
        }

        &__hit-subtitle
        {
            color: var(--color-ink-muted);
            font-style: italic;
        }

        &__all
        {
            color: var(--color-accent);
            display: inline-block;
            font-weight: 700;
            margin-top: var(--space-3);
        }
    }
</style>
