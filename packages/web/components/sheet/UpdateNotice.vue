<script lang="ts" setup>
    import type { SheetChange } from "@byloth/dnd-platform-composer";

    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { VersionCheck } from "@/composables/versions";

    /**
     * The alert of DEC-21 on a stored character's sheet: a package it uses has a newer version, the sheet follows
     * it, and this names what changed on it ("Armor Class: 18 → 19"), with a link to each package's changelog.
     * "Got it" records the new versions, and the alert does not come back for them.
     */
    const props = defineProps<{ check: VersionCheck, name: (id: string) => string }>();
    const emit = defineEmits<{ ok: [] }>();

    const { t } = useI18n();

    const SHOWN = 8;
    const first = computed(() => props.check.changes.slice(0, SHOWN));
    const rest = computed(() => props.check.changes.slice(SHOWN));
    const unknown = computed(() => props.check.updates.some((u) => !u.compared));

    const describe = (change: SheetChange): string =>
    {
        const fresh = t("character.updates.new");
        if (change.before === undefined) { return change.after ? `${change.after} (${fresh})` : fresh; }
        if (change.after === undefined) { return t("character.updates.gone"); }

        return `${change.before} → ${change.after}`;
    };
    const id = useId();
</script>

<template>
    <section class="update-notice" :aria-labelledby="id">
        <h2 :id="id" class="update-notice__title">
            <FontAwesome icon="feather" aria-hidden="true" />
            {{ t("character.updates.title") }}
        </h2>
        <p class="update-notice__text">
            {{ t("character.updates.text") }}
        </p>
        <ul class="update-notice__packages">
            <li v-for="update in check.updates" :key="update.id">
                {{ t("character.updates.package", { name: name(update.id), from: update.from, to: update.to }) }}
                <NuxtLink v-if="update.changelog"
                          class="update-notice__changelog"
                          :to="{ name: 'changelog-id', params: { id: update.id }, query: { from: update.from } }">
                    {{ t("character.updates.changelog", { name: name(update.id) }) }}
                </NuxtLink>
            </li>
        </ul>
        <template v-if="check.changes.length">
            <h3 class="update-notice__subtitle">
                {{ t("character.updates.changed") }}
            </h3>
            <ul class="update-notice__changes">
                <li v-for="(change, i) in first" :key="i">
                    <strong>{{ change.label }}</strong>: {{ describe(change) }}
                </li>
            </ul>
            <details v-if="rest.length" class="update-notice__more">
                <summary class="update-notice__more-toggle">
                    {{ t("character.updates.more", { count: check.changes.length }) }}
                </summary>
                <ul class="update-notice__changes">
                    <li v-for="(change, i) in rest" :key="i">
                        <strong>{{ change.label }}</strong>: {{ describe(change) }}
                    </li>
                </ul>
            </details>
        </template>
        <p v-else-if="unknown" class="update-notice__text">
            {{ t("character.updates.unknown") }}
        </p>
        <p v-else class="update-notice__text">
            {{ t("character.updates.none") }}
        </p>
        <AppButton small @click="emit('ok')">
            {{ t("character.updates.ok") }}
        </AppButton>
    </section>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .update-notice
    {
        @include mixins.card(2);

        border-left: 6px solid var(--color-brass);
        display: grid;
        gap: var(--space-3);
        justify-items: start;
        margin-bottom: var(--space-5);
        padding: var(--space-4) var(--space-5);

        &__title
        {
            align-items: center;
            color: var(--color-brass);
            display: flex;
            font-size: var(--text-xl);
            gap: var(--space-2);
            margin: 0;
        }

        &__text
        {
            margin: 0;
        }

        &__packages,
        &__changes
        {
            display: grid;
            gap: var(--space-1);
            margin: 0;
            padding-left: var(--space-5);
        }

        &__changelog
        {
            color: var(--color-accent);
            font-weight: 700;
            margin-left: var(--space-2);
        }

        &__subtitle
        {
            font-size: var(--text-md);
            margin: 0;
        }

        &__more-toggle
        {
            cursor: pointer;
            font-weight: 700;
            min-height: 44px;
            padding: var(--space-2) 0;
        }
    }
</style>
