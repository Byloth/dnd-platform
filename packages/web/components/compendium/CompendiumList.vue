<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { CompendiumEntry, CompendiumKind } from "@/composables/compendium";

    /**
     * The entries of a list (docs/phase-1/13-compendium.md): name, the composer's subtitle, the first sentence,
     * the lock of a private package. Sixty at a time, so a cheap phone never lays out five hundred cards; the count
     * is announced once the list settles.
     */
    const props = defineProps<{ kind: CompendiumKind, entries: readonly CompendiumEntry[] }>();

    const { t } = useI18n();

    const PAGE = 60;
    const shown = ref(PAGE);
    watch(() => props.entries, () => { shown.value = PAGE; });
    const visible = computed(() => props.entries.slice(0, shown.value));
    const left = computed(() => Math.max(0, props.entries.length - shown.value));
</script>

<template>
    <div class="compendium-list">
        <p class="compendium-list__count" aria-live="polite">
            {{ t(`compendium.count.${kind}`, entries.length) }}
        </p>
        <p v-if="!entries.length" class="compendium-list__empty">
            {{ t("compendium.noResults") }}
        </p>
        <ul v-else class="compendium-list__items">
            <li v-for="entry in visible"
                :key="entry.id"
                class="compendium-list__item">
                <NuxtLink class="compendium-list__link"
                          :to="{ name: 'compendium-kind-id', params: { kind: kind, id: entry.id } }">
                    <span class="compendium-list__name">{{ entry.name }}</span>
                    <span class="compendium-list__subtitle">{{ entry.subtitle }}</span>
                    <span v-if="entry.summary" class="compendium-list__summary">{{ entry.summary }}</span>
                </NuxtLink>
                <span v-if="entry.private" class="compendium-list__private">
                    <FontAwesome icon="lock" aria-hidden="true" />
                    {{ t("compendium.private") }}
                </span>
            </li>
        </ul>
        <AppButton v-if="left"
                   class="compendium-list__more"
                   theme="secondary"
                   outline
                   @click="shown += PAGE">
            {{ t("compendium.showMore", { count: left }) }}
        </AppButton>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .compendium-list
    {
        display: grid;
        gap: var(--space-3);

        &__count
        {
            color: var(--color-ink-muted);
            font-weight: 700;
            margin: 0;
        }

        &__empty
        {
            @include mixins.card(1);

            margin: 0;
            padding: var(--space-5);
        }

        &__items
        {
            display: grid;
            gap: var(--space-3);
            list-style: none;
            margin: 0;
            padding: 0;

            @include mixins.from(variables.$desktop-min)
            {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        &__item
        {
            @include mixins.card(1);

            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: border-color var(--duration-fast) var(--easing), box-shadow var(--duration-fast) var(--easing);

            &:hover
            {
                border-color: var(--color-accent);
                box-shadow: var(--shadow-2);
            }
        }

        &__link
        {
            color: inherit;
            display: grid;
            flex: 1;
            gap: var(--space-1);
            padding: var(--space-4) var(--space-4) var(--space-3);
            text-decoration: none;

            &:focus-visible
            {
                @include mixins.focus-ring;

                outline-offset: -3px;
            }
        }

        &__name
        {
            color: var(--color-accent);
            font-family: var(--font-display);
            font-size: var(--text-lg);
            font-weight: 700;
        }

        &__subtitle
        {
            color: var(--color-ink-muted);
            font-style: italic;
        }

        &__summary
        {
            display: -webkit-box;
            font-size: var(--text-sm);
            -webkit-line-clamp: 2;
            line-clamp: 2;
            overflow: hidden;
            -webkit-box-orient: vertical;
        }

        &__private
        {
            align-items: center;
            background-color: var(--color-brass-soft);
            color: var(--color-brass);
            display: flex;
            font-size: var(--text-xs);
            font-weight: 700;
            gap: var(--space-2);
            padding: var(--space-1) var(--space-4);
        }

        &__more
        {
            justify-self: center;
        }
    }
</style>
