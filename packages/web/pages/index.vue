<script lang="ts" setup>
    import type { PackageSet } from "@byloth/dnd-platform-loader";
    import type { Character } from "@byloth/dnd-platform-engine";

    import SheetTree from "@/components/sheet/SheetTree.vue";

    const { fetchBundle, load } = useContent();
    const { t, locale } = useI18n();
    const runtimeConfig = useRuntimeConfig();

    const { data, status, error } = await useAsyncData("sample-sheet", async () =>
    {
        const [srd51, character] = await Promise.all([
            fetchBundle("srd51"),
            $fetch<Character>(`${runtimeConfig.app.baseURL}content/sample-character.json`, { responseType: "json" })
        ]);
        const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
        const packages: PackageSet = load([srd51], pins);

        return { character, packages };
    });

    const composed = computed(() =>
    {
        if (!data.value) { return undefined; }

        return composeSheet(data.value.character, data.value.packages, locale.value);
    });
</script>

<template>
    <div id="home-page" class="page container">
        <h1>{{ t("sample.heading") }}</h1>
        <p>{{ t("sample.intro") }}</p>
        <p v-if="status === 'pending'" role="status">
            {{ t("sample.loading") }}
        </p>
        <p v-else-if="error" role="alert">
            {{ t("sample.failed") }} <code>{{ error.message }}</code>
        </p>
        <SheetTree v-else-if="composed" :tree="composed.tree" />
    </div>
</template>

<style lang="scss" scoped>
    #home-page
    {
        min-height: 100dvh;
        padding-bottom: 2em;
        padding-top: calc(var(--navigation-bar-height) + 1em);
    }
</style>
