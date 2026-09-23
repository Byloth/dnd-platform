<script lang="ts" setup>
    import type { Block, HelpLevel } from "@byloth/dnd-platform-composer";

    import AbilityTable from "@/components/sheet/AbilityTable.vue";
    import ActionCard from "@/components/sheet/ActionCard.vue";
    import AttackTable from "@/components/sheet/AttackTable.vue";
    import CreditsList from "@/components/sheet/CreditsList.vue";
    import FeatureCard from "@/components/sheet/FeatureCard.vue";
    import ReminderList from "@/components/sheet/ReminderList.vue";
    import ResourcePips from "@/components/sheet/ResourcePips.vue";
    import RichText from "@/components/sheet/RichText.vue";
    import SkillList from "@/components/sheet/SkillList.vue";
    import SpellcastingCard from "@/components/sheet/SpellcastingCard.vue";
    import SpellList from "@/components/sheet/SpellList.vue";
    import ValueTile from "@/components/sheet/ValueTile.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";

    /** One block of the section tree, rendered by its kind; the tree decides what, this decides how. */
    defineProps<{ block: Block, helpLevel: HelpLevel }>();

    const { t } = useI18n();

    /** One fixed icon per activation type (docs/13-ux-and-accessibility.md). */
    const ACTIVATION_ICONS: Record<string, string> = {
        "action": "hand-fist",
        "bonus-action": "bolt",
        "reaction": "rotate-left",
        "free": "feather",
        "special": "star"
    };
</script>

