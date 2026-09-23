<template>
    <div class="default-layout">
        <NavigationBar />
        <div class="content">
            <slot></slot>
        </div>
        <HiddenFooter />
    </div>
</template>

<style lang="scss" scoped>
    .default-layout
    {
        display: flex;
        flex-direction: column;
        width: 100%;

        .content
        {
            background-color: var(--bs-tertiary-bg);
            min-height: 100dvh;
            flex: 1;
        }
    }
</style>
