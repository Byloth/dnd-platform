<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import SheetView from "@/components/sheet/SheetView.vue";
    import { choiceKind, useChoiceOptions } from "@/composables/choice-options";
    import type { StepId } from "@/stores/wizard";

    /**
     * Step 9: the character as the sheet shows it (docs/phase-1/04-character-creation.md). On top, what is still
     * open, each said plainly with the step that fixes it: a step not done, a choice not answered, content that
     * is missing, the name. Everything but the name is a warning the player may save with; the name is needed
     * (owner, 2026-09-25). Saving stores the character and opens its sheet.
     */
    interface Issue
    {
        readonly text: string;
        readonly step?: StepId;
        /** The engine's own words, for an expert. */
        readonly detail?: string;
    }

    const STEPS_TO_CHECK: StepId[] = ["species", "class", "background", "abilities", "equipment"];

    const { wizard, helpLevel } = useWizardContext();
    const { t, locale } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const translate = useSheetTranslate();

    const composed = computed(() => (wizard.character && wizard.sources.length ?
        useEngine().sheet(wizard.character, wizard.sources, {
            language: locale.value,
            helpLevel: helpLevel.value,
            translate: translate
        }) :
        undefined));
    const named = computed(() => Boolean(wizard.character?.name.trim()));
    const stepName = (step: StepId): string => t(`wizard.steps.${step}`);
    const note = computed(() =>
    {
        if (!named.value) { return t("wizard.review.needsName"); }

        return t(wizard.editing ? "wizard.review.saveChangesNote" : "wizard.review.saveNote");
    });

    const issues = computed((): Issue[] =>
    {
        const sheet = composed.value?.sheet;
        if (!sheet || !wizard.packageSet) { return []; }
        const naming = useChoiceOptions(wizard.packageSet, sheet, locale.value, t);

        const steps = STEPS_TO_CHECK.filter((step) => !stepDone(step))
            .map((step): Issue => ({ step: step, text: t("wizard.review.issues.step", { step: stepName(step) }) }));
        const choices = sheet.choices.filter((c) => !c.answered && (c.of !== "asi-or-feat"))
            .map((choice): Issue =>
            {
                const { name, root } = naming.owner(choice);
                const title = name === root ? t(`wizard.choices.titles.${choiceKind(choice)}`) : name;
                const left = choice.count - choice.answers.length;

                const text = t("wizard.review.issues.choice", { owner: root, choice: title, n: left }, left);

                return { step: choice.of === "subclass" ? "class" : "choices", text: text };
            });
        const others = sheet.warnings.filter((w) => w.code !== "W_UNANSWERED_CHOICE")
            .map((w): Issue => ((w.code === "W_MISSING_ENTITY") || (w.package !== undefined) ?
                { step: "content", text: t("wizard.review.issues.content"), detail: w.message } :
                { text: t("wizard.review.issues.other"), detail: w.message }));
        const name = named.value ? [] : [{ step: "personality" as const, text: t("wizard.review.issues.name") }];

        return [...name, ...steps, ...choices, ...others];
    });

    const heading = computed(() => (issues.value.length ?
        t("wizard.review.open", { n: issues.value.length }, issues.value.length) :
        t("wizard.review.ready")));

    const go = (step: StepId): void =>
    {
        wizard.goTo(step);
        void router.replace({ query: { ...route.query, step: step } });
        if (import.meta.client) { window.scrollTo({ top: 0, behavior: "smooth" }); }
    };

    type Saving = "idle" | "saving" | "failed";
    const saving = ref<Saving>("idle");

    const save = async (): Promise<void> =>
    {
        saving.value = "saving";
        try
        {
            const id = await wizard.finish();
            if (!id)
            {
                saving.value = "idle";

                return;
            }

            await navigateTo({ name: "characters-id", params: { id: id } });
        }
        catch
        {
            saving.value = "failed";
        }
    };
</script>

