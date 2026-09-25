<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";

    /**
     * The question about usage statistics (DEC-22), asked once and only while no answer is stored: a card at the
     * bottom of the screen that blocks nothing and takes no focus. "Accept" and "Decline" have the same weight;
     * nothing is loaded or sent before "Accept". The answer can be changed in the settings and on the privacy page.
     */
    const { t } = useI18n();
    const consent = useConsentStore();
    const enabled = Boolean((useRuntimeConfig().public.analytics as { websiteId?: string }).websiteId);
</script>

<template>
    <section v-if="enabled && consent.analytics === 'unset'"
             class="consent-banner"
             aria-labelledby="consent-banner-title">
        <h2 id="consent-banner-title" class="consent-banner__title">
            {{ t("consent.title") }}
        </h2>
        <p class="consent-banner__text">
            {{ t("consent.text") }}
            <NuxtLink :to="{ name: 'privacy' }">
                {{ t("consent.privacy") }}
            </NuxtLink>
        </p>
        <div class="consent-banner__actions">
            <AppButton theme="secondary"
                       outline
                       @click="consent.deny()">
                {{ t("consent.decline") }}
            </AppButton>
            <AppButton theme="secondary"
                       outline
                       @click="consent.grant()">
                {{ t("consent.accept") }}
            </AppButton>
        </div>
    </section>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .consent-banner
    {
        @include mixins.card(3);

        bottom: var(--space-3);
        display: grid;
        gap: var(--space-3);
        left: var(--space-3);
        padding: var(--space-4) var(--space-5);
        position: fixed;
        right: var(--space-3);
        z-index: 20;

        @include mixins.from(variables.$desktop-min)
        {
            left: auto;
            max-width: 30rem;
        }

        &__title
        {
            font-family: var(--font-text);
            font-size: var(--text-md);
            letter-spacing: 0;
            margin: 0;
        }

        &__text
        {
            color: var(--color-ink);
            margin: 0;
        }

        &__actions
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            justify-content: flex-end;
        }
    }
</style>
