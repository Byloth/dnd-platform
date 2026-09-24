<script lang="ts" setup>
    import type { DerivedValue } from "@byloth/dnd-platform-engine";

    /**
     * One number of the sheet: its label, the value large, and a tap (or a click) that opens the explanation.
     * Accessible name "label, value" (docs/phase-1/07-testing-accessibility-performance.md).
     */
    const props = withDefaults(defineProps<{
        label: string;
        shown: string;
        value?: DerivedValue;
        raw?: string;
        vital?: boolean;
    }>(), { value: undefined, raw: undefined, vital: false });

    const open = useSheetDrawer();
    const explain = (): void =>
    {
        if (props.value) { open({ label: props.label, shown: props.shown, value: props.value }); }
    };
</script>

<template>
    <div class="value-tile" :class="{ 'value-tile--vital': vital }">
        <!-- Named by its content, "label, value", the comma for the ear only (docs/13-ux-and-accessibility.md). -->
        <component :is="value ? 'button' : 'div'"
                   class="value-tile__face"
                   :type="value ? 'button' : undefined"
                   @click="explain">
            <span class="value-tile__label">{{ label }}</span>
            <span class="value-tile__separator">, </span>
            <span class="value-tile__value">{{ shown }}</span>
        </component>
        <small v-if="raw" class="value-tile__raw">{{ raw }}</small>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .value-tile
    {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-width: 0;

        &__face
        {
            @include mixins.tap-target;

            align-items: flex-start;
            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            color: var(--color-ink);
            display: flex;
            flex-direction: column;
            gap: var(--space-1);
            padding: var(--space-3);
            text-align: left;
            width: 100%;
        }

        &__separator
        {
            @include mixins.sr-only;
        }

        button.value-tile__face
        {
            cursor: pointer;
            transition: border-color var(--duration-fast) var(--easing), box-shadow var(--duration-fast) var(--easing);

            &:hover
            {
                border-color: var(--color-accent);
                box-shadow: var(--shadow-2);
            }
        }

        &__label
        {
            color: var(--color-ink-muted);
            font-size: var(--text-xs);
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        &__value
        {
            font-size: var(--text-xl);
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            line-height: 1.1;
        }

        &__raw
        {
            color: var(--color-ink-muted);
            font-size: var(--text-xs);
            padding: 0 var(--space-1);
        }

        &--vital
        {
            .value-tile__face
            {
                align-items: center;
                background: linear-gradient(160deg, var(--color-surface-raised), var(--color-surface-sunken));
                text-align: center;
            }

            .value-tile__value
            {
                color: var(--color-accent);
                font-family: var(--font-display);
                font-size: var(--text-vital);
            }
        }
    }
</style>
