<script lang="ts">
    import { ref } from "vue";

    export interface DropdownItem
    {
        readonly value: string;
        readonly label: string;
    }

    /** The dropdown open on the page, if any: opening one closes the other. */
    const _open = ref<string>();
</script>

<script lang="ts" setup>
    import FontAwesome from "./FontAwesome.vue";

    /**
     * A button that opens a short list of choices (docs/phase-1/09-interface-revisions.md, "The dropdown menu"): a
     * disclosure, not an ARIA menu. Each choice is a button with `aria-pressed` on the current one and a tick beside
     * it. It closes on a click outside, on Escape (focus back on its button), on a choice, on a route change and
     * when another dropdown opens. Up, Down, Home and End move between the choices.
     */
    const props = defineProps<{
        /** The button's accessible name, which says the current choice: "Colour mode: System". */
        label: string;
        items: readonly DropdownItem[];
        modelValue: string;
    }>();
    const emit = defineEmits<{ "update:modelValue": [value: string] }>();

    const id = useId();
    const listId = `${id}-list`;
    const open = computed(() => _open.value === id);

    const root = ref<HTMLElement>();
    const button = ref<HTMLButtonElement>();
    const list = ref<HTMLElement>();

    const choices = (): HTMLButtonElement[] =>
        [...list.value?.querySelectorAll<HTMLButtonElement>(".dropdown-menu__item") ?? []];

    const close = (focusButton: boolean): void =>
    {
        if (_open.value === id) { _open.value = undefined; }
        if (focusButton) { button.value?.focus(); }
    };
    const toggle = (): void => { _open.value = open.value ? undefined : id; };

    /** Opens from the keyboard and moves to the current choice. */
    const openAndFocus = async (): Promise<void> =>
    {
        _open.value = id;
        await nextTick();

        const current = props.items.findIndex((i) => i.value === props.modelValue);
        choices()[Math.max(current, 0)]?.focus();
    };

    const choose = (value: string): void =>
    {
        emit("update:modelValue", value);
        close(true);
    };

    const move = (event: KeyboardEvent): void =>
    {
        const all = choices();
        const at = all.indexOf(document.activeElement as HTMLButtonElement);
        const target = {
            ArrowDown: all[(at + 1) % all.length],
            ArrowUp: all[(at - 1 + all.length) % all.length],
            Home: all[0],
            End: all[all.length - 1]

        }[event.key];
        if (!target) { return; }

        event.preventDefault();
        target.focus();
    };

    onClickOutside(root, () => close(false));
    // Escape closes it wherever the focus is, and gives the focus back to its button.
    onKeyStroke("Escape", () =>
    {
        if (open.value) { close(true); }
    });
    const route = useRoute();
    watch(() => route.fullPath, () => close(false));
</script>

<template>
    <div ref="root" class="dropdown-menu">
        <button ref="button"
                type="button"
                class="dropdown-menu__button"
                :class="{ 'dropdown-menu__button--open': open }"
                :aria-label="label"
                :title="label"
                :aria-expanded="open"
                :aria-controls="listId"
                @click="toggle"
                @keydown.down.prevent="openAndFocus">
            <slot name="button"></slot>
            <FontAwesome class="dropdown-menu__chevron" icon="chevron-down" />
        </button>
        <ul v-show="open"
            :id="listId"
            ref="list"
            class="dropdown-menu__list"
            @keydown="move">
            <li v-for="item in items" :key="item.value">
                <button type="button"
                        class="dropdown-menu__item"
                        :class="{ 'dropdown-menu__item--current': item.value === modelValue }"
                        :aria-pressed="item.value === modelValue"
                        @click="choose(item.value)">
                    <span class="dropdown-menu__glyph">
                        <slot name="item" :item="item"></slot>
                    </span>
                    <span class="dropdown-menu__text">{{ item.label }}</span>
                    <FontAwesome v-if="item.value === modelValue"
                                 class="dropdown-menu__tick"
                                 icon="check" />
                </button>
            </li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .dropdown-menu
    {
        position: relative;

        &__button
        {
            align-items: center;
            background: none;
            border: 0;
            border-radius: var(--radius-md);
            color: var(--color-ink-muted);
            cursor: pointer;
            display: inline-flex;
            font-size: 0.95rem;
            gap: 2px;
            justify-content: center;
            min-height: 44px;
            min-width: 36px;
            padding: 0 var(--space-1);
            transition: background-color var(--duration-fast) var(--easing), color var(--duration-fast) var(--easing);

            &:hover,
            &--open
            {
                background-color: var(--color-surface-sunken);
                color: var(--color-ink);
            }
        }

        &__chevron
        {
            font-size: 0.55rem;
            opacity: 0.7;
        }

        &__list
        {
            @include mixins.card(3);

            list-style: none;
            margin: 0;
            max-width: calc(100vw - 2 * var(--space-3));
            min-width: 11rem;
            padding: var(--space-1);
            position: absolute;
            right: 0;
            top: calc(100% + var(--space-2));
            z-index: 1;
        }

        &__item
        {
            align-items: center;
            background: none;
            border: 0;
            border-radius: var(--radius-sm);
            color: var(--color-ink);
            cursor: pointer;
            display: flex;
            font: inherit;
            gap: var(--space-3);
            min-height: 44px;
            padding: 0 var(--space-3);
            text-align: left;
            width: 100%;

            &:hover
            {
                background-color: var(--color-surface-sunken);
            }

            &--current
            {
                background-color: var(--color-accent-soft);
                color: var(--color-accent);
                font-weight: 700;
            }
        }

        &__glyph
        {
            display: inline-flex;
            font-size: 1.25rem;
            justify-content: center;
            min-width: 1.5em;
        }

        &__text
        {
            flex: 1;
            white-space: nowrap;
        }

        &__tick
        {
            font-size: 0.9rem;
        }
    }
</style>
