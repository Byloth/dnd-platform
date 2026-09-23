<script lang="ts" setup>
    import type { ActionItem } from "@byloth/dnd-platform-composer";

    import RichText from "@/components/sheet/RichText.vue";

    /** One action: name and cost first, its one-line summary, the rule on demand (docs/13-ux-and-accessibility.md). */
    defineProps<{ item: ActionItem }>();

    const { t } = useI18n();
</script>

<template>
    <article class="action-card" :class="{ 'action-card--unavailable': !item.available }">
        <header class="action-card__header">
            <h4 class="action-card__name">
                {{ item.name }}
            </h4>
            <span v-if="item.cost" class="action-card__cost">
                <span class="sr-only">{{ t("sheetView.actions.cost") }}:</span>
                {{ item.cost }}
            </span>
        </header>
        <p v-if="!item.available" class="action-card__unavailable">
            {{ t("sheetView.actions.unavailable") }}
        </p>
        <p v-if="item.details.length" class="action-card__details">
            {{ item.details.join(" · ") }}
        </p>
        <p v-if="item.summary" class="action-card__summary">
            {{ item.summary }}
        </p>
        <details v-if="item.text" class="action-card__rule">
            <summary class="action-card__rule-toggle">
                {{ t("sheetView.actions.showRule") }}
            </summary>
            <RichText class="action-card__rule-text" :text="item.text" />
        </details>
    </article>
</template>

<style lang="scss" scoped>
    .action-card
    {
        background-color: var(--color-surface-sunken);
        border-left: 4px solid var(--color-accent);
        border-radius: var(--radius-md);
        padding: var(--space-3) var(--space-4);

        &--unavailable
        {
            border-left-color: var(--color-unavailable);
            opacity: 0.8;
        }

        &__header
        {
            align-items: baseline;
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            justify-content: space-between;
        }

        &__name
        {
            font-family: var(--font-text);
            font-size: var(--text-md);
            letter-spacing: 0;
            margin: 0;
        }

        &__cost
        {
            background-color: var(--color-resource-soft);
            border-radius: var(--radius-round);
            color: var(--color-resource);
            font-size: var(--text-xs);
            font-weight: 700;
            padding: 0.1em var(--space-2);
        }

        &__unavailable
        {
            color: var(--color-unavailable);
            font-size: var(--text-sm);
            font-weight: 700;
            margin: var(--space-1) 0 0;
        }

        &__details
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            margin: var(--space-1) 0 0;
        }

        &__summary
        {
            margin: var(--space-2) 0 0;
        }

        &__rule
        {
            margin-top: var(--space-2);
        }

        &__rule-toggle
        {
            color: var(--color-accent);
            cursor: pointer;
            font-size: var(--text-sm);
            font-weight: 700;
            min-height: 32px;
        }

        &__rule-text
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            margin-top: var(--space-2);
        }
    }
</style>
