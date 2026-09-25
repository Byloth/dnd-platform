<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import StepAbilities from "@/components/wizard/steps/StepAbilities.vue";
    import StepEquipment from "@/components/wizard/steps/StepEquipment.vue";
    import StepChoices from "@/components/wizard/steps/StepChoices.vue";
    import StepBackground from "@/components/wizard/steps/StepBackground.vue";
    import StepClass from "@/components/wizard/steps/StepClass.vue";
    import StepConcept from "@/components/wizard/steps/StepConcept.vue";
    import StepContent from "@/components/wizard/steps/StepContent.vue";
    import StepPersonality from "@/components/wizard/steps/StepPersonality.vue";
    import StepReview from "@/components/wizard/steps/StepReview.vue";
    import StepSpecies from "@/components/wizard/steps/StepSpecies.vue";
    import WizardStep from "@/components/wizard/WizardStep.vue";
    import WizardStepList from "@/components/wizard/WizardStepList.vue";
    import WizardStepper from "@/components/wizard/WizardStepper.vue";
    import { STEPS } from "@/stores/wizard";
    import type { StepId } from "@/stores/wizard";

    /**
     * The creation wizard (docs/phase-1/04-character-creation.md), for a new character or, with `editing`, for a
     * stored one reopened from its sheet: a draft that saves itself, the step in the address (`?step=class`), the
     * dots over the steps and, on desktop, their names beside them. A draft found in the browser is offered back.
     * At the expert help level the steps are one scrolling form instead (docs/07-character-creation.md, "Expert
     * mode"): every step but the concept in its own section, the names beside them as in-page links, the address's
     * step scrolled to.
     */
    const props = defineProps<{ editing?: string }>();

    const route = useRoute();
    const router = useRouter();
    const { t } = useI18n();
    const wizard = useWizardStore();
    const preferences = usePreferencesStore();

    type Phase = "loading" | "resume" | "ready" | "missing" | "failed";
    const phase = ref<Phase>("loading");

    const STEP_VIEWS: Record<StepId, Component> = {
        content: StepContent,
        concept: StepConcept,
        species: StepSpecies,
        class: StepClass,
        background: StepBackground,
        abilities: StepAbilities,
        choices: StepChoices,
        equipment: StepEquipment,
        personality: StepPersonality,
        review: StepReview
    };
    const view = computed(() => STEP_VIEWS[wizard.step]);

    const expert = computed(() => preferences.helpLevel === "expert");
    /** The steps of the expert page: an expert chooses directly, without an archetype. */
    const pageSteps = computed(() => wizard.steps.filter((s) => s !== "concept"));
    const heading = computed(() => (props.editing ?
        t("wizard.edit.title", { name: wizard.character?.name || t("wizard.edit.unnamed") }) :
        t("wizard.title")));

    const scrollToSection = (step: StepId): void =>
    {
        if (!import.meta.client) { return; }
        void nextTick(() => document.getElementById(`step-${step}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };

    const done = (step: StepId): boolean => stepDone(step);
    const isStep = (value: unknown): value is StepId => STEPS.includes(value as StepId);
    const asked = (): StepId | undefined =>
    {
        const step = route.query["step"];

        return isStep(step) ? step : undefined;
    };

    const go = (step: StepId): void =>
    {
        wizard.goTo(step);
        void router.replace({ query: { ...route.query, step: step } });
        if (expert.value) { scrollToSection(step); }
        else if (import.meta.client) { window.scrollTo({ top: 0, behavior: "smooth" }); }
    };

    // A step asked from inside a section (the review's "Go to…") is a place on the expert page.
    watch(() => wizard.step, (step) =>
    {
        if (expert.value && (phase.value === "ready")) { scrollToSection(step); }
    });

    /** The step the address asks for, or the draft's own written into the address. */
    const followAddress = (): void =>
    {
        const step = asked();
        if (step && wizard.steps.includes(step)) { wizard.goTo(step); }
        else { void router.replace({ query: { ...route.query, step: wizard.step } }); }
    };

    const open = async (resume: boolean): Promise<void> =>
    {
        phase.value = "loading";
        try
        {
            if (resume && (await wizard.resume(props.editing))) { followAddress(); }
            else if (props.editing)
            {
                if (!(await wizard.edit(props.editing, asked())))
                {
                    phase.value = "missing";

                    return;
                }
                followAddress();
            }
            else
            {
                await wizard.start();
                followAddress();
            }
            phase.value = "ready";
            if (expert.value && asked()) { scrollToSection(wizard.step); }
        }
        catch
        {
            phase.value = "failed";
        }
    };

    onMounted(async () =>
    {
        // A draft in memory for the same character (back from another page) goes on; one in the browser only asks.
        if (wizard.character && wizard.packageSet && (wizard.editing === props.editing))
        {
            followAddress();
            phase.value = "ready";
        }
        else if (await wizard.stored(props.editing)) { phase.value = "resume"; }
        else { await open(false); }
    });
</script>

<template>
    <div class="wizard-page">
        <p v-if="phase === 'loading'" role="status">
            {{ t("wizard.loading") }}
        </p>
        <p v-else-if="phase === 'failed'" role="alert">
            {{ t("character.failed") }}
        </p>
        <div v-else-if="phase === 'missing'" role="alert">
            <h1>{{ t("character.notFound.heading") }}</h1>
            <p>{{ t("wizard.edit.missing") }}</p>
            <NuxtLink :to="{ name: 'index' }">
                {{ t("character.back") }}
            </NuxtLink>
        </div>
        <section v-else-if="phase === 'resume'"
                 class="wizard-page__resume"
                 aria-labelledby="wizard-resume-title">
            <h1 id="wizard-resume-title">
                {{ t(editing ? "wizard.edit.resume.heading" : "wizard.resume.heading") }}
            </h1>
            <p>{{ t(editing ? "wizard.edit.resume.text" : "wizard.resume.text") }}</p>
            <div class="wizard-page__resume-actions">
                <AppButton @click="open(true)">
                    {{ t("wizard.resume.resume") }}
                </AppButton>
                <AppButton theme="secondary"
                           outline
                           @click="open(false)">
                    {{ t("wizard.resume.restart") }}
                </AppButton>
            </div>
        </section>
        <div v-else-if="expert" class="wizard-page__body">
            <aside class="wizard-page__aside">
                <WizardStepList :steps="pageSteps"
                                :current="wizard.step"
                                :done="done"
                                @go="go" />
            </aside>
            <div class="wizard-page__form">
                <h1 class="wizard-page__title">
                    {{ heading }}
                </h1>
                <section v-for="step in pageSteps"
                         :id="`step-${step}`"
                         :key="step"
                         class="wizard-page__section"
                         :aria-labelledby="`step-${step}-title`">
                    <h2 :id="`step-${step}-title`" class="wizard-page__section-title">
                        {{ t(`wizard.steps.${step}`) }}
                    </h2>
                    <component :is="STEP_VIEWS[step]" />
                </section>
            </div>
        </div>
        <template v-else>
            <WizardStepper :steps="wizard.steps"
                           :current="wizard.step"
                           :done="done"
                           @go="go" />
            <div class="wizard-page__body">
                <aside class="wizard-page__aside">
                    <WizardStepList :steps="wizard.steps"
                                    :current="wizard.step"
                                    :done="done"
                                    @go="go" />
                </aside>
                <WizardStep :steps="wizard.steps"
                            :step="wizard.step"
                            :help-level="preferences.helpLevel"
                            @go="go">
                    <component :is="view" />
                </WizardStep>
            </div>
        </template>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .wizard-page
    {
        &__body
        {
            display: grid;
            gap: var(--space-6);

            @include mixins.from(variables.$desktop-min)
            {
                grid-template-columns: 14rem minmax(0, 1fr);
            }
        }

        &__aside
        {
            display: none;

            @include mixins.from(variables.$desktop-min)
            {
                align-self: start;
                display: block;
                position: sticky;
                top: calc(var(--navigation-bar-height) + var(--space-5));
            }
        }

        &__form
        {
            display: grid;
            gap: var(--space-6);
            min-width: 0;
        }

        &__title
        {
            margin: 0;
        }

        &__section
        {
            border-top: 1px solid var(--color-border);
            display: grid;
            gap: var(--space-4);
            padding-top: var(--space-5);
            scroll-margin-top: calc(var(--navigation-bar-height) + var(--space-4));
        }

        &__section-title
        {
            margin: 0;
        }

        &__resume
        {
            @include mixins.card(2);

            margin: var(--space-6) auto;
            max-width: 36rem;
            padding: var(--space-6);
        }

        &__resume-actions
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-3);
            margin-top: var(--space-5);
        }
    }
</style>

<style lang="scss">
    @use "@/assets/scss/mixins";

    // The option lists every step shares (their cards are ChoiceCard).
    .wizard-options
    {
        border: 0;
        display: grid;
        gap: var(--space-4);
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
        margin: 0;
        min-width: 0;
        padding: 0;

        &--nested
        {
            margin-top: var(--space-6);
        }

        &__legend
        {
            @include mixins.sr-only;
        }

        // A legend in a grid fieldset spans every column: it heads the options, it is not one of them.
        &__title
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
            grid-column: 1 / -1;
            letter-spacing: 0.08em;
            margin-bottom: var(--space-1);
            padding: 0;
            text-transform: uppercase;
        }

        &__facts
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-1) var(--space-2);
            margin-top: var(--space-1);
        }

        &__fact
        {
            background-color: var(--color-surface-sunken);
            border-radius: var(--radius-sm);
            color: var(--color-ink);
            font-size: var(--text-sm);
            padding: 0.1em var(--space-2);
        }

        &__empty
        {
            color: var(--color-ink-muted);
        }
    }
</style>
