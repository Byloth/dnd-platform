<script lang="ts" setup>
    import { SystemInfo } from "@byloth/core";
    import type { PackageManifest } from "@byloth/dnd-platform-schema";

    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { PackageEntry } from "@/stores/content";

    // The packages page (docs/phase-1/02-content-and-character-stores.md): what the site ships, what the user
    // loaded, loading more from files, removing, and the state of the browser's storage.

    const { t, locale } = useI18n();
    const store = useContentStore();

    // Read again on every visit: the store may have changed from another page (or another tab).
    await store.refresh();

    const packages = computed((): PackageEntry[] => [...store.site, ...store.stored]);

    const name = (manifest: PackageManifest): string =>
    {
        const names = manifest.name as Record<string, string | undefined>;

        return names[locale.value] ?? names["en"] ?? manifest.id;
    };
    const keyOf = (entry: PackageEntry): string => `${entry.manifest.id}@${entry.manifest.version}`;

    const onFiles = async (event: Event): Promise<void> =>
    {
        const input = event.target as HTMLInputElement;
        const files = [...(input.files ?? [])];
        input.value = "";

        await store.loadFiles(files);
    };

    // Removal asks first (docs/13-ux-and-accessibility.md), and is refused while a character uses the package.
    const confirming = ref<string>();
    const inUse = ref<Record<string, readonly string[]>>({});
    const remove = async (entry: PackageEntry): Promise<void> =>
    {
        confirming.value = undefined;

        const { removed, usedBy } = await store.remove(entry.manifest.id, entry.manifest.version);
        if (!removed) { inUse.value = { ...inUse.value, [keyOf(entry)]: usedBy }; }
    };

    const bytes = (value: number): string =>
    {
        const megabytes = value / 1_000_000;
        const unit = megabytes >= 1_000 ? "gigabyte" : "megabyte";
        const amount = megabytes >= 1_000 ? megabytes / 1_000 : megabytes;

        return new Intl.NumberFormat(locale.value, { style: "unit", unit: unit, maximumFractionDigits: 1 })
            .format(amount);
    };
    const persistenceText = computed((): string =>
    {
        const persisted = store.persistence?.persisted;
        if (persisted === true) { return t("packages.storage.persisted"); }
        if (persisted === false) { return t("packages.storage.notPersisted"); }

        return t("packages.storage.unknown");
    });
    const usageShare = computed((): number | undefined =>
    {
        const state = store.persistence;
        if (state?.usage === undefined || !state.quota) { return undefined; }

        return Math.min(100, Math.max(1, (state.usage / state.quota) * 100));
    });
    const { browser, operatingSystem } = SystemInfo.Current;
    const evicts = (browser.name === "Safari") || (operatingSystem.name === "iOS");
</script>

