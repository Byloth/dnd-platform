<script lang="ts" setup>
    import type { Character } from "@byloth/dnd-platform-engine";

    import AppButton from "@/components/ui/AppButton.vue";
    import FilePicker from "@/components/ui/FilePicker.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { ExportRefusal, ImportPlan } from "@/composables/character-files";

    // The file code and the dialogs load with their first use: the page's first load stays light (its Lighthouse
    // guard).
    const ExportDialog = defineAsyncComponent(() => import("@/components/characters/ExportDialog.vue"));
    const ImportDialog = defineAsyncComponent(() => import("@/components/characters/ImportDialog.vue"));
    const files = async () => (await import("@/composables/character-files")).useCharacterFiles();

    // The characters page: the player's own characters, stored in this browser, then the site's demo characters,
    // each linking its sheet.

    const { t, locale } = useI18n();
    const { list } = useCharacters();

    // The names and summaries follow the interface's language.
    const { data: characters, status } = await useAsyncData("characters", () => list(), { watch: [locale] });
    const groups = computed(() => (["stored", "demo"] as const)
        .map((origin) => ({ origin: origin, characters: (characters.value ?? []).filter((c) => c.origin === origin) }))
        .filter((g) => g.characters.length > 0));

    // The blank sheet (M1.6b): the classic PDF with every field empty, in the interface's language and the paper and
    // hand of the preferences. The PDF code loads with the click.
    const preferences = usePreferencesStore();
    const makingBlank = ref(false);
    const saveBlank = async (): Promise<void> =>
    {
        if (makingBlank.value) { return; }
        makingBlank.value = true;
        try
        {
            const { saveBlankSheetPdf } = await import("@/composables/sheet-pdf");
            await saveBlankSheetPdf(t("characters.blankSheet.file"), {
                language: locale.value, pageSize: preferences.pageSize, hand: preferences.hand
            });
            useAnalytics().track("blank-sheet-pdf", { pageSize: preferences.pageSize, hand: preferences.hand });
        }
        finally { makingBlank.value = false; }
    };

    // Export from the list (docs/phase-1/05-print-and-export.md): the stored document, in the dialog.
    const exporting = shallowRef<Character>();
    const exportCharacter = async (id: string): Promise<void> =>
    {
        exporting.value = await useBrowserStorage().characters.get(id);
    };

    // Import: read the file, show what happens to its packages, then store it and open its sheet.
    const importing = shallowRef<ImportPlan>();
    const refusal = shallowRef<{ file: string, reason: ExportRefusal | "failed", problems: readonly string[] }>();
    const onFiles = async ([file]: File[]): Promise<void> =>
    {
        if (!file) { return; }
        refusal.value = undefined;
        const { ExportRefusedException } = await import("@/composables/character-files");
        try
        {
            const characterFiles = await files();
            importing.value = await characterFiles.plan(await characterFiles.read(file));
        }
        catch (error)
        {
            if (!(error instanceof ExportRefusedException)) { throw error; }
            refusal.value = { file: file.name, reason: error.reason, problems: error.problems };
        }
    };
    const onImport = async (replace: boolean): Promise<void> =>
    {
        const plan = importing.value!;
        importing.value = undefined;
        const { PackageRefusedException } = await import("@/composables/packages");
        try
        {
            const character = await (await files()).importCharacter(plan, { replace: replace });
            useAnalytics().track("character-import", {
                embedded: plan.packages.filter((p) => p.status === "embedded").length,
                missing: plan.packages.filter((p) => p.status === "missing").length
            });
            clearNuxtData(["characters", `character-${character.id}`]);
            await navigateTo({ name: "characters-id", params: { id: character.id } });
        }
        catch (error)
        {
            if (!(error instanceof PackageRefusedException)) { throw error; }
            refusal.value = {
                file: `${plan.document.character.name}.dnd.json`,
                reason: "failed",
                problems: error.diagnostics.map((d) => `${d.code} ${d.message}`)
            };
        }
    };
</script>

