<script lang="ts" setup>
    import type { HelpLevel } from "@byloth/dnd-platform-composer";
    import type { ChoiceView } from "@byloth/dnd-platform-engine";

    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { ChoiceKind, ChoiceOption } from "@/composables/choice-options";

    /**
     * One choice the sheet asks (step 6): its heading ("Acolyte · Languages", "choose 2, 1 chosen"), for a
     * newcomer a line on what it does, and its options as cards: radios for one answer, checkboxes for more,
     * the unchosen ones disabled once the count is reached. Long lists get a search field; spells are grouped by
     * level and exotic languages wait behind a toggle.
     */
    const props = defineProps<{
        choice: ChoiceView;
        kind: ChoiceKind;
        title: string;
        eyebrow: string;
        options: readonly ChoiceOption[];
        helpLevel: HelpLevel;
    }>();
    const emit = defineEmits<{ answer: [values: string[]] }>();

    const { t } = useI18n();

    const SEARCH_FROM = 12;
    const query = ref("");
    const exotic = ref(false);

    const chosen = computed(() => new Set(props.choice.answers));
    const full = computed(() => chosen.value.size >= props.choice.count);
    const single = computed(() => props.choice.count === 1);
    const hasExotic = computed(() => props.options.some((o) => o.group === "exotic"));

    const visible = computed(() =>
    {
        const needle = query.value.trim().toLocaleLowerCase();

        return props.options.filter((o) => chosen.value.has(o.id) ||
            (((o.group !== "exotic") || exotic.value) && (!needle || o.name.toLocaleLowerCase().includes(needle))));
    });

    /** Spells by level; anything else as one group. */
    const groups = computed(() =>
    {
        if ((props.kind !== "spell") && (props.kind !== "cantrip"))
        {
            return [{ key: "all", label: "", items: visible.value }];
        }
        const levels = [...new Set(visible.value.map((o) => o.group ?? ""))];
        if (levels.length < 2) { return [{ key: "all", label: "", items: visible.value }]; }

        return levels.map((level) => ({
            key: level,
            label: t(`sheet.spellLevels.${level}`),
            items: visible.value.filter((o) => (o.group ?? "") === level)
        }));
    });

    const select = (id: string, checked: boolean): void =>
    {
        if (single.value) { emit("answer", [id]); }
        else
        {
            const next = checked ? [...props.choice.answers, id] : props.choice.answers.filter((a) => a !== id);
            emit("answer", next.slice(0, props.choice.count));
        }
    };

    /** A language written by hand, kept as an id (lowercase words joined by hyphens). */
    const typed = (index: number, event: Event): void =>
    {
        const id = (event.target as HTMLInputElement).value.trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const next = [...props.choice.answers];
        next[index] = id;
        emit("answer", next.filter((v) => v !== ""));
    };

    const name = computed(() => `choice-${props.choice.key.replace(/[^a-z0-9]+/gi, "-")}`);
</script>

