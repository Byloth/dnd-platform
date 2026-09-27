<script lang="ts" setup>
    import type { PackageManifest } from "@byloth/dnd-platform-schema";

    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /** Where an entry comes from: the package and its sources with their licence; the lock of a private package. */
    const props = defineProps<{ manifest: PackageManifest }>();

    const { t, locale } = useI18n();

    const name = computed(() =>
    {
        const names = props.manifest.name as Record<string, string | undefined>;

        return names[locale.value] ?? names["en"] ?? props.manifest.id;
    });
</script>

<template>
    <footer class="entry-source">
        <p class="entry-source__package">
            <strong>{{ t("compendium.source") }}:</strong> {{ name }}
            <span v-if="manifest.redistributable === false" class="entry-source__private">
                <FontAwesome icon="lock" aria-hidden="true" />
                {{ t("compendium.private") }}
            </span>
        </p>
        <ul class="entry-source__sources">
            <li v-for="source in manifest.sources" :key="source.id">
                {{ t("packages.list.source", { title: source.title, license: source.license }) }}
            </li>
        </ul>
    </footer>
</template>

<style lang="scss" scoped>
    .entry-source
    {
        color: var(--color-ink-muted);
        font-size: var(--text-sm);

        &__package
        {
            align-items: baseline;
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            margin: 0;
        }

        &__private
        {
            background-color: var(--color-brass-soft);
            border-radius: var(--radius-round);
            color: var(--color-brass);
            font-weight: 700;
            padding: 0 var(--space-3);
        }

        &__sources
        {
            list-style: none;
            margin: var(--space-1) 0 0;
            padding: 0;
        }
    }
</style>
