<script lang="ts" setup>
    import StepChoiceGroups from "@/components/wizard/StepChoiceGroups.vue";

    /**
     * Other choices: what the sheet asks that no other step takes (a feat's own choices); every other choice is
     * in the step that makes it, the spells in Spells (docs/phase-1/14-wizard-steps-revision.md, point 6). The
     * step is offered only when there is one.
     */
</script>

<template>
    <StepChoiceGroups class="step-choices" step="choices" />
</template>

<style lang="scss" scoped>
    .step-choices
    {
        margin-top: 0;
    }
</style>
