<script lang="ts" setup>
    import type { CreditItem } from "@byloth/dnd-platform-composer";

    /** The packages in use and their attribution (a licence requirement; never collapsed away from print). */
    defineProps<{ packages: readonly CreditItem[] }>();
</script>

<template>
    <ul class="credits-list">
        <li v-for="pkg in packages"
            :key="pkg.id"
            class="credits-list__package">
            <h3 class="credits-list__name">
                {{ pkg.name }}
                <small class="credits-list__version">{{ pkg.id }} {{ pkg.version }}</small>
            </h3>
            <p v-for="source in pkg.sources"
               :key="source.title"
               class="credits-list__line">
                {{ source.line }}
            </p>
        </li>
    </ul>
</template>

<style lang="scss" scoped>
    .credits-list
    {
        display: grid;
        gap: var(--space-4);
        list-style: none;
        margin: 0;
        padding: 0;

        &__name
        {
            font-size: var(--text-md);
            margin-bottom: var(--space-1);
        }

        &__version
        {
            color: var(--color-ink-muted);
            font-family: var(--font-text);
            font-size: var(--text-xs);
            margin-left: var(--space-2);
        }

        &__line
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            margin: 0;
        }
    }
</style>
