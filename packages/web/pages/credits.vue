<script lang="ts" setup>
    import { localize } from "@byloth/dnd-platform-composer";
    import type { PackageManifest } from "@byloth/dnd-platform-schema";

    import FontAwesome from "@/components/ui/FontAwesome.vue";

    // Who made this and whose work it stands on (owner, 2026-09-25): the author first, with a way to support the
    // work; then the game content, credited from the packages' own manifests so a new public package credits
    // itself; the trademarks; the data, fonts and tools; the platform's licence.
    const { t, locale } = useI18n();
    const content = useContentStore();
    const { track } = useAnalytics();

    useHead({ title: () => t("creditsPage.title") });

    const SUPPORT_URL = "https://buymeacoffee.com/byloth";
    const REPOSITORY_URL = "https://github.com/Byloth/dnd-platform";

    /** The site's packages with the translation of the interface's language, which has its own attribution. */
    const published = shallowRef<PackageManifest[]>([]);
    const load = async (): Promise<void> =>
    {
        if (!content.site.length) { await content.refresh(); }
        const sources = await content.sources(content.site.map((p) => p.manifest.id));
        published.value = sources.map((s) => s.manifest);
    };
    onMounted(load);
    watch(locale, () => { void load(); });

    const packages = computed(() => [
        ...published.value.map((manifest) => ({ manifest: manifest, local: false })),
        ...content.stored.map((entry) => ({ manifest: entry.manifest, local: true }))

    ].map(({ manifest, local }) => ({
        key: `${manifest.id}@${manifest.version}`,
        name: localize(manifest.name, locale.value) || manifest.id,
        local: local,
        sources: manifest.sources ?? []
    })));

    const TOOLS = ["data", "fonts", "icons", "framework", "statistics"] as const;
</script>

<template>
    <article class="credits-page">
        <h1>{{ t("creditsPage.title") }}</h1>

        <section class="credits-page__author" aria-labelledby="credits-author">
            <FontAwesome class="credits-page__mark"
                         icon="dice-d20"
                         aria-hidden="true" />
            <div class="credits-page__author-body">
                <p class="credits-page__eyebrow">
                    {{ t("creditsPage.author.eyebrow") }}
                </p>
                <h2 id="credits-author" class="credits-page__author-name">
                    Matteo Bilotta <span class="credits-page__alias">· Byloth</span>
                </h2>
                <p>{{ t("creditsPage.author.text") }}</p>
                <p class="credits-page__links">
                    <a href="https://www.byloth.dev/" rel="noopener">byloth.dev</a>
                    ·
                    <a :href="REPOSITORY_URL" rel="noopener">{{ t("creditsPage.author.source") }}</a>
                </p>
                <div class="credits-page__support">
                    <p class="credits-page__support-text">
                        {{ t("creditsPage.support.text") }}
                    </p>
                    <a class="credits-page__beer"
                       :href="SUPPORT_URL"
                       target="_blank"
                       rel="noopener"
                       @click="track('support-click', { from: 'credits' })">
                        <FontAwesome icon="beer-mug-empty" aria-hidden="true" />
                        {{ t("creditsPage.support.button") }}
                    </a>
                </div>
            </div>
        </section>

        <section aria-labelledby="credits-content">
            <h2 id="credits-content">
                {{ t("creditsPage.content.title") }}
            </h2>
            <p>{{ t("creditsPage.content.text") }}</p>
            <div v-for="pkg in packages"
                 :key="pkg.key"
                 class="credits-page__package">
                <h3 class="credits-page__package-name">
                    {{ pkg.name }}
                    <small v-if="pkg.local" class="credits-page__local">{{ t("creditsPage.content.local") }}</small>
                </h3>
                <p v-for="source in pkg.sources"
                   :key="source.id"
                   class="credits-page__attribution">
                    <strong>{{ source.title }}</strong>
                    <template v-if="source.publisher">
                        · {{ source.publisher }}
                    </template>
                    <template v-if="source.license">
                        · {{ source.license }}
                    </template>
                    <template v-if="source.attribution">
                        <br />{{ source.attribution }}
                    </template>
                </p>
            </div>
        </section>

        <section aria-labelledby="credits-trademarks">
            <h2 id="credits-trademarks">
                {{ t("creditsPage.trademarks.title") }}
            </h2>
            <p>{{ t("creditsPage.trademarks.text") }}</p>
        </section>

        <section aria-labelledby="credits-tools">
            <h2 id="credits-tools">
                {{ t("creditsPage.tools.title") }}
            </h2>
            <ul>
                <li v-for="tool in TOOLS" :key="tool">
                    {{ t(`creditsPage.tools.items.${tool}`) }}
                </li>
            </ul>
        </section>

        <section aria-labelledby="credits-licence">
            <h2 id="credits-licence">
                {{ t("creditsPage.licence.title") }}
            </h2>
            <p>
                {{ t("creditsPage.licence.text") }}
                <a :href="REPOSITORY_URL" rel="noopener">{{ REPOSITORY_URL.replace("https://", "") }}</a>
            </p>
        </section>
    </article>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .credits-page
    {
        max-width: 46rem;

        &__author
        {
            @include mixins.card(2);

            background:
                radial-gradient(120% 140% at 0% 0%, var(--color-accent-soft), transparent 55%),
                var(--color-surface-raised);
            display: grid;
            gap: var(--space-4);
            margin: var(--space-5) 0 var(--space-6);
            padding: var(--space-5);

            @include mixins.from(variables.$desktop-min)
            {
                grid-template-columns: auto minmax(0, 1fr);
            }
        }

        &__mark
        {
            color: var(--color-accent);
            font-size: 3rem;
        }

        &__eyebrow
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            font-weight: 700;
            letter-spacing: 0.08em;
            margin: 0;
            text-transform: uppercase;
        }

        &__author-name
        {
            margin: var(--space-1) 0 var(--space-2);
        }

        &__alias
        {
            color: var(--color-ink-muted);
        }

        &__support
        {
            align-items: center;
            border-top: 1px solid var(--color-border);
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-3);
            margin-top: var(--space-4);
            padding-top: var(--space-4);
        }

        &__support-text
        {
            flex: 1 1 16rem;
            margin: 0;
        }

        &__beer
        {
            @include mixins.tap-target;

            align-items: center;
            background-color: var(--color-brass);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-1);
            color: var(--color-accent-ink);
            display: inline-flex;
            font-weight: 700;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-4);
            text-decoration: none;

            &:hover
            {
                box-shadow: var(--shadow-2);
                text-decoration: none;
            }
        }

        &__package
        {
            margin-top: var(--space-4);
        }

        &__package-name
        {
            margin: 0 0 var(--space-2);
        }

        &__local
        {
            color: var(--color-ink-muted);
            font-weight: 400;
        }

        &__attribution
        {
            color: var(--color-ink);
            font-size: var(--text-sm);
        }
    }
</style>
