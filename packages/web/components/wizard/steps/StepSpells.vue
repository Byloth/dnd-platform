<script lang="ts" setup>
    import StepChoiceGroups from "@/components/wizard/StepChoiceGroups.vue";

    /**
     * Spells (docs/phase-1/14-wizard-steps-revision.md, point 6): the cantrips, then the spells by level, whatever
     * gives them (a class, a subclass, a species); after the ability scores, which set how many a caster prepares.
     * Offered only to a character with something to choose here.
     */
</script>

<template>
    <StepChoiceGroups class="step-spells" step="spells" />
</template>

<style lang="scss" scoped>
    .step-spells
    {
        margin-top: 0;
    }
</style>