<template>
    <div class="characters-page">
        <header class="characters-page__header">
            <h1 class="characters-page__title">
                {{ t("characters.heading") }}
            </h1>
            <p class="characters-page__intro">
                {{ t("characters.intro") }}
            </p>
            <div class="characters-page__actions">
                <AppButton :to="{ name: 'characters-new' }">
                    <FontAwesome icon="dice-d20" aria-hidden="true" />
                    {{ t("wizard.create") }}
                </AppButton>
                <AppButton theme="secondary"
                           outline
                           :disabled="makingBlank"
                           @click="saveBlank">
                    <FontAwesome :icon="makingBlank ? 'spinner' : 'file-pdf'"
                                 :class="{ 'characters-page__spinner': makingBlank }"
                                 aria-hidden="true" />
                    {{ makingBlank ? t("characters.blankSheet.busy") : t("characters.blankSheet.button") }}
                </AppButton>
            </div>
        </header>
        <p v-if="status === 'pending'" role="status">
            {{ t("characters.loading") }}
        </p>
        <p v-else-if="status === 'error'" role="alert">
            {{ t("characters.failed") }}
        </p>
        <template v-else>
            <section v-for="group in groups"
                     :key="group.origin"
                     class="characters-page__section"
                     :aria-labelledby="`characters-${group.origin}-heading`">
                <h2 :id="`characters-${group.origin}-heading`" class="characters-page__subtitle">
                    {{ t(`characters.${group.origin}`) }}
                </h2>
                <ul class="characters-page__list">
                    <li v-for="character in group.characters"
                        :key="character.id"
                        class="characters-page__item">
                        <NuxtLink :to="{ name: 'characters-id', params: { id: character.id } }"
                                  class="character-card">
                            <span class="character-card__crest" aria-hidden="true">
                                {{ character.name.charAt(0) }}
                            </span>
                            <span class="character-card__text">
                                <strong class="character-card__name">{{ character.name }}</strong>
                                <span class="character-card__summary">{{ character.summary }}</span>
                            </span>
                            <FontAwesome class="character-card__go"
                                         icon="chevron-right"
                                         aria-hidden="true" />
                        </NuxtLink>
                        <button v-if="group.origin === 'stored'"
                                type="button"
                                class="characters-page__export"
                                :aria-label="t('characters.export.button', { name: character.name })"
                                :title="t('characters.export.button', { name: character.name })"
                                @click="exportCharacter(character.id)">
                            <FontAwesome icon="file-arrow-down" aria-hidden="true" />
                        </button>
                    </li>
                </ul>
            </section>
        </template>

        <section class="characters-page__section" aria-labelledby="characters-import-heading">
            <h2 id="characters-import-heading" class="characters-page__subtitle">
                {{ t("characters.import.heading") }}
            </h2>
            <FilePicker accept=".json"
                        :action="t('characters.import.action')"
                        :hint="t('characters.import.hint')"
                        @files="onFiles" />
            <div v-if="refusal"
                 class="characters-page__refusal"
                 role="alert">
                <p>
                    {{ refusal.reason === "failed" ?
                        t("characters.import.failed", { file: refusal.file }) :
                        t(`characters.import.refused.${refusal.reason}`, { file: refusal.file }) }}
                </p>
                <details v-if="refusal.problems.length">
                    <summary class="characters-page__details">
                        {{ t("characters.import.details") }}
                    </summary>
                    <ul>
                        <li v-for="(problem, i) in refusal.problems" :key="i">
                            <code>{{ problem }}</code>
                        </li>
                    </ul>
                </details>
            </div>
        </section>

        <ExportDialog v-if="exporting"
                      :open="true"
                      :character="exporting"
                      @close="exporting = undefined" />
        <ImportDialog v-if="importing"
                      :open="true"
                      :plan="importing"
                      @confirm="onImport"
                      @cancel="importing = undefined" />
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    @keyframes characters-page-spin
    {
        to { transform: rotate(360deg); }
    }

    .characters-page
    {
        &__header
        {
            margin-bottom: var(--space-6);
            max-width: 46rem;
        }

        &__intro
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
        }

        &__actions
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-3);
        }

        &__spinner
        {
            animation: characters-page-spin 1s linear infinite;

            @media (prefers-reduced-motion: reduce)
            {
                animation: none;
            }
        }

        &__section + &__section
        {
            margin-top: var(--space-7);
        }

        &__subtitle
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        &__list
        {
            display: grid;
            gap: var(--space-4);
            grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__item
        {
            display: flex;
            gap: var(--space-2);
        }

        &__export
        {
            @include mixins.tap-target;
            @include mixins.card(1);

            color: var(--color-ink-muted);
            cursor: pointer;
            font-size: var(--text-lg);

            &:hover
            {
                border-color: var(--color-accent);
                color: var(--color-accent);
            }

            &:focus-visible
            {
                @include mixins.focus-ring;
            }
        }

        &__refusal
        {
            background-color: var(--color-warning-soft);
            border-radius: var(--radius-md);
            margin-top: var(--space-3);
            padding: var(--space-3) var(--space-4);

            p
            {
                margin: 0;
            }
        }

        &__details
        {
            cursor: pointer;
            font-weight: 700;
            min-height: 44px;
            padding: var(--space-2) 0;
        }
    }

    .character-card
    {
        @include mixins.card(1);

        flex: 1;
        align-items: center;
        color: var(--color-ink);
        display: flex;
        gap: var(--space-4);
        min-height: 5.5rem;
        padding: var(--space-4);
        text-decoration: none;
        transition:
            transform var(--duration-fast) var(--easing),
            box-shadow var(--duration-fast) var(--easing),
            border-color var(--duration-fast) var(--easing);

        &:hover
        {
            border-color: var(--color-border-strong);
            box-shadow: var(--shadow-2);
            text-decoration: none;
            transform: translateY(-2px);

            .character-card__go
            {
                color: var(--color-accent);
                transform: translateX(2px);
            }
        }

        &__crest
        {
            align-items: center;
            background: linear-gradient(145deg, var(--color-accent), var(--color-brass));
            border-radius: var(--radius-round);
            box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--color-surface-raised) 35%, transparent);
            color: var(--color-accent-ink);
            display: inline-flex;
            flex: none;
            font-family: var(--font-display);
            font-size: var(--text-2xl);
            font-weight: 700;
            height: 3.25rem;
            justify-content: center;
            width: 3.25rem;
        }

        &__text
        {
            display: grid;
            flex: 1;
            min-width: 0;
        }

        &__name
        {
            font-family: var(--font-display);
            font-size: var(--text-lg);
        }

        &__summary
        {
            color: var(--color-ink-muted);
        }

        &__go
        {
            color: var(--color-ink-muted);
            transition: transform var(--duration-fast) var(--easing), color var(--duration-fast) var(--easing);
        }
    }
</style>
