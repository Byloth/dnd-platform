<script lang="ts" setup>
    import type { SkillsBlock } from "@byloth/dnd-platform-composer";

    /** The skills with their training as a shape and a word (never colour alone), each bonus explained on tap. */
    defineProps<{ block: SkillsBlock }>();

    const { t } = useI18n();
    const open = useSheetDrawer();
</script>

<template>
    <div class="skill-list">
        <ul class="skill-list__rows">
            <li v-for="row in block.rows"
                :key="row.id"
                class="skill-list__row"
                :class="`skill-list__row--${row.mark}`">
                <span class="skill-list__mark" aria-hidden="true"></span>
                <span class="skill-list__name">
                    {{ row.name }}
                    <small class="skill-list__ability">{{ row.ability }}</small>
                    <span class="sr-only">, {{ t(`sheetView.skills.${row.mark}`) }}</span>
                </span>
                <button type="button"
                        class="skill-list__bonus"
                        :aria-label="`${row.name}, ${row.bonus}`"
                        :disabled="!row.value"
                        @click="row.value && open({ label: row.name, shown: row.bonus, value: row.value })">
                    {{ row.bonus }}
                </button>
            </li>
        </ul>
        <p class="skill-list__legend" aria-hidden="true">
            {{ t("sheetView.skills.legend") }}
        </p>
        <dl v-if="block.proficiencies.length" class="skill-list__proficiencies">
            <template v-for="group in block.proficiencies" :key="group.type">
                <dt class="skill-list__group">
                    {{ group.label }}
                </dt>
                <dd class="skill-list__items">
                    {{ group.items.join(", ") }}
                </dd>
            </template>
        </dl>
    </div>
</template>

<style lang="scss" scoped>
    .skill-list
    {
        &__rows
        {
            display: grid;
            gap: 0 var(--space-4);
            grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__row
        {
            align-items: center;
            border-bottom: 1px dashed var(--color-border);
            display: flex;
            gap: var(--space-3);
            min-height: 44px;
        }

        &__mark
        {
            border: 2px solid var(--color-ink-muted);
            border-radius: var(--radius-round);
            flex: none;
            height: 0.85rem;
            width: 0.85rem;
        }
        &__row--proficient .skill-list__mark
        {
            background-color: var(--color-accent);
            border-color: var(--color-accent);
        }
        &__row--expertise .skill-list__mark
        {
            background-color: var(--color-accent);
            border-color: var(--color-accent);
            box-shadow: 0 0 0 2px var(--color-surface-raised), 0 0 0 4px var(--color-accent);
        }

        &__name
        {
            flex: 1;
            min-width: 0;
        }
        &__row--untrained .skill-list__name
        {
            color: var(--color-ink-muted);
        }

        &__ability
        {
            color: var(--color-ink-muted);
            font-size: var(--text-xs);
            font-weight: 700;
            margin-left: var(--space-1);
        }

        &__bonus
        {
            background-color: var(--color-surface-sunken);
            border: 1px solid transparent;
            border-radius: var(--radius-sm);
            color: var(--color-ink);
            cursor: pointer;
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            min-height: 36px;
            min-width: 3rem;

            &:hover:not(:disabled)
            {
                border-color: var(--color-accent);
            }
        }

        &__legend
        {
            color: var(--color-ink-muted);
            font-size: var(--text-xs);
            margin: var(--space-3) 0 0;
        }

        &__proficiencies
        {
            display: grid;
            gap: var(--space-1) var(--space-4);
            grid-template-columns: max-content 1fr;
            margin: var(--space-4) 0 0;
        }

        &__group
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            font-weight: 700;
        }

        &__items
        {
            margin: 0;
        }
    }
</style>
