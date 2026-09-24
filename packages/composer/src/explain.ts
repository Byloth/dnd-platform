/**
 * The newcomer view of a value's provenance (docs/phase-1/03-sheet-composer.md, "The newcomer wording of
 * provenance"): one sentence per applied contribution, then "would apply if…" for the inactive ones, with the
 * condition in words. The sentences are content-independent: labels, names and rule texts come from the
 * packages, the wording from the `sheet.explain` and `sheet.when` keys.
 */

import type { Condition, Contribution } from "@byloth/dnd-platform-engine";

import type { TranslateParams } from "./messages/index.js";

/** What the wording needs from the composer: its translator and name lookups. */
export interface WordingContext
{
    /** A `sheet.*` string (the key without `sheet.`). */
    t(key: string, params?: TranslateParams, fallback?: string): string;
    /** The name of an entity in the sheet's language; the last id segment when unknown. */
    name(id: string): string;
    /** The label of a contribution in the sheet's language. */
    label(contribution: Contribution): string;
    /** The ability behind a ruleset-generated modifier label ("Dexterity modifier" → `dex`), if any. */
    abilityOf(contribution: Contribution): string | undefined;
    /** The score of an ability on the sheet. */
    score(ability: string): number;
    /** The first sentence of the rule text of the contribution's feature, if any. */
    rule(contribution: Contribution): string | undefined;
    /** The `when` of the effect behind a contribution, if it can be found in the packages. */
    condition(contribution: Contribution): Condition | undefined;
    /** Whether the contribution comes from the ruleset itself rather than from an entity. */
    fromRuleset(contribution: Contribution): boolean;
}

/** Every key of the condition language (packages/schema/schemas/condition.schema.json), in words. */
export const CONDITION_KEYS = [
    "level", "classLevel", "hasFeature", "armorCategory", "shield", "wielding", "wieldingOnly", "armorStrengthUnmet",
    "conditionActive", "toggled", "resourceAtLeast", "answer", "knowsSpell", "ability", "proficient", "species",
    "class", "any", "all", "not"

] as const;

const words = (id: string): string => id.replace(/-/g, " ");

function signedText(value: number | string): string
{
    if (typeof value !== "number") { return value; }

    return value < 0 ? `−${-value}` : `+${value}`;
}

function plainText(value: number | string): string
{
    return (typeof value === "number" && value < 0) ? `−${-value}` : String(value);
}

interface WeaponFilter
{
    readonly property?: string;
    readonly category?: string;
    readonly twoHanded?: boolean;
    readonly unarmed?: boolean;
    readonly monkWeapon?: boolean;
    readonly ranged?: boolean;
    readonly melee?: boolean;
    readonly count?: number;
}

function weapon(filter: WeaponFilter, ctx: WordingContext): string
{
    if (filter.unarmed) { return ctx.t("when.weapon.unarmed"); }

    const traits = [
        filter.category !== undefined ? ctx.t(`when.weapon.${filter.category}`, undefined, filter.category) : undefined,
        filter.twoHanded === true ? ctx.t("when.weapon.twoHanded") : undefined,
        filter.ranged === true ? ctx.t("when.weapon.ranged") : undefined,
        filter.melee === true ? ctx.t("when.weapon.melee") : undefined,
        filter.monkWeapon === true ? ctx.t("when.weapon.monk") : undefined,
        filter.property !== undefined ? words(filter.property) : undefined

    ].filter((t) => t !== undefined);
    const one = traits.length === 0 ?
        ctx.t("when.weapon.any") :
        ctx.t("when.weapon.with", { traits: traits.join(", ") });

    return filter.count !== undefined ? ctx.t("when.weapon.count", { count: filter.count, weapon: one }) : one;
}

function range(key: string, value: { min?: number, max?: number }, params: TranslateParams, ctx: WordingContext): string
{
    if (value.min !== undefined && value.max !== undefined)
    {
        return ctx.t(`when.${key}.range`, { ...params, min: value.min, max: value.max });
    }
    if (value.min !== undefined) { return ctx.t(`when.${key}.min`, { ...params, min: value.min }); }
    if (value.max !== undefined) { return ctx.t(`when.${key}.max`, { ...params, max: value.max }); }

    return ctx.t(`when.${key}.any`, params);
}

