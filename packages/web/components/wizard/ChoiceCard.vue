<script lang="ts" setup>
    import type { EntryView, HelpLevel } from "@byloth/dnd-platform-composer";

    import RichText from "@/components/sheet/RichText.vue";
    import CompendiumLink from "@/components/compendium/CompendiumLink.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { CompendiumKind } from "@/composables/compendium";

    /**
     * One option of a wizard step: a native radio (or checkbox) inside a card, so the keyboard and the arrow keys
     * work as the browser makes them. A recommended option carries a badge and, by help level, its reason: inline
     * for a newcomer, behind "Why?" for a regular player, not at all for an expert, who gets a dense card: the
     * name and the facts, no summary. A species, a class or a background brings its entry (`composeEntry`,
     * docs/phase-1/14-wizard-steps-revision.md): its key facts as stats on the card, and every trait behind
     * "Details", outside the label so its text and links are not part of the choice.
     */
    const props = withDefaults(defineProps<{
        name: string;
        value: string;
        title: string;
        summary?: string;
        checked: boolean;
        type?: "radio" | "checkbox";
        disabled?: boolean;
        recommended?: { why?: string | undefined };
        helpLevel: HelpLevel;
        /** The option's entry in the compendium, linked beside the card (never inside its label). */
        compendium?: CompendiumKind;
        /** The option's facts and traits as the composer writes them. */
        entry?: EntryView;
    }>(), {
        summary: "",
        type: "radio",
        disabled: false,
        recommended: undefined,
        compendium: undefined,
        entry: undefined
    });

    const emit = defineEmits<{ select: [value: string, checked: boolean] }>();

    const { t } = useI18n();

    const why = computed(() => (props.helpLevel === "expert" ? undefined : props.recommended?.why));
    const details = computed(() => (props.entry && (props.entry.lines.length || props.entry.sections.length) ?
        props.entry :
        undefined));
    const onChange = (event: Event): void => emit("select", props.value, (event.target as HTMLInputElement).checked);
</script>

