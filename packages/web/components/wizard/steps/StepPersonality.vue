<script lang="ts" setup>
    import { localize } from "@byloth/dnd-platform-composer";
    import type { Background } from "@byloth/dnd-platform-schema";

    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /**
     * Step 8: who the character is (docs/phase-1/04-character-creation.md; owner, 2026-09-25). The name, the one
     * thing the character cannot be saved without; the alignment from the ruleset's list (typed when the ruleset
     * has none); traits, ideals, bonds and flaws as free text, the background's suggestions below each one as
     * buttons that fill the field, or add a line to it; appearance and notes.
     */
    type Trait = "traits" | "ideals" | "bonds" | "flaws";
    type Personal = Trait | "appearance" | "notes";
    const TRAITS: Trait[] = ["traits", "ideals", "bonds", "flaws"];

    const { wizard, helpLevel } = useWizardContext();
    const { t, locale } = useI18n();

    const choices = computed(() => wizard.character?.choices);
    const alignments = computed(() => wizard.packageSet?.ruleset.alignments ?? []);
    const alignment = computed(() => alignments.value.find((a) => a.id === choices.value?.alignment));

    const background = computed(() =>
    {
        const id = choices.value?.background;

        return (id ? wizard.packageSet?.entities.get(id)?.data : undefined) as Background | undefined;
    });
    const suggestions = (key: Trait): string[] =>
        (background.value?.personality?.[key] ?? []).map((s) => localize(s, locale.value));

    const text = (key: Personal): string =>
    {
        const value = ((key === "appearance") || (key === "notes")) ?
            choices.value?.[key] :
            choices.value?.personality?.[key];

        return localize(value, locale.value);
    };
    const used = (key: Trait, suggestion: string): boolean => text(key).includes(suggestion);

    /** A suggestion fills an empty field and adds a line to a written one. */
    const suggest = (key: Trait, suggestion: string): void =>
    {
        const current = text(key).trimEnd();

        wizard.setPersonal(key, current ? `${current}\n${suggestion}` : suggestion);
    };

    const value = (event: Event): string => (event.target as HTMLInputElement | HTMLTextAreaElement).value;
</script>

