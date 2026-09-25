<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    // What the platform does, what comes next and what comes later, in plain words (owner, 2026-09-25). The plan
    // behind it is docs/16-roadmap.md; this page is its short version for players, and changing it is one line here.
    const { t } = useI18n();

    useHead({ title: () => t("roadmapPage.title") });

    type Status = "now" | "next" | "later";
    const GROUPS: readonly { status: Status, icon: string, items: readonly string[] }[] = [
        {
            status: "now",
            icon: "circle-check",
            items: ["creation", "ideas", "sheet", "editing", "expert", "languages", "books"]
        },
        { status: "next", icon: "feather", items: ["settings", "italian", "rolling", "files", "print"] },
        {
            status: "later",
            icon: "star",
            items: ["play", "dice", "levels", "homebrew", "catalogues", "assistant", "campaigns"]
        }
    ];
</script>

<template>
    <article class="roadmap-page">
        <h1>{{ t("roadmapPage.title") }}</h1>
        <p class="roadmap-page__intro">
            {{ t("roadmapPage.intro") }}
        </p>
        <section v-for="group in GROUPS"
                 :key="group.status"
                 class="roadmap-page__group"
                 :class="`roadmap-page__group--${group.status}`"
                 :aria-labelledby="`roadmap-${group.status}`">
            <h2 :id="`roadmap-${group.status}`" class="roadmap-page__heading">
                <FontAwesome class="roadmap-page__icon"
                             :icon="group.icon"
                             aria-hidden="true" />
                {{ t(`roadmapPage.groups.${group.status}`) }}
            </h2>
            <ul class="roadmap-page__list">
                <li v-for="item in group.items"
                    :key="item"
                    class="roadmap-page__item">
                    <strong class="roadmap-page__name">{{ t(`roadmapPage.items.${item}.name`) }}</strong>
                    <span class="roadmap-page__text">{{ t(`roadmapPage.items.${item}.text`) }}</span>
                </li>
            </ul>
        </section>
        <p class="roadmap-page__note">
            {{ t("roadmapPage.note") }}
        </p>
    </article>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .roadmap-page
    {
        max-width: 46rem;

        &__intro
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
        }

        &__group
        {
            margin-top: var(--space-6);
        }

        &__heading
        {
            align-items: center;
            display: flex;
            gap: var(--space-2);
        }

        &__icon
        {
            font-size: var(--text-lg);
        }

        &__group--now &__icon
        {
            color: var(--color-healing);
        }

        &__group--next &__icon
        {
            color: var(--color-accent);
        }

        &__group--later &__icon
        {
            color: var(--color-brass);
        }

        &__list
        {
            display: grid;
            gap: var(--space-2);
            list-style: none;
            margin: var(--space-3) 0 0;
            padding: 0;
        }

        &__item
        {
            @include mixins.card(1);

            display: grid;
            gap: var(--space-1);
            padding: var(--space-3) var(--space-4);
        }

        &__text
        {
            color: var(--color-ink-muted);
        }

        &__note
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            margin-top: var(--space-6);
        }
    }
</style>
