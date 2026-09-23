<script lang="ts" setup>
    import type { FeatureItem } from "@byloth/dnd-platform-composer";

    import RichText from "@/components/sheet/RichText.vue";

    /** A feature or trait: its name, the level it comes at, the summary, the full text when opened. */
    defineProps<{ item: FeatureItem, open?: boolean }>();

    const { t } = useI18n();
</script>

<template>
    <details class="feature-card" :open="open">
        <summary class="feature-card__summary">
            <span class="feature-card__name">{{ item.name }}</span>
            <small v-if="item.level !== undefined" class="feature-card__level">
                {{ t("sheetView.features.level", { level: item.level }) }}
            </small>
            <span v-if="item.summary" class="feature-card__line">{{ item.summary }}</span>
        </summary>
        <RichText v-if="item.text"
                  class="feature-card__text"
                  :text="item.text" />
    </details>
</template>

<style lang="scss" scoped>
    .feature-card
    {
        border-bottom: 1px solid var(--color-border);

        &:last-child
        {
            border-bottom: 0;
        }

        &__summary
        {
            cursor: pointer;
            display: grid;
            gap: 0 var(--space-2);
            grid-template-columns: 1fr auto;
            list-style: none;
            min-height: 44px;
            padding: var(--space-3) 0;

            &::-webkit-details-marker { display: none; }

            &::after
            {
                color: var(--color-ink-muted);
                content: "+";
                font-size: var(--text-lg);
                grid-column: 2;
                grid-row: 1;
                line-height: 1;
            }
        }

        &[open] > &__summary::after
        {
            content: "−";
        }

        &__name
        {
            font-weight: 700;
        }

        &__level
        {
            color: var(--color-ink-muted);
            grid-column: 1;
        }

        &__line
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            grid-column: 1;
        }

        &__text
        {
            color: var(--color-ink);
            padding: 0 0 var(--space-3);
        }
    }
</style>