<template>
    <div class="step-personality">
        <section class="step-personality__section" aria-labelledby="personality-who">
            <h2 id="personality-who" class="step-personality__title">
                {{ t("wizard.personality.who") }}
            </h2>
            <label class="step-personality__field">
                <span class="step-personality__label">
                    {{ t("wizard.personality.name") }}
                    <small class="step-personality__needed">{{ t("wizard.personality.needed") }}</small>
                </span>
                <input class="step-personality__input"
                       type="text"
                       autocomplete="off"
                       aria-required="true"
                       :aria-invalid="!wizard.character?.name.trim()"
                       :value="wizard.character?.name ?? ''"
                       @input="wizard.setName(value($event))" />
                <span v-if="helpLevel === 'newcomer'" class="step-personality__hint">
                    {{ t("wizard.personality.nameHint") }}
                </span>
            </label>
            <label class="step-personality__field">
                <span class="step-personality__label">{{ t("wizard.personality.alignment") }}</span>
                <select v-if="alignments.length"
                        class="step-personality__input step-personality__input--short"
                        :value="choices?.alignment ?? ''"
                        @change="wizard.setAlignment(value($event) || undefined)">
                    <option value="">
                        {{ t("wizard.personality.noAlignment") }}
                    </option>
                    <option v-for="a in alignments"
                            :key="a.id"
                            :value="a.id">
                        {{ localize(a.name, locale) }}
                    </option>
                </select>
                <input v-else
                       class="step-personality__input step-personality__input--short"
                       type="text"
                       :value="choices?.alignment ?? ''"
                       @change="wizard.setAlignment(value($event))" />
                <span v-if="alignment?.text && (helpLevel !== 'expert')" class="step-personality__hint">
                    {{ localize(alignment.text, locale) }}
                </span>
                <span v-else-if="helpLevel === 'newcomer'" class="step-personality__hint">
                    {{ t("wizard.personality.alignmentHint") }}
                </span>
            </label>
        </section>

        <section class="step-personality__section" aria-labelledby="personality-traits">
            <h2 id="personality-traits" class="step-personality__title">
                {{ t("wizard.personality.personality") }}
            </h2>
            <div v-for="key in TRAITS"
                 :key="key"
                 class="step-personality__trait">
                <label class="step-personality__field">
                    <span class="step-personality__label">{{ t(`wizard.personality.fields.${key}`) }}</span>
                    <span v-if="helpLevel === 'newcomer'" class="step-personality__hint">
                        {{ t(`wizard.personality.hints.${key}`) }}
                    </span>
                    <textarea class="step-personality__input step-personality__textarea"
                              rows="2"
                              :value="text(key)"
                              @input="wizard.setPersonal(key, value($event))"></textarea>
                </label>
                <details v-if="suggestions(key).length"
                         class="step-personality__suggestions"
                         :open="helpLevel !== 'expert'">
                    <summary class="step-personality__summary">
                        <FontAwesome icon="lightbulb" aria-hidden="true" />
                        {{ t("wizard.personality.suggestions") }}
                    </summary>
                    <ul class="step-personality__list">
                        <li v-for="suggestion in suggestions(key)" :key="suggestion">
                            <button type="button"
                                    class="step-personality__suggestion"
                                    :disabled="used(key, suggestion)"
                                    @click="suggest(key, suggestion)">
                                <span class="step-personality__sr">
                                    {{ t("wizard.personality.use", { field: t(`wizard.personality.fields.${key}`) }) }}
                                </span>
                                {{ suggestion }}
                            </button>
                        </li>
                    </ul>
                </details>
            </div>
        </section>

        <section class="step-personality__section" aria-labelledby="personality-more">
            <h2 id="personality-more" class="step-personality__title">
                {{ t("wizard.personality.more") }}
            </h2>
            <label v-for="key in (['appearance', 'notes'] as const)"
                   :key="key"
                   class="step-personality__field">
                <span class="step-personality__label">{{ t(`wizard.personality.fields.${key}`) }}</span>
                <textarea class="step-personality__input step-personality__textarea"
                          rows="3"
                          :value="text(key)"
                          @input="wizard.setPersonal(key, value($event))"></textarea>
            </label>
        </section>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .step-personality
    {
        display: grid;
        gap: var(--space-6);
        max-width: 46rem;

        &__sr
        {
            @include mixins.sr-only;
        }

        &__section
        {
            display: grid;
            gap: var(--space-4);
        }

        &__title
        {
            font-size: var(--text-xl);
            margin: 0;
        }

        &__trait
        {
            @include mixins.card(1);

            display: grid;
            gap: var(--space-3);
            padding: var(--space-3) var(--space-4) var(--space-4);
        }

        &__field
        {
            display: grid;
            gap: var(--space-1);
        }

        &__label
        {
            align-items: baseline;
            display: flex;
            flex-wrap: wrap;
            font-weight: 700;
            gap: var(--space-2);
        }

        &__needed
        {
            color: var(--color-ink-muted);
            font-weight: 400;
        }

        &__hint
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
        }

        &__input
        {
            @include mixins.tap-target;

            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-md);
            color: var(--color-ink);
            font: inherit;
            padding: 0 var(--space-3);
            width: 100%;

            &--short
            {
                max-width: 22rem;
            }
        }

        &__textarea
        {
            line-height: 1.5;
            padding: var(--space-2) var(--space-3);
            resize: vertical;
        }

        &__summary
        {
            @include mixins.tap-target;

            align-items: center;
            color: var(--color-ink-muted);
            cursor: pointer;
            display: flex;
            font-size: var(--text-sm);
            font-weight: 700;
            gap: var(--space-2);

            :deep(svg)
            {
                color: var(--color-brass);
            }
        }

        &__list
        {
            display: grid;
            gap: var(--space-2);
            list-style: none;
            margin: var(--space-2) 0 0;
            padding: 0;
        }

        &__suggestion
        {
            background-color: var(--color-surface-sunken);
            border: 1px solid transparent;
            border-radius: var(--radius-md);
            color: var(--color-ink);
            cursor: pointer;
            font: inherit;
            padding: var(--space-2) var(--space-3);
            text-align: left;
            width: 100%;

            &:hover:not(:disabled)
            {
                border-color: var(--color-accent);
            }

            &:focus-visible
            {
                @include mixins.focus-ring;
            }

            &:disabled
            {
                color: var(--color-ink-muted);
                cursor: default;
                text-decoration: line-through;
            }
        }
    }
</style>