<template>
    <section class="choice-group" :aria-labelledby="`${name}-title`">
        <header class="choice-group__header">
            <p class="choice-group__eyebrow">
                {{ eyebrow }}
            </p>
            <h2 :id="`${name}-title`" class="choice-group__title">
                {{ title }}
            </h2>
            <p class="choice-group__progress"
               :class="{ 'choice-group__progress--done': full }"
               aria-live="polite">
                <FontAwesome v-if="full"
                             icon="circle-check"
                             aria-hidden="true" />
                {{ t("wizard.choices.progress", { chosen: chosen.size, count: choice.count }) }}
            </p>
            <p v-if="helpLevel === 'newcomer'" class="choice-group__about">
                {{ t(`wizard.choices.kinds.${kind}`) }}
            </p>
        </header>

        <div v-if="options.length >= SEARCH_FROM || hasExotic" class="choice-group__tools">
            <label v-if="options.length >= SEARCH_FROM" class="choice-group__search">
                <span class="choice-group__search-label">{{ t("wizard.choices.search") }}</span>
                <input v-model="query"
                       class="choice-group__search-input"
                       type="search"
                       autocomplete="off" />
            </label>
            <label v-if="hasExotic" class="choice-group__toggle">
                <input v-model="exotic" type="checkbox" />
                {{ t("wizard.choices.exotic") }}
            </label>
        </div>

        <p v-if="full && !single" class="choice-group__limit">
            {{ t("wizard.choices.limit") }}
        </p>

        <fieldset v-for="group in groups"
                  :key="group.key"
                  class="wizard-options">
            <legend :class="group.label ? 'wizard-options__title' : 'wizard-options__legend'">
                {{ group.label || title }}
            </legend>
            <ChoiceCard v-for="option in group.items"
                        :key="option.id"
                        :name="name"
                        :type="single ? 'radio' : 'checkbox'"
                        :value="option.id"
                        :title="option.name"
                        :summary="option.summary"
                        :checked="chosen.has(option.id)"
                        :disabled="!single && full && !chosen.has(option.id)"
                        :help-level="helpLevel"
                        @select="select">
                <span v-if="option.facts.length" class="wizard-options__facts">
                    <span v-for="fact in option.facts"
                          :key="fact"
                          class="wizard-options__fact">{{ fact }}</span>
                </span>
            </ChoiceCard>
        </fieldset>
        <!-- A ruleset without a list of languages: the player writes them (ruleset.schema.json, "languages"). -->
        <div v-if="!options.length && kind === 'language'" class="choice-group__free">
            <label v-for="i in choice.count"
                   :key="i"
                   class="choice-group__search">
                <span class="choice-group__search-label">{{ t("wizard.choices.freeLanguage", { n: i }) }}</span>
                <input class="choice-group__search-input"
                       type="text"
                       :value="choice.answers[i - 1] ?? ''"
                       @change="typed(i - 1, $event)" />
            </label>
        </div>
        <p v-else-if="!options.length" class="wizard-options__empty">
            {{ t("wizard.choices.noOptions") }}
        </p>
        <p v-else-if="!visible.length" class="wizard-options__empty">
            {{ t("wizard.choices.noMatch") }}
        </p>
    </section>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .choice-group
    {
        border-top: 1px solid var(--color-border);
        display: grid;
        gap: var(--space-3);
        padding-top: var(--space-5);

        &:first-child
        {
            border-top: 0;
            padding-top: 0;
        }

        &__header
        {
            display: grid;
            gap: var(--space-1);
        }

        &__eyebrow
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            font-weight: 700;
            letter-spacing: 0.08em;
            margin: 0;
            text-transform: uppercase;
        }

        &__title
        {
            font-size: var(--text-xl);
            margin: 0;
        }

        &__progress
        {
            color: var(--color-ink-muted);
            font-weight: 700;
            margin: 0;

            &--done
            {
                color: var(--color-healing);
            }
        }

        &__about
        {
            margin: 0;
            max-width: 46rem;
        }

        &__tools
        {
            align-items: end;
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-4);
        }

        &__search
        {
            display: grid;
            flex: 1 1 16rem;
            gap: var(--space-1);
            max-width: 24rem;
        }

        &__search-label
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
        }

        &__search-input
        {
            @include mixins.tap-target;

            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-md);
            color: var(--color-ink);
            font: inherit;
            padding: 0 var(--space-3);
        }

        &__toggle
        {
            @include mixins.tap-target;

            align-items: center;
            cursor: pointer;
            display: inline-flex;
            gap: var(--space-2);
        }

        &__free
        {
            display: grid;
            gap: var(--space-3);
        }

        &__limit
        {
            background-color: var(--color-surface-sunken);
            border-radius: var(--radius-md);
            color: var(--color-ink-muted);
            margin: 0;
            padding: var(--space-2) var(--space-3);
        }
    }
</style>
