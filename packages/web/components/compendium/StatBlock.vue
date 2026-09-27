<script lang="ts" setup>
    import type { StatBlock } from "@byloth/dnd-platform-composer";

    import RichText from "@/components/sheet/RichText.vue";

    /**
     * A creature's stat block as the composer writes it (`composeCreature`, DEC-24), in the manuals' order: name
     * and kind, armour class to speed, the six abilities, the details, then traits, actions, reactions and the
     * legendary actions.
     */
    defineProps<{ block: StatBlock }>();

    const { t } = useI18n();
</script>

<template>
    <article class="stat-block">
        <header class="stat-block__header">
            <h1 class="stat-block__name">
                {{ block.name }}
            </h1>
            <p class="stat-block__kind">
                {{ block.header }}
            </p>
        </header>
        <RichText v-if="block.text"
                  class="stat-block__text"
                  :text="block.text" />
        <dl class="stat-block__lines">
            <div v-for="line in block.core"
                 :key="line.label"
                 class="stat-block__line">
                <dt class="stat-block__label">
                    {{ line.label }}
                </dt>
                <dd class="stat-block__value">
                    {{ line.value }}
                </dd>
            </div>
        </dl>
        <table class="stat-block__abilities">
            <caption class="stat-block__caption">
                {{ t("sheet.sections.abilities") }}
            </caption>
            <thead>
                <tr>
                    <th v-for="ability in block.abilities"
                        :key="ability.ability"
                        scope="col">
                        {{ ability.label }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td v-for="ability in block.abilities" :key="ability.ability">
                        {{ ability.score }} <span class="stat-block__modifier">({{ ability.modifier }})</span>
                    </td>
                </tr>
            </tbody>
        </table>
        <dl class="stat-block__lines">
            <div v-for="line in block.details"
                 :key="line.label"
                 class="stat-block__line">
                <dt class="stat-block__label">
                    {{ line.label }}
                </dt>
                <dd class="stat-block__value">
                    {{ line.value }}
                </dd>
            </div>
        </dl>
        <section v-for="section in block.sections"
                 :key="section.id"
                 class="stat-block__section"
                 :aria-label="section.title || undefined">
            <h2 v-if="section.title" class="stat-block__section-title">
                {{ section.title }}
            </h2>
            <p v-if="section.intro" class="stat-block__intro">
                {{ section.intro }}
            </p>
            <div v-for="entry in section.entries"
                 :key="entry.name"
                 class="stat-block__entry">
                <strong class="stat-block__entry-name">{{ entry.name }}.</strong>
                <RichText class="stat-block__entry-text" :text="entry.text" />
            </div>
        </section>
    </article>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .stat-block
    {
        @include mixins.card(2);

        border-bottom: 4px solid var(--color-brass);
        border-top: 4px solid var(--color-brass);
        display: grid;
        gap: var(--space-3);
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

        &__kind
        {
            font-style: italic;
            margin: var(--space-1) 0 0;
        }

        &__lines
        {
            border-top: 2px solid var(--color-brass);
            display: grid;
            gap: var(--space-1);
            margin: 0;
            padding-top: var(--space-3);
        }

        &__line
        {
            display: block;
        }

        &__label
        {
            color: var(--color-accent);
            display: inline;
            font-weight: 700;
            margin-right: var(--space-2);
        }

        &__value
        {
            display: inline;
            margin: 0;
        }

        &__abilities
        {
            border-collapse: collapse;
            border-top: 2px solid var(--color-brass);
            table-layout: fixed;
            text-align: center;
            width: 100%;

            th
            {
                color: var(--color-accent);
                font-size: var(--text-sm);
                padding: var(--space-2) 0 0;
            }

            td
            {
                font-variant-numeric: tabular-nums;
                padding: 0 0 var(--space-2);
            }
        }

        &__caption
        {
            @include mixins.sr-only;
        }

        &__modifier
        {
            color: var(--color-ink-muted);
            display: block;
            font-size: var(--text-sm);

            @include mixins.from(variables.$tablet-min)
            {
                display: inline;
            }
        }

        &__section
        {
            display: grid;
            gap: var(--space-2);
        }

        &__section-title
        {
            border-bottom: 1px solid var(--color-brass);
            color: var(--color-accent);
            font-size: var(--text-xl);
            margin: var(--space-3) 0 0;
            padding-bottom: var(--space-1);
        }

        &__intro
        {
            margin: 0;
        }

        &__entry
        {
            :deep(p:first-child)
            {
                display: inline;
            }
        }

        &__entry-name
        {
            font-style: italic;
            margin-right: var(--space-1);
        }

        &__entry-text
        {
            display: inline;
        }
    }
</style>
