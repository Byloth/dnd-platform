<script lang="ts" setup>
    import type { Explanation, HelpLevel } from "@byloth/dnd-platform-composer";

    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /**
     * "Explain this number" (docs/08-dynamic-sheet.md): the value's provenance in words for a newcomer, line by
     * line, or raw with its formulas. A native <dialog>: modal, focus kept inside, Esc closes; a bottom sheet on
     * a phone, a side panel on a wide screen.
     */
    const props = defineProps<{
        label: string;
        shown: string;
        explanation?: Explanation;
        helpLevel: HelpLevel;
    }>();
    const emit = defineEmits<{ close: [] }>();

    const { t } = useI18n();
    const dialog = ref<HTMLDialogElement>();

    type Tab = "words" | "lines" | "raw";
    const TABS: Tab[] = ["words", "lines", "raw"];
    const TAB_OF_LEVEL: Record<HelpLevel, Tab> = { newcomer: "words", regular: "lines", expert: "raw" };
    const initialTab = (): Tab => TAB_OF_LEVEL[props.helpLevel];
    const tab = ref<Tab>(initialTab());

    const open = computed(() => props.explanation !== undefined);
    watch(open, async (isOpen) =>
    {
        await nextTick();
        if (isOpen)
        {
            tab.value = initialTab();
            if (!dialog.value?.open) { dialog.value?.showModal(); }
        }
        else if (dialog.value?.open) { dialog.value.close(); }
    });

    const onTabKey = (event: KeyboardEvent): void =>
    {
        const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (step === 0) { return; }
        event.preventDefault();
        const next = TABS[(TABS.indexOf(tab.value) + step + TABS.length) % TABS.length]!;
        tab.value = next;
        document.getElementById(`drawer-tab-${next}`)?.focus();
    };

    const single = computed(() => (props.explanation?.regular.length ?? 0) <= 1 && !(props.explanation?.notes?.length));
</script>

