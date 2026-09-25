<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";

    // What the site knows about its visitors (DEC-22, docs/phase-1/12-analytics.md): nothing of their characters,
    // and anonymous usage statistics only with their consent, which can be changed here.
    const { t } = useI18n();
    const consent = useConsentStore();

    useHead({ title: () => t("privacy.title") });

    const COLLECTED = ["pages", "device", "country", "events"] as const;
    const NEVER = ["characters", "packages", "typed", "identity"] as const;
</script>

<template>
    <article class="privacy-page">
        <h1>{{ t("privacy.title") }}</h1>
        <p class="privacy-page__intro">
            {{ t("privacy.intro") }}
        </p>

        <section aria-labelledby="privacy-local">
            <h2 id="privacy-local">
                {{ t("privacy.local.title") }}
            </h2>
            <p>{{ t("privacy.local.text") }}</p>
        </section>

        <section aria-labelledby="privacy-statistics">
            <h2 id="privacy-statistics">
                {{ t("privacy.statistics.title") }}
            </h2>
            <p>{{ t("privacy.statistics.text") }}</p>
            <h3>{{ t("privacy.statistics.collected") }}</h3>
            <ul>
                <li v-for="item in COLLECTED" :key="item">
                    {{ t(`privacy.statistics.items.${item}`) }}
                </li>
            </ul>
            <h3>{{ t("privacy.statistics.never") }}</h3>
            <ul>
                <li v-for="item in NEVER" :key="item">
                    {{ t(`privacy.statistics.nevers.${item}`) }}
                </li>
            </ul>
            <p>{{ t("privacy.statistics.basis") }}</p>
        </section>

        <section class="privacy-page__choice" aria-labelledby="privacy-choice">
            <h2 id="privacy-choice">
                {{ t("privacy.choice.title") }}
            </h2>
            <p role="status">
                {{ t(`privacy.choice.state.${consent.analytics}`) }}
            </p>
            <div class="privacy-page__actions">
                <AppButton theme="secondary"
                           outline
                           :disabled="consent.analytics === 'denied'"
                           @click="consent.deny()">
                    {{ t("consent.decline") }}
                </AppButton>
                <AppButton theme="secondary"
                           outline
                           :disabled="consent.analytics === 'granted'"
                           @click="consent.grant()">
                    {{ t("consent.accept") }}
                </AppButton>
            </div>
        </section>

        <section aria-labelledby="privacy-contact">
            <h2 id="privacy-contact">
                {{ t("privacy.contact.title") }}
            </h2>
            <p>
                {{ t("privacy.contact.text") }}
                <a href="https://www.byloth.dev/" rel="noopener">byloth.dev</a>
            </p>
        </section>
    </article>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .privacy-page
    {
        max-width: 46rem;

        &__intro
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
        }

        &__choice
        {
            @include mixins.card(1);

            margin: var(--space-5) 0;
            padding: var(--space-4) var(--space-5);
        }

        &__actions
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
        }
    }
</style>
