<script setup lang="ts">
    import AlertHandler from "./components/handlers/AlertHandler.vue";

    useErrorsHandler();

    // Every page title reads "Page · D&D Platform", in the interface language; a page without one shows the name
    // (nuxt.config.ts's fallback title is the name itself, not a page).
    const { t } = useI18n();
    useHead({
        titleTemplate: (page?: string) =>
        {
            const name = t("app.title");

            return page && (page !== name) ? `${page} · ${name}` : name;
        }
    });
</script>

<template>
    <!-- eslint-disable vue/no-multiple-template-root -->

    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
    <AlertHandler />
</template>

<style lang="scss">
    @use "@/assets/scss/index";

    .page-enter-from,
    .page-leave-to
    {
        opacity: 0;
    }
    .page-enter-active,
    .page-leave-active
    {
        transition: opacity var(--duration) var(--easing);
    }
</style>
