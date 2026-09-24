<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /** The steps that arrive with M1.4c and M1.4d: said plainly, with the reassurance that nothing is lost. */
    const { t } = useI18n();
</script>

<template>
    <div class="wizard-pending">
        <FontAwesome class="wizard-pending__icon"
                     icon="hard-drive"
                     aria-hidden="true" />
        <div>
            <h2 class="wizard-pending__heading">
                {{ t("wizard.pending.heading") }}
            </h2>
            <p class="wizard-pending__text">
                {{ t("wizard.pending.text") }}
            </p>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    .wizard-pending
    {
        align-items: flex-start;
        background-color: var(--color-surface-sunken);
        border: 1px dashed var(--color-border-strong);
        border-radius: var(--radius-lg);
        display: flex;
        gap: var(--space-4);
        padding: var(--space-5);

        &__icon
        {
            color: var(--color-ink-muted);
            font-size: var(--text-2xl);
            margin-top: 0.2rem;
        }

        &__heading
        {
            font-size: var(--text-xl);
            margin: 0 0 var(--space-2);
        }

        &__text
        {
            color: var(--color-ink-muted);
            margin: 0;
        }
    }
</style>
