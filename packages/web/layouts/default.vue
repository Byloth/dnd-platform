<template>
    <div class="default-layout">
        <NavigationBar />
        <main class="default-layout__main">
            <slot></slot>
        </main>
        <SiteFooter />
        <ConsentBanner />
    </div>
</template>

<style lang="scss" scoped>
    .default-layout
    {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;

        &__main
        {
            flex: 1;
            margin: 0 auto;
            max-width: var(--content-max-width);
            padding: calc(var(--navigation-bar-height) + var(--space-5)) var(--space-4) var(--space-6);
            width: 100%;
        }
    }
</style>
