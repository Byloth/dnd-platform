<script lang="ts" setup>
    import { composeCreature, composeEntry } from "@byloth/dnd-platform-composer";

    import EntryCard from "@/components/compendium/EntryCard.vue";
    import EntrySource from "@/components/compendium/EntrySource.vue";
    import StatBlock from "@/components/compendium/StatBlock.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import { COMPENDIUM_KINDS } from "@/composables/compendium";
    import type { CompendiumKind } from "@/composables/compendium";
    import { defaultUnits } from "@/composables/sheet";

    /**
     * One entry of the compendium (docs/phase-1/13-compendium.md): a creature's stat block or a spell, an item or a
     * condition, as the composer writes them in the interface's language and units, and where it comes from. An
     * entry that is not on this device (a private package loaded elsewhere) says so.
     */
    const { t, locale } = useI18n();
    const route = useRoute();
    const translate = useSheetTranslate();

    const kind = computed(() => String(route.params["kind"]) as CompendiumKind);
    const id = computed(() => String(route.params["id"]));
    const valid = computed(() => COMPENDIUM_KINDS.includes(kind.value));

    const { data } = await useAsyncData(
        () => `compendium-${kind.value}-${locale.value}`,
        async () => (valid.value ? useCompendium().set({ creatures: kind.value === "creatures" }) : null),
        { watch: [kind, locale] }
    );

    const options = computed(() => ({
        packages: data.value!.packages,
        language: locale.value,
        translate: translate,
        units: defaultUnits(locale.value)
    }));
    const block = computed(() => ((data.value && (kind.value === "creatures")) ?
        composeCreature(id.value, options.value) :
        undefined));
    const entry = computed(() =>
    {
        if (!data.value || (kind.value === "creatures")) { return undefined; }
        const view = composeEntry(id.value, options.value);

        // An address that names an entry under another section is not this section's entry.
        return view && (`${view.kind}s` === kind.value) ? view : undefined;
    });
    const manifest = computed(() =>
    {
        const owner = data.value?.packages.entities.get(id.value as never)?.package;

        return data.value?.packages.order.find((m) => m.id === owner);
    });

    useHead({ title: () => block.value?.name ?? entry.value?.name ?? t("compendium.missing.heading") });

    // Back to the list it came from, with its search and filters, when that is where the player was.
    const back = computed(() =>
    {
        const previous = import.meta.client ? (window.history.state as { back?: unknown } | null)?.back : undefined;
        if ((typeof previous === "string") && previous.startsWith(`/compendium/${kind.value}`) &&
            !previous.startsWith(`/compendium/${kind.value}/`))
        {
            return previous;
        }

        return { name: "compendium-kind", params: { kind: kind.value } };
    });
    const kindName = computed(() => (valid.value ? t(`compendium.kinds.${kind.value}.name`) : t("compendium.title")));
</script>

<template>
    <div class="compendium-entry">
        <nav class="compendium-entry__crumbs" :aria-label="t('compendium.title')">
            <NuxtLink :to="valid ? back : { name: 'compendium' }" class="compendium-entry__back">
                <FontAwesome icon="chevron-left" aria-hidden="true" />
                {{ t("compendium.back", { kind: kindName }) }}
            </NuxtLink>
        </nav>
        <template v-if="block || entry">
            <StatBlock v-if="block" :block="block" />
            <EntryCard v-else-if="entry" :entry="entry" />
            <EntrySource v-if="manifest" :manifest="manifest" />
        </template>
        <section v-else-if="data !== undefined" class="compendium-entry__missing">
            <h1>{{ t("compendium.missing.heading") }}</h1>
            <p>{{ t("compendium.missing.text") }}</p>
        </section>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .compendium-entry
    {
        display: grid;
        gap: var(--space-4);
        margin: 0 auto;
        max-width: 48rem;
        width: 100%;

        &__back
        {
            align-items: center;
            color: var(--color-ink-muted);
            display: inline-flex;
            font-weight: 700;
            gap: var(--space-2);
            min-height: 44px;
            text-decoration: none;

            &:hover
            {
                color: var(--color-accent);
            }
        }

        &__missing
        {
            @include mixins.card(1);

            padding: var(--space-5);
        }
    }
</style>
