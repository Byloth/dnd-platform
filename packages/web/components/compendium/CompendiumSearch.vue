<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /**
     * The compendium's search field (docs/phase-1/13-compendium.md): a visible label, the magnifier, and the text
     * passed on once the typing pauses, so the list and the address change once per word, not per key.
     */
    const props = defineProps<{ modelValue: string, label: string, placeholder?: string }>();
    const emit = defineEmits<{ "update:modelValue": [value: string] }>();

    const DELAY = 250;
    const id = useId();
    const text = ref(props.modelValue);
    watch(() => props.modelValue, (value) =>
    {
        if (value !== text.value.trim()) { text.value = value; }
    });

    let _timer: ReturnType<typeof setTimeout> | undefined;
    const onInput = (): void =>
    {
        clearTimeout(_timer);
        _timer = setTimeout(() => emit("update:modelValue", text.value.trim()), DELAY);
    };
    onBeforeUnmount(() => clearTimeout(_timer));
</script>

<template>
    <div class="compendium-search">
        <label class="compendium-search__label" :for="id">{{ label }}</label>
        <span class="compendium-search__field">
            <FontAwesome class="compendium-search__icon"
                         icon="magnifying-glass"
                         aria-hidden="true" />
            <input :id="id"
                   v-model="text"
                   class="compendium-search__input"
                   type="search"
                   autocomplete="off"
                   spellcheck="false"
                   :placeholder="placeholder"
                   @input="onInput" />
        </span>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .compendium-search
    {
        display: grid;
        gap: var(--space-2);

        &__label
        {
            font-weight: 700;
        }

        &__field
        {
            position: relative;
        }

        &__icon
        {
            color: var(--color-ink-muted);
            left: var(--space-4);
            pointer-events: none;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
        }

        &__input
        {
            @include mixins.tap-target;

            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-round);
            box-shadow: var(--shadow-1);
            color: var(--color-ink);
            font: inherit;
            font-size: var(--text-lg);
            min-height: 52px;
            padding: 0 var(--space-4) 0 calc(var(--space-4) * 2 + 1em);
            width: 100%;

            &::placeholder
            {
                color: var(--color-ink-muted);
            }

            &:focus-visible
            {
                @include mixins.focus-ring;
            }
        }
    }
</style>
