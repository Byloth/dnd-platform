<script lang="ts" setup>
    import type { Class } from "@byloth/dnd-platform-schema";

    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";

    /** Step 3: the class, recommended one first, with its hit die, primary abilities and saving throws. */
    const { wizard, entities, helpLevel, recommended } = useWizardContext();
    const { t } = useI18n();

    const current = computed(() => wizard.character?.choices.classes?.[0]?.class);
    const classes = computed(() => [...entities.value?.list("class") ?? []]
        .sort((a, b) => Number(!recommended("class", a.id)) - Number(!recommended("class", b.id))));

    const abilities = (list: readonly string[] | undefined): string =>
        (list ?? []).map((a) => t(`sheet.abilities.${a}`)).join(", ");
    const facts = (id: string): string[] =>
    {
        const data = entities.value?.data<Class>(id);
        if (!data) { return []; }

        return [
            t("wizard.class.hitDie", { term: t("terms.hitDice"), die: data.hitDie }),
            ...(data.primaryAbilities?.length ?
                [t("wizard.class.primary", { list: abilities(data.primaryAbilities) })] :
                []),
            t("wizard.class.saves", { list: abilities(data.savingThrows) })
        ];
    };
</script>

<template>
    <fieldset class="wizard-options">
        <legend class="wizard-options__legend">
            {{ t("wizard.steps.class") }}
        </legend>
        <ChoiceCard v-for="entity in classes"
                    :key="entity.id"
                    name="class"
                    :value="entity.id"
                    :title="entities?.name(entity.id) ?? ''"
                    :summary="entities?.summary(entity.id)"
                    :checked="current === entity.id"
                    :recommended="recommended('class', entity.id)"
                    :help-level="helpLevel"
                    @select="wizard.chooseClass">
            <span class="wizard-options__facts">
                <span v-for="fact in facts(entity.id)"
                      :key="fact"
                      class="wizard-options__fact">{{ fact }}</span>
            </span>
        </ChoiceCard>
    </fieldset>
</template>
