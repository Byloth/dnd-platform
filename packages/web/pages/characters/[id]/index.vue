<script lang="ts" setup>
    import type { Character } from "@byloth/dnd-platform-engine";
    import type { PackageSource } from "@byloth/dnd-platform-loader";

    import SheetTree from "@/components/sheet/SheetTree.vue";
    import { MissingPackageException } from "@/stores/content";

    // A character's build-mode sheet (docs/phase-1/03-sheet-composer.md): derived in the interface language and at
    // the help level of the preferences. M1.3c replaces the unstyled tree with the screen's components.

    type Loaded =
        { readonly state: "ready", readonly character: Character, readonly sources: PackageSource[] } |
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
        const character = await useCharacters().get(id.value);
        if (!character) { return { state: "not-found" }; }

        try
        {
            const sources = await content.sources(character.packages.map((p) => p.id));

            return { state: "ready", character: character, sources: sources };
        }
        catch (error)
        {
            if (error instanceof MissingPackageException) { return { state: "missing", packageId: error.packageId }; }
            throw error;
        }

    }, { watch: [id] });

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
</script>

<template>
    <div id="character-page" class="page container">
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
        <SheetTree v-else-if="composed" :tree="composed.tree" />
    </div>
</template>

<style lang="scss" scoped>
    #character-page
    {
        min-height: 100dvh;
        padding-bottom: 2em;
        padding-top: calc(var(--navigation-bar-height) + 1em);
    }
</style>