<template>
    <dialog ref="dialog"
            class="provenance-drawer"
            aria-labelledby="provenance-drawer-title"
            @close="emit('close')"
            @click.self="dialog?.close()">
        <div v-if="explanation" class="provenance-drawer__panel">
            <header class="provenance-drawer__header">
                <div class="provenance-drawer__heading">
                    <p class="provenance-drawer__eyebrow">
                        {{ label }}
                    </p>
                    <h2 id="provenance-drawer-title" class="provenance-drawer__title">
                        {{ t("sheetView.drawer.title") }}
                    </h2>
                </div>
                <span class="provenance-drawer__total" :aria-label="`${t('sheetView.drawer.total')}: ${shown}`">
                    {{ shown }}
                </span>
                <button type="button"
                        class="provenance-drawer__close"
                        :aria-label="t('sheetView.drawer.close')"
                        @click="dialog?.close()">
                    <FontAwesome icon="xmark" aria-hidden="true" />
                </button>
            </header>

            <div class="provenance-drawer__tabs"
                 role="tablist"
                 @keydown="onTabKey">
                <button v-for="name in TABS"
                        :id="`drawer-tab-${name}`"
                        :key="name"
                        type="button"
                        role="tab"
                        class="provenance-drawer__tab"
                        :class="{ 'provenance-drawer__tab--active': tab === name }"
                        :aria-selected="tab === name"
                        :tabindex="tab === name ? 0 : -1"
                        :aria-controls="`drawer-panel-${name}`"
                        @click="tab = name">
                    {{ t(`sheetView.drawer.${name}`) }}
                </button>
            </div>

            <div :id="`drawer-panel-${tab}`"
                 class="provenance-drawer__body"
                 role="tabpanel"
                 :aria-labelledby="`drawer-tab-${tab}`">
                <template v-if="tab === 'words'">
                    <ol class="provenance-drawer__sentences">
                        <li v-for="(sentence, i) in explanation.newcomer"
                            :key="i"
                            class="provenance-drawer__sentence">
                            {{ sentence }}
                        </li>
                    </ol>
                    <ul v-if="explanation.notes?.length" class="provenance-drawer__notes">
                        <li v-for="(note, i) in explanation.notes"
                            :key="i"
                            class="provenance-drawer__note">
                            <FontAwesome icon="lightbulb" aria-hidden="true" />
                            {{ note }}
                        </li>
                    </ul>
                    <p v-if="single" class="provenance-drawer__single">
                        {{ t("sheetView.drawer.none") }}
                    </p>
                </template>

                <table v-else-if="tab === 'lines'" class="provenance-drawer__lines">
                    <tbody>
                        <tr v-for="(line, i) in explanation.regular"
                            :key="i"
                            class="provenance-drawer__line">
                            <td class="provenance-drawer__amount">
                                {{ line.shown }}
                            </td>
                            <td class="provenance-drawer__what">
                                {{ line.label }}
                                <small class="provenance-drawer__source">{{ line.source }}</small>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr class="provenance-drawer__line provenance-drawer__line--total">
                            <td class="provenance-drawer__amount">
                                {{ shown }}
                            </td>
                            <td class="provenance-drawer__what">
                                {{ t("sheetView.drawer.total") }}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <ul v-else class="provenance-drawer__raw">
                    <li v-for="(line, i) in explanation.expert"
                        :key="i"
                        class="provenance-drawer__raw-line"
                        :class="{ 'provenance-drawer__raw-line--inactive': !line.applied }">
                        <code class="provenance-drawer__raw-value">{{ line.shown }}</code>
                        <span>{{ line.label }}</span>
                        <small class="provenance-drawer__source">{{ line.source }}</small>
                        <code v-if="line.formula" class="provenance-drawer__formula">= {{ line.formula }}</code>
                        <small v-if="!line.applied" class="provenance-drawer__inactive">
                            {{ t("sheetView.drawer.inactive") }}
                        </small>
                    </li>
                </ul>
            </div>
        </div>
    </dialog>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .provenance-drawer
    {
        background: transparent;
        border: 0;
        color: var(--color-ink);
        inset: auto 0 0;
        margin: 0;
        max-height: 85dvh;
        max-width: 100%;
        padding: 0;
        width: 100%;

        &::backdrop
        {
            backdrop-filter: blur(2px);
            background-color: var(--backdrop);
        }

        &[open]
        {
            animation: rise var(--duration-slow) var(--easing);
        }

        @include mixins.from(variables.$desktop-min)
        {
            height: 100dvh;
            inset: 0 0 0 auto;
            max-height: 100dvh;
            width: 28rem;

            &[open]
            {
                animation: slide var(--duration-slow) var(--easing);
            }
        }

        &__panel
        {
            background-color: var(--color-surface-raised);
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            box-shadow: var(--shadow-3);
            display: flex;
            flex-direction: column;
            max-height: 85dvh;
            padding: var(--space-5) var(--space-4) var(--space-6);

            @include mixins.from(variables.$desktop-min)
            {
                border-radius: var(--radius-lg) 0 0 var(--radius-lg);
                height: 100%;
                max-height: none;
                padding: var(--space-6) var(--space-5);
            }
        }

        &__header
        {
            align-items: center;
            display: flex;
            gap: var(--space-3);
            margin-bottom: var(--space-4);
        }

        &__heading
        {
            flex: 1;
            min-width: 0;
        }

        &__eyebrow
        {
            color: var(--color-ink-muted);
            font-size: var(--text-xs);
            font-weight: 700;
            letter-spacing: 0.08em;
            margin: 0;
            text-transform: uppercase;
        }

        &__title
        {
            font-size: var(--text-lg);
            margin: 0;
        }

        &__total
        {
            color: var(--color-accent);
            font-family: var(--font-display);
            font-size: var(--text-3xl);
            font-weight: 700;
        }

        &__close
        {
            @include mixins.tap-target;

            background: var(--color-surface-sunken);
            border: 0;
            border-radius: var(--radius-round);
            color: var(--color-ink-muted);
            cursor: pointer;
            font-size: var(--text-lg);
        }

        &__tabs
        {
            background-color: var(--color-surface-sunken);
            border-radius: var(--radius-md);
            display: grid;
            gap: var(--space-1);
            grid-template-columns: repeat(3, 1fr);
            margin-bottom: var(--space-4);
            padding: var(--space-1);
        }

        &__tab
        {
            @include mixins.tap-target;

            background: transparent;
            border: 0;
            border-radius: var(--radius-sm);
            color: var(--color-ink-muted);
            cursor: pointer;
            font-weight: 700;

            &--active
            {
                background-color: var(--color-surface-raised);
                box-shadow: var(--shadow-1);
                color: var(--color-ink);
            }
        }

        &__body
        {
            overflow-y: auto;
        }

        &__sentences
        {
            counter-reset: sentence;
            display: grid;
            gap: var(--space-3);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__sentence
        {
            border-left: 3px solid var(--color-brass);
            font-size: var(--text-lg);
            padding-left: var(--space-3);
        }

        &__notes
        {
            display: grid;
            gap: var(--space-2);
            list-style: none;
            margin: var(--space-4) 0 0;
            padding: 0;
        }

        &__note
        {
            background-color: var(--color-warning-soft);
            border-radius: var(--radius-md);
            color: var(--color-ink);
            display: flex;
            gap: var(--space-2);
            padding: var(--space-3);
        }

        &__single
        {
            color: var(--color-ink-muted);
            margin-top: var(--space-3);
        }

        &__lines
        {
            border-collapse: collapse;
            width: 100%;
        }

        &__line
        {
            border-bottom: 1px solid var(--color-border);

            &--total
            {
                border-bottom: 0;
                border-top: 2px solid var(--color-ink);
                font-weight: 700;
            }
        }

        &__amount
        {
            font-size: var(--text-lg);
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            padding: var(--space-2) var(--space-3) var(--space-2) 0;
            text-align: right;
            white-space: nowrap;
            width: 4.5rem;
        }

        &__what
        {
            padding: var(--space-2) 0;
        }

        &__source
        {
            color: var(--color-ink-muted);
            display: block;
            font-size: var(--text-xs);
        }

        &__raw
        {
            display: grid;
            gap: var(--space-2);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__raw-line
        {
            background-color: var(--color-surface-sunken);
            border-radius: var(--radius-md);
            display: grid;
            gap: var(--space-1);
            padding: var(--space-3);

            &--inactive
            {
                opacity: 0.7;
            }
        }

        &__raw-value
        {
            background: none;
            font-size: var(--text-md);
            font-weight: 700;
            padding: 0;
        }

        &__formula
        {
            overflow-wrap: anywhere;
        }

        &__inactive
        {
            color: var(--color-warning);
            font-weight: 700;
        }
    }

    @keyframes rise
    {
        from { transform: translateY(100%); }
    }

    @keyframes slide
    {
        from { transform: translateX(100%); }
    }
</style>
