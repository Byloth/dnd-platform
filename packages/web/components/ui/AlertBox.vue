<script lang="ts" setup>
    import { computed } from "vue";

    import ThemedElement from "@/components/core/ThemedElement.vue";

    const props = defineProps({
        title: {
            default: "",
            type: String
        },
        icon: {
            default: "",
            type: String
        },

        dismissible: {
            default: false,
            type: Boolean
        }
    });
    defineEmits(["dismiss"]);

    const classes = computed((): Record<string, boolean> => ({
        "alert-dismissible": props.dismissible,
        "flex-horizontal": !(props.title),
        "flex-vertical": !!(props.title)
    }));
</script>

<template>
    <ThemedElement class="alert flex"
                   :class="classes"
                   name="alert"
                   role="alert">
        <h3 v-if="title" class="alert-heading">
            <span v-if="icon"
                  class="fa-solid"
                  :class="`fa-${icon}`">
            </span>
            {{ title }}
        </h3>
        <span v-else-if="icon"
              class="fa-solid"
              :class="`fa-${icon}`"></span>
        <slot></slot>
        <button v-if="dismissible"
                class="btn btn-close"
                type="button"
                @click="$emit('dismiss', $event)">
            <span class="fa-solid fa-times"></span>
        </button>
    </ThemedElement>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/variables";

    .alert
    {
        & > .alert-heading > .fa-solid
        {
            margin-right: 0.25em;
        }
        & > .btn-close
        {
            align-items: center;
            background-image: unset;
            display: flex;
            filter: none;
            font-size: 1.5rem;
            justify-content: center;
            padding: 0.75em;
        }
        & > .fa-solid
        {
            margin-right: 0.5em;
            margin-top: 0.15em;
        }

        &.flex
        {
            display: flex;

            &.flex-horizontal
            {
                flex-direction: row;
            }
            &.flex-vertical
            {
                flex-direction: column;
            }
        }
    }
</style>