<template>
    <div class="sheet-block" :class="`sheet-block--${block.kind}`">
        <ul v-if="block.kind === 'values'" class="sheet-block__tiles">
            <li v-for="item in block.items"
                :key="item.id"
                class="sheet-block__tile">
                <ValueTile :label="item.label"
                           :shown="item.shown"
                           :value="item.value"
                           :raw="item.raw" />
            </li>
        </ul>

        <AbilityTable v-else-if="block.kind === 'abilities'" :rows="block.rows" />

        <SkillList v-else-if="block.kind === 'skills'" :block="block" />

        <ul v-else-if="block.kind === 'text'" class="sheet-block__chips">
            <li v-for="item in block.items"
                :key="item"
                class="sheet-block__chip">
                {{ item }}
            </li>
        </ul>

        <dl v-else-if="block.kind === 'pairs' || block.kind === 'personality'" class="sheet-block__pairs">
            <template v-for="row in block.kind === 'pairs' ? block.rows : block.fields" :key="row.label">
                <dt class="sheet-block__term">
                    {{ row.label }}
                </dt>
                <dd class="sheet-block__definition">
                    {{ row.text }}
                </dd>
            </template>
        </dl>

        <AttackTable v-else-if="block.kind === 'attacks'" :rows="block.rows" />

        <div v-else-if="block.kind === 'actions'" class="sheet-block__actions">
            <section v-for="group in block.groups"
                     :key="group.activation"
                     class="sheet-block__group">
                <h3 class="sheet-block__group-title">
                    <FontAwesome :icon="ACTIVATION_ICONS[group.activation] ?? 'circle'" aria-hidden="true" />
                    {{ group.label }}
                </h3>
                <div class="sheet-block__cards">
                    <ActionCard v-for="item in group.items"
                                :key="item.id"
                                :item="item" />
                </div>
            </section>
            <p v-if="block.base.length" class="sheet-block__base">
                <strong>{{ t("sheetView.actions.base") }}:</strong>
                {{ block.base.map((b) => b.name).join(", ") }}
            </p>
        </div>

        <div v-else-if="block.kind === 'resources'" class="sheet-block__cards">
            <ResourcePips v-for="item in block.items"
                          :key="item.id"
                          :item="item" />
        </div>

        <div v-else-if="block.kind === 'spellcasting'">
            <SpellcastingCard v-for="caster in block.casters"
                              :key="caster.id"
                              :caster="caster" />
        </div>

        <SpellList v-else-if="block.kind === 'spells'" :block="block" />

        <div v-else-if="block.kind === 'features'" class="sheet-block__features">
            <section v-for="group in block.groups"
                     :key="group.origin + group.label"
                     class="sheet-block__group">
                <h3 class="sheet-block__group-title">
                    {{ group.label }}
                </h3>
                <FeatureCard v-for="item in group.items"
                             :key="item.id"
                             :item="item" />
            </section>
        </div>

        <ul v-else-if="block.kind === 'equipment'" class="sheet-block__equipment">
            <li v-for="item in block.items"
                :key="item.id"
                class="sheet-block__item">
                <span class="sheet-block__item-name">{{ item.name }}</span>
                <span v-if="item.quantity > 1" class="sheet-block__quantity">
                    {{ t("sheetView.equipment.quantity", { count: item.quantity }) }}
                </span>
                <span v-for="flag in item.flags"
                      :key="flag"
                      class="sheet-block__flag">{{ flag }}</span>
            </li>
        </ul>

        <ul v-else-if="block.kind === 'conditions'" class="sheet-block__chips">
            <li v-for="item in block.items"
                :key="item"
                class="sheet-block__chip sheet-block__chip--condition">
                {{ item }}
            </li>
        </ul>

        <div v-else-if="block.kind === 'notes'" class="sheet-block__notes">
            <RichText v-if="block.text" :text="block.text" />
            <template v-if="block.open.length">
                <h3 class="sheet-block__group-title">
                    {{ t("sheetView.notes.open") }}
                </h3>
                <ul class="sheet-block__open">
                    <li v-for="choice in block.open"
                        :key="choice.key"
                        class="sheet-block__open-choice">
                        <span>{{ choice.label }}</span>
                        <small>{{ choice.progress }}</small>
                    </li>
                </ul>
            </template>
        </div>

        <CreditsList v-else-if="block.kind === 'credits'" :packages="block.packages" />

        <ReminderList v-else-if="block.kind === 'reminders'" :items="block.items" />
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";

    .sheet-block
    {
        & + &
        {
            margin-top: var(--space-4);
        }

        &__tiles
        {
            display: grid;
            gap: var(--space-3);
            grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__chips
        {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__chip
        {
            background-color: var(--color-surface-sunken);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-round);
            padding: var(--space-1) var(--space-3);

            &--condition
            {
                background-color: var(--color-accent-soft);
                border-color: var(--color-accent);
                color: var(--color-ink);
                font-weight: 700;
            }
        }

        &__pairs
        {
            display: grid;
            gap: var(--space-2) var(--space-4);
            grid-template-columns: minmax(7rem, max-content) 1fr;
            margin: 0;
        }

        &__term
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            font-weight: 700;
        }

        &__definition
        {
            margin: 0;
        }

        &__group
        {
            & + &
            {
                margin-top: var(--space-5);
            }
        }

        &__group-title
        {
            align-items: center;
            color: var(--color-ink-muted);
            display: flex;
            font-family: var(--font-text);
            font-size: var(--text-sm);
            gap: var(--space-2);
            letter-spacing: 0.08em;
            margin-bottom: var(--space-2);
            text-transform: uppercase;
        }

        &__cards
        {
            display: grid;
            gap: var(--space-2);
        }

        &__base
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            margin: var(--space-4) 0 0;
        }

        &__equipment
        {
            display: grid;
            gap: var(--space-1);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__item
        {
            align-items: center;
            border-bottom: 1px dashed var(--color-border);
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2);
            min-height: 40px;
        }

        &__item-name
        {
            flex: 1;
            font-weight: 700;
        }

        &__quantity
        {
            color: var(--color-ink-muted);
            font-variant-numeric: tabular-nums;
        }

        &__flag
        {
            background-color: var(--color-healing-soft);
            border-radius: var(--radius-round);
            color: var(--color-healing);
            font-size: var(--text-xs);
            font-weight: 700;
            padding: 0 var(--space-2);
        }

        &__open
        {
            display: grid;
            gap: var(--space-1);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__open-choice
        {
            display: flex;
            gap: var(--space-2);
            justify-content: space-between;
        }
    }
</style>
