<script lang="ts" setup>
    import type { ReminderItem } from "@byloth/dnd-platform-composer";

    import RichText from "@/components/sheet/RichText.vue";

    /** The content's reminders for a section, each with what adds it. */
    defineProps<{ items: readonly ReminderItem[] }>();
</script>

<template>
    <ul class="reminder-list">
        <li v-for="(item, i) in items"
            :key="i"
            class="reminder-list__item">
            <RichText class="reminder-list__text" :text="item.text" />
            <small class="reminder-list__source">{{ item.source }}</small>
        </li>
    </ul>
</template>

<style lang="scss" scoped>
    .reminder-list
    {
        display: grid;
        gap: var(--space-2);
        list-style: none;
        margin: var(--space-4) 0 0;
        padding: 0;

        &__item
        {
            background-color: var(--color-brass-soft);
            border-radius: var(--radius-md);
            padding: var(--space-3) var(--space-4);
        }

        &__source
        {
            color: var(--color-brass);
            display: block;
            font-weight: 700;
            margin-top: var(--space-1);
        }
    }
</style>
