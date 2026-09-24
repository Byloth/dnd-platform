<script lang="ts" setup>
    import { localize } from "@byloth/dnd-platform-composer";
    import type { EquipmentGrant, ItemFilter } from "@byloth/dnd-platform-schema";

    import AppButton from "@/components/ui/AppButton.vue";
    import FontAwesome from "@/components/ui/FontAwesome.vue";
    import { coins, costInCopper, useEquipment } from "@/composables/equipment";
    import type { Slot } from "@/composables/equipment";

    /**
     * Step 7: the starting equipment (docs/phase-1/04-character-creation.md; owner, 2026-09-24). The class's
     * option groups as radios, a filter as a menu of the items it allows; the granted items, each removable; a
     * pack shown with what it holds, since it is unpacked into the equipment; the background's words for what the
     * data does not carry; items added from a shop; what is equipped; the coins, five fields beside the suggested
     * purse (the grants' gold, plus removed items, minus added ones).
     */
    type RefWithQuantity = NonNullable<EquipmentGrant["fixed"]>[number];
    type Coin = "copper" | "silver" | "electrum" | "gold" | "platinum";
    const COINS: Coin[] = ["copper", "silver", "electrum", "gold", "platinum"];

    const { wizard, helpLevel } = useWizardContext();
    const { t, locale } = useI18n();

    const tools = computed(() => (wizard.packageSet ? useEquipment(wizard.packageSet, locale.value) : undefined));
    const character = computed(() => wizard.character);

    const groups = computed(() => (tools.value && character.value ?
        tools.value.groups(character.value, wizard.equipment) :
        []));
    const slots = computed((): Slot[] => (tools.value && character.value ?
        tools.value.slots(character.value, wizard.equipment) :
        []));
    const fixed = computed(() => slots.value.filter((s) => s.key.includes("#fixed#")));
    const inGroup = (group: string): Slot[] => slots.value.filter((s) => s.key.startsWith(`${group}#`));

    const background = computed(() =>
    {
        const id = character.value?.choices.background;
        const entity = id ? wizard.packageSet?.entities.get(id) : undefined;
        const data = entity?.data as { equipment?: EquipmentGrant } | undefined;

        return localize(data?.equipment?.text, locale.value);
    });

    // Words
    const name = (id: string): string => tools.value?.name(id) ?? id;
    const describe = (filter: ItemFilter): string =>
    {
        if (filter.weapon)
        {
            return t(`wizard.equipment.filters.weapon.${filter.weapon}${filter.category ? "Melee" : ""}`);
        }
        if (filter.armor) { return t(`wizard.equipment.filters.armor.${filter.armor}`); }
        const key = filter.category ?? filter.tool ?? "";
        const known = `wizard.equipment.filters.category.${key}`;

        return useNuxtApp().$i18n.te(known) ? t(known) : key.replace(/-/g, " ");
    };
    const refWords = (ref: RefWithQuantity): string =>
    {
        const what = "item" in ref ? name(ref.item) : describe(ref.filter);

        return (ref.quantity ?? 1) > 1 ? t("wizard.equipment.quantity", { quantity: ref.quantity, item: what }) : what;
    };
    const optionWords = (refs: readonly RefWithQuantity[]): string => refs.map(refWords).join(", ");
    const contents = (id: string | undefined): string =>
    {
        const held = id ? tools.value?.item(id)?.contents : undefined;

        return held?.length ?
            held.map((c) => counted(c.item, c.quantity)).join(", ") :
            "";
    };
    const candidates = (slot: Slot): string[] =>
        ("filter" in slot.ref ? tools.value?.candidates(slot.ref.filter) ?? [] : []);
    /** "Torch" or "10 × Torch". */
    const counted = (id: string, quantity: number | undefined): string =>
        ((quantity ?? 1) > 1 ? t("wizard.equipment.quantity", { quantity: quantity, item: name(id) }) : name(id));

    // The equipment as it stands
    const entries = computed(() => character.value?.choices.equipment ?? []);
    const equippable = (id: string): boolean => tools.value?.equippable(id) ?? false;

    // Shop
    const query = ref("");
    const shop = computed(() =>
    {
        const needle = query.value.trim().toLocaleLowerCase();
        if (needle.length < 2) { return []; }

        return (tools.value?.shop() ?? []).filter((id) => name(id).toLocaleLowerCase()
            .includes(needle)).slice(0, 12);
    });
    const price = (id: string): string => money(costInCopper(tools.value?.item(id)));

    // Coins
    const money = (copper: number): string =>
    {
        const { gold, silver, copper: rest } = coins(copper);
        const parts = [
            gold ? t("wizard.equipment.coins.short.gold", { n: gold }) : "",
            silver ? t("wizard.equipment.coins.short.silver", { n: silver }) : "",
            rest ? t("wizard.equipment.coins.short.copper", { n: rest }) : ""

        ].filter(Boolean);

        return parts.length ? parts.join(", ") : t("wizard.equipment.coins.short.gold", { n: 0 });
    };
    const currency = computed(() => character.value?.state.currency ?? {});
    const onCoin = (coin: Coin, event: Event): void =>
    {
        const value = Math.max(0, Math.trunc(Number((event.target as HTMLInputElement).value) || 0));
        wizard.setCoins({ ...currency.value, [coin]: value });
    };

    onMounted(() =>
    {
        if (character.value && !character.value.state.currency) { wizard.useSuggestedCoins(); }
    });
