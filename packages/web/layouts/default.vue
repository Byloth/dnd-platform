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
    @use "@/assets/scss/variables";

    .default-layout
    {
        display: flex;
        flex-direction: column;
        width: 100%;

        .content
        {
            background-color: variables.$slightly-off-white;
            min-height: 100dvh;
            flex: 1;
        }
    }
</style>
