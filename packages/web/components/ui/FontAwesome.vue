<script lang="ts" setup>
    import { computed } from "vue";

    const props = defineProps({
        icon: {
            type: String,
            required: true
        }
    });

    const classes = computed(() => ({ [`fa-${props.icon}`]: true }));
</script>

<template>
    <span class="fa" :class="classes"></span>
</template>

<style lang="scss" scoped></style>
