<script lang="ts" setup>
    import { computed } from "vue";
    import type { PropType } from "vue";
    import type { RouteLocationRaw } from "vue-router";

    /**
     * A button, a link or a router link that looks like one: `.button` with a variant modifier
     * (`--primary`, `--secondary`, `--danger`, `--link`), `--outline` and `--small`.
     */
    const props = defineProps({
        href: {
            default: "",
            type: String
        },
        to: {
            default: "",
            type: [String, Object] as PropType<RouteLocationRaw>
        },

        outline: {
            default: false,
            type: Boolean
        },
        theme: {
            default: "primary",
            type: String
        },

        small: {
            default: false,
            type: Boolean
        },

        type: {
            default: "button",
            type: String
        }
    });

    const tag = computed((): string =>
    {
        if (props.to) { return "router-link"; }
        else if (props.href) { return "a"; }

        return "button";
    });
    const attributes = computed((): Record<string, unknown> =>
    {
        if (props.to) { return { to: props.to }; }
        if (props.href) { return { href: props.href }; }

        return { type: props.type };
    });
    const modifiers = computed((): string[] => [
        `button--${props.theme}`,
        ...(props.outline ? ["button--outline"] : []),
        ...(props.small ? ["button--small"] : [])
    ]);
</script>

<template>
    <Component :is="tag"
               class="button"
               :class="modifiers"
               v-bind="attributes">
        <slot></slot>
    </Component>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .button
    {
        @include mixins.tap-target;

        --button-fill: var(--color-accent);
        --button-ink: var(--color-accent-ink);

        align-items: center;
        background-color: var(--button-fill);
        border: 2px solid var(--button-fill);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-1);
        color: var(--button-ink);
        cursor: pointer;
        display: inline-flex;
        font-weight: 700;
        gap: var(--space-2);
        justify-content: center;
        line-height: 1.2;
        padding: var(--space-2) var(--space-4);
        text-decoration: none;
        transition:
            transform var(--duration-fast) var(--easing),
            box-shadow var(--duration-fast) var(--easing),
            background-color var(--duration-fast) var(--easing);

        &:hover
        {
            box-shadow: var(--shadow-2);
            text-decoration: none;
            transform: translateY(-1px);
        }
        &:active
        {
            box-shadow: var(--shadow-1);
            transform: translateY(0);
        }

        &--secondary
        {
            --button-fill: var(--color-ink-muted);
            --button-ink: var(--color-surface-raised);
        }
        &--danger
        {
            --button-fill: var(--color-damage);
            --button-ink: var(--color-surface-raised);
        }
        &--link
        {
            --button-fill: transparent;
            --button-ink: var(--color-accent);

            box-shadow: none;
        }

        &--outline
        {
            background-color: transparent;
            box-shadow: none;
            color: var(--button-fill);
        }

        &--small
        {
            font-size: var(--text-sm);
            padding: var(--space-1) var(--space-3);
        }
    }
</style>
