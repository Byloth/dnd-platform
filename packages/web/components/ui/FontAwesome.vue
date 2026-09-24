<script lang="ts" setup>
    import { computed } from "vue";

    import { ICONS } from "./icons";

    const props = defineProps({
        icon: {
            type: String,
            required: true
        },

        /** The accessible name, for an icon that means something on its own; decorative otherwise. */
        label: {
            type: String,
            default: undefined
        }
    });

    const definition = computed(() => ICONS[props.icon]);
    const paths = computed(() =>
    {
        const data = definition.value?.icon[4] ?? [];

        return Array.isArray(data) ? data : [data];
    });
</script>

<template>
    <svg v-if="definition"
         class="font-awesome"
         :viewBox="`0 0 ${definition.icon[0]} ${definition.icon[1]}`"
         :role="label ? 'img' : undefined"
         :aria-label="label"
         :aria-hidden="label ? undefined : 'true'"
         focusable="false"
         xmlns="http://www.w3.org/2000/svg">
        <path v-for="(d, index) in paths"
              :key="index"
              :d="d" />
    </svg>
</template>

<style lang="scss" scoped>
    .font-awesome
    {
        display: inline-block;
        width: auto;
        height: 1em;
        overflow: visible;
        vertical-align: -0.125em;
        fill: currentColor;
    }
</style>
