<script lang="ts" setup>
    import type { Character } from "@byloth/dnd-platform-engine";
    import type { PackageSource } from "@byloth/dnd-platform-loader";

    import SheetView from "@/components/sheet/SheetView.vue";
    import UpdateNotice from "@/components/sheet/UpdateNotice.vue";
    import AppButton from "@/components/ui/AppButton.vue";
    import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import { recordVersions, useVersionCheck } from "@/composables/versions";
    import type { VersionCheck } from "@/composables/versions";
    import { MissingPackageException } from "@/stores/content";

    // The export dialog loads with its first use: the file code is not part of the sheet's load.
    const ExportDialog = defineAsyncComponent(() => import("@/components/characters/ExportDialog.vue"));

    // A character's build-mode sheet (docs/phase-1/03-sheet-composer.md): derived in the interface language and at
    // the help level of the preferences; a stored character's can be reopened for editing or deleted, a demo's
    // cannot.

    type Loaded =
        {
            readonly state: "ready";
            readonly character: Character;
            readonly sources: PackageSource[];
            readonly stored: boolean;
        } |
        { readonly state: "not-found" } |
        { readonly state: "missing", readonly packageId: string };

    const route = useRoute();
    const { t, locale } = useI18n();
    const preferences = usePreferencesStore();
    const content = useContentStore();
    const translate = useSheetTranslate();
    const engine = useEngine();

    const id = computed(() => String(route.params["id"]));

    const { data, status, refresh } = await useAsyncData(() => `character-${id.value}`, async (): Promise<Loaded> =>
    {
        const found = await useCharacters().get(id.value);
        if (!found) { return { state: "not-found" }; }
        const { character } = found;

        try
        {
            const sources = await content.sources(character.packages.map((p) => p.id));

            return { state: "ready", character: character, sources: sources, stored: found.origin === "stored" };
        }
        catch (error)
        {
            if (error instanceof MissingPackageException) { return { state: "missing", packageId: error.packageId }; }
            throw error;
        }

    }, { watch: [id, locale] });

    useHead({
        title: () =>
        {
            const loaded = data.value;
            if (loaded?.state === "ready") { return loaded.character.name; }
            if (loaded?.state === "not-found") { return t("character.notFound.heading"); }
            if (loaded?.state === "missing") { return t("character.missing.heading"); }

            return undefined;
        }
    });

    // DEC-21 (M1.5b): a stored character last seen with an older version of a package it uses is told what the
    // update changed on its sheet; "Got it" records the versions. When nothing changed, they are recorded at once.
    const updates = shallowRef<VersionCheck>();
    const acknowledge = async (): Promise<void> =>
    {
        const loaded = data.value;
        updates.value = undefined;
        if (loaded?.state !== "ready") { return; }
        await useBrowserStorage().characters.put(recordVersions(loaded.character, loaded.sources));
        await refresh();
    };
    watch(() => [data.value, locale.value] as const, async ([loaded]) =>
    {
        updates.value = undefined;
        if ((loaded?.state !== "ready") || !loaded.stored) { return; }
        const found = await useVersionCheck().check(loaded.character, loaded.sources, {
            language: locale.value,
            translate: translate
        });
        if (!found.updates.length) { return; }
        if (!found.changes.length && found.updates.every((u) => u.compared)) { await acknowledge(); }
        else { updates.value = found; }

    }, { immediate: true });
    const packageName = (packageId: string): string =>
    {
        const loaded = data.value;
        const manifest = loaded?.state === "ready" ?
            loaded.sources.find((s) => s.manifest.id === packageId)?.manifest :
            undefined;
        const names = manifest?.name as Record<string, string | undefined> | undefined;

        return names?.[locale.value] ?? names?.["en"] ?? packageId;
    };

    const composed = computed(() =>
    {
        const loaded = data.value;
        if (loaded?.state !== "ready") { return undefined; }

        return engine.sheet(loaded.character, loaded.sources, {
            language: locale.value,
            helpLevel: preferences.helpLevel,
            translate: translate
        });
    });

    const deleting = ref(false);
    const exporting = ref(false);
    /** The copy the delete confirmation offers first: the whole file, the player's own content included. */
    const downloadCopy = async (): Promise<void> =>
    {
        if (data.value?.state !== "ready") { return; }
        const { useCharacterFiles } = await import("@/composables/character-files");
        const files = useCharacterFiles();
        files.download(await files.exportDocument(data.value.character, { embed: true }));
        useAnalytics().track("character-export", { embedded: true });
    };
    // The PDF (M1.6): drawn from the tree on the page, in the page size of the preferences. A failure reaches the
    // application's error handler, like any other.
    const makingPdf = ref(false);
    const savePdf = async (): Promise<void> =>
    {
        const loaded = data.value;
        const sheet = composed.value;
        if ((loaded?.state !== "ready") || !sheet || makingPdf.value) { return; }
        makingPdf.value = true;
        try
        {
            const { saveSheetPdf } = await import("@/composables/sheet-pdf");
            const options = {
                language: locale.value, pageSize: preferences.pageSize, hand: preferences.hand, packages: sheet.packages
            };
            await saveSheetPdf(loaded.character, sheet.tree, options);
            useAnalytics().track("character-pdf", { pageSize: preferences.pageSize, hand: preferences.hand });
        }
        finally { makingPdf.value = false; }
    };
    /** Set once deleted: the sheet goes away first, so nothing of it (its layout) is written again. */
    const removed = ref(false);
    const remove = async (): Promise<void> =>
    {
        deleting.value = false;
        removed.value = true;
        useAnalytics().track("sheet-delete");
        await nextTick();
        await useCharacters().remove(id.value);
        clearNuxtData(["characters", `character-${id.value}`]);
        await navigateTo({ name: "index" });
    };
