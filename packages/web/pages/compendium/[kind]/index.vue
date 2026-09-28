<script lang="ts" setup>
    import CompendiumFilters from "@/components/compendium/CompendiumFilters.vue";
    import CompendiumList from "@/components/compendium/CompendiumList.vue";
    import CompendiumSearch from "@/components/compendium/CompendiumSearch.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import {
        COMPENDIUM_KINDS, entriesOf, facetLabel, filter, filterOptions, fromQuery, search, toQuery
    } from "@/composables/compendium";
    import type { CompendiumKind, Filters } from "@/composables/compendium";

    /**
     * A section of the compendium (docs/phase-1/13-compendium.md): its entries, searched and filtered. The search
     * and the filters live in the address, so Back and a shared link give the same list. Only the bestiary fetches
     * the creatures.
     */
    const { t, locale } = useI18n();
    const route = useRoute();
    const router = useRouter();

    const kind = computed(() => String(route.params["kind"]) as CompendiumKind);
    const valid = computed(() => COMPENDIUM_KINDS.includes(kind.value));

    useHead({
        title: () => (valid.value ? t(`compendium.kinds.${kind.value}.name`) : t("compendium.notFound.heading"))
    });

    const { data } = await useAsyncData(
        () => `compendium-${kind.value}-${locale.value}`,
        async () => (valid.value ? useCompendium().set({ creatures: kind.value === "creatures" }) : null),
        { watch: [kind, locale] }
    );

    const state = computed(() => fromQuery(kind.value, route.query));
    const entries = computed(() => (data.value ? entriesOf(data.value.packages, kind.value, locale.value) : []));
    const results = computed(() => search(filter(entries.value, kind.value, state.value.filters), state.value.q));
    const options = computed(() => filterOptions(entries.value));
    const label = (key: string, value: string): string =>
        facetLabel(t, kind.value, key, value, data.value!.packages, locale.value);

    // Statistics (docs/phase-1/12-analytics.md): how many results a search found and which filter was touched,
    // never the words typed nor a filter's value.
    const { track } = useAnalytics();
    const go = async (q: string, filters: Filters): Promise<void> =>
    {
        const before = state.value;
        await router.replace({ query: toQuery({ q: q, filters: filters }) });

        if (q && (q !== before.q)) { track("compendium-search", { kind: kind.value, results: results.value.length }); }
        const keys = new Set([...Object.keys(before.filters), ...Object.keys(filters)]);
        for (const key of keys)
        {
            if (before.filters[key] !== filters[key]) { track("compendium-filter", { kind: kind.value, filter: key }); }
        }
    };

    // The packages left out are named as the packages page names them.
    const content = useContentStore();
    const skipped = computed(() => (data.value?.skipped ?? []).map((id) =>
    {
        const names = content.stored.find((p) => p.manifest.id === id)?.manifest.name as
            Record<string, string | undefined> | undefined;

        return names?.[locale.value] ?? names?.["en"] ?? id;
    }));
    watch(() => data.value?.skipped.length, (count) =>
    {
        if (count) { content.refresh(); }

    }, { immediate: true });
</script>

<template>
    <div class="compendium-kind">
        <template v-if="valid">
            <nav class="compendium-kind__crumbs" :aria-label="t('compendium.title')">
                <NuxtLink :to="{ name: 'compendium' }" class="compendium-kind__crumb">
                    <FontAwesome icon="book-open" aria-hidden="true" />
                    {{ t("compendium.title") }}
                </NuxtLink>
            </nav>
            <header class="compendium-kind__header">
                <h1 class="compendium-kind__title">
                    {{ t(`compendium.kinds.${kind}.name`) }}
                </h1>
                <p class="compendium-kind__intro">
                    {{ t(`compendium.kinds.${kind}.description`) }}
                </p>
            </header>
            <p v-if="skipped.length"
               class="compendium-kind__notice"
               role="status">
                <FontAwesome icon="triangle-exclamation" aria-hidden="true" />
                {{ t("compendium.skipped", { packages: skipped.join(", ") }) }}
            </p>
            <CompendiumSearch :model-value="state.q"
                              :label="t('compendium.search.label')"
                              :placeholder="t('compendium.search.placeholder')"
                              @update:model-value="(q) => go(q, state.filters)" />
            <CompendiumFilters v-if="data"
                               :kind="kind"
                               :filters="state.filters"
                               :options="options"
                               :label="label"
                               @update="(filters) => go(state.q, filters)" />
            <CompendiumList :kind="kind" :entries="results" />
        </template>
        <section v-else class="compendium-kind__missing">
            <h1>{{ t("compendium.notFound.heading") }}</h1>
            <p>{{ t("compendium.notFound.text") }}</p>
            <NuxtLink :to="{ name: 'compendium' }">
                {{ t("compendium.notFound.link") }}
            </NuxtLink>
        </section>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .compendium-kind
    {
        display: grid;
        gap: var(--space-4);

        &__crumb
        {
            align-items: center;
            color: var(--color-ink-muted);
            display: inline-flex;
            font-weight: 700;
            gap: var(--space-2);
            min-height: 44px;
            text-decoration: none;

            &:hover
            {
                color: var(--color-accent);
            }
        }

        &__title
        {
            margin: 0;
        }

        &__intro
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
            margin: var(--space-2) 0 0;
        }

        &__notice
        {
            background-color: var(--color-warning-soft);
            border-radius: var(--radius-md);
            display: flex;
            gap: var(--space-2);
            margin: 0;
            padding: var(--space-3);
        }

        &__missing
        {
            @include mixins.card(1);

            padding: var(--space-5);
        }
    }
</style>
