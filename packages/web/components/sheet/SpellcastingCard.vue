<script lang="ts" setup>
    import type { CasterItem } from "@byloth/dnd-platform-composer";

    /** One caster: its ability and numbers, what it knows, and its slots per level as pips. */
    defineProps<{ caster: CasterItem }>();

    const { t } = useI18n();
</script>

<template>
    <article class="spellcasting-card">
        <header class="spellcasting-card__header">
            <h3 class="spellcasting-card__name">
                {{ caster.name }}
            </h3>
            <span class="spellcasting-card__ability">{{ caster.ability }}</span>
        </header>
        <ul class="spellcasting-card__facts">
            <li v-for="part in [...caster.parts, ...caster.known]"
                :key="part"
                class="spellcasting-card__fact">
                {{ part }}
            </li>
        </ul>
        <table v-if="caster.slots.length" class="spellcasting-card__slots">
            <caption class="sr-only">
                {{ t("sheetView.spells.slots") }}
            </caption>
            <tbody>
                <tr v-for="slot in caster.slots"
                    :key="slot.label"
                    class="spellcasting-card__slot">
                    <th scope="row" class="spellcasting-card__level">
                        {{ slot.label }}
                    </th>
                    <td class="spellcasting-card__pips">
                        <span class="sr-only">{{ slot.current }} / {{ slot.max }}</span>
                        <span v-for="i in slot.max"
                              :key="i"
                              class="spellcasting-card__pip"
                              :class="{ 'spellcasting-card__pip--spent': i > slot.current }"
                              aria-hidden="true"></span>
                    </td>
                </tr>
            </tbody>
        </table>
    </article>
</template>

<style lang="scss" scoped>
    .spellcasting-card
    {
        background-color: var(--color-surface-sunken);
        border-radius: var(--radius-md);
        padding: var(--space-4);

        & + &
        {
            margin-top: var(--space-3);
        }

        &__header
        {
            align-items: baseline;
            display: flex;
            gap: var(--space-2);
            justify-content: space-between;
        }

        &__name
        {
            font-size: var(--text-lg);
            margin: 0;
        }

        &__ability
        {
            color: var(--color-ink-muted);
            font-weight: 700;
        }

        &__facts
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            list-style: none;
            margin: var(--space-3) 0;
            padding: 0;
        }

        &__fact
        {
            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-round);
            font-size: var(--text-sm);
            font-weight: 700;
            padding: 0.1em var(--space-3);
        }

        &__slots
        {
            border-collapse: collapse;
        }

        &__level
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            padding: var(--space-1) var(--space-4) var(--space-1) 0;
            text-align: left;
        }

        &__pips
        {
            display: flex;
            gap: var(--space-2);
            padding: var(--space-1) 0;
        }

        &__pip
        {
            background-color: var(--color-resource);
            border: 2px solid var(--color-resource);
            border-radius: 3px;
            height: 1rem;
            transform: rotate(45deg);
            width: 1rem;

            &--spent
            {
                background-color: transparent;
            }
        }
    }
</style>
