<script lang="ts" setup>
    import { explainValue } from "@byloth/dnd-platform-composer";
    import type {
        Explanation, HelpLevel, IdentityBlock, Section, Translate, ValueItem
    } from "@byloth/dnd-platform-composer";
    import type { Character } from "@byloth/dnd-platform-engine";

    import ProvenanceDrawer from "@/components/sheet/ProvenanceDrawer.vue";
    import SectionBlock from "@/components/sheet/SectionBlock.vue";
    import SheetBlock from "@/components/sheet/SheetBlock.vue";
    import ValueTile from "@/components/sheet/ValueTile.vue";
    import WarningList from "@/components/sheet/WarningList.vue";
    import type { ComposedSheet } from "@/composables/sheet";
    import { OPEN_DRAWER } from "@/composables/sheet-drawer";
    import type { DrawerRequest } from "@/composables/sheet-drawer";

    /**
     * The build-mode sheet (docs/phase-1/03-sheet-composer.md, "The build-mode screen"): the character's header,
     * the vital strip (sticky on a phone), the warnings, the pinned sections, then the sections in tree order —
     * one column on a phone, two from a desktop width. Every number opens its explanation.
     */
    const props = defineProps<{
        character: Character;
        composed: ComposedSheet;
        helpLevel: HelpLevel;
        language: string;
        translate?: Translate;
    }>();

    const { t } = useI18n();
    const preferences = usePreferencesStore();

    /** The values every turn needs, in the strip at the top; the rest of Core stays in its section. */
    const VITAL = ["ac", "hp", "speed", "initiative", "proficiency"];
    /** Sections of the left column on a wide screen: the numbers; the right column has what the character does. */
    const LEFT = new Set(["core", "abilities", "saves", "skills", "senses", "combat"]);

    const sections = computed(() => props.composed.tree.sections);
    const identity = computed(() => sections.value
        .find((s) => s.id === "identity")?.blocks
        .find((b) => b.kind === "identity") as IdentityBlock | undefined);
    const coreItems = computed((): ValueItem[] =>
    {
        const block = sections.value.find((s) => s.id === "core")?.blocks.find((b) => b.kind === "values");

        return block?.kind === "values" ? [...block.items] : [];
    });
    const vital = computed(() => VITAL
        .map((id) => coreItems.value.find((i) => i.id === id))
        .filter((i) => i !== undefined));

    /** The sections the screen shows: Core without its vital values, and Conditions even when empty. */
    const shown = computed((): Section[] => sections.value
        .filter((s) => s.id !== "identity")
        .map((s) =>
        {
            if (s.id !== "core") { return s; }
            const rest = coreItems.value.filter((i) => !VITAL.includes(i.id));
            const others = s.blocks.filter((b) => b.kind !== "values");

            return { ...s, blocks: [...(rest.length ? [{ kind: "values" as const, items: rest }] : []), ...others] };
        })
        .filter((s) => s.blocks.length > 0 || s.id === "conditions"));

    const layout = computed(() => preferences.sheetLayout(props.character.id));
    const pinned = computed(() => shown.value.filter((s) => layout.value.pinned.includes(s.id)));
    const unpinned = computed(() => shown.value.filter((s) => !layout.value.pinned.includes(s.id)));
    const left = computed(() => unpinned.value.filter((s) => LEFT.has(s.id)));
    const right = computed(() => unpinned.value.filter((s) => !LEFT.has(s.id)));

    // The drawer: every view of the tapped value's provenance, composed on demand.
    const request = ref<DrawerRequest>();
    const explanation = computed((): Explanation | undefined =>
    {
        if (!request.value) { return undefined; }

        return explainValue(props.composed.sheet, request.value.value, {
            character: props.character,
            packages: props.composed.packages,
            language: props.language,
            helpLevel: props.helpLevel,
            ...(props.translate ? { translate: props.translate } : {})
        });
    });
    provide(OPEN_DRAWER, (value: DrawerRequest) => { request.value = value; });
</script>

