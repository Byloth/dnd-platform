<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    const { t } = useI18n();
</script>

<template>
    <footer class="site-footer">
        <div class="site-footer__inner">
            <p class="site-footer__attribution">
                {{ t("footer.attribution") }}
            </p>
            <p class="site-footer__signature">
                {{ t("footer.madeBy") }}
                <FontAwesome class="site-footer__heart"
                             icon="heart"
                             aria-hidden="true" />
                {{ t("footer.by") }}
                <a href="https://www.byloth.dev/" rel="noopener">Byloth</a>
            </p>
        </div>
    </footer>
</template>

<style lang="scss" scoped>
    .site-footer
    {
        background-color: var(--color-surface-sunken);
        border-top: 1px solid var(--color-border);
        color: var(--color-ink-muted);
        font-size: var(--text-sm);
        margin-top: var(--space-7);

        &__inner
        {
            margin: 0 auto;
            max-width: var(--content-max-width);
            padding: var(--space-5) var(--space-4);
        }

        &__attribution
        {
            max-width: 60rem;
        }

        &__signature
        {
            margin: 0;
        }

        &__heart
        {
            color: var(--color-damage);
            transform-origin: center;
        }

        // The heart beats while the signature is hovered or its link has the keyboard's focus.
        &__signature:hover &__heart,
        &__signature:focus-within &__heart
        {
            animation: heartbeat 900ms var(--easing) infinite;

            @media (prefers-reduced-motion: reduce)
            {
                animation: none;
            }
        }
    }

    @keyframes heartbeat
    {
        0%, 50%, 100% { transform: scale(1); }
        15%, 35% { transform: scale(1.25); }
        25% { transform: scale(1.1); }
    }
</style>
