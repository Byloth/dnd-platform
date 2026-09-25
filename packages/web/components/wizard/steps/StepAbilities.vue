<script lang="ts" setup>
    import type { Class } from "@byloth/dnd-platform-schema";

    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import { pointBuyCost } from "@/composables/ability-scores";

    /**
     * Step 5: the six ability scores (docs/phase-1/04-character-creation.md; owner, 2026-09-24). Standard array
     * by default, point buy and roll as the other two methods; for the array and the rolls, one menu per ability
     * that swaps a value with the ability holding it, so a value never appears twice. Every row shows the bonuses
     * of species and traits and the total with its modifier, from the derived sheet. The player's own adjustment
     * of a score sits behind "Manual adjustments", open for an expert. A character whose scores were typed as they
     * are (the `manual` method, e.g. one reopened for editing) shows them as six fields, a fourth method.
     */
    const { wizard, entities, helpLevel } = useWizardContext();
    const { t, locale } = useI18n();

    type Method = "standard-array" | "point-buy" | "roll" | "manual";
    const METHODS: Method[] = ["standard-array", "point-buy", "roll", "manual"];

    const set = computed(() => wizard.packageSet);
    const abilities = computed(() => set.value?.ruleset.abilities ?? []);
    const methods = computed(() => set.value?.ruleset.abilityScores);
    const available = computed(() => METHODS.filter((m) => (m === "roll") ||
        ((m === "manual") && (scores.value?.method === "manual")) ||
        ((m === "standard-array") && methods.value?.standardArray?.length) ||
        ((m === "point-buy") && methods.value?.pointBuy)));

    const scores = computed(() => wizard.character?.choices.abilityScores);
    const method = computed((): Method => scores.value?.method ?? "standard-array");
    const base = computed(() => scores.value?.base ?? {});
    const bonuses = computed(() => scores.value?.bonuses ?? {});

    const sheet = computed(() => (wizard.character ?
        useEngine().sheet(wizard.character, wizard.sources, { language: locale.value }).sheet :
        undefined));

    const primary = computed(() =>
    {
        const cls = wizard.character?.choices.classes?.[0]?.class;

        return new Set(cls ? entities.value?.data<Class>(cls)?.primaryAbilities ?? [] : []);
    });

    const signed = (value: number): string => (value >= 0 ? `+${value}` : `−${Math.abs(value)}`);
    const name = (ability: string): string => t(`sheet.abilities.${ability}`);

    const total = (ability: string): number => Number(sheet.value?.values[`ability.${ability}`]?.value ?? 0);
    const modifier = (ability: string): number => Number(sheet.value?.values[`mod.${ability}`]?.value ?? 0);
    const traits = (ability: string): number =>
        total(ability) - (base.value[ability] ?? 10) - (bonuses.value[ability] ?? 0);

    /** The values a row's menu offers: the array, or the rolls once all six are typed. */
    const values = computed((): number[] =>
    {
        if (method.value === "roll") { return validRolls.value ? rollInputs.value as number[] : []; }

        return [...methods.value?.standardArray ?? []];
    });
    const sortedValues = computed(() => [...values.value].sort((a, b) => b - a)
        .map((v, i) => ({ key: `${v}-${i}`, value: v })));

    // Point buy
    const costs = computed(() => methods.value?.pointBuy?.costs ?? {});
    const budget = computed(() => methods.value?.pointBuy?.budget ?? 0);
    const spent = computed(() => pointBuyCost(base.value as Record<string, number>, costs.value) ?? 0);
    const allowed = computed(() => Object.keys(costs.value).map(Number)
        .sort((a, b) => a - b));
    const step = (ability: string, direction: 1 | -1): number | undefined =>
    {
        const list = allowed.value;
        const next = list[list.indexOf(base.value[ability] ?? list[0]!) + direction];
        if (next === undefined) { return undefined; }
        const cost = pointBuyCost({ ...base.value as Record<string, number>, [ability]: next }, costs.value);

        return (cost !== undefined) && (cost <= budget.value) ? next : undefined;
    };

    // Rolls: one place per ability, typed in any order; the menus appear once all are valid.
    const rollInputs = computed(() =>
        Array.from({ length: abilities.value.length }, (_, i) => wizard.rolls[i] ?? null));
    const validRolls = computed(() => rollInputs.value.every((v) => (v !== null) && (v >= 3) && (v <= 18)));
    const onRoll = (index: number, event: Event): void =>
    {
        const input = event.target as HTMLInputElement;
        const next = [...rollInputs.value];
        next[index] = input.value === "" ? null : Math.trunc(Number(input.value));
        wizard.setRolls(next);
    };

    const onAssign = (ability: string, event: Event): void =>
        wizard.assign(ability, Number((event.target as HTMLSelectElement).value));
    const onType = (ability: string, event: Event): void =>
        wizard.setScore(ability, Math.trunc(Number((event.target as HTMLInputElement).value)));
    const onAdjust = (ability: string, event: Event): void =>
    {
        const typed = Math.trunc(Number((event.target as HTMLInputElement).value));
        wizard.adjust(ability, Number.isFinite(typed) ? Math.max(-10, Math.min(10, typed)) : 0);
    };
