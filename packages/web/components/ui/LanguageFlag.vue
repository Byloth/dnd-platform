<script lang="ts" setup>
    import type { Component } from "vue";

    import FlagGb from "./flags/FlagGb.vue";
    import FlagIt from "./flags/FlagIt.vue";
    import FontAwesome from "./FontAwesome.vue";

    /**
     * The flag of an interface language, always beside the language's name, so it is decorative; a language without
     * a flag shows a globe (docs/phase-1/09-interface-revisions.md).
     */
    const props = defineProps<{ language: string }>();

    const FLAGS: Readonly<Record<string, Component>> = { en: FlagGb, it: FlagIt };
    const flag = computed(() => FLAGS[props.language]);
</script>

<template>
    <span class="language-flag">
        <component :is="flag" v-if="flag" />
        <FontAwesome v-else
                     icon="globe"
                     aria-hidden="true" />
    </span>
</template>

<style lang="scss" scoped>
    .language-flag
    {
        display: inline-flex;
        line-height: 0;

        :deep(.flag)
        {
            border-radius: 2px;
            box-shadow: 0 0 0 1px var(--color-border);
            height: 1em;
            width: 1.5em;
        }
    }
</style>
