<script lang="ts" setup>
    import AlertBox from "@/components/ui/AlertBox.vue";
    import AppButton from "@/components/ui/AppButton.vue";

    /** What a change would forget, named, with the two ways out: make it, or keep the choice that stands. */
    defineProps<{ names: readonly string[] }>();
    const emit = defineEmits<{ confirm: [], cancel: [] }>();

    const { t } = useI18n();
</script>

<template>
    <AlertBox class="reset-notice"
              theme="warning"
              icon="triangle-exclamation"
              :title="t('wizard.reset.title')">
        <p class="reset-notice__text">
            {{ t("wizard.reset.text") }}
        </p>
        <ul class="reset-notice__list">
            <li v-for="name in names" :key="name">
                {{ name }}
            </li>
        </ul>
        <div class="reset-notice__actions">
            <AppButton small @click="emit('confirm')">
                {{ t("wizard.reset.confirm") }}
            </AppButton>
            <AppButton theme="secondary"
                       outline
                       small
                       @click="emit('cancel')">
                {{ t("wizard.reset.cancel") }}
            </AppButton>
        </div>
    </AlertBox>
</template>

<style lang="scss" scoped>
    .reset-notice
    {
        margin-bottom: var(--space-5);

        &__text
        {
            margin: 0 0 var(--space-2);
        }

        &__list
        {
            margin: 0 0 var(--space-3);
            padding-left: var(--space-5);
        }

        &__actions
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
        }
    }
</style>
