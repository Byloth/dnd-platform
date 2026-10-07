<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { StepId } from "@/stores/wizard";

    /**
     * The steps by name, beside the wizard on desktop (owner, 2026-09-24): the same moves as the dots, spelled out.
     * The mark of the step on screen slides to the next one (owner's review, 8.2.1).
     */
    const props = defineProps<{ steps: readonly StepId[], current: StepId, done: (step: StepId) => boolean }>();
    const emit = defineEmits<{ go: [step: StepId] }>();

    const { t } = useI18n();

    const list = ref<HTMLElement>();
    const marker = ref<{ top: number, height: number }>();
    // The first place is taken without sliding; only the moves after it slide.
    const sliding = ref(false);

    const measure = (): void =>
    {
        // A ref array in a v-for does not keep the order of the list: the DOM does.
        const item = list.value?.querySelectorAll<HTMLElement>(".wizard-step-list__items > li")[
            props.steps.indexOf(props.current)
        ];
        if (!item?.offsetHeight) { return; }

        sliding.value = marker.value !== undefined;
        marker.value = { top: item.offsetTop, height: item.offsetHeight };
    };
    watch(() => [props.current, props.steps.length], () => nextTick(measure));
    onMounted(measure);
    useResizeObserver(list, measure);
</script>

<template>
    <nav class="wizard-step-list" :aria-label="t('wizard.stepList')">
        <div ref="list" class="wizard-step-list__track">
            <span v-if="marker"
                  class="wizard-step-list__marker"
                  :class="{ 'wizard-step-list__marker--sliding': sliding }"
                  :style="{ height: `${marker.height}px`, transform: `translateY(${marker.top}px)` }"
                  aria-hidden="true"></span>
            <ol class="wizard-step-list__items">
                <li v-for="(step, i) in steps" :key="step">
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
        </div>
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

        &__track
        {
            position: relative;
        }

        &__marker
        {
            background-color: var(--color-accent-soft);
            border-left: 3px solid var(--color-accent);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            left: 0;
            position: absolute;
            right: 0;
            top: 0;

            &--sliding
            {
                transition: transform var(--duration) var(--easing), height var(--duration) var(--easing);
            }
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
            position: relative;
            text-align: left;
            width: 100%;

            &:hover:not(.wizard-step-list__step--current)
            {
                background-color: var(--color-surface-sunken);
                color: var(--color-ink);
            }

            // The background and the border of the step on screen are the sliding mark's.
            &--current
            {
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
