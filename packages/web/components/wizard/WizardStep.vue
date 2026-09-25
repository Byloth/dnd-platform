<script lang="ts" setup>
    import type { HelpLevel } from "@byloth/dnd-platform-composer";

    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import { STEPS } from "@/stores/wizard";
    import type { StepId } from "@/stores/wizard";

    /**
     * The frame of a wizard step: its name as the page's heading, the step's copy by help level (the purpose for
     * everyone but an expert; what the choice changes and what to choose when unsure for a newcomer), the step's
     * content, and "Back" and "Next", never disabled: the wizard warns, it never blocks.
     */
    const props = defineProps<{ step: StepId, helpLevel: HelpLevel }>();
    const emit = defineEmits<{ go: [step: StepId] }>();

    const { t } = useI18n();

    const index = computed(() => STEPS.indexOf(props.step));
    const previous = computed(() => STEPS[index.value - 1]);
    const next = computed(() => STEPS[index.value + 1]);
</script>

<template>
    <section class="wizard-step" aria-labelledby="wizard-step-title">
        <header class="wizard-step__header">
            <h1 id="wizard-step-title" class="wizard-step__title">
                {{ t(`wizard.steps.${step}`) }}
            </h1>
            <template v-if="helpLevel !== 'expert'">
                <p class="wizard-step__purpose">
                    {{ t(`wizard.${step}.purpose`) }}
                </p>
                <template v-if="helpLevel === 'newcomer'">
                    <p class="wizard-step__consequence">
                        {{ t(`wizard.${step}.consequence`) }}
                    </p>
                    <p class="wizard-step__recommendation">
                        <FontAwesome icon="lightbulb" aria-hidden="true" />
                        {{ t(`wizard.${step}.recommendation`) }}
                    </p>
                </template>
            </template>
        </header>
        <div class="wizard-step__content">
            <slot></slot>
        </div>
        <footer class="wizard-step__footer">
            <AppButton v-if="previous"
                       theme="secondary"
                       outline
                       @click="emit('go', previous)">
                <FontAwesome icon="chevron-left" aria-hidden="true" />
                {{ t("wizard.back") }}
            </AppButton>
            <AppButton v-if="next"
                       class="wizard-step__next"
                       @click="emit('go', next)">
                {{ t("wizard.next") }}
                <FontAwesome icon="chevron-right" aria-hidden="true" />
            </AppButton>
        </footer>
    </section>
</template>

<style lang="scss" scoped>
    .wizard-step
    {
        &__header
        {
            margin-bottom: var(--space-5);
            max-width: 46rem;
        }

        &__title
        {
            margin-bottom: var(--space-3);
        }

        &__purpose
        {
            font-size: var(--text-lg);
            margin: 0 0 var(--space-2);
        }

        &__consequence
        {
            color: var(--color-ink-muted);
            margin: 0 0 var(--space-3);
        }

        &__recommendation
        {
            background-color: var(--color-brass-soft);
            border-radius: var(--radius-md);
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

        &__footer
        {
            border-top: 1px solid var(--color-border);
            display: flex;
            gap: var(--space-3);
            justify-content: space-between;
            margin-top: var(--space-6);
            padding-top: var(--space-4);
        }

        &__next
        {
            margin-left: auto;
        }
    }
</style>
