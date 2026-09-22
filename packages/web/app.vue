<script setup lang="ts">
    // Alerts and the errors handler of the template return with the first screen that needs them (M1.2).
</script>

<template>
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
</template>

<style lang="scss">
    @use "@/assets/scss/index" as *;

    #__nuxt
    {
        .page-enter-from,
        .page-leave-to
        {
            opacity: 0;
        }
        .page-enter-active,
        .page-leave-active
        {
            transition: opacity $app-transition-duration $app-transition-timing-function;
        }
        .page-enter-to,
        .page-leave-from
        {
            opacity: 1;
        }
    }
</style>
