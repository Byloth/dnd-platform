<script lang="ts" setup>
    import type { WarningItem } from "@byloth/dnd-platform-composer";

    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /** The sheet's warnings, at the top: they never block, they say what to check (docs/13-ux-and-accessibility.md). */
    defineProps<{ warnings: readonly WarningItem[] }>();

    const { t } = useI18n();
</script>

<template>
    <section id="section-warnings"
             class="warning-list"
             aria-labelledby="title-warnings">
        <h2 id="title-warnings" class="warning-list__title">
            <FontAwesome icon="triangle-exclamation" aria-hidden="true" />
            {{ t("sheetView.warnings.heading", { count: warnings.length }, warnings.length) }}
        </h2>
        <ul class="warning-list__items">
            <li v-for="(warning, i) in warnings"
                :key="i"
                class="warning-list__item">
                {{ warning.message }}
                <code class="warning-list__code">{{ warning.code }}</code>
            </li>
        </ul>
    </section>
</template>

<style lang="scss" scoped>
    .warning-list
    {
        background-color: var(--color-warning-soft);
        border: 1px solid color-mix(in srgb, var(--color-warning) 35%, transparent);
        border-radius: var(--radius-lg);
        padding: var(--space-4);

        &__title
        {
            align-items: center;
            color: var(--color-warning);
            display: flex;
            font-family: var(--font-text);
            font-size: var(--text-md);
            gap: var(--space-2);
            letter-spacing: 0;
            margin-bottom: var(--space-2);
        }

        &__items
        {
            margin: 0;
            padding-left: var(--space-5);
        }

        &__code
        {
            font-size: var(--text-xs);
            margin-left: var(--space-1);
        }
    }
</style>
