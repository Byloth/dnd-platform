<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /**
     * One section of the sheet: a landmark named by its title, collapsible, pinnable to the top
     * (docs/08-dynamic-sheet.md). The state lives in the preferences, per character.
     */
    const props = defineProps<{
        id: string;
        title: string;
        collapsed: boolean;
        pinned: boolean;
    }>();
    const emit = defineEmits<{ toggleCollapsed: [], togglePinned: [] }>();

    const { t } = useI18n();
    const headingId = computed(() => `title-${props.id}`);
</script>

<template>
    <section :id="`section-${id}`"
             class="section-block"
             :class="{ 'section-block--collapsed': collapsed, 'section-block--pinned': pinned }"
             :aria-labelledby="headingId">
        <header class="section-block__header">
            <h2 :id="headingId" class="section-block__title">
                <button type="button"
                        class="section-block__toggle"
                        :aria-expanded="!collapsed"
                        :aria-controls="`body-${id}`"
                        :aria-label="t(collapsed ? 'sheetView.expand' : 'sheetView.collapse', { section: title })"
                        @click="emit('toggleCollapsed')">
                    <FontAwesome class="section-block__chevron"
                                 icon="chevron-down"
                                 aria-hidden="true" />
                    <span>{{ title }}</span>
                </button>
            </h2>
            <button type="button"
                    class="section-block__pin"
                    :aria-pressed="pinned"
                    :aria-label="t(pinned ? 'sheetView.unpin' : 'sheetView.pin', { section: title })"
                    @click="emit('togglePinned')">
                <FontAwesome icon="thumbtack" aria-hidden="true" />
            </button>
        </header>
        <div v-show="!collapsed"
             :id="`body-${id}`"
             class="section-block__body">
            <slot></slot>
        </div>
    </section>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .section-block
    {
        @include mixins.card(1);

        overflow: hidden;

        &--pinned
        {
            border-color: var(--color-brass);
            box-shadow: 0 0 0 1px var(--color-brass), var(--shadow-1);
        }

        &__header
        {
            align-items: center;
            background: linear-gradient(180deg, var(--color-surface-raised), var(--color-surface-sunken));
            border-bottom: 1px solid var(--color-border);
            display: flex;
            gap: var(--space-2);
            padding: 0 var(--space-2) 0 0;
        }

        &--collapsed .section-block__header
        {
            border-bottom-color: transparent;
        }

        &__title
        {
            flex: 1;
            font-size: var(--text-lg);
            margin: 0;
        }

        &__toggle
        {
            @include mixins.tap-target;

            align-items: center;
            background: none;
            border: 0;
            color: var(--color-ink);
            cursor: pointer;
            display: flex;
            font: inherit;
            gap: var(--space-3);
            letter-spacing: 0.04em;
            padding: var(--space-3) var(--space-4);
            text-align: left;
            width: 100%;
        }

        &__chevron
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            transition: transform var(--duration) var(--easing);
        }

        &--collapsed .section-block__chevron
        {
            transform: rotate(-90deg);
        }

        &__pin
        {
            @include mixins.tap-target;

            background: none;
            border: 0;
            border-radius: var(--radius-round);
            color: var(--color-ink-muted);
            cursor: pointer;
            opacity: 0.55;
            transition: opacity var(--duration-fast) var(--easing), color var(--duration-fast) var(--easing);

            &:hover,
            &[aria-pressed="true"]
            {
                color: var(--color-brass);
                opacity: 1;
            }
        }

        &__body
        {
            padding: var(--space-4);
        }
    }
</style>
