<script lang="ts" setup>
    import { localize } from "@byloth/dnd-platform-composer";
    import type { PackageManifest } from "@byloth/dnd-platform-schema";

    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";

    /**
     * Step 0: the packages the character is built from. The site's packages always come with it; the ones loaded
     * in this browser are optional, private ones flagged.
     */
    const { wizard, helpLevel } = useWizardContext();
    const content = useContentStore();
    const { t, locale } = useI18n();

    onMounted(() =>
    {
        if (content.site.length === 0) { void content.refresh(); }
    });

    const name = (manifest: PackageManifest): string => localize(manifest.name, locale.value);
    const chosen = computed(() => new Set(wizard.character?.packages.map((p) => p.id) ?? []));
    /** A translation is not a choice: the interface's language brings it (docs/phase-1/11). */
    const choosable = computed(() => content.stored.filter((p) => p.manifest.kind !== "translation"));

    const toggle = (id: string, checked: boolean): void =>
    {
        const stored = choosable.value
            .filter((p) => (p.manifest.id === id ? checked : chosen.value.has(p.manifest.id)))
            .map((p) => ({ id: p.manifest.id, version: p.manifest.version }));
        void wizard.choosePackages(stored);
    };
</script>

<template>
    <fieldset class="wizard-options">
        <legend class="wizard-options__legend">
            {{ t("wizard.steps.content") }}
        </legend>
        <ChoiceCard v-for="entry in content.site"
                    :key="entry.manifest.id"
                    name="packages"
                    type="checkbox"
                    :value="entry.manifest.id"
                    :title="name(entry.manifest)"
                    :summary="t('wizard.content.site')"
                    checked
                    disabled
                    :help-level="helpLevel" />
        <ChoiceCard v-for="entry in choosable"
                    :key="entry.manifest.id"
                    name="packages"
                    type="checkbox"
                    :value="entry.manifest.id"
                    :title="name(entry.manifest)"
                    :summary="entry.manifest.visibility === 'private' ? t('wizard.content.private') : ''"
                    :checked="chosen.has(entry.manifest.id)"
                    :help-level="helpLevel"
                    @select="toggle" />
    </fieldset>
</template>