<template>
    <div class="choice-card"
         :class="{
             'choice-card--checked': checked,
             'choice-card--recommended': recommended && helpLevel !== 'expert',
             'choice-card--disabled': disabled,
             'choice-card--dense': helpLevel === 'expert'
         }">
        <label class="choice-card__main">
            <input class="choice-card__input"
                   :type="type"
                   :name="name"
                   :value="value"
                   :checked="checked"
                   :disabled="disabled"
                   @change="onChange" />
            <span class="choice-card__mark" aria-hidden="true">
                <FontAwesome v-if="checked" icon="circle-check" />
            </span>
            <span class="choice-card__body">
                <span class="choice-card__head">
                    <span class="choice-card__title">{{ title }}</span>
                    <span v-if="recommended && helpLevel !== 'expert'" class="choice-card__badge">
                        <FontAwesome icon="star" aria-hidden="true" />
                        {{ t("wizard.recommended") }}
                    </span>
                </span>
                <span v-if="summary && helpLevel !== 'expert'" class="choice-card__summary">{{ summary }}</span>
                <span v-if="entry?.facts?.length" class="choice-card__stats">
                    <span v-for="fact in entry.facts"
                          :key="fact"
                          class="choice-card__stat">{{ fact }}</span>
                </span>
                <slot></slot>
            </span>
        </label>
        <CompendiumLink v-if="compendium && helpLevel !== 'expert'"
                        :id="value"
                        class="choice-card__compendium"
                        :kind="compendium">
            {{ t("compendium.readMore") }}
            <span class="choice-card__sr">: {{ title }}</span>
        </CompendiumLink>
        <details v-if="details" class="choice-card__details">
            <summary class="choice-card__details-toggle">
                {{ t("wizard.details") }}
                <span class="choice-card__sr">: {{ title }}</span>
                <FontAwesome class="choice-card__chevron"
                             icon="chevron-down"
                             aria-hidden="true" />
            </summary>
            <dl v-if="details.lines.length" class="choice-card__lines">
                <div v-for="line in details.lines"
                     :key="line.label"
                     class="choice-card__line">
                    <dt class="choice-card__label">
                        {{ line.label }}
                    </dt>
                    <dd class="choice-card__value">
                        {{ line.value }}
                    </dd>
                </div>
            </dl>
            <div v-for="section in details.sections"
                 :key="section.title"
                 class="choice-card__trait">
                <p class="choice-card__trait-title">
                    {{ section.title }}
                </p>
                <RichText class="choice-card__trait-text" :text="section.text" />
            </div>
        </details>
        <p v-if="why && helpLevel === 'newcomer'" class="choice-card__why">
            <FontAwesome icon="lightbulb" aria-hidden="true" />
            {{ why }}
        </p>
        <details v-else-if="why" class="choice-card__more">
            <summary class="choice-card__more-toggle">
                {{ t("wizard.why") }}
            </summary>
            <p class="choice-card__why">
                {{ why }}
            </p>
        </details>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .choice-card
    {
        @include mixins.card(1);

        display: flex;
        flex-direction: column;
        transition:
            border-color var(--duration-fast) var(--easing),
            box-shadow var(--duration-fast) var(--easing),
            transform var(--duration-fast) var(--easing);

        &:hover:not(&--disabled)
        {
            border-color: var(--color-border-strong);
            box-shadow: var(--shadow-2);
        }

        &:has(.choice-card__input:focus-visible)
        {
            @include mixins.focus-ring;
        }

        &--disabled:not(&--checked)
        {
            opacity: 0.55;
        }

        &--recommended
        {
            border-color: var(--color-brass);
        }

        &--checked,
        &--checked:hover:not(&--disabled)
        {
            border-color: var(--color-accent);
            box-shadow: 0 0 0 1px var(--color-accent), var(--shadow-2);
        }

        &__main
        {
            @include mixins.tap-target;

            align-items: flex-start;
            cursor: pointer;
            display: flex;
            gap: var(--space-3);
            padding: var(--space-4);
        }

        &--dense &__main
        {
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
        }

        &--dense &__title
        {
            font-size: var(--text-md);
        }

        &--disabled &__main
        {
            cursor: default;
        }

        &__input
        {
            @include mixins.sr-only;
        }

        &__mark
        {
            align-items: center;
            border: 2px solid var(--color-ink-muted);
            border-radius: var(--radius-round);
            color: var(--color-accent);
            display: inline-flex;
            flex: none;
            font-size: 1.35rem;
            height: 1.5rem;
            justify-content: center;
            margin-top: 0.1rem;
            width: 1.5rem;
        }

        &--checked &__mark
        {
            border-color: transparent;
        }

        &__body
        {
            display: grid;
            gap: var(--space-1);
            min-width: 0;
        }

        &__head
        {
            align-items: baseline;
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
        }

        &__title
        {
            font-family: var(--font-display);
            font-size: var(--text-lg);
            font-weight: 700;
        }

        &__badge
        {
            align-items: center;
            background-color: var(--color-brass-soft);
            border-radius: var(--radius-round);
            color: var(--color-brass);
            display: inline-flex;
            font-size: var(--text-xs);
            font-weight: 700;
            gap: var(--space-1);
            letter-spacing: 0.04em;
            padding: 0.15em var(--space-2);
            text-transform: uppercase;
        }

        &__summary
        {
            color: var(--color-ink-muted);
        }

        &__why
        {
            border-top: 1px dashed var(--color-border);
            color: var(--color-ink);
            display: flex;
            gap: var(--space-2);
            margin: 0;
            padding: var(--space-3) var(--space-4);

            :deep(svg)
            {
                color: var(--color-brass);
                flex: none;
                margin-top: 0.2em;
            }
        }

        &__more
        {
            border-top: 1px dashed var(--color-border);

            .choice-card__why
            {
                border-top: 0;
                padding-top: 0;
            }
        }

        &__more-toggle
        {
            @include mixins.tap-target;

            color: var(--color-accent);
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 0 var(--space-4);
        }

        // The option's stats: a game's numbers, not a form's hints.
        &__stats
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-1) var(--space-2);
            margin-top: var(--space-1);
        }

        &__stat
        {
            background-color: var(--color-accent-soft);
            border-radius: var(--radius-sm);
            color: var(--color-accent);
            font-size: var(--text-sm);
            font-weight: 700;
            padding: 0.1em var(--space-2);
        }

        &__details
        {
            border-top: 1px dashed var(--color-border);

            &[open]
            {
                padding-bottom: var(--space-4);
            }

            &[open] .choice-card__chevron
            {
                transform: rotate(180deg);
            }
        }

        &__details-toggle
        {
            @include mixins.tap-target;

            align-items: center;
            color: var(--color-accent);
            cursor: pointer;
            display: flex;
            font-weight: 700;
            gap: var(--space-2);
            list-style: none;
            padding: 0 var(--space-4);

            &::-webkit-details-marker
            {
                display: none;
            }
        }

        &__chevron
        {
            transition: transform var(--duration-fast) var(--easing);
        }

        &__lines
        {
            display: grid;
            gap: var(--space-1);
            margin: 0 var(--space-4) var(--space-3);
        }

        &__line
        {
            display: flex;
            flex-wrap: wrap;
            gap: 0 var(--space-2);
        }

        &__label
        {
            font-weight: 700;

            &::after
            {
                content: ":";
            }
        }

        &__value
        {
            margin: 0;
        }

        &__trait
        {
            margin: 0 var(--space-4) var(--space-3);
        }

        &__trait-title
        {
            font-family: var(--font-display);
            font-weight: 700;
            margin: 0;
        }

        &__trait-text
        {
            color: var(--color-ink-muted);
        }

        &__compendium
        {
            align-self: start;
            font-size: var(--text-sm);
            font-weight: 700;
            // Under the card's text, past the round mark (1.5rem) and its gap.
            align-items: center;
            display: inline-flex;
            margin: calc(var(--space-2) * -1) var(--space-4) var(--space-3);
            margin-left: calc(var(--space-4) + 1.5rem + var(--space-3));
            min-height: 44px;
        }

        &__sr
        {
            @include mixins.sr-only;
        }
    }
</style>
