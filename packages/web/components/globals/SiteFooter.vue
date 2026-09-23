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
        }
    }
</style>
