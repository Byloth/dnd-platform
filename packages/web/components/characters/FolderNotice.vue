<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import { useWorkingDirectory } from "@/composables/working-directory";

    /**
     * On the characters page, when the working folder of the last visit is not connected in this one (M1.8): the
     * browser asks again at each visit, and only after a click.
     */
    const { t } = useI18n();
    const directory = useWorkingDirectory();
</script>

<template>
    <p v-if="directory.status.value === 'needs-permission'" class="folder-notice">
        <FontAwesome icon="folder-open" aria-hidden="true" />
        <span>{{ t("workingDirectory.notice", { name: directory.folder.value }) }}</span>
        <AppButton small
                   outline
                   @click="directory.reconnect">
            {{ t("workingDirectory.reconnect", { name: directory.folder.value }) }}
        </AppButton>
    </p>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .folder-notice
    {
        @include mixins.card(1);

        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3);
        margin-bottom: var(--space-5);
        padding: var(--space-3) var(--space-4);
    }
</style>