<template>
    <div class="packages-page">
        <header class="packages-page__header">
            <h1>{{ t("packages.heading") }}</h1>
            <p class="packages-page__intro">
                {{ t("packages.intro") }}
            </p>
        </header>

        <section class="packages-page__section" aria-labelledby="packages-load-heading">
            <h2 id="packages-load-heading" class="packages-page__subtitle">
                {{ t("packages.load.heading") }}
            </h2>
            <label class="file-picker">
                <span class="file-picker__icon" aria-hidden="true">
                    <FontAwesome icon="file-arrow-up" />
                </span>
                <span class="file-picker__text">
                    <strong class="file-picker__action">{{ t("packages.load.choose") }}</strong>
                    <span class="file-picker__hint">{{ t("packages.load.hint") }}</span>
                </span>
                <input type="file"
                       class="file-picker__input"
                       accept=".zip,.json"
                       multiple
                       @change="onFiles" />
            </label>

            <ul v-if="store.loads.length" class="packages-page__loads">
                <li v-for="entry in store.loads"
                    :key="entry.id"
                    class="load-entry"
                    :class="`load-entry--${entry.status}`">
                    <p class="load-entry__status" role="status">
                        <template v-if="entry.status === 'checking'">
                            <FontAwesome icon="spinner"
                                         class="load-entry__icon load-entry__icon--spinning"
                                         aria-hidden="true" />
                            {{ t("packages.load.checking", { file: entry.fileName }) }}
                        </template>
                        <template v-else-if="entry.status === 'done' && entry.manifest">
                            <FontAwesome icon="circle-check"
                                         class="load-entry__icon"
                                         aria-hidden="true" />
                            {{ t("packages.load.done", {
                                name: name(entry.manifest),
                                version: entry.manifest.version
                            }) }}
                        </template>
                        <template v-else-if="entry.status === 'refused'">
                            <FontAwesome icon="circle-xmark"
                                         class="load-entry__icon"
                                         aria-hidden="true" />
                            {{ t("packages.load.refused", { file: entry.fileName }) }}
                            {{ t("packages.load.refusedNext") }}
                        </template>
                        <template v-else>
                            <FontAwesome icon="circle-xmark"
                                         class="load-entry__icon"
                                         aria-hidden="true" />
                            {{ t("packages.load.failed", { file: entry.fileName }) }}
                        </template>
                    </p>
                    <details v-if="entry.diagnostics.length" class="load-entry__details">
                        <summary class="load-entry__summary">
                            {{ t(entry.status === "refused" ? "packages.load.problems" : "packages.load.remarks",
                                 entry.diagnostics.length) }}
                        </summary>
                        <ul class="load-entry__diagnostics">
                            <li v-for="(d, i) in entry.diagnostics"
                                :key="i"
                                class="load-entry__diagnostic">
                                <code>{{ d.code }}</code> <code>{{ d.file }}</code> <code>{{ d.path }}</code>
                                {{ d.message }}
                            </li>
                        </ul>
                    </details>
                    <details v-if="entry.message" class="load-entry__details">
                        <summary class="load-entry__summary">
                            {{ t("packages.load.problems", 1) }}
                        </summary>
                        <p><code>{{ entry.message }}</code></p>
                    </details>
                    <AppButton v-if="entry.status !== 'checking'"
                               class="load-entry__dismiss"
                               small
                               outline
                               theme="secondary"
                               @click="store.dismissLoad(entry.id)">
                        {{ t("packages.load.dismiss") }}
                    </AppButton>
                </li>
            </ul>
        </section>

        <section class="packages-page__section" aria-labelledby="packages-list-heading">
            <h2 id="packages-list-heading" class="packages-page__subtitle">
                {{ t("packages.list.heading") }}
            </h2>
            <ul class="packages-page__list">
                <li v-for="entry in packages"
                    :key="keyOf(entry)"
                    class="package-card"
                    :class="{ 'package-card--private': entry.manifest.redistributable === false }"
                    :aria-labelledby="`package-${entry.manifest.id}`">
                    <header class="package-card__header">
                        <h3 :id="`package-${entry.manifest.id}`" class="package-card__name">
                            {{ name(entry.manifest) }}
                        </h3>
                        <p class="package-card__badges">
                            <span class="package-card__badge">
                                <template v-if="entry.origin === 'site'">
                                    <FontAwesome icon="globe" aria-hidden="true" />
                                    {{ t("packages.list.site") }}
                                </template>
                                <template v-else>
                                    <FontAwesome icon="hard-drive" aria-hidden="true" />
                                    {{ t("packages.list.file", { file: entry.fileName ?? entry.manifest.id }) }}
                                </template>
                            </span>
                            <span v-if="entry.manifest.redistributable === false"
                                  class="package-card__badge package-card__badge--private">
                                <FontAwesome icon="lock" aria-hidden="true" />
                                {{ t("packages.list.private") }}
                            </span>
                        </p>
                    </header>
                    <dl class="package-card__facts">
                        <dt class="package-card__term">
                            {{ t("packages.list.id") }}
                        </dt>
                        <dd class="package-card__value">
                            <code>{{ entry.manifest.id }}</code>
                        </dd>
                        <dt class="package-card__term">
                            {{ t("packages.list.version") }}
                        </dt>
                        <dd class="package-card__value">
                            {{ entry.manifest.version }}
                        </dd>
                        <dt class="package-card__term">
                            {{ t("packages.list.kind") }}
                        </dt>
                        <dd class="package-card__value">
                            {{ t(`packages.kind.${entry.manifest.kind}`) }}
                        </dd>
                        <dt class="package-card__term">
                            {{ t("packages.list.content") }}
                        </dt>
                        <dd class="package-card__value">
                            {{ t("packages.list.entries", entry.entities) }}
                        </dd>
                        <dt class="package-card__term">
                            {{ t("packages.list.sources") }}
                        </dt>
                        <dd class="package-card__value">
                            <ul class="package-card__sources">
                                <li v-for="source in entry.manifest.sources" :key="source.id">
                                    {{ t("packages.list.source", { title: source.title, license: source.license }) }}
                                </li>
                            </ul>
                        </dd>
                    </dl>

                    <footer v-if="entry.origin === 'file'" class="package-card__footer">
                        <p v-if="inUse[keyOf(entry)]?.length"
                           class="package-card__notice"
                           role="alert">
                            {{ t("packages.remove.inUse", {
                                name: name(entry.manifest),
                                characters: inUse[keyOf(entry)]!.join(", ")
                            }) }}
                        </p>
                        <div v-if="confirming === keyOf(entry)"
                             class="package-card__confirm"
                             role="group">
                            <p class="package-card__question">
                                {{ t("packages.remove.confirm", { name: name(entry.manifest) }) }}
                            </p>
                            <div class="package-card__actions">
                                <AppButton theme="danger" @click="remove(entry)">
                                    <FontAwesome icon="trash" aria-hidden="true" />
                                    {{ t("packages.remove.yes") }}
                                </AppButton>
                                <AppButton outline
                                           theme="secondary"
                                           @click="confirming = undefined">
                                    {{ t("packages.remove.no") }}
                                </AppButton>
                            </div>
                        </div>
                        <AppButton v-else
                                   outline
                                   theme="danger"
                                   @click="confirming = keyOf(entry)">
                            <FontAwesome icon="trash" aria-hidden="true" />
                            {{ t("packages.remove.action") }}
                        </AppButton>
                    </footer>
                </li>
            </ul>
        </section>

        <section class="packages-page__section" aria-labelledby="packages-storage-heading">
            <h2 id="packages-storage-heading" class="packages-page__subtitle">
                {{ t("packages.storage.heading") }}
            </h2>
            <div class="storage-panel">
                <p class="storage-panel__state">
                    {{ persistenceText }}
                </p>
                <template v-if="store.persistence?.usage !== undefined && store.persistence?.quota !== undefined">
                    <div class="storage-panel__meter" aria-hidden="true">
                        <span class="storage-panel__fill" :style="{ width: `${usageShare}%` }"></span>
                    </div>
                    <p class="storage-panel__usage">
                        {{ t("packages.storage.usage", {
                            used: bytes(store.persistence.usage),
                            quota: bytes(store.persistence.quota)
                        }) }}
                    </p>
                </template>
                <p v-if="evicts" class="storage-panel__warning">
                    <FontAwesome icon="triangle-exclamation" aria-hidden="true" />
                    {{ t("packages.storage.safari") }}
                </p>
            </div>
        </section>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    @keyframes spin
    {
        to { transform: rotate(360deg); }
    }

    .packages-page
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

        &__section
        {
            margin-bottom: var(--space-7);
        }

        &__subtitle
        {
            color: var(--color-ink-muted);
            font-size: var(--text-lg);
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        &__loads,
        &__list
        {
            display: grid;
            gap: var(--space-4);
            list-style: none;
            margin: var(--space-4) 0 0;
            padding: 0;
        }

        &__list
        {
            @include mixins.from(variables.$desktop-min)
            {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
    }

    .file-picker
    {
        align-items: center;
        background-color: var(--color-surface-raised);
        border: 2px dashed var(--color-border-strong);
        border-radius: var(--radius-lg);
        cursor: pointer;
        display: flex;
        gap: var(--space-4);
        padding: var(--space-5);
        transition:
            border-color var(--duration-fast) var(--easing),
            background-color var(--duration-fast) var(--easing);

        &:hover
        {
            background-color: var(--color-accent-soft);
            border-color: var(--color-accent);
        }

        &:focus-within
        {
            @include mixins.focus-ring;
        }

        &__icon
        {
            align-items: center;
            background-color: var(--color-accent);
            border-radius: var(--radius-md);
            color: var(--color-accent-ink);
            display: inline-flex;
            flex: none;
            font-size: var(--text-xl);
            height: 3rem;
            justify-content: center;
            width: 3rem;
        }

        &__text
        {
            display: grid;
            gap: var(--space-1);
        }

        &__action
        {
            font-size: var(--text-lg);
        }

        &__hint
        {
            color: var(--color-ink-muted);
        }

        &__input
        {
            @include mixins.sr-only;
        }
    }

    .load-entry
    {
        --load-tone: var(--color-resource);

        @include mixins.card(1);

        border-left: 6px solid var(--load-tone);
        padding: var(--space-4);

        &--done { --load-tone: var(--color-healing); }
        &--refused,
        &--failed { --load-tone: var(--color-damage); }

        &__status
        {
            align-items: baseline;
            display: flex;
            gap: var(--space-2);
            margin: 0;
        }

        &__icon
        {
            color: var(--load-tone);
            flex: none;

            &--spinning
            {
                animation: spin 1s linear infinite;
            }
        }

        &__details
        {
            margin-top: var(--space-3);
        }

        &__summary
        {
            cursor: pointer;
            font-weight: 700;
            min-height: 44px;
            padding: var(--space-2) 0;
        }

        &__diagnostics
        {
            font-size: var(--text-sm);
            margin: 0;
            overflow-wrap: anywhere;
            padding-left: var(--space-4);
        }

        &__diagnostic
        {
            margin-bottom: var(--space-1);
        }

        &__dismiss
        {
            margin-top: var(--space-3);
        }
    }

    .package-card
    {
        @include mixins.card(1);

        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-5);

        &--private
        {
            border-top: 4px solid var(--color-brass);
        }

        &__name
        {
            margin-bottom: var(--space-2);
        }

        &__badges
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            margin: 0;
        }

        &__badge
        {
            align-items: center;
            background-color: var(--color-surface-sunken);
            border-radius: var(--radius-round);
            color: var(--color-ink-muted);
            display: inline-flex;
            font-size: var(--text-sm);
            font-weight: 700;
            gap: var(--space-2);
            padding: var(--space-1) var(--space-3);

            &--private
            {
                background-color: var(--color-brass-soft);
                color: var(--color-brass);
            }
        }

        &__facts
        {
            display: grid;
            gap: var(--space-1) var(--space-4);
            grid-template-columns: max-content 1fr;
            margin: 0;
        }

        &__term
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            font-weight: 700;
            padding-top: 0.15em;
        }

        &__value
        {
            margin: 0;
        }

        &__sources
        {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__footer
        {
            border-top: 1px solid var(--color-border);
            margin-top: auto;
            padding-top: var(--space-3);
        }

        &__notice
        {
            color: var(--color-damage);
        }

        &__actions
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
        }
    }

    .storage-panel
    {
        @include mixins.card(1);

        max-width: 46rem;
        padding: var(--space-5);

        &__meter
        {
            background-color: var(--color-surface-sunken);
            border-radius: var(--radius-round);
            height: 0.75rem;
            margin: var(--space-3) 0 var(--space-2);
            overflow: hidden;
        }

        &__fill
        {
            background: linear-gradient(90deg, var(--color-resource), var(--color-accent));
            border-radius: inherit;
            display: block;
            height: 100%;
        }

        &__usage
        {
            color: var(--color-ink-muted);
        }

        &__warning
        {
            background-color: var(--color-warning-soft);
            border-radius: var(--radius-md);
            color: var(--color-ink);
            display: flex;
            gap: var(--space-2);
            margin: var(--space-3) 0 0;
            padding: var(--space-3);
        }
    }
</style>
