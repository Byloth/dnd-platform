<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import { STEPS } from "@/stores/wizard";
    import type { StepId } from "@/stores/wizard";

    /** The steps by name, beside the wizard on desktop (owner, 2026-09-24): the same moves as the dots, spelled out. */
    defineProps<{ current: StepId, done: (step: StepId) => boolean }>();
    const emit = defineEmits<{ go: [step: StepId] }>();

    const { t } = useI18n();
</script>

<template>
    <nav class="wizard-step-list" :aria-label="t('wizard.stepList')">
        <ol class="wizard-step-list__items">
            <li v-for="(step, i) in STEPS" :key="step">
                <button type="button"
                        class="wizard-step-list__step"
                        :class="{
                            'wizard-step-list__step--current': step === current,
                            'wizard-step-list__step--done': done(step)
                        }"
                        :aria-current="step === current ? 'step' : undefined"
                        @click="emit('go', step)">
                    <span class="wizard-step-list__number">{{ i + 1 }}</span>
                    <span class="wizard-step-list__name">{{ t(`wizard.steps.${step}`) }}</span>
                    <span v-if="done(step)" class="wizard-step-list__done">
                        <FontAwesome icon="circle-check" aria-hidden="true" />
                        <span class="wizard-step-list__done-text">, {{ t("wizard.done") }}</span>
                    </span>
                </button>
            </li>
        </ol>
    </nav>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .wizard-step-list
    {
        &__items
        {
            display: grid;
            gap: var(--space-1);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__step
        {
            @include mixins.tap-target;

            align-items: center;
            background: none;
            border: 0;
            border-left: 3px solid transparent;
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            color: var(--color-ink-muted);
            cursor: pointer;
            display: flex;
            font: inherit;
            gap: var(--space-3);
            padding: var(--space-2) var(--space-3);
            text-align: left;
            width: 100%;

            &:hover
            {
                background-color: var(--color-surface-sunken);
                color: var(--color-ink);
            }

            &--current
            {
                background-color: var(--color-accent-soft);
                border-left-color: var(--color-accent);
                color: var(--color-ink);
                font-weight: 700;
            }
        }

        &__number
        {
            color: var(--color-ink-muted);
            font-variant-numeric: tabular-nums;
            min-width: 1.25rem;
            text-align: right;
        }

        &__name
        {
            flex: 1;
        }

        &__done
        {
            color: var(--color-healing);
        }

        &__done-text
        {
            @include mixins.sr-only;
        }
    }
</style>
