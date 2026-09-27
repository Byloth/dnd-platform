<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import { challengeLabel } from "@/composables/compendium";
    import type { CompendiumKind, Filters } from "@/composables/compendium";

    /**
     * The filters of a compendium list (docs/phase-1/13-compendium.md): a menu per facet with "Any" first and only
     * the values the entries have, a checkbox per yes-or-no facet. Closed on a phone, open from a tablet up.
     */
    const props = defineProps<{
        kind: CompendiumKind;
        filters: Filters;
        /** The values present, per facet (`filterOptions`). */
        options: Readonly<Record<string, readonly string[]>>;
        /** The label of a facet's value. */
        label: (key: string, value: string) => string;
    }>();
    const emit = defineEmits<{ update: [filters: Filters] }>();

    const { t } = useI18n();

    const MENUS: Readonly<Record<CompendiumKind, readonly string[]>> = {
        spells: ["level", "school", "class", "source"],
        items: ["type", "rarity", "source"],
        creatures: ["crMin", "crMax", "type", "size", "source"],
        conditions: ["source"]
    };
    const CHECKS: Readonly<Record<CompendiumKind, readonly string[]>> = {
        spells: ["ritual", "concentration"],
        items: ["magic", "attunement"],
        creatures: [],
        conditions: []
    };

    /** A menu's values: challenges as the manuals write them, the rest as they are. */
    const valuesOf = (key: string): readonly string[] =>
        ((key === "crMin") || (key === "crMax") ?
            (props.options["challenge"] ?? []).map(challengeLabel) :
            props.options[key] ?? []);
    const labelOf = (key: string, value: string): string =>
        ((key === "crMin") || (key === "crMax") ? value : props.label(key, value));
    // A menu with a single choice filters nothing: the source of an SRD-only device, for one.
    const menus = computed(() => MENUS[props.kind].filter((key) => valuesOf(key).length > 1));
    const active = computed(() => Object.keys(props.filters).length);

    const set = (key: string, value: string): void =>
    {
        const next = Object.fromEntries(Object.entries(props.filters).filter(([k]) => k !== key));
        emit("update", value ? { ...next, [key]: value } : next);
    };

    const open = ref(import.meta.client && (window.matchMedia?.("(min-width: 600px)").matches ?? false));
</script>

<template>
    <details class="compendium-filters" :open="open">
        <summary class="compendium-filters__toggle">
            <FontAwesome icon="sliders" aria-hidden="true" />
            {{ t("compendium.filters.title") }}
            <span v-if="active" class="compendium-filters__badge">{{ active }}</span>
        </summary>
        <div class="compendium-filters__body">
            <label v-for="key in menus"
                   :key="key"
                   class="compendium-filters__field">
                <span class="compendium-filters__label">{{ t(`compendium.filters.${key}`) }}</span>
                <select class="compendium-filters__select"
                        :value="filters[key] ?? ''"
                        @change="set(key, ($event.target as HTMLSelectElement).value)">
                    <option value="">{{ t("compendium.filters.any") }}</option>
                    <option v-for="value in valuesOf(key)"
                            :key="value"
                            :value="value">
                        {{ labelOf(key, value) }}
                    </option>
                </select>
            </label>
            <div v-if="CHECKS[kind].length" class="compendium-filters__checks">
                <label v-for="key in CHECKS[kind]"
                       :key="key"
                       class="compendium-filters__check">
                    <input type="checkbox"
                           class="compendium-filters__checkbox"
                           :checked="filters[key] === 'yes'"
                           @change="set(key, ($event.target as HTMLInputElement).checked ? 'yes' : '')" />
                    {{ t(`compendium.filters.${key}`) }}
                </label>
            </div>
            <AppButton v-if="active"
                       class="compendium-filters__clear"
                       theme="secondary"
                       outline
                       small
                       @click="emit('update', {})">
                {{ t("compendium.filters.clear") }}
            </AppButton>
        </div>
    </details>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .compendium-filters
    {
        @include mixins.card(1);

        padding: 0 var(--space-4);

        &__toggle
        {
            @include mixins.tap-target;

            align-items: center;
            cursor: pointer;
            display: flex;
            font-weight: 700;
            gap: var(--space-2);

            &:focus-visible
            {
                @include mixins.focus-ring;
            }
        }

        &__badge
        {
            background-color: var(--color-accent);
            border-radius: var(--radius-round);
            color: var(--color-accent-ink);
            font-size: var(--text-xs);
            min-width: 1.5em;
            padding: 0 var(--space-2);
            text-align: center;
        }

        &__body
        {
            display: grid;
            gap: var(--space-3);
            grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
            padding-bottom: var(--space-4);
        }

        &__field
        {
            display: grid;
            gap: var(--space-1);
        }

        &__label
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            font-weight: 700;
        }

        &__select
        {
            @include mixins.tap-target;

            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-md);
            color: var(--color-ink);
            font: inherit;
            padding: 0 var(--space-3);
            width: 100%;

            &:focus-visible
            {
                @include mixins.focus-ring;
            }
        }

        &__checks
        {
            align-content: end;
            display: grid;
            gap: var(--space-1);
        }

        &__check
        {
            @include mixins.tap-target;

            align-items: center;
            cursor: pointer;
            display: flex;
            gap: var(--space-2);
        }

        &__checkbox
        {
            accent-color: var(--color-accent);
            height: 1.25rem;
            width: 1.25rem;

            &:focus-visible
            {
                @include mixins.focus-ring;
            }
        }

        &__clear
        {
            align-self: end;
            justify-self: start;
        }
    }
</style>
