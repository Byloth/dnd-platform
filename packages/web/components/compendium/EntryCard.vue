<script lang="ts" setup>
    import type { EntryView } from "@byloth/dnd-platform-composer";

    import RichText from "@/components/sheet/RichText.vue";

    /** A spell, an item or a condition as the composer writes it (`composeEntry`): heading, lines, text, sections. */
    defineProps<{ entry: EntryView }>();
</script>

<template>
    <article class="entry-card" :class="`entry-card--${entry.kind}`">
        <header class="entry-card__header">
            <h1 class="entry-card__name">
                {{ entry.name }}
            </h1>
            <p class="entry-card__subtitle">
                {{ entry.subtitle }}
            </p>
        </header>
        <dl v-if="entry.lines.length" class="entry-card__lines">
            <div v-for="line in entry.lines"
                 :key="line.label"
                 class="entry-card__line">
                <dt class="entry-card__label">
                    {{ line.label }}
                </dt>
                <dd class="entry-card__value">
                    {{ line.value }}
                </dd>
            </div>
        </dl>
        <RichText v-if="entry.text"
                  class="entry-card__text"
                  :text="entry.text" />
        <section v-for="section in entry.sections"
                 :key="section.title"
                 class="entry-card__section">
            <h2 class="entry-card__section-title">
                {{ section.title }}
            </h2>
            <RichText :text="section.text" />
        </section>
    </article>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .entry-card
    {
        @include mixins.card(2);

        border-top: 4px solid var(--color-accent);
        display: grid;
        gap: var(--space-4);
        padding: var(--space-5);

        @include mixins.from(variables.$tablet-min)
        {
            padding: var(--space-6);
        }

        &__name
        {
            color: var(--color-accent);
            margin: 0;
        }

        &__subtitle
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
            font-style: italic;
            margin: var(--space-1) 0 0;
        }

        &__lines
        {
            border-bottom: 1px solid var(--color-border);
            border-top: 1px solid var(--color-border);
            display: grid;
            gap: var(--space-2);
            margin: 0;
            padding: var(--space-3) 0;
        }

        &__line
        {
            display: grid;
            gap: 0 var(--space-3);

            @include mixins.from(variables.$tablet-min)
            {
                grid-template-columns: 11rem 1fr;
            }
        }

        &__label
        {
            color: var(--color-brass);
            font-weight: 700;
        }

        &__value
        {
            margin: 0;
        }

        &__section-title
        {
            color: var(--color-brass);
            font-size: var(--text-lg);
            margin: 0 0 var(--space-2);
        }
    }
</style>
