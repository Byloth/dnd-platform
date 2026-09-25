<script lang="ts" setup>
    import WizardView from "@/components/wizard/WizardView.vue";

    // A stored character reopened in the wizard from its sheet (docs/07-character-creation.md, "Editing after
    // creation"): the same steps, at the one the sheet asked for.
    const route = useRoute();
    const { t } = useI18n();
    const wizard = useWizardStore();

    const id = computed(() => String(route.params["id"]));

    useHead({ title: () => t("wizard.edit.title", { name: wizard.character?.name || t("wizard.edit.unnamed") }) });
</script>

<template>
    <WizardView :key="id" :editing="id" />
</template>
