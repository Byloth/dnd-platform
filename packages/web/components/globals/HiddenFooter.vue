<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    const { t } = useI18n();
</script>

<template>
    <footer class="hidden-footer">
        <p>
            Made with <FontAwesome icon="heart"
                                   alt="Lots of love!"
                                   title="Lots of love!" /> by
            <a class="link bold"
               href="https://www.byloth.dev/"
               target="_blank"
               title="Byloth's Website">Byloth</a>.
        </p>
        <p>
            <small>
                {{ t("footer.attribution") }}
            </small>
        </p>
    </footer>
</template>

<style lang="scss" scoped>
    @use "sass:color";
    @use "@/assets/scss/variables";

    @keyframes pulse
    {
        0% { transform: scale(1); }
        30% { transform: scale(1); }
        40% { transform: scale(1.125); }
        50% { transform: scale(1); }
        60% { transform: scale(1.125); }
        100% { transform: scale(1); }
    }

    .hidden-footer
    {
        align-items: center;
        bottom: 0px;
        color: #FFF;
        display: flex;
        flex-direction: column;
        height: var(--hidden-footer-height);
        justify-content: center;
        left: 0px;
        position: fixed;
        right: 0px;
        text-align: center;
        z-index: -1;

        p
        {
            margin-bottom: 0.25em;

            &:last-child
            {
                margin-bottom: 0px;
            }
        }

        .fa-heart
        {
            animation: pulse 2s infinite;
            color: red;
            cursor: help;
        }

        .link
        {
            $link-color: #007FFF;

            --link-color: #{$link-color};
            &:hover
            {
                --link-color: #{color.adjust($link-color, $lightness: 10%)};
            }

            color: var(--link-color);

            &.bold
            {
                font-weight: bold;
            }
        }
    }
</style>