<template>
    <div class="step-review">
        <section class="step-review__status"
                 :class="issues.length ? 'step-review__status--open' : 'step-review__status--ready'"
                 aria-labelledby="review-status">
            <h2 id="review-status" class="step-review__heading">
                <FontAwesome :icon="issues.length ? 'triangle-exclamation' : 'circle-check'" aria-hidden="true" />
                {{ heading }}
            </h2>
            <p v-if="issues.length && (helpLevel === 'newcomer')" class="step-review__hint">
                {{ t("wizard.review.openHint") }}
            </p>
            <ul v-if="issues.length" class="step-review__issues">
                <li v-for="(issue, i) in issues"
                    :key="i"
                    class="step-review__issue">
                    <span class="step-review__issue-text">
                        {{ issue.text }}
                        <small v-if="issue.detail && (helpLevel === 'expert')" class="step-review__detail">
                            {{ issue.detail }}
                        </small>
                    </span>
                    <AppButton v-if="issue.step"
                               theme="secondary"
                               outline
                               small
                               @click="go(issue.step)">
                        {{ t("wizard.review.fix", { step: stepName(issue.step) }) }}
                    </AppButton>
                </li>
            </ul>
            <div class="step-review__save">
                <AppButton :disabled="!named || (saving === 'saving')"
                           aria-describedby="review-save-note"
                           @click="save">
                    <FontAwesome icon="hard-drive" aria-hidden="true" />
                    {{ t(wizard.editing ? "wizard.review.saveChanges" : "wizard.review.save") }}
                </AppButton>
                <p id="review-save-note" class="step-review__note">
                    {{ note }}
                </p>
            </div>
            <p v-if="saving === 'failed'"
               class="step-review__failed"
               role="alert">
                {{ t("wizard.review.failed") }}
            </p>
        </section>

        <SheetView v-if="composed && wizard.character"
                   embedded
                   :character="wizard.character"
                   :composed="composed"
                   :help-level="helpLevel"
                   :language="locale"
                   :translate="translate" />
    </div>
</template>

<style lang="scss" scoped>
    .step-review
    {
        display: grid;
        gap: var(--space-6);

        &__status
        {
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            display: grid;
            gap: var(--space-3);
            padding: var(--space-4) var(--space-5);

            &--open
            {
                background-color: var(--color-warning-soft);
                border-color: color-mix(in srgb, var(--color-warning) 35%, transparent);

                .step-review__heading :deep(svg) { color: var(--color-warning); }
            }

            &--ready
            {
                background-color: var(--color-healing-soft);
                border-color: color-mix(in srgb, var(--color-healing) 35%, transparent);

                .step-review__heading :deep(svg) { color: var(--color-healing); }
            }
        }

        &__heading
        {
            align-items: center;
            display: flex;
            font-family: var(--font-text);
            font-size: var(--text-lg);
            gap: var(--space-2);
            letter-spacing: 0;
            margin: 0;
        }

        &__hint
        {
            color: var(--color-ink-muted);
            margin: 0;
        }

        &__issues
        {
            display: grid;
            gap: var(--space-2);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__issue
        {
            align-items: center;
            background-color: var(--color-surface-raised);
            border-radius: var(--radius-md);
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2) var(--space-3);
            justify-content: space-between;
            padding: var(--space-2) var(--space-3);
        }

        &__issue-text
        {
            display: grid;
            flex: 1 1 16rem;
            gap: var(--space-1);
        }

        &__detail
        {
            color: var(--color-ink-muted);
        }

        &__save
        {
            align-items: center;
            border-top: 1px solid var(--color-border);
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-3);
            padding-top: var(--space-3);
        }

        &__note
        {
            color: var(--color-ink-muted);
            flex: 1 1 16rem;
            font-size: var(--text-sm);
            margin: 0;
        }

        &__failed
        {
            color: var(--color-damage);
            font-weight: 700;
            margin: 0;
        }
    }
</style>