</script>

<template>
    <div class="character-page">
        <UpdateNotice v-if="updates && composed && data?.state === 'ready' && !removed"
                      :check="updates"
                      :name="packageName"
                      @ok="acknowledge" />
        <p v-if="status === 'pending'" role="status">
            {{ t("character.loading") }}
        </p>
        <div v-else-if="data?.state === 'not-found'" role="alert">
            <h1>{{ t("character.notFound.heading") }}</h1>
            <p>{{ t("character.notFound.text") }}</p>
            <NuxtLink :to="{ name: 'index' }">
                {{ t("character.back") }}
            </NuxtLink>
        </div>
        <div v-else-if="data?.state === 'missing'" role="alert">
            <h1>{{ t("character.missing.heading") }}</h1>
            <p>{{ t("character.missing.text", { id: data.packageId }) }}</p>
            <NuxtLink :to="{ name: 'packages' }">
                {{ t("character.missing.action") }}
            </NuxtLink>
        </div>
        <p v-else-if="status === 'error'" role="alert">
            {{ t("character.failed") }}
        </p>
        <SheetView v-else-if="composed && data?.state === 'ready' && !removed"
                   :character="data.character"
                   :composed="composed"
                   :editable="data.stored"
                   :help-level="preferences.helpLevel"
                   :language="locale"
                   :translate="translate"
                   :making-pdf="makingPdf"
                   @remove="deleting = true"
                   @export="exporting = true"
                   @pdf="savePdf" />
        <ExportDialog v-if="data?.state === 'ready' && exporting"
                      :open="exporting"
                      :character="data.character"
                      @close="exporting = false" />
        <ConfirmDialog v-if="data?.state === 'ready' && data.stored"
                       :open="deleting"
                       danger
                       :title="t('character.delete.title', { name: data.character.name })"
                       :confirm="t('character.delete.confirm', { name: data.character.name })"
                       :cancel="t('character.delete.cancel')"
                       @confirm="remove"
                       @cancel="deleting = false">
            <p>{{ t("character.delete.text") }}</p>
            <p>{{ t("character.delete.local") }}</p>
            <AppButton theme="secondary"
                       outline
                       small
                       @click="downloadCopy">
                <FontAwesome icon="file-arrow-down" aria-hidden="true" />
                {{ t("character.delete.exportFirst") }}
            </AppButton>
        </ConfirmDialog>
    </div>
</template>

<style lang="scss" scoped>
    .character-page
    {
        min-height: 60dvh;
    }
</style>
