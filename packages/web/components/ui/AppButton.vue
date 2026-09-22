<script lang="ts" setup>
    import { computed } from "vue";
    import type { PropType } from "vue";
    import type { RouteLocationRaw } from "vue-router";

    import ThemedElement from "@/components/core/ThemedElement.vue";

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
        large: {
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
    const properties = computed((): Record<string, unknown> =>
    {
        const _props = { } as Record<string, unknown>;

        if (props.to) { _props["to"] = props.to; }
        else if (props.href) { _props["href"] = props.href; }
        else { _props["type"] = props.type; }

        if (props.outline) { _props["theme"] = `outline-${props.theme}`; }
        else { _props["theme"] = props.theme; }

        return _props;
    });

    const classes = computed((): Record<string, boolean> => ({
        "btn-sm": props.small,
        "btn-lg": props.large
    }));
</script>

<template>
    <ThemedElement :is="tag"
                   class="btn"
                   name="btn"
                   :class="classes"
                   v-bind="properties">
        <slot></slot>
    </ThemedElement>
</template>

<style lang="scss" scoped></style>
