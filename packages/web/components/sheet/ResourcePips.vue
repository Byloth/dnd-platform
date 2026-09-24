<script lang="ts" setup>
    import type { ResourceItem } from "@byloth/dnd-platform-composer";

    /** A resource: pips with a filled and an empty shape when small, a number otherwise; "n of m" for everyone. */
    const props = defineProps<{ item: ResourceItem }>();

    const { t } = useI18n();
    const open = useSheetDrawer();
    const explain = (): void =>
    {
        const provenance = props.item.explain?.provenance ?? [];
        const value = { value: props.item.max, provenance: provenance };
        open({ label: props.item.name, shown: props.item.shownMax, value: value });
    };

    const label = computed(() => t("sheetView.resources.pips", {
        current: props.item.current ?? props.item.shownMax,
        max: props.item.shownMax,
        name: props.item.name
    }));
    const pips = computed(() =>
    {
        const max = typeof props.item.max === "number" ? props.item.max : 0;
        const current = props.item.current ?? max;

        return Array.from({ length: max }, (_, i) => i < current);
    });
</script>

<template>
    <div class="resource-pips">
        <div class="resource-pips__head">
            <span class="resource-pips__name">{{ item.name }}</span>
            <component :is="item.explain ? 'button' : 'span'"
                       class="resource-pips__count"
                       :type="item.explain ? 'button' : undefined"
                       @click="item.explain && explain()">
                <span aria-hidden="true">{{ item.current ?? item.shownMax }} / {{ item.shownMax }}</span>
                <span class="resource-pips__spoken">{{ label }}</span>
            </component>
        </div>
        <ol v-if="item.pips"
            class="resource-pips__pips"
            aria-hidden="true">
            <li v-for="(full, i) in pips"
                :key="i"
                class="resource-pips__pip"
                :class="{ 'resource-pips__pip--spent': !full }"></li>
        </ol>
        <p v-if="item.recharge" class="resource-pips__recharge">
            {{ item.recharge }}
        </p>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .resource-pips
    {
        background-color: var(--color-surface-sunken);
        border-radius: var(--radius-md);
        padding: var(--space-3) var(--space-4);

        &__spoken
        {
            @include mixins.sr-only;
        }

        &__head
        {
            align-items: center;
            display: flex;
            gap: var(--space-2);
            justify-content: space-between;
        }

        &__name
        {
            font-weight: 700;
        }

        &__count
        {
            background: none;
            border: 0;
            color: var(--color-resource);
            font-family: var(--font-display);
            font-size: var(--text-xl);
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            min-height: 36px;
        }
        button.resource-pips__count
        {
            border-radius: var(--radius-sm);
            cursor: pointer;

            &:hover
            {
                background-color: var(--color-resource-soft);
            }
        }

        &__pips
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            list-style: none;
            margin: var(--space-2) 0 0;
            padding: 0;
        }

        &__pip
        {
            background-color: var(--color-resource);
            border: 2px solid var(--color-resource);
            border-radius: var(--radius-round);
            height: 1.1rem;
            width: 1.1rem;

            &--spent
            {
                background-color: transparent;
            }
        }

        &__recharge
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            margin: var(--space-2) 0 0;
        }
    }
</style>
