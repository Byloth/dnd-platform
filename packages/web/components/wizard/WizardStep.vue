<script lang="ts" setup>
    import type { HelpLevel } from "@byloth/dnd-platform-composer";

    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { StepId } from "@/stores/wizard";

    /**
     * The frame of a wizard step: its name as the page's heading, the step's copy by help level (the purpose for
     * everyone but an expert; what the choice changes and what to choose when unsure for a newcomer), the step's
     * content, and "Back" and "Next", never disabled: the wizard warns, it never blocks. The buttons sit in a bar
     * fixed to the bottom of the screen, with "Step n of 10" between them on a phone; the step fades out and the
     * next fades in, and then its heading takes the focus, so a screen reader announces it (owner's review, points
     * 8.1 and 8.2; docs/phase-1/09-interface-revisions.md).
     */
    const props = defineProps<{ steps: readonly StepId[], step: StepId, helpLevel: HelpLevel }>();
    const emit = defineEmits<{ go: [step: StepId] }>();

    const { t } = useI18n();

    const index = computed(() => props.steps.indexOf(props.step));
    const previous = computed(() => props.steps[index.value - 1]);
    const next = computed(() => props.steps[index.value + 1]);

    const title = ref<HTMLElement>();
    const focusTitle = (): void => title.value?.focus({ preventScroll: true });

    // While the bar is on screen, the page keeps a focused field above it.
    useHead({ htmlAttrs: { class: "wizard-bar" } });
</script>

<template>
    <section class="wizard-step" aria-labelledby="wizard-step-title">
        <Transition name="step"
                    mode="out-in"
                    @after-enter="focusTitle">
            <div :key="step" class="wizard-step__page">
                <header class="wizard-step__header">
                    <h1 id="wizard-step-title"
                        ref="title"
                        class="wizard-step__title"
                        tabindex="-1">
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
            </div>
        </Transition>
        <footer class="wizard-step__footer">
            <AppButton v-if="previous"
                       theme="secondary"
                       outline
                       @click="emit('go', previous)">
                <FontAwesome icon="chevron-left" aria-hidden="true" />
                {{ t("wizard.back") }}
            </AppButton>
            <span class="wizard-step__count" aria-hidden="true">
                {{ t("wizard.stepOf", { n: index + 1, total: steps.length }) }}
            </span>
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
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

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

        &__title:focus
        {
            outline: none;
        }

        &__title:focus-visible
        {
            outline: 2px solid var(--color-focus);
            outline-offset: 4px;
        }

        // Back and Next stay on screen however long the step (owner's review, 8.1): a bar at the bottom of the
        // viewport while the step scrolls under it, at its place after the content once the end is reached.
        &__footer
        {
            align-items: center;
            backdrop-filter: blur(12px) saturate(1.2);
            background-color: color-mix(in srgb, var(--color-surface) 88%, transparent);
            border-top: 1px solid var(--color-border);
            bottom: 0;
            box-shadow: 0 -6px 16px -12px rgb(0 0 0 / 35%);
            display: flex;
            gap: var(--space-3);
            justify-content: space-between;
            margin-top: var(--space-6);
            padding: var(--space-3) 0 calc(var(--space-3) + env(safe-area-inset-bottom));
            position: sticky;
            z-index: 5;
        }

        // On a phone the dots scroll away with the page: the bar says where the player is. Under 360 px (a small
        // phone, or 400 % zoom) Back and Next take the whole width, with no sideways scroll (WCAG 1.4.10).
        &__count
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            white-space: nowrap;

            @include mixins.from(variables.$tablet-min) { display: none; }
            @media (max-width: 359px) { display: none; }
        }

        &__next
        {
            margin-left: auto;
        }
    }

    // The step fades out and the next one in, as the pages do (owner's review, 8.2); the tokens make it instant
    // under reduced motion.
    .step-enter-active,
    .step-leave-active
    {
        transition: opacity var(--duration) var(--easing);
    }

    .step-enter-from,
    .step-leave-to
    {
        opacity: 0;
    }
</style>

<style lang="scss">
    // While the wizard's bar is on screen, a field the keyboard reaches is never hidden under it.
    html.wizard-bar
    {
        scroll-padding-bottom: 6rem;
    }
</style>
