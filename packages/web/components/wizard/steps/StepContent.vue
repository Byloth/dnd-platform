<script lang="ts" setup>
    import { localize } from "@byloth/dnd-platform-composer";
    import type { PackageManifest } from "@byloth/dnd-platform-schema";

    import ChoiceCard from "@/components/wizard/ChoiceCard.vue";
    import ResetNotice from "@/components/wizard/ResetNotice.vue";
    import type { PackageUse } from "@/stores/wizard";

    /**
     * Step 0: the packages the character is built from. The site's packages always come with it; the ones loaded
     * in this browser are optional, private ones flagged. Removing a package the draft uses asks first, naming
     * what would be reset, in creation as in editing; a package others depend on goes with them
     * (docs/phase-1/10-wizard-integrity.md, point 10, owner 2026-09-25 and 2026-10-07).
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
    const choosable = computed(() => content.choosable);

    const kept = (removed: ReadonlySet<string>) => choosable.value
        .filter((p) => chosen.value.has(p.manifest.id) && !removed.has(p.manifest.id))
        .map((p) => ({ id: p.manifest.id, version: p.manifest.version }));

    /** The package and every chosen package that depends on it, directly or through another. */
    const withDependents = (id: string): Set<string> =>
    {
        const out = new Set([id]);
        for (let grew = true; grew;)
        {
            grew = false;
            for (const p of choosable.value)
            {
                const needs = p.manifest.dependencies.some((d) => out.has(d.id));
                if (chosen.value.has(p.manifest.id) && !out.has(p.manifest.id) && needs)
                {
                    out.add(p.manifest.id);
                    grew = true;
                }
            }
        }

        return out;
    };

    const { nameOf } = useResetConfirmation();
    const named = (use: PackageUse): string =>
    {
        if (use.kind === "answer") { return nameOf(use.id); }
        const entityName = wizard.packageSet ? useEntities(wizard.packageSet, locale.value).name(use.id) : use.id;

        return t(`wizard.content.uses.${use.kind}`, { name: entityName });
    };

    const pending = shallowRef<{
        readonly removed: ReadonlySet<string>;
        readonly uses: readonly PackageUse[];
        readonly names: readonly string[];
        readonly others: readonly string[];
    }>();
    /** Bumped when a removal is kept back, so the checkbox shows the package as chosen again. */
    const revision = ref(0);

    const toggle = (id: string, checked: boolean): void =>
    {
        if (checked)
        {
            void wizard.choosePackages(choosable.value
                .filter((p) => (p.manifest.id === id) || chosen.value.has(p.manifest.id))
                .map((p) => ({ id: p.manifest.id, version: p.manifest.version })));

            return;
        }

        const removed = withDependents(id);
        const uses = wizard.usesOf([...removed]);
        const others = [...removed].filter((other) => other !== id);
        if (!uses.length && !others.length)
        {
            void wizard.choosePackages(kept(removed));

            return;
        }

        const manifestName = (other: string): string =>
            name(choosable.value.find((p) => p.manifest.id === other)!.manifest);
        pending.value = {
            removed: removed,
            uses: uses,
            names: [...new Set(uses.map(named))],
            others: others.map(manifestName)
        };
    };

    const confirm = (): void =>
    {
        const removal = pending.value;
        pending.value = undefined;
        if (removal) { void wizard.dropPackages(kept(removal.removed), removal.uses); }
    };
    const cancel = (): void =>
    {
        pending.value = undefined;
        revision.value += 1;
    };
</script>

<template>
    <ResetNotice v-if="pending"
                 :names="pending.names"
                 :title="t('wizard.content.remove.title')"
                 :text="pending.others.length ?
                     t('wizard.content.remove.together', { names: pending.others.join(', ') }) :
                     t('wizard.content.remove.text')"
                 :confirm-label="t('wizard.content.remove.confirm')"
                 :cancel-label="t('wizard.content.remove.cancel')"
                 @confirm="confirm"
                 @cancel="cancel" />
    <fieldset :key="`packages-${revision}`" class="wizard-options">
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
