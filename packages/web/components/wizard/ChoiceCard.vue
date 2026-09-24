<script lang="ts" setup>
    import type { HelpLevel } from "@byloth/dnd-platform-composer";

    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /**
     * One option of a wizard step: a native radio (or checkbox) inside a card, so the keyboard and the arrow keys
     * work as the browser makes them. A recommended option carries a badge and, by help level, its reason: inline
     * for a newcomer, behind "Why?" for a regular player, not at all for an expert.
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
    }>(), { summary: "", type: "radio", disabled: false, recommended: undefined });

    const emit = defineEmits<{ select: [value: string, checked: boolean] }>();

    const { t } = useI18n();

    const why = computed(() => (props.helpLevel === "expert" ? undefined : props.recommended?.why));
    const onChange = (event: Event): void => emit("select", props.value, (event.target as HTMLInputElement).checked);
</script>

<template>
    <div class="choice-card"
         :class="{
             'choice-card--checked': checked,
             'choice-card--recommended': recommended && helpLevel !== 'expert',
             'choice-card--disabled': disabled
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
                <span v-if="summary" class="choice-card__summary">{{ summary }}</span>
                <slot></slot>
            </span>
        </label>
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
    }
</style>
