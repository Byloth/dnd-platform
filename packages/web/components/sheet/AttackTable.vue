<script lang="ts" setup>
    import type { AttackRow } from "@byloth/dnd-platform-composer";

    /** Attacks as rows of cards: name, to-hit large, damage, and the notes that matter at the table. */
    defineProps<{ rows: readonly AttackRow[] }>();

    const { t } = useI18n();
    const open = useSheetDrawer();
    const explain = (row: AttackRow): void =>
    {
        const label = `${row.name}: ${t("sheetView.attacks.toHit")}`;
        open({ label: label, shown: row.toHit, value: row.attack.attackBonus });
    };
</script>

<template>
    <ul class="attack-table">
        <li v-for="row in rows"
            :key="row.id"
            class="attack-table__row">
            <span class="attack-table__name">{{ row.name }}</span>
            <button type="button"
                    class="attack-table__to-hit"
                    :aria-label="`${row.name}, ${t('sheetView.attacks.toHit')} ${row.toHit}`"
                    @click="explain(row)">
                <small class="attack-table__caption" aria-hidden="true">{{ t("sheetView.attacks.toHit") }}</small>
                <span aria-hidden="true">{{ row.toHit }}</span>
            </button>
            <span class="attack-table__damage">
                <small class="attack-table__caption">{{ t("sheetView.attacks.damage") }}</small>
                {{ row.damage }}
            </span>
            <ul v-if="row.notes.length" class="attack-table__notes">
                <li v-for="note in row.notes"
                    :key="note"
                    class="attack-table__note">
                    {{ note }}
                </li>
            </ul>
        </li>
    </ul>
</template>

<style lang="scss" scoped>
    .attack-table
    {
        display: grid;
        gap: var(--space-3);
        list-style: none;
        margin: 0;
        padding: 0;

        &__row
        {
            align-items: center;
            background-color: var(--color-surface-sunken);
            border-radius: var(--radius-md);
            display: grid;
            gap: var(--space-2) var(--space-4);
            grid-template-columns: 1fr auto auto;
            padding: var(--space-3) var(--space-4);
        }

        &__name
        {
            font-weight: 700;
        }

        &__caption
        {
            color: var(--color-ink-muted);
            display: block;
            font-size: var(--text-xs);
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        &__to-hit
        {
            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            color: var(--color-damage);
            cursor: pointer;
            font-family: var(--font-display);
            font-size: var(--text-xl);
            font-weight: 700;
            min-height: 44px;
            min-width: 4rem;

            &:hover
            {
                border-color: var(--color-accent);
            }
        }

        &__damage
        {
            font-weight: 700;
        }

        &__notes
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-1);
            grid-column: 1 / -1;
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__note
        {
            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-round);
            color: var(--color-ink-muted);
            font-size: var(--text-xs);
            padding: 0 var(--space-2);
        }
    }
</style>
