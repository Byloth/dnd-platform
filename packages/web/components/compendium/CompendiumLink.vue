<script lang="ts" setup>
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import type { CompendiumKind } from "@/composables/compendium";
    import { useCompendiumLinkFrom } from "@/composables/compendium-link";

    /**
     * A link to an entry of the compendium: in place on the sheet, in a new tab inside the wizard, said aloud and
     * marked with an icon then. Its text is the slot: an entry's name, or "Read in the compendium".
     */
    const props = defineProps<{ kind: CompendiumKind, id: string }>();

    const { t } = useI18n();
    const from = useCompendiumLinkFrom();
    const newTab = from === "wizard";

    const onClick = (): void => useAnalytics().track("compendium-link", { from: from, kind: props.kind });
</script>

<template>
    <NuxtLink class="compendium-link"
              :to="{ name: 'compendium-kind-id', params: { kind: kind, id: id } }"
              :target="newTab ? '_blank' : undefined"
              :rel="newTab ? 'noopener' : undefined"
              @click="onClick">
        <slot></slot>
        <template v-if="newTab">
            <FontAwesome class="compendium-link__icon"
                         icon="arrow-up-right-from-square"
                         aria-hidden="true" />
            <span class="compendium-link__sr">({{ t("compendium.newTab") }})</span>
        </template>
    </NuxtLink>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .compendium-link
    {
        color: var(--color-accent);
        text-decoration: none;
        text-underline-offset: 0.15em;

        &:hover
        {
            text-decoration: underline;
        }

        &:focus-visible
        {
            @include mixins.focus-ring;
        }

        &__icon
        {
            font-size: 0.75em;
            margin-left: var(--space-1);
        }

        &__sr
        {
            @include mixins.sr-only;
        }
    }
</style>