</script>

<template>
    <div class="step-abilities">
        <fieldset class="step-abilities__methods">
            <legend class="step-abilities__legend">
                {{ t("wizard.abilities.method") }}
            </legend>
            <label v-for="m in available"
                   :key="m"
                   class="step-abilities__method"
                   :class="{ 'step-abilities__method--checked': m === method }">
                <input class="step-abilities__method-input"
                       type="radio"
                       name="ability-method"
                       :value="m"
                       :checked="m === method"
                       @change="wizard.chooseMethod(m)" />
                {{ t(`wizard.abilities.methods.${m}`) }}
            </label>
        </fieldset>
        <p v-if="helpLevel !== 'expert'" class="step-abilities__hint">
            {{ t(`wizard.abilities.hints.${method}`) }}
        </p>

        <fieldset v-if="method === 'roll'" class="step-abilities__rolls">
            <legend class="step-abilities__rolls-title">
                {{ t("wizard.abilities.rolls") }}
            </legend>
            <label v-for="(roll, i) in rollInputs"
                   :key="i"
                   class="step-abilities__roll">
                <span class="step-abilities__roll-label">{{ t("wizard.abilities.roll", { n: i + 1 }) }}</span>
                <input class="step-abilities__roll-input"
                       type="number"
                       inputmode="numeric"
                       min="3"
                       max="18"
                       :value="roll ?? ''"
                       @change="onRoll(i, $event)" />
            </label>
        </fieldset>

        <div class="step-abilities__bar">
            <p v-if="method === 'point-buy'"
               class="step-abilities__points"
               aria-live="polite">
                {{ t("wizard.abilities.pointsLeft", { left: budget - spent, budget: budget }) }}
            </p>
            <p v-if="primary.size" class="step-abilities__legend-primary">
                <FontAwesome icon="star" aria-hidden="true" />
                {{ t("wizard.abilities.primaryLegend") }}
            </p>
            <AppButton v-if="method !== 'manual'"
                       theme="secondary"
                       outline
                       small
                       class="step-abilities__deal"
                       @click="wizard.dealRecommended()">
                {{ t("wizard.abilities.dealRecommended") }}
            </AppButton>
        </div>

        <table class="step-abilities__table">
            <thead>
                <tr>
                    <th scope="col">
                        {{ t("wizard.abilities.headers.ability") }}
                    </th>
                    <th scope="col">
                        {{ t("wizard.abilities.headers.score") }}
                    </th>
                    <th scope="col">
                        {{ t("wizard.abilities.headers.bonuses") }}
                    </th>
                    <th scope="col">
                        {{ t("wizard.abilities.headers.total") }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="ability in abilities"
                    :key="ability"
                    class="step-abilities__row"
                    :class="{ 'step-abilities__row--primary': primary.has(ability) }">
                    <th scope="row" class="step-abilities__name">
                        {{ name(ability) }}
                        <span v-if="primary.has(ability)" class="step-abilities__star">
                            <FontAwesome icon="star" aria-hidden="true" />
                            <span class="step-abilities__sr">, {{ t("wizard.abilities.primary") }}</span>
                        </span>
                    </th>
                    <td class="step-abilities__score" :data-label="t('wizard.abilities.headers.score')">
                        <template v-if="method === 'point-buy'">
                            <span class="step-abilities__buy">
                                <button type="button"
                                        class="step-abilities__step"
                                        :aria-label="t('wizard.abilities.lower', { ability: name(ability) })"
                                        :disabled="step(ability, -1) === undefined"
                                        @click="wizard.buy(ability, step(ability, -1)!)">
                                    <FontAwesome icon="minus" aria-hidden="true" />
                                </button>
                                <output class="step-abilities__value">{{ base[ability] }}</output>
                                <button type="button"
                                        class="step-abilities__step"
                                        :aria-label="t('wizard.abilities.raise', { ability: name(ability) })"
                                        :disabled="step(ability, 1) === undefined"
                                        @click="wizard.buy(ability, step(ability, 1)!)">
                                    <FontAwesome icon="plus" aria-hidden="true" />
                                </button>
                            </span>
                            <small class="step-abilities__cost">
                                {{ t("wizard.abilities.cost", { cost: costs[String(base[ability])] ?? 0 }) }}
                            </small>
                        </template>
                        <template v-else-if="method === 'manual'">
                            <label class="step-abilities__sr" :for="`score-${ability}`">
                                {{ t("wizard.abilities.scoreOf", { ability: name(ability) }) }}
                            </label>
                            <input :id="`score-${ability}`"
                                   class="step-abilities__select step-abilities__typed"
                                   type="number"
                                   inputmode="numeric"
                                   min="1"
                                   max="30"
                                   :value="base[ability]"
                                   @change="onType(ability, $event)" />
                        </template>
                        <template v-else-if="values.length">
                            <label class="step-abilities__sr" :for="`score-${ability}`">
                                {{ t("wizard.abilities.scoreOf", { ability: name(ability) }) }}
                            </label>
                            <select :id="`score-${ability}`"
                                    class="step-abilities__select"
                                    :value="base[ability]"
                                    @change="onAssign(ability, $event)">
                                <option v-for="option in sortedValues"
                                        :key="option.key"
                                        :value="option.value">
                                    {{ option.value }}
                                </option>
                            </select>
                        </template>
                        <span v-else class="step-abilities__value">{{ base[ability] ?? "—" }}</span>
                    </td>
                    <td class="step-abilities__bonus"
                        :class="{ 'step-abilities__bonus--none': !traits(ability) }"
                        :data-label="t('wizard.abilities.headers.bonuses')">
                        {{ traits(ability) ? signed(traits(ability)) : "—" }}
                    </td>
                    <td class="step-abilities__total" :data-label="t('wizard.abilities.headers.total')">
                        <strong>{{ total(ability) }}</strong>
                        <!-- The span's leading space keeps "15 (+2)" apart for a screen reader too. -->
                        <span class="step-abilities__mod"> ({{ signed(modifier(ability)) }})</span>
                    </td>
                </tr>
            </tbody>
        </table>
        <p v-if="method === 'roll' && !values.length" class="step-abilities__hint">
            {{ t("wizard.abilities.typeRolls") }}
        </p>

        <details class="step-abilities__adjustments" :open="helpLevel === 'expert'">
            <summary class="step-abilities__adjustments-toggle">
                {{ t("wizard.abilities.adjustments.title") }}
            </summary>
            <p class="step-abilities__hint">
                {{ t("wizard.abilities.adjustments.note") }}
            </p>
            <div class="step-abilities__adjust-list">
                <label v-for="ability in abilities"
                       :key="ability"
                       class="step-abilities__adjust">
                    <span>{{ name(ability) }}</span>
                    <input class="step-abilities__adjust-input"
                           type="number"
                           inputmode="numeric"
                           min="-10"
                           max="10"
                           step="1"
                           :value="bonuses[ability] ?? 0"
                           @change="onAdjust(ability, $event)" />
                </label>
            </div>
        </details>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .step-abilities
    {
        display: grid;
        gap: var(--space-4);

        &__legend,
        &__sr
        {
            @include mixins.sr-only;
        }

        &__methods
        {
            background-color: var(--color-surface-sunken);
            border: 0;
            border-radius: var(--radius-round);
            display: flex;
            gap: var(--space-1);
            justify-self: start;
            margin: 0;
            max-width: 100%;
            padding: var(--space-1);
        }

        &__method
        {
            @include mixins.tap-target;

            align-items: center;
            border-radius: var(--radius-round);
            color: var(--color-ink-muted);
            cursor: pointer;
            display: inline-flex;
            font-weight: 700;
            justify-content: center;
            padding: 0 var(--space-4);
            text-align: center;
            transition: background-color var(--duration-fast) var(--easing), color var(--duration-fast) var(--easing);

            &:hover
            {
                color: var(--color-ink);
            }

            &:has(.step-abilities__method-input:focus-visible)
            {
                @include mixins.focus-ring;
            }

            &--checked,
            &--checked:hover
            {
                background-color: var(--color-surface-raised);
                box-shadow: var(--shadow-1);
                color: var(--color-accent);
            }
        }

        &__method-input
        {
            @include mixins.sr-only;
        }

        &__hint
        {
            color: var(--color-ink-muted);
            margin: 0;
        }

        &__rolls
        {
            border: 0;
            display: grid;
            gap: var(--space-2);
            grid-template-columns: repeat(3, minmax(0, 1fr));
            margin: 0;
            padding: 0;

            @include mixins.from(variables.$tablet-min)
            {
                grid-template-columns: repeat(6, minmax(0, 1fr));
            }
        }

        &__rolls-title
        {
            font-weight: 700;
            margin-bottom: var(--space-2);
            padding: 0;
        }

        &__roll
        {
            display: grid;
            gap: var(--space-1);
        }

        &__roll-label
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
        }

        &__roll-input,
        &__adjust-input,
        &__select
        {
            @include mixins.tap-target;

            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-md);
            color: var(--color-ink);
            font: inherit;
            font-size: var(--text-lg);
            font-weight: 700;
            padding: 0 var(--space-3);
            width: 100%;
        }

        &__select
        {
            max-width: 6rem;
        }

        &__bar
        {
            align-items: center;
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-3);
        }

        &__points
        {
            background-color: var(--color-accent-soft);
            border-radius: var(--radius-round);
            color: var(--color-accent);
            font-weight: 700;
            margin: 0;
            padding: var(--space-1) var(--space-3);
        }

        &__legend-primary
        {
            color: var(--color-ink-muted);
            margin: 0;

            :deep(svg)
            {
                color: var(--color-brass);
            }
        }

        &__deal
        {
            margin-left: auto;
        }

        &__table
        {
            border-collapse: separate;
            border-spacing: 0 var(--space-2);
            width: 100%;

            thead th
            {
                color: var(--color-ink-muted);
                font-size: var(--text-sm);
                font-weight: 700;
                letter-spacing: 0.06em;
                padding: 0 var(--space-3);
                text-align: left;
                text-transform: uppercase;
            }

            // On a phone every row is a card: the header row goes, the cells say what they are.
            @media (max-width: variables.$phone-max)
            {
                thead
                {
                    @include mixins.sr-only;
                }

                tbody,
                tr
                {
                    display: block;
                }

                td[data-label]::before
                {
                    color: var(--color-ink-muted);
                    content: attr(data-label);
                    font-size: var(--text-sm);
                    font-weight: 400;
                    margin-right: auto;
                }
            }
        }

        &__row
        {
            th,
            td
            {
                background-color: var(--color-surface-raised);
                border-bottom: 1px solid var(--color-border);
                border-top: 1px solid var(--color-border);
                padding: var(--space-3);
                vertical-align: middle;
            }

            th
            {
                border-left: 1px solid var(--color-border);
                border-radius: var(--radius-md) 0 0 var(--radius-md);
            }

            td:last-child
            {
                border-radius: 0 var(--radius-md) var(--radius-md) 0;
                border-right: 1px solid var(--color-border);
            }

            &--primary th
            {
                border-left: 4px solid var(--color-brass);
            }

            @media (max-width: variables.$phone-max)
            {
                @include mixins.card(1);

                margin-bottom: var(--space-3);
                padding: var(--space-2) var(--space-3);

                th,
                td,
                td:last-child
                {
                    align-items: center;
                    background: none;
                    border: 0;
                    border-radius: 0;
                    display: flex;
                    gap: var(--space-3);
                    padding: var(--space-2) 0;
                }

                &--primary
                {
                    border-left: 4px solid var(--color-brass);

                    th
                    {
                        border-left: 0;
                    }
                }
            }
        }

        &__name
        {
            font-family: var(--font-display);
            font-size: var(--text-lg);
            text-align: left;
        }

        &__star
        {
            color: var(--color-brass);
            font-size: var(--text-sm);
            margin-left: var(--space-1);
        }

        &__buy
        {
            align-items: center;
            display: inline-flex;
            gap: var(--space-2);
        }

        &__step
        {
            @include mixins.tap-target;

            align-items: center;
            background-color: var(--color-surface-sunken);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-round);
            color: var(--color-ink);
            cursor: pointer;
            display: inline-flex;
            justify-content: center;

            &:hover:not(:disabled)
            {
                border-color: var(--color-accent);
                color: var(--color-accent);
            }

            &:disabled
            {
                cursor: not-allowed;
                opacity: 0.45;
            }
        }

        &__value
        {
            font-size: var(--text-xl);
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            min-width: 2ch;
            text-align: center;
        }

        &__cost
        {
            color: var(--color-ink-muted);
            display: block;
            margin-top: var(--space-1);
        }

        &__bonus
        {
            color: var(--color-healing);
            font-weight: 700;

            &--none
            {
                color: var(--color-ink-muted);
                font-weight: 400;
            }
        }

        &__total strong
        {
            font-size: var(--text-xl);
        }

        &__mod
        {
            color: var(--color-ink-muted);
        }

        &__adjustments
        {
            @include mixins.card(1);

            padding: 0 var(--space-4);
        }

        &__adjustments-toggle
        {
            @include mixins.tap-target;

            align-items: center;
            cursor: pointer;
            display: flex;
            font-weight: 700;
        }

        &__adjustments[open]
        {
            padding-bottom: var(--space-4);
        }

        &__adjust-list
        {
            display: grid;
            gap: var(--space-3);
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: var(--space-3);

            @include mixins.from(variables.$tablet-min)
            {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
        }

        &__adjust
        {
            display: grid;
            gap: var(--space-1);
        }
    }
</style>
