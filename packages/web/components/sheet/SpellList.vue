<script lang="ts" setup>
    import type { SpellsBlock } from "@byloth/dnd-platform-composer";

    /** Spells by level; at the newcomer level each carries its one-line summary. */
    defineProps<{ block: SpellsBlock }>();

    const { t } = useI18n();
</script>

<template>
    <div class="spell-list">
        <section v-for="level in block.levels"
                 :key="level.level"
                 class="spell-list__level">
            <h3 class="spell-list__title">
                {{ level.label }}
            </h3>
            <ul class="spell-list__spells">
                <li v-for="spell in level.items"
                    :key="spell.id"
                    class="spell-list__spell"
                    :class="{ 'spell-list__spell--described': spell.summary }">
                    <span class="spell-list__name">{{ spell.label }}</span>
                    <span v-if="spell.summary" class="spell-list__summary">{{ spell.summary }}</span>
                </li>
            </ul>
        </section>
        <p class="spell-list__legend">
            {{ t("sheetView.spells.legend") }}
        </p>
    </div>
</template>

<style lang="scss" scoped>
    .spell-list
    {
        &__level
        {
            margin-bottom: var(--space-4);
        }

        &__title
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            letter-spacing: 0.08em;
            margin-bottom: var(--space-2);
            text-transform: uppercase;
        }

        &__spells
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__spell
        {
            background-color: var(--color-surface-sunken);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-round);
            padding: var(--space-1) var(--space-3);

            &--described
            {
                border-radius: var(--radius-md);
                display: grid;
                flex-basis: 100%;
                padding: var(--space-2) var(--space-3);
            }
        }

        &__name
        {
            font-weight: 700;
        }

        &__summary
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
        }

        &__legend
        {
            color: var(--color-ink-muted);
            font-size: var(--text-xs);
            margin: 0;
        }
    }
</style>
