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
    const { browser, operatingSystem } = SystemInfo.Current;
    const evicts = (browser.name === "Safari") || (operatingSystem.name === "iOS");
</script>

<template>
    <div id="packages-page" class="page container">
        <h1>{{ t("packages.heading") }}</h1>
        <p>{{ t("packages.intro") }}</p>

        <section aria-labelledby="packages-load-heading">
            <h2 id="packages-load-heading">
                {{ t("packages.load.heading") }}
            </h2>
            <p>{{ t("packages.load.hint") }}</p>
            <label class="btn btn-primary file-button">
                <FontAwesome icon="file-arrow-up" aria-hidden="true" />
                {{ t("packages.load.choose") }}
                <input type="file"
                       class="visually-hidden"
                       accept=".zip,.json"
                       multiple
                       @change="onFiles" />
            </label>

            <ul v-if="store.loads.length" class="loads">
                <li v-for="entry in store.loads"
                    :key="entry.id"
                    class="load"
                    :class="entry.status">
                    <p role="status">
                        <template v-if="entry.status === 'checking'">
                            <FontAwesome icon="spinner"
                                         class="fa-spin"
                                         aria-hidden="true" />
                            {{ t("packages.load.checking", { file: entry.fileName }) }}
                        </template>
                        <template v-else-if="entry.status === 'done' && entry.manifest">
                            <FontAwesome icon="circle-check" aria-hidden="true" />
                            {{ t("packages.load.done", {
                                name: name(entry.manifest),
                                version: entry.manifest.version
                            }) }}
                        </template>
                        <template v-else-if="entry.status === 'refused'">
                            <FontAwesome icon="circle-xmark" aria-hidden="true" />
                            {{ t("packages.load.refused", { file: entry.fileName }) }}
                            {{ t("packages.load.refusedNext") }}
                        </template>
                        <template v-else>
                            <FontAwesome icon="circle-xmark" aria-hidden="true" />
                            {{ t("packages.load.failed", { file: entry.fileName }) }}
                        </template>
                    </p>
                    <details v-if="entry.diagnostics.length">
                        <summary>
                            {{ t(entry.status === "refused" ? "packages.load.problems" : "packages.load.remarks",
                                 entry.diagnostics.length) }}
                        </summary>
                        <ul class="diagnostics">
                            <li v-for="(d, i) in entry.diagnostics" :key="i">
                                <code>{{ d.code }}</code> <code>{{ d.file }}</code> <code>{{ d.path }}</code>
                                {{ d.message }}
                            </li>
                        </ul>
                    </details>
                    <details v-if="entry.message">
                        <summary>{{ t("packages.load.problems", 1) }}</summary>
                        <p><code>{{ entry.message }}</code></p>
                    </details>
                    <AppButton v-if="entry.status !== 'checking'"
                               small
                               outline
                               theme="secondary"
                               @click="store.dismissLoad(entry.id)">
                        {{ t("packages.load.dismiss") }}
                    </AppButton>
                </li>
            </ul>
        </section>

        <section aria-labelledby="packages-list-heading">
            <h2 id="packages-list-heading">
                {{ t("packages.list.heading") }}
            </h2>
            <ul class="package-list">
                <li v-for="entry in packages"
                    :key="keyOf(entry)"
                    class="package"
                    :aria-labelledby="`package-${entry.manifest.id}`">
                    <h3 :id="`package-${entry.manifest.id}`">
                        {{ name(entry.manifest) }}
                    </h3>
                    <p class="origin">
                        <template v-if="entry.origin === 'site'">
                            <FontAwesome icon="globe" aria-hidden="true" />
                            {{ t("packages.list.site") }}
                        </template>
                        <template v-else>
                            <FontAwesome icon="hard-drive" aria-hidden="true" />
                            {{ t("packages.list.file", { file: entry.fileName ?? entry.manifest.id }) }}
                        </template>
                    </p>
                    <p v-if="entry.manifest.redistributable === false" class="private">
                        <FontAwesome icon="lock" aria-hidden="true" />
                        {{ t("packages.list.private") }}
                    </p>
                    <dl>
                        <dt>{{ t("packages.list.id") }}</dt>
                        <dd><code>{{ entry.manifest.id }}</code></dd>
                        <dt>{{ t("packages.list.version") }}</dt>
                        <dd>{{ entry.manifest.version }}</dd>
                        <dt>{{ t("packages.list.kind") }}</dt>
                        <dd>{{ t(`packages.kind.${entry.manifest.kind}`) }}</dd>
                        <dt>{{ t("packages.list.content") }}</dt>
                        <dd>{{ t("packages.list.entries", entry.entities) }}</dd>
                        <dt>{{ t("packages.list.sources") }}</dt>
                        <dd>
                            <ul class="sources">
                                <li v-for="source in entry.manifest.sources" :key="source.id">
                                    {{ t("packages.list.source", { title: source.title, license: source.license }) }}
                                </li>
                            </ul>
                        </dd>
                    </dl>

                    <template v-if="entry.origin === 'file'">
                        <p v-if="inUse[keyOf(entry)]?.length" role="alert">
                            {{ t("packages.remove.inUse", {
                                name: name(entry.manifest),
                                characters: inUse[keyOf(entry)]!.join(", ")
                            }) }}
                        </p>
                        <div v-if="confirming === keyOf(entry)"
                             class="confirm"
                             role="group">
                            <p>{{ t("packages.remove.confirm", { name: name(entry.manifest) }) }}</p>
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
                        <AppButton v-else
                                   outline
                                   theme="danger"
                                   @click="confirming = keyOf(entry)">
                            <FontAwesome icon="trash" aria-hidden="true" />
                            {{ t("packages.remove.action") }}
                        </AppButton>
                    </template>
                </li>
            </ul>
        </section>

        <section aria-labelledby="packages-storage-heading">
            <h2 id="packages-storage-heading">
                {{ t("packages.storage.heading") }}
            </h2>
            <p>{{ persistenceText }}</p>
            <p v-if="store.persistence?.usage !== undefined && store.persistence?.quota !== undefined">
                {{ t("packages.storage.usage", {
                    used: bytes(store.persistence.usage),
                    quota: bytes(store.persistence.quota)
                }) }}
            </p>
            <p v-if="evicts" class="warning">
                <FontAwesome icon="triangle-exclamation" aria-hidden="true" />
                {{ t("packages.storage.safari") }}
            </p>
        </section>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/variables";

    #packages-page
    {
        min-height: 100dvh;
        padding-bottom: 2em;
        padding-top: calc(var(--navigation-bar-height) + 1em);

        section
        {
            margin-top: 2em;
        }

        .file-button
        {
            align-items: center;
            display: inline-flex;
            gap: 0.5em;
            min-height: 44px;

            &:focus-within
            {
                outline: 3px solid variables.$accent;
                outline-offset: 2px;
            }
        }

        .loads,
        .package-list
        {
            list-style: none;
            margin: 1em 0px 0px;
            padding: 0px;
        }

        .load,
        .package
        {
            background-color: var(--bs-body-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 0.5em;
            margin-bottom: 1em;
            padding: 1em;
        }

        .load.refused,
        .load.failed
        {
            border-left: 0.5em solid variables.$danger;
        }
        .load.done
        {
            border-left: 0.5em solid variables.$success;
        }

        .diagnostics
        {
            font-size: 0.875em;
            overflow-wrap: anywhere;
        }

        .package
        {
            h3
            {
                font-size: 1.25em;
                margin-bottom: 0.25em;
            }

            .origin,
            .private
            {
                margin-bottom: 0.5em;
            }

            dl
            {
                display: grid;
                gap: 0.25em 1em;
                grid-template-columns: max-content 1fr;
            }

            dd
            {
                margin: 0px;
            }

            .sources
            {
                list-style: none;
                margin: 0px;
                padding: 0px;
            }

            .btn
            {
                min-height: 44px;
                margin-right: 0.5em;
            }
        }

        .warning
        {
            border-left: 0.5em solid variables.$warning;
            padding-left: 0.75em;
        }
    }
</style>
