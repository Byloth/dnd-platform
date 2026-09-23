<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /** A message box: `.alert-box` with a tone modifier (`--info`, `--success`, `--warning`, `--danger`). */
    defineProps({
        theme: {
            default: "info",
            type: String
        },
        title: {
            default: "",
            type: String
        },
        icon: {
            default: "",
            type: String
        },

        dismissible: {
            default: false,
            type: Boolean
        }
    });
    defineEmits(["dismiss"]);

    const { t } = useI18n();
</script>

<template>
    <div class="alert-box"
         :class="`alert-box--${theme}`"
         role="alert">
        <FontAwesome v-if="icon"
                     class="alert-box__icon"
                     :icon="icon"
                     aria-hidden="true" />
        <div class="alert-box__body">
            <h3 v-if="title" class="alert-box__title">
                {{ title }}
            </h3>
            <slot></slot>
        </div>
        <button v-if="dismissible"
                class="alert-box__close"
                type="button"
                :aria-label="t('alerts.close')"
                @click="$emit('dismiss', $event)">
            <FontAwesome icon="xmark" aria-hidden="true" />
        </button>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .alert-box
    {
        --alert-tone: var(--color-resource);
        --alert-soft: var(--color-resource-soft);

        @include mixins.card(3);

        align-items: flex-start;
        border-left: 6px solid var(--alert-tone);
        display: flex;
        gap: var(--space-3);
        padding: var(--space-4);

        &--success
        {
            --alert-tone: var(--color-healing);
            --alert-soft: var(--color-healing-soft);
        }
        &--warning
        {
            --alert-tone: var(--color-warning);
            --alert-soft: var(--color-warning-soft);
        }
        &--danger
        {
            --alert-tone: var(--color-damage);
            --alert-soft: var(--color-accent-soft);
        }

        &__icon
        {
            color: var(--alert-tone);
            font-size: var(--text-xl);
            margin-top: 0.1em;
        }

        &__body
        {
            flex: 1;
            min-width: 0;
        }

        &__title
        {
            font-size: var(--text-lg);
        }

        &__close
        {
            @include mixins.tap-target;

            background: none;
            border: 0;
            border-radius: var(--radius-md);
            color: var(--color-ink-muted);
            cursor: pointer;
            font-size: var(--text-lg);

            &:hover
            {
                background-color: var(--alert-soft);
                color: var(--color-ink);
            }
        }
    }
</style>
