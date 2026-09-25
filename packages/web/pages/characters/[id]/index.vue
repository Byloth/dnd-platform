<script lang="ts" setup>
    import type { Character } from "@byloth/dnd-platform-engine";
    import type { PackageSource } from "@byloth/dnd-platform-loader";

    import SheetView from "@/components/sheet/SheetView.vue";
    import ConfirmDialog from "@/components/ui/ConfirmDialog.vue";
    import { MissingPackageException } from "@/stores/content";

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

    const { data, status } = await useAsyncData(() => `character-${id.value}`, async (): Promise<Loaded> =>
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

    }, { watch: [id] });

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
                   @remove="deleting = true" />
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
        </ConfirmDialog>
    </div>
</template>

<style lang="scss" scoped>
    .character-page
    {
        min-height: 60dvh;
    }
</style>
