<script lang="ts" setup>
    import type { StepId } from "@/stores/wizard";

    /**
     * The row of numbered dots over the wizard, on every width (owner, 2026-09-24): the step on screen is marked
     * as current, the completed ones carry a tick, any step can be reached in any order. Each dot is named
     * "n. Step name" (its visible number first, WCAG 2.5.3), plus "done" when completed.
     */
    const props = defineProps<{ steps: readonly StepId[], current: StepId, done: (step: StepId) => boolean }>();
    const emit = defineEmits<{ go: [step: StepId] }>();

    const { t } = useI18n();

    const index = computed(() => props.steps.indexOf(props.current));
</script>

<template>
    <nav class="wizard-stepper" :aria-label="t('wizard.progress')">
        <ol class="wizard-stepper__dots">
            <li v-for="(step, i) in steps"
                :key="step"
                class="wizard-stepper__item"
                :class="{
                    'wizard-stepper__item--current': step === current,
                    'wizard-stepper__item--done': done(step),
                    'wizard-stepper__item--passed': i < index
                }">
                <button type="button"
                        class="wizard-stepper__dot"
                        :aria-current="step === current ? 'step' : undefined"
                        @click="emit('go', step)">
                    <span class="wizard-stepper__number">{{ i + 1 }}</span>
                    <span class="wizard-stepper__name">. {{ t(`wizard.steps.${step}`) }}</span>
                    <span v-if="done(step)" class="wizard-stepper__name">, {{ t("wizard.done") }}</span>
                </button>
            </li>
        </ol>
        <Transition name="stepper-fade" mode="out-in">
            <p :key="current" class="wizard-stepper__current">
                <span class="wizard-stepper__count">
                    {{ t("wizard.stepOf", { n: index + 1, total: steps.length }) }}
                </span>
                <span aria-hidden="true"> · </span>
                <strong>{{ t(`wizard.steps.${current}`) }}</strong>
            </p>
        </Transition>
    </nav>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .wizard-stepper
    {
        margin-bottom: var(--space-5);

        &__dots
        {
            display: flex;
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__item
        {
            align-items: center;
            display: flex;
            flex: 1;

            // The connector before every dot but the first; filled up to the step on screen.
            &:not(:first-child)::before
            {
                background-color: var(--color-border-strong);
                content: "";
                flex: 1;
                height: 2px;
                margin: 0 2px;
                transition: background-color var(--duration) var(--easing);

                @media (max-width: 359px) { margin: 0 1px; }
            }

            &:first-child
            {
                flex: none;
            }

            &--passed + &::before,
            &--current::before
            {
                background-color: var(--color-accent);
            }
        }

        &__dot
        {
            align-items: center;
            background-color: var(--color-surface-raised);
            border: 2px solid var(--color-border-strong);
            border-radius: var(--radius-round);
            color: var(--color-ink-muted);
            cursor: pointer;
            display: inline-flex;
            flex: none;
            font-size: var(--text-sm);
            font-weight: 700;
            height: 28px;
            justify-content: center;
            padding: 0;
            position: relative;
            transition:
                background-color var(--duration-fast) var(--easing),
                border-color var(--duration-fast) var(--easing),
                transform var(--duration-fast) var(--easing);
            width: 28px;

            &:hover
            {
                border-color: var(--color-accent);
                transform: scale(1.08);
            }

            @include mixins.from(600px)
            {
                height: 34px;
                width: 34px;
            }

            // Ten dots and their connectors fit in 320 px (WCAG 1.4.10; M1.8b), still above the 24 px target.
            @media (max-width: 359px)
            {
                font-size: var(--text-xs);
                height: 24px;
                width: 24px;
            }
        }

        &__item--done &__dot
        {
            border-color: var(--color-accent);
            color: var(--color-accent);

            // A tick beside the number: completion is never told by colour alone.
            &::after
            {
                background-color: var(--color-healing);
                border: 2px solid var(--color-surface);
                border-radius: var(--radius-round);
                bottom: -4px;
                content: "";
                height: 10px;
                position: absolute;
                right: -4px;
                width: 10px;
            }
        }

        &__item--current &__dot
        {
            background-color: var(--color-accent);
            border-color: var(--color-accent);
            color: var(--color-accent-ink);
            transform: scale(1.12);
        }

        &__name
        {
            @include mixins.sr-only;
        }

        &__current
        {
            color: var(--color-ink-muted);
            margin: var(--space-3) 0 0;
            text-align: center;

            strong
            {
                color: var(--color-ink);
                font-family: var(--font-display);
            }
        }
    }

    // The line under the dots fades between steps, with the step itself (owner's review, 8.2.1).
    .stepper-fade-enter-active,
    .stepper-fade-leave-active
    {
        transition: opacity var(--duration-fast) var(--easing);
    }

    .stepper-fade-enter-from,
    .stepper-fade-leave-to
    {
        opacity: 0;
    }
</style>
