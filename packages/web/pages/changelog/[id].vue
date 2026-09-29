<script lang="ts" setup>
    import RichText from "@/components/sheet/RichText.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /**
     * What's new in a published package (DEC-21, M1.5b): the sections of its changelog, newest first, the ones
     * after the version a character had shown open and the earlier ones behind a disclosure. The file's preamble,
     * written for whoever maintains the content, is left out.
     */
    const { t, locale } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const base = useRuntimeConfig().app.baseURL;
    const content = useContentStore();

    const id = computed(() => String(route.params["id"]));
    const from = computed(() => (typeof route.query["from"] === "string" ? route.query["from"] : undefined));

    interface Release { readonly version: string, readonly heading: string, readonly text: string }

    const { data } = await useAsyncData(() => `changelog-${id.value}`, async () =>
    {
        const [text] = await Promise.all([
            $fetch<string>(`${base}content/${id.value}.changelog.md`, { responseType: "text" }).catch(() => undefined),
            content.refresh().catch(() => undefined)
        ]);

        return text ?? null;

    }, { watch: [id] });

    /** "1.10.0" after "1.9.2": each part as a number. */
    const newer = (a: string, b: string): boolean =>
    {
        const [x, y] = [a, b].map((v) => v.split(/[.-]/).map((p) => Number.parseInt(p, 10) || 0));
        for (let i = 0; i < Math.max(x!.length, y!.length); i += 1)
        {
            if ((x![i] ?? 0) !== (y![i] ?? 0)) { return (x![i] ?? 0) > (y![i] ?? 0); }
        }

        return false;
    };
    const releases = computed((): Release[] => (data.value ?? "").split(/^## /m).slice(1)
        .map((section) =>
        {
            const [heading = "", ...body] = section.split("\n");

            return { version: heading.split(/\s/)[0] ?? "", heading: heading.trim(), text: body.join("\n").trim() };
        }));
    const recent = computed(() =>
        (from.value ? releases.value.filter((r) => newer(r.version, from.value!)) : releases.value));
    const earlier = computed(() => (from.value ? releases.value.filter((r) => !newer(r.version, from.value!)) : []));

    const name = computed(() =>
    {
        const names = content.site.find((p) => p.manifest.id === id.value)?.manifest.name as
            Record<string, string | undefined> | undefined;

        return names?.[locale.value] ?? names?.["en"] ?? id.value;
    });
    useHead({ title: () => `${t("changelog.title")}: ${name.value}` });
</script>

<template>
    <article class="changelog-page">
        <button type="button"
                class="changelog-page__back"
                @click="router.back()">
            <FontAwesome icon="chevron-left" aria-hidden="true" />
            {{ t("changelog.back") }}
        </button>
        <h1 class="changelog-page__title">
            {{ t("changelog.title") }}: {{ name }}
        </h1>
        <p v-if="!releases.length" class="changelog-page__intro">
            {{ t("changelog.missing") }}
        </p>
        <template v-else>
            <p class="changelog-page__intro">
                {{ from ? t("changelog.since") : t("changelog.intro") }}
            </p>
            <section v-for="release in recent"
                     :key="release.version"
                     class="changelog-page__release">
                <h2 class="changelog-page__version">
                    {{ release.heading }}
                </h2>
                <RichText :text="release.text" />
            </section>
            <details v-if="earlier.length" class="changelog-page__earlier">
                <summary class="changelog-page__toggle">
                    {{ t("changelog.earlier") }}
                </summary>
                <section v-for="release in earlier"
                         :key="release.version"
                         class="changelog-page__release">
                    <h2 class="changelog-page__version">
                        {{ release.heading }}
                    </h2>
                    <RichText :text="release.text" />
                </section>
            </details>
        </template>
    </article>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .changelog-page
    {
        display: grid;
        gap: var(--space-4);
        margin: 0 auto;
        max-width: 48rem;

        &__back
        {
            @include mixins.tap-target;

            align-items: center;
            background: none;
            border: 0;
            color: var(--color-ink-muted);
            cursor: pointer;
            display: inline-flex;
            font: inherit;
            font-weight: 700;
            gap: var(--space-2);
            justify-self: start;
            padding: 0;

            &:hover
            {
                color: var(--color-accent);
            }

            &:focus-visible
            {
                @include mixins.focus-ring;
            }
        }

        &__title
        {
            margin: 0;
        }

        &__intro
        {
            color: var(--color-ink-muted);
            margin: 0;
        }

        &__release
        {
            @include mixins.card(1);

            padding: var(--space-4) var(--space-5);
        }

        &__version
        {
            color: var(--color-brass);
            font-size: var(--text-lg);
            margin: 0 0 var(--space-2);
        }

        &__toggle
        {
            cursor: pointer;
            font-weight: 700;
            min-height: 44px;
            padding: var(--space-2) 0;
        }

        &__earlier
        {
            display: grid;
            gap: var(--space-3);
        }
    }
</style>
