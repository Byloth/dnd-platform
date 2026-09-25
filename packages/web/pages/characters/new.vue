<script lang="ts" setup>
    import WizardView from "@/components/wizard/WizardView.vue";

    // The guided creation of a new character (docs/phase-1/04-character-creation.md).
    const { t } = useI18n();

    useHead({ title: () => t("wizard.title") });
</script>

<template>
    <WizardView />
</template>