<template>
    <article class="sheet-view" :class="`sheet-view--${helpLevel}`">
        <header v-if="identity" class="sheet-view__hero">
            <p class="sheet-view__level">
                {{ t("sheetView.level", { level: identity.level }) }}
            </p>
            <h1 class="sheet-view__name">
                {{ identity.name }}
            </h1>
            <p class="sheet-view__parts">
                {{ identity.parts.join(" · ") }}
            </p>
            <p v-if="helpLevel === 'newcomer'" class="sheet-view__hint">
                {{ t("sheetView.explainHint") }}
            </p>
        </header>

        <section v-if="vital.length"
                 class="sheet-view__vital"
                 :aria-label="t('sheetView.vital')">
            <ValueTile v-for="item in vital"
                       :key="item.id"
                       vital
                       :label="item.label"
                       :shown="item.shown"
                       :value="item.value"
                       :raw="item.raw" />
        </section>

        <WarningList v-if="composed.tree.warnings.length"
                     class="sheet-view__warnings"
                     :warnings="composed.tree.warnings" />

        <div v-if="pinned.length" class="sheet-view__pinned">
            <SectionBlock v-for="section in pinned"
                          :id="section.id"
                          :key="section.id"
                          :title="section.title"
                          :pinned="true"
                          :collapsed="layout.collapsed.includes(section.id)"
                          @toggle-pinned="preferences.togglePinned(character.id, section.id)"
                          @toggle-collapsed="preferences.toggleCollapsed(character.id, section.id)">
                <SheetBlock v-for="(block, i) in section.blocks"
                            :key="i"
                            :block="block"
                            :help-level="helpLevel" />
                <p v-if="section.id === 'conditions' && !section.blocks.length" class="sheet-view__empty">
                    {{ t("sheetView.conditions.none") }}
                </p>
            </SectionBlock>
        </div>

        <div class="sheet-view__columns">
            <div v-for="column in [left, right]"
                 :key="column === left ? 'left' : 'right'"
                 class="sheet-view__column">
                <SectionBlock v-for="section in column"
                              :id="section.id"
                              :key="section.id"
                              :title="section.title"
                              :pinned="false"
                              :collapsed="layout.collapsed.includes(section.id)"
                              @toggle-pinned="preferences.togglePinned(character.id, section.id)"
                              @toggle-collapsed="preferences.toggleCollapsed(character.id, section.id)">
                    <SheetBlock v-for="(block, i) in section.blocks"
                                :key="i"
                                :block="block"
                                :help-level="helpLevel" />
                    <p v-if="section.id === 'conditions' && !section.blocks.length" class="sheet-view__empty">
                        {{ t("sheetView.conditions.none") }}
                    </p>
                </SectionBlock>
            </div>
        </div>

        <ProvenanceDrawer :label="request?.label ?? ''"
                          :shown="request?.shown ?? ''"
                          :explanation="explanation"
                          :help-level="helpLevel"
                          @close="request = undefined" />
    </article>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .sheet-view
    {
        display: grid;
        gap: var(--space-4);

        &__hero
        {
            background:
                radial-gradient(120% 140% at 0% 0%, var(--color-accent-soft), transparent 55%),
                linear-gradient(160deg, var(--color-surface-raised), var(--color-surface-sunken));
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-1);
            padding: var(--space-5);
        }

        &__level
        {
            background-color: var(--color-accent);
            border-radius: var(--radius-round);
            color: var(--color-accent-ink);
            display: inline-block;
            font-size: var(--text-xs);
            font-weight: 700;
            letter-spacing: 0.08em;
            margin: 0 0 var(--space-2);
            padding: 0.15em var(--space-3);
            text-transform: uppercase;
        }

        &__name
        {
            font-size: clamp(var(--text-2xl), 6vw, 3rem);
            margin-bottom: var(--space-2);
        }

        &__parts
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
            margin: 0;
        }

        &__hint
        {
            color: var(--color-brass);
            font-weight: 700;
            margin: var(--space-3) 0 0;
        }

        &__vital
        {
            display: grid;
            gap: var(--space-2);
            grid-template-columns: repeat(5, minmax(0, 1fr));

            // On a phone: one compact row that scrolls sideways, kept under the navigation bar.
            @media (max-width: variables.$phone-max)
            {
                backdrop-filter: blur(10px);
                background-color: color-mix(in srgb, var(--color-surface) 90%, transparent);
                border-bottom: 1px solid var(--color-border);
                grid-auto-columns: max-content;
                grid-auto-flow: column;
                grid-template-columns: none;
                margin: 0 calc(-1 * var(--space-4));
                overflow-x: auto;
                overscroll-behavior-x: contain;
                padding: var(--space-2) var(--space-4);
                position: sticky;
                scroll-snap-type: x proximity;
                scrollbar-width: none;
                top: var(--navigation-bar-height);
                z-index: 5;

                :deep(.value-tile)
                {
                    scroll-snap-align: start;
                }
                :deep(.value-tile__face)
                {
                    min-width: 6.25rem;
                    padding: var(--space-2) var(--space-3);
                }
                :deep(.value-tile__label)
                {
                    white-space: nowrap;
                }
                :deep(.value-tile__value)
                {
                    font-size: var(--text-2xl);
                    white-space: nowrap;
                }
            }
        }

        &__pinned
        {
            display: grid;
            gap: var(--space-4);
        }

        &__columns
        {
            display: grid;
            gap: var(--space-4);

            @include mixins.from(variables.$desktop-min)
            {
                align-items: start;
                grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
            }
        }

        &__column
        {
            display: grid;
            gap: var(--space-4);
        }

        &__empty
        {
            color: var(--color-ink-muted);
            font-style: italic;
            margin: 0;
        }
    }
</style>
