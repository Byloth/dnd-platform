<script lang="ts" setup>
    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { SyncChange } from "@/composables/working-directory";

    /**
     * The working folder on the packages page (docs/phase-1/02-content-and-character-stores.md, M1.8): choose a
     * folder, see which one is connected and when it was last synchronised, synchronise it now, disconnect; a bar
     * while a sync runs, then its changes. Where the browser cannot use a folder, one sentence says which can.
     */
    const { t, locale } = useI18n();
    const directory = useWorkingDirectory();

    const error = ref<string>();
    const run = async (action: () => Promise<unknown>): Promise<void> =>
    {
        error.value = undefined;
        try { await action(); }
        catch (e) { error.value = (e as Error).message; }
    };

    const connect = () => run(directory.connect);
    const reconnect = () => run(directory.reconnect);
    const reload = () => run(directory.reload);
    const disconnect = () => run(directory.disconnect);

    const progress = computed(() => directory.progress.value);
    const failure = computed((): string | undefined => error.value ?? directory.failure.value);
    const lastSync = computed((): string | undefined =>
    {
        const at = directory.report.value?.at;

        return at ? new Intl.DateTimeFormat(locale.value, { timeStyle: "short" }).format(new Date(at)) : undefined;
    });

    const ACTION_KEYS: Readonly<Record<SyncChange["action"], string>> = {
        "imported": "imported",
        "updated-here": "updatedHere",
        "updated-folder": "updatedFolder",
        "written": "written",
        "removed-folder": "removedFolder",
        "refused": "refused"
    };
    const describe = (change: SyncChange): string =>
        t(`workingDirectory.report.${ACTION_KEYS[change.action]}`, { name: change.name });
</script>

<template>
    <div class="working-directory">
        <p class="working-directory__intro">
            {{ t("workingDirectory.intro") }}
        </p>

        <p v-if="directory.status.value === 'unsupported'" class="working-directory__unsupported">
            {{ t("workingDirectory.unsupported") }}
        </p>

        <div v-else-if="directory.status.value === 'none'" class="working-directory__actions">
            <AppButton @click="connect">
                <FontAwesome icon="folder-open" aria-hidden="true" />
                {{ t("workingDirectory.connect") }}
            </AppButton>
        </div>

        <template v-else-if="directory.status.value === 'needs-permission'">
            <p class="working-directory__state">
                {{ t("workingDirectory.needsPermission", { name: directory.folder.value }) }}
            </p>
            <div class="working-directory__actions">
                <AppButton @click="reconnect">
                    <FontAwesome icon="folder-open" aria-hidden="true" />
                    {{ t("workingDirectory.reconnect", { name: directory.folder.value }) }}
                </AppButton>
                <AppButton outline
                           theme="secondary"
                           @click="disconnect">
                    {{ t("workingDirectory.disconnect") }}
                </AppButton>
            </div>
        </template>

        <template v-else>
            <p class="working-directory__state">
                <FontAwesome icon="folder-open" aria-hidden="true" />
                {{ t("workingDirectory.connected", { name: directory.folder.value }) }}
                <span v-if="lastSync" class="working-directory__time">
                    {{ t("workingDirectory.lastSync", { time: lastSync }) }}
                </span>
            </p>
            <div class="working-directory__actions">
                <AppButton :disabled="directory.syncing.value" @click="reload">
                    <FontAwesome icon="rotate" aria-hidden="true" />
                    {{ t("workingDirectory.reload") }}
                </AppButton>
                <AppButton outline
                           theme="secondary"
                           @click="disconnect">
                    <FontAwesome icon="link-slash" aria-hidden="true" />
                    {{ t("workingDirectory.disconnect") }}
                </AppButton>
            </div>
            <p class="working-directory__hint">
                {{ t("workingDirectory.reloadHint") }} {{ t("workingDirectory.disconnected") }}
            </p>
        </template>

        <div v-if="directory.syncing.value" class="working-directory__syncing">
            <p id="working-directory-syncing"
               class="working-directory__syncing-label"
               role="status">
                <FontAwesome icon="rotate"
                             class="working-directory__spinner"
                             aria-hidden="true" />
                {{ t("workingDirectory.syncing") }}
            </p>
            <div class="working-directory__progress">
                <progress class="working-directory__bar"
                          aria-labelledby="working-directory-syncing"
                          :max="progress.total || undefined"
                          :value="progress.total ? progress.done : undefined"></progress>
                <span v-if="progress.total"
                      class="working-directory__count"
                      aria-hidden="true">
                    {{ t("workingDirectory.progress", { done: progress.done, total: progress.total }) }}
                </span>
            </div>
        </div>

        <p v-if="failure"
           class="working-directory__failure"
           role="alert">
            <FontAwesome icon="triangle-exclamation" aria-hidden="true" />
            {{ t("workingDirectory.failure", { message: failure }) }}
        </p>

        <section v-if="directory.report.value && !directory.syncing.value"
                 class="working-directory__report"
                 aria-labelledby="working-directory-report">
            <h3 id="working-directory-report" class="working-directory__report-title">
                {{ t("workingDirectory.report.heading") }}
            </h3>
            <p v-if="!directory.report.value.changes.length">
                {{ t("workingDirectory.report.nothing") }}
            </p>
            <ul v-else class="working-directory__changes">
                <li v-for="(change, index) in directory.report.value.changes"
                    :key="index"
                    class="working-directory__change"
                    :class="{ 'working-directory__change--refused': change.action === 'refused' }">
                    {{ describe(change) }}
                    <ul v-if="change.problems?.length" class="working-directory__problems">
                        <li v-for="problem in change.problems" :key="problem">
                            {{ problem }}
                        </li>
                    </ul>
                </li>
            </ul>
        </section>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    @keyframes spin
    {
        to { transform: rotate(360deg); }
    }

    .working-directory
    {
        @include mixins.card(1);

        max-width: 46rem;
        padding: var(--space-5);

        &__intro,
        &__hint,
        &__time
        {
            color: var(--color-ink-muted);
        }

        &__state
        {
            font-weight: 600;
        }

        &__time
        {
            display: block;
            font-weight: 400;
        }

        &__actions
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-3);
            margin: var(--space-4) 0;
        }

        &__syncing
        {
            margin: var(--space-4) 0;
        }

        &__syncing-label
        {
            margin-bottom: var(--space-2);
        }

        &__progress
        {
            align-items: center;
            display: flex;
            gap: var(--space-3);
        }

        &__bar
        {
            appearance: none;
            background: var(--color-surface-sunken);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-round);
            flex: 1;
            height: 0.75rem;
            overflow: hidden;

            &::-webkit-progress-bar
            {
                background: transparent;
            }

            &::-webkit-progress-value
            {
                background: var(--color-accent);
                border-radius: var(--radius-round);
                transition: width var(--duration) ease-out;
            }

            &::-moz-progress-bar
            {
                background: var(--color-accent);
                border-radius: var(--radius-round);
            }
        }

        &__count
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }

        &__spinner
        {
            animation: spin 1s linear infinite;

            @media (prefers-reduced-motion: reduce) { animation: none; }
        }

        &__failure
        {
            color: var(--color-damage);
        }

        &__report
        {
            border-top: 1px solid var(--color-border);
            margin-top: var(--space-4);
            padding-top: var(--space-4);
        }

        &__report-title
        {
            font-size: var(--text-md);
        }

        &__changes,
        &__problems
        {
            margin: var(--space-2) 0 0;
            padding-left: var(--space-5);
        }

        &__change--refused
        {
            color: var(--color-damage);
        }

        &__problems
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
        }
    }
</style>
