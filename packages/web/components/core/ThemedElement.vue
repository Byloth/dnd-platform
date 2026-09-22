<script lang="ts" setup>
    import { computed } from "vue";
    import type { Component, PropType } from "vue";

    const props = defineProps({
        is: {
            default: "div",
            type: [String, Object] as PropType<string | Component>
        },

        name: {
            default: "",
            type: String
        },
        theme: {
            default: "primary",
            type: String
        }
    });

    const classes = computed((): string[] =>
    {
        if (props.name)
        {
            return [`${props.name}-${props.theme}`];
        }

        return [`${props.theme}`];
    });
</script>

<template>
    <Component :is="is" :class="classes">
        <slot></slot>
    </Component>
</template>

<style lang="scss" scoped></style>