</script>

<template>
    <div class="step-equipment">
        <section v-if="groups.some((g) => g.source === 'class')"
                 class="step-equipment__section"
                 aria-labelledby="equipment-class">
            <h2 id="equipment-class" class="step-equipment__title">
                {{ t("wizard.equipment.fromClass") }}
            </h2>
            <fieldset v-for="(group, g) in groups.filter((x) => x.source === 'class')"
                      :key="group.key"
                      class="step-equipment__group">
                <legend class="step-equipment__legend">
                    {{ t("wizard.equipment.chooseOne", { n: g + 1 }) }}
                </legend>
                <div v-for="(option, o) in group.options"
                     :key="o"
                     class="step-equipment__option"
                     :class="{ 'step-equipment__option--chosen': o === group.chosen }">
                    <label class="step-equipment__option-label">
                        <input class="step-equipment__radio"
                               type="radio"
                               :name="group.key"
                               :checked="o === group.chosen"
                               @change="wizard.chooseOption(group.key, o)" />
                        <span>{{ optionWords(option) }}</span>
                    </label>
                    <template v-if="o === group.chosen">
                        <template v-for="slot in inGroup(group.key)" :key="slot.key">
                            <label v-if="'filter' in slot.ref" class="step-equipment__pick">
                                <span class="step-equipment__pick-label">{{ describe(slot.ref.filter) }}</span>
                                <select class="step-equipment__select"
                                        :value="slot.item"
                                        @change="wizard.pick(slot.key, ($event.target as HTMLSelectElement).value)">
                                    <option v-for="id in candidates(slot)"
                                            :key="id"
                                            :value="id">{{ name(id) }}</option>
                                </select>
                            </label>
                            <p v-if="contents(slot.item)" class="step-equipment__contents">
                                <strong>{{ name(slot.item!) }}:</strong> {{ contents(slot.item) }}
                            </p>
                        </template>
                    </template>
                </div>
            </fieldset>
        </section>

        <section v-if="fixed.length"
                 class="step-equipment__section"
                 aria-labelledby="equipment-fixed">
            <h2 id="equipment-fixed" class="step-equipment__title">
                {{ t("wizard.equipment.granted") }}
            </h2>
            <ul class="step-equipment__list">
                <li v-for="slot in fixed"
                    :key="slot.key"
                    class="step-equipment__row"
                    :class="{ 'step-equipment__row--removed': slot.removed }">
                    <span class="step-equipment__row-main">
                        <label v-if="'filter' in slot.ref" class="step-equipment__pick">
                            <span class="step-equipment__pick-label">{{ describe(slot.ref.filter) }}</span>
                            <select class="step-equipment__select"
                                    :value="slot.item"
                                    :disabled="slot.removed"
                                    @change="wizard.pick(slot.key, ($event.target as HTMLSelectElement).value)">
                                <option v-for="id in candidates(slot)"
                                        :key="id"
                                        :value="id">{{ name(id) }}</option>
                            </select>
                        </label>
                        <span v-else class="step-equipment__row-name">{{ refWords(slot.ref) }}</span>
                        <small class="step-equipment__row-source">
                            {{ t(`wizard.equipment.sources.${slot.source}`) }}
                        </small>
                    </span>
                    <AppButton theme="secondary"
                               outline
                               small
                               @click="wizard.removeSlot(slot.key, !slot.removed)">
                        {{ slot.removed ? t("wizard.equipment.putBack") : t("wizard.equipment.remove") }}
                        <span class="step-equipment__sr">{{ slot.item ? name(slot.item) : "" }}</span>
                    </AppButton>
                </li>
            </ul>
            <p v-if="background" class="step-equipment__note">
                <FontAwesome icon="lightbulb" aria-hidden="true" />
                <span><strong>{{ t("wizard.equipment.backgroundSays") }}</strong> {{ background }}</span>
            </p>
        </section>

        <section class="step-equipment__section" aria-labelledby="equipment-shop">
            <h2 id="equipment-shop" class="step-equipment__title">
                {{ t("wizard.equipment.shop.title") }}
            </h2>
            <label class="step-equipment__pick step-equipment__search">
                <span class="step-equipment__pick-label">{{ t("wizard.equipment.shop.search") }}</span>
                <input v-model="query"
                       class="step-equipment__select"
                       type="search"
                       autocomplete="off" />
            </label>
            <ul v-if="shop.length" class="step-equipment__list">
                <li v-for="id in shop"
                    :key="id"
                    class="step-equipment__row">
                    <span class="step-equipment__row-main">
                        <span class="step-equipment__row-name">{{ name(id) }}</span>
                        <small class="step-equipment__row-source">{{ price(id) }}</small>
                    </span>
                    <AppButton theme="secondary"
                               outline
                               small
                               @click="wizard.addItem(id)">
                        {{ t("wizard.equipment.shop.add") }}
                        <span class="step-equipment__sr">{{ name(id) }}</span>
                    </AppButton>
                </li>
            </ul>
            <ul v-if="wizard.equipment.added.length" class="step-equipment__list">
                <li v-for="added in wizard.equipment.added"
                    :key="added.item"
                    class="step-equipment__row">
                    <span class="step-equipment__row-main">
                        <span class="step-equipment__row-name">
                            {{ counted(added.item, added.quantity) }}
                        </span>
                        <small class="step-equipment__row-source">{{ t("wizard.equipment.sources.added") }}</small>
                    </span>
                    <AppButton theme="secondary"
                               outline
                               small
                               @click="wizard.dropItem(added.item)">
                        {{ t("wizard.equipment.remove") }}
                        <span class="step-equipment__sr">{{ name(added.item) }}</span>
                    </AppButton>
                </li>
            </ul>
        </section>

        <section class="step-equipment__section" aria-labelledby="equipment-carried">
            <h2 id="equipment-carried" class="step-equipment__title">
                {{ t("wizard.equipment.carried") }}
            </h2>
            <ul class="step-equipment__carried">
                <li v-for="entry in entries"
                    :key="entry.item"
                    class="step-equipment__carried-item">
                    <span>
                        {{ counted(entry.item, entry.quantity) }}
                    </span>
                    <label v-if="equippable(entry.item)" class="step-equipment__equip">
                        <input type="checkbox"
                               :checked="entry.equipped"
                               @change="wizard.equip(entry.item, ($event.target as HTMLInputElement).checked)" />
                        {{ t("wizard.equipment.equipped") }}
                        <span class="step-equipment__sr">{{ name(entry.item) }}</span>
                    </label>
                </li>
            </ul>
        </section>

        <section class="step-equipment__section" aria-labelledby="equipment-coins">
            <h2 id="equipment-coins" class="step-equipment__title">
                {{ t("wizard.equipment.coins.title") }}
            </h2>
            <div class="step-equipment__suggestion">
                <p class="step-equipment__suggested">
                    {{ t("wizard.equipment.coins.suggested", { amount: money(wizard.suggestedCopper) }) }}
                </p>
                <p v-if="helpLevel === 'newcomer'" class="step-equipment__hint">
                    {{ t("wizard.equipment.coins.why") }}
                </p>
                <AppButton theme="secondary"
                           outline
                           small
                           @click="wizard.useSuggestedCoins()">
                    {{ t("wizard.equipment.coins.use") }}
                </AppButton>
            </div>
            <div class="step-equipment__coins">
                <label v-for="coin in COINS"
                       :key="coin"
                       class="step-equipment__pick">
                    <span class="step-equipment__pick-label">{{ t(`wizard.equipment.coins.names.${coin}`) }}</span>
                    <input class="step-equipment__select"
                           type="number"
                           inputmode="numeric"
                           min="0"
                           :value="currency[coin] ?? 0"
                           @change="onCoin(coin, $event)" />
                </label>
            </div>
        </section>
    </div>
