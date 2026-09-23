<script lang="ts" setup>
    import type { AbilityRow } from "@byloth/dnd-platform-composer";

    /** The six abilities as cards: the modifier large, the score and the save under it, each explained on tap. */
    defineProps<{ rows: readonly AbilityRow[] }>();

    const { t } = useI18n();
    const open = useSheetDrawer();

    type Part = "score" | "modifier" | "save";
    const shownOf = (row: AbilityRow, part: Part): string => row[part];
    const explain = (row: AbilityRow, part: Part): void =>
    {
        const value = row.values[part];
        if (!value) { return; }
        const label = part === "save" ? `${t("sheetView.abilities.save")}: ${row.name}` : row.name;
        open({ label: label, shown: shownOf(row, part), value: value });
    };
    const saveLabel = (row: AbilityRow): string =>
    {
        const proficient = row.proficient ? `, ${t("sheetView.abilities.proficient")}` : "";

        return `${row.name}, ${t("sheetView.abilities.save")} ${row.save}${proficient}`;
    };
</script>

<template>
    <ul class="ability-table">
        <li v-for="row in rows"
            :key="row.id"
            class="ability-table__card">
            <span class="ability-table__name">{{ row.name }}</span>
            <button type="button"
                    class="ability-table__modifier"
                    :aria-label="`${row.name}, ${t('sheetView.abilities.modifier')} ${row.modifier}`"
                    :disabled="!row.values.modifier"
                    @click="explain(row, 'modifier')">
                {{ row.modifier }}
            </button>
            <button type="button"
                    class="ability-table__score"
                    :aria-label="`${row.name}, ${t('sheetView.abilities.score')} ${row.score}`"
                    :disabled="!row.values.score"
                    @click="explain(row, 'score')">
                {{ row.score }}
            </button>
            <button type="button"
                    class="ability-table__save"
                    :class="{ 'ability-table__save--proficient': row.proficient }"
                    :aria-label="saveLabel(row)"
                    :disabled="!row.values.save"
                    @click="explain(row, 'save')">
                <span class="ability-table__save-mark" aria-hidden="true"></span>
                <span aria-hidden="true">{{ t("sheetView.abilities.save") }} {{ row.save }}</span>
            </button>
        </li>
    </ul>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .ability-table
    {
        display: grid;
        gap: var(--space-3);
        grid-template-columns: repeat(3, minmax(0, 1fr));
        list-style: none;
        margin: 0;
        padding: 0;

        &__card
        {
            align-items: center;
            background: linear-gradient(170deg, var(--color-surface-raised), var(--color-surface-sunken));
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            display: flex;
            flex-direction: column;
            padding: var(--space-3) var(--space-2);
            text-align: center;
        }

        &__name
        {
            color: var(--color-ink-muted);
            font-size: var(--text-xs);
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        &__modifier,
        &__score,
        &__save
        {
            background: none;
            border: 0;
            border-radius: var(--radius-md);
            color: inherit;
            cursor: pointer;

            &:hover:not(:disabled)
            {
                background-color: var(--color-accent-soft);
            }
        }

        &__modifier
        {
            color: var(--color-accent);
            font-family: var(--font-display);
            font-size: var(--text-3xl);
            font-weight: 700;
            line-height: 1.1;
            min-height: 44px;
            min-width: 3.5rem;
        }

        &__score
        {
            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-round);
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            min-height: 32px;
            min-width: 2.75rem;
            padding: 0 var(--space-2);
        }

        &__save
        {
            align-items: center;
            color: var(--color-ink-muted);
            display: inline-flex;
            font-size: var(--text-xs);
            font-weight: 700;
            gap: var(--space-1);
            margin-top: var(--space-2);
            min-height: 36px;
            padding: 0 var(--space-2);

            &--proficient
            {
                color: var(--color-ink);
            }
        }

        &__save-mark
        {
            border: 2px solid currentColor;
            border-radius: var(--radius-round);
            height: 0.7rem;
            width: 0.7rem;
        }

        &__save--proficient .ability-table__save-mark
        {
            background-color: var(--color-accent);
            border-color: var(--color-accent);
        }
    }
</style>