function clause(key: string, value: unknown, ctx: WordingContext): string
{
    switch (key)
    {
        case "any": return (value as Condition[]).map((c) => conditionWords(c, ctx)).join(` ${ctx.t("when.or")} `);
        case "all": return (value as Condition[]).map((c) => conditionWords(c, ctx)).join(` ${ctx.t("when.and")} `);
        case "not":
        {
            // The two negations the content uses most read better said directly.
            const inner = value as Condition;
            if (Object.keys(inner).length === 1 && inner.armorCategory === "none") { return ctx.t("when.armorAny"); }
            if (Object.keys(inner).length === 1 && typeof inner.shield === "boolean")
            {
                return ctx.t(inner.shield ? "when.noShield" : "when.shield");
            }

            return ctx.t("when.not", { condition: conditionWords(inner, ctx) });
        }
        case "level": return range("level", value as { min?: number, max?: number }, {}, ctx);
        case "classLevel":
        {
            const v = value as { class: string, min?: number, max?: number };

            return range("classLevel", v, { class: ctx.name(v.class) }, ctx);
        }
        case "hasFeature": return ctx.t("when.hasFeature", { feature: ctx.name(value as string) });
        case "armorCategory":
            return value === "none" ?
                ctx.t("when.armorNone") :
                ctx.t("when.armor", {
                    category: ctx.t(`when.armorCategories.${String(value)}`, undefined, String(value))
                });
        case "shield": return ctx.t(value === true ? "when.shield" : "when.noShield");
        case "wielding": return ctx.t("when.wielding", { weapon: weapon(value as WeaponFilter, ctx) });
        case "wieldingOnly": return ctx.t("when.wieldingOnly", { weapon: weapon(value as WeaponFilter, ctx) });
        case "armorStrengthUnmet": return ctx.t(value === true ? "when.armorStrengthUnmet" : "when.armorStrengthMet");
        case "conditionActive": return ctx.t("when.conditionActive", { condition: ctx.name(value as string) });
        case "toggled": return ctx.t("when.toggled", { state: words(value as string) });
        case "resourceAtLeast":
        {
            const v = value as { resource: string, amount: number };

            return ctx.t("when.resourceAtLeast", { amount: v.amount, resource: words(v.resource) });
        }
        case "answer":
        {
            const v = value as { choice: string, is: string };

            return ctx.t("when.answer", { choice: words(v.choice), option: ctx.name(v.is) });
        }
        case "knowsSpell": return ctx.t("when.knowsSpell", { spell: ctx.name(value as string) });
        case "ability":
        {
            const v = value as { ability: string, min: number };

            const ability = ctx.t(`abilities.${v.ability}`, undefined, v.ability);

            return ctx.t("when.ability", { ability: ability, min: v.min });
        }
        case "proficient":
        {
            const v = value as { type: string, item: string };

            return ctx.t("when.proficient", { item: words(v.item) });
        }
        case "species": return ctx.t("when.species", { species: ctx.name(value as string) });
        case "class": return ctx.t("when.class", { class: ctx.name(value as string) });
        default: return ctx.t("when.fallback", { condition: words(key) });
    }
}

/** A condition in words; several keys in one condition all hold. */
export function conditionWords(condition: Condition, ctx: WordingContext): string
{
    return Object.entries(condition)
        .map(([key, value]) => clause(key, value, ctx))
        .join(` ${ctx.t("when.and")} `);
}

/** The newcomer sentence of one applied contribution. */
function sentence(c: Contribution, ctx: WordingContext): string
{
    const label = ctx.label(c);
    // The player's own numbers: the score they chose and the adjustment they typed (the engine's ability base).
    const own = (c.source.package === "") && (c.source.entity === undefined) ? c.label["en"] : undefined;
    if ((own === "Base score") && (c.kind === "base")) { return ctx.t("explain.score", { value: plainText(c.value) }); }
    if ((own === "Adjustment") && (c.kind === "add"))
    {
        return ctx.t("explain.adjustment", { value: signedText(c.value) });
    }
    switch (c.kind)
    {
        case "base":
            // The ruleset's plain starting value ("Base") reads as everyone's; a labelled one names its origin.
            return ctx.fromRuleset(c) && ctx.abilityOf(c) === undefined && ["", "base"].includes(label.toLowerCase()) ?
                ctx.t("explain.base", { value: plainText(c.value) }) :
                baseOrAbility(c, ctx);
        case "add":
        {
            const ability = ctx.abilityOf(c);
            if (ability !== undefined) { return abilitySentence(c, ability, ctx); }
            if (ctx.fromRuleset(c) && /proficiency/i.test(label))
            {
                return ctx.t("explain.proficiency", { value: signedText(c.value) });
            }

            return ctx.t("explain.add", { label: label, value: signedText(c.value) });
        }
        case "set": return ctx.t("explain.set", { label: label, value: plainText(c.value) });
        case "set-formula":
        {
            const rule = ctx.rule(c) ?? c.formula ?? "";

            return ctx.t("explain.setFormula", { label: label, rule: rule, value: plainText(c.value) });
        }
        case "mul": return ctx.t("explain.mul", { label: label, value: plainText(c.value) });
        case "min": return ctx.t("explain.min", { label: label, value: plainText(c.value) });
        case "max": return ctx.t("explain.max", { label: label, value: plainText(c.value) });
        default: return ctx.t("explain.patch", { label: label, value: plainText(c.value) });
    }
}

function abilitySentence(c: Contribution, ability: string, ctx: WordingContext): string
{
    const name = ctx.t(`abilities.${ability}`, undefined, ability);

    return ctx.t("explain.ability", { ability: name, score: ctx.score(ability), value: signedText(c.value) });
}

function baseOrAbility(c: Contribution, ctx: WordingContext): string
{
    const ability = ctx.abilityOf(c);
    if (ability !== undefined) { return abilitySentence(c, ability, ctx); }

    return ctx.t("explain.baseFrom", { label: ctx.label(c), value: plainText(c.value) });
}

/** The newcomer sentences of a provenance: applied contributions, then the ones that would apply. */
export function newcomerWording(
    provenance: readonly Contribution[], ctx: WordingContext
): { readonly newcomer: string[], readonly notes: string[] }
{
    const newcomer = provenance.filter((c) => c.applied).map((c) => sentence(c, ctx));
    const notes = provenance.filter((c) => !c.applied).map((c) =>
    {
        const when = ctx.condition(c);

        return when === undefined ?
            ctx.t("explain.inactiveUnknown", { label: ctx.label(c) }) :
            ctx.t("explain.inactive", { label: ctx.label(c), condition: conditionWords(when, ctx) });
    });

    return { newcomer: newcomer, notes: notes };
}

/** The first sentence of a text (first non-empty paragraph, up to the first `.`, `!` or `?`). */
export function firstSentence(text: string): string
{
    const paragraph = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim())
        .find((p) => p !== "") ?? "";

    return /^(.*?[.!?])(\s|$)/.exec(paragraph)?.[1] ?? paragraph;
}