</template>

<style lang="scss" scoped>
    @use "@/assets/scss/mixins";
    @use "@/assets/scss/variables";

    .step-equipment
    {
        display: grid;
        gap: var(--space-6);

        &__sr
        {
            @include mixins.sr-only;
        }

        &__section
        {
            display: grid;
            gap: var(--space-3);
        }

        &__title
        {
            font-size: var(--text-xl);
            margin: 0;
        }

        &__group
        {
            @include mixins.card(1);

            display: grid;
            gap: var(--space-2);
            margin: 0;
            padding: var(--space-3) var(--space-4) var(--space-4);
        }

        &__legend
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
            font-weight: 700;
            letter-spacing: 0.06em;
            padding: 0 var(--space-1);
            text-transform: uppercase;
        }

        &__option
        {
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            display: grid;
            gap: var(--space-2);
            padding: var(--space-1) var(--space-3);

            &--chosen
            {
                border-color: var(--color-accent);
                box-shadow: 0 0 0 1px var(--color-accent);
                padding-bottom: var(--space-3);
            }
        }

        &__option-label
        {
            @include mixins.tap-target;

            align-items: center;
            cursor: pointer;
            display: flex;
            gap: var(--space-3);
            font-weight: 700;
        }

        &__radio
        {
            accent-color: var(--color-accent);
            flex: none;
            height: 1.2rem;
            width: 1.2rem;
        }

        &__pick
        {
            display: grid;
            gap: var(--space-1);
        }

        &__pick-label
        {
            color: var(--color-ink-muted);
            font-size: var(--text-sm);
        }

        &__select
        {
            @include mixins.tap-target;

            background-color: var(--color-surface-raised);
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-md);
            color: var(--color-ink);
            font: inherit;
            max-width: 22rem;
            padding: 0 var(--space-3);
            width: 100%;
        }

        &__contents
        {
            background-color: var(--color-surface-sunken);
            border-radius: var(--radius-md);
            color: var(--color-ink);
            font-size: var(--text-sm);
            margin: 0;
            padding: var(--space-2) var(--space-3);
        }

        &__list
        {
            display: grid;
            gap: var(--space-2);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__row
        {
            @include mixins.card(1);

            align-items: center;
            display: flex;
            gap: var(--space-3);
            justify-content: space-between;
            padding: var(--space-2) var(--space-3);

            &--removed .step-equipment__row-name
            {
                color: var(--color-ink-muted);
                text-decoration: line-through;
            }
        }

        &__row-main
        {
            display: grid;
            flex: 1;
            gap: var(--space-1);
            min-width: 0;
        }

        &__row-name
        {
            font-weight: 700;
        }

        &__row-source
        {
            color: var(--color-ink-muted);
        }

        &__note
        {
            align-items: flex-start;
            background-color: var(--color-brass-soft);
            border-radius: var(--radius-md);
            display: flex;
            gap: var(--space-2);
            margin: 0;
            padding: var(--space-3) var(--space-4);

            :deep(svg)
            {
                color: var(--color-brass);
                flex: none;
                margin-top: 0.2em;
            }
        }

        &__carried
        {
            display: grid;
            gap: var(--space-1) var(--space-4);
            grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
            list-style: none;
            margin: 0;
            padding: 0;
        }

        &__carried-item
        {
            align-items: center;
            border-bottom: 1px dashed var(--color-border);
            display: flex;
            gap: var(--space-2);
            justify-content: space-between;
            min-height: 44px;
        }

        &__equip
        {
            align-items: center;
            color: var(--color-ink-muted);
            cursor: pointer;
            display: inline-flex;
            font-size: var(--text-sm);
            gap: var(--space-1);
            min-height: 44px;

            input
            {
                accent-color: var(--color-accent);
            }
        }

        &__suggestion
        {
            align-items: center;
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-3);
        }

        &__suggested
        {
            font-weight: 700;
            margin: 0;
        }

        &__hint
        {
            color: var(--color-ink-muted);
            flex-basis: 100%;
            margin: 0;
            order: 3;
        }

        &__coins
        {
            display: grid;
            gap: var(--space-3);
            grid-template-columns: repeat(2, minmax(0, 1fr));

            @include mixins.from(variables.$tablet-min)
            {
                grid-template-columns: repeat(5, minmax(0, 1fr));
            }
        }
    }
</style>
