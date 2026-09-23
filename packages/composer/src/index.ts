/**
 * Sheet composer (docs/phase-1/03-sheet-composer.md): a computed sheet, the
 * character it was derived from and the package set it was derived with →
 * a *section tree*, plain data that every rendering of the sheet starts
 * from (the CLI text renderer, the web sheet, the print mode).
 *
 * Pure: no I/O, no framework. The composer computes nothing the engine did
 * not: it groups, labels, localises and attaches provenance. Every number
 * in the tree is a `DerivedValue` copied from the sheet or a count of
 * things in the sheet. Sections follow `sheet.sections`; a section with no
 * content has no blocks.
 */

import type { LocalizedString } from "@byloth/dnd-platform-schema";
import type { PackageSet } from "@byloth/dnd-platform-loader";
import type {
    ActionView, AttackView, Character, ComputedSheet, Contribution, DerivedValue, Provenance, SpellView
} from "@byloth/dnd-platform-engine";

// ---- options ------------------------------------------------------------------------

export interface ComposeOptions
{
    readonly character: Character;
    readonly packages: PackageSet;
    /** Language of every label; default the sheet's. */
    readonly language?: string;
}

// ---- the tree -------------------------------------------------------------------------

export interface SectionTree
{
    readonly sections: readonly Section[];
    readonly warnings: readonly WarningItem[];
}
export interface Section
{
    readonly id: string;
    /** Localised title; empty for the identity section, which has none. */
    readonly title: string;
    readonly blocks: readonly Block[];
}
export interface WarningItem { readonly code: string, readonly message: string }

/** One line of an explanation: `+3  Dexterity modifier  ← srd51`. */
export interface ExplanationLine
{
    readonly shown: string;
    readonly label: string;
    readonly source: string;
    readonly formula?: string;
    readonly applied: boolean;
}
export interface Explanation
{
    /** The applied contributions, in the sheet's wording. */
    readonly regular: readonly ExplanationLine[];
    /** Every contribution, inactive ones included, with their formulas. */
    readonly expert: readonly ExplanationLine[];
    readonly provenance: Provenance;
}

export interface ValueItem
{
    readonly id: string;
    readonly label: string;
    readonly shown: string;
    readonly value?: DerivedValue;
    /** Present when the value has more than one applied contribution. */
    readonly explain?: Explanation;
}
export interface ClassRef
{
    readonly id: string;
    readonly name: string;
    readonly levels: number;
    readonly subclass?: string;
}
export interface IdentityBlock
{
    readonly kind: "identity";
    readonly name: string;
    readonly level: number;
    /** `Feline (Puma)`, `Monk 3, Way of Shadow`, `Acolyte`, alignment: the non-empty ones. */
    readonly parts: readonly string[];
    readonly species?: string;
    readonly subspecies?: string;
    readonly classes: readonly ClassRef[];
    readonly background?: string;
    readonly alignment?: string;
    readonly ruleset: string;
    readonly packages: readonly { readonly id: string, readonly version: string }[];
}
export interface ValuesBlock { readonly kind: "values", readonly items: readonly ValueItem[] }
export interface AbilityRow
{
    readonly id: string;
    readonly name: string;
    readonly score: string;
    readonly modifier: string;
    readonly save: string;
    readonly proficient: boolean;
    readonly values: { readonly score?: DerivedValue, readonly modifier?: DerivedValue, readonly save?: DerivedValue };
}
export interface AbilitiesBlock { readonly kind: "abilities", readonly rows: readonly AbilityRow[] }
export interface SkillRow
{
    readonly id: string;
    readonly name: string;
    readonly ability: string;
    readonly mark: "untrained" | "proficient" | "expertise";
    readonly bonus: string;
    readonly value?: DerivedValue;
}
export interface ProficiencyGroup { readonly type: string, readonly label: string, readonly items: readonly string[] }
export interface SkillsBlock
{
    readonly kind: "skills";
    readonly rows: readonly SkillRow[];
    readonly proficiencies: readonly ProficiencyGroup[];
}
/** Short facts joined by the renderer (senses, passive scores). */
export interface TextBlock { readonly kind: "text", readonly items: readonly string[] }
export interface LabelledText { readonly label: string, readonly text: string }
export interface PairsBlock { readonly kind: "pairs", readonly rows: readonly LabelledText[] }
export interface AttackRow
{
    readonly id: string;
    readonly name: string;
    readonly toHit: string;
    readonly damage: string;
    readonly notes: readonly string[];
    readonly attack: AttackView;
}
export interface AttacksBlock { readonly kind: "attacks", readonly rows: readonly AttackRow[] }
export interface ActionItem
{
    readonly id: string;
    readonly name: string;
    readonly cost: string;
    readonly details: readonly string[];
    readonly available: boolean;
    readonly text?: string;
    readonly action: ActionView;
}
export interface ActionGroup
{
    readonly activation: string;
    readonly label: string;
    readonly items: readonly ActionItem[];
}
export interface ActionsBlock
{
    readonly kind: "actions";
    readonly groups: readonly ActionGroup[];
    /** The ruleset's base actions (Attack, Dash…), by name. */
    readonly base: readonly { readonly id: string, readonly name: string }[];
}
export interface ResourceItem
{
    readonly id: string;
    readonly name: string;
    readonly current: number | null;
    readonly max: number | string;
    readonly shownMax: string;
    /** True when the resource is small enough to show as pips. */
    readonly pips: boolean;
    readonly recharge: string;
    readonly explain?: Explanation;
}
export interface ResourcesBlock { readonly kind: "resources", readonly items: readonly ResourceItem[] }
export interface SlotItem { readonly label: string, readonly current: number, readonly max: number }
export interface CasterItem
{
    readonly id: string;
    readonly name: string;
    readonly ability: string;
    readonly parts: readonly string[];
    readonly known: readonly string[];
    readonly slots: readonly SlotItem[];
}
export interface SpellcastingBlock { readonly kind: "spellcasting", readonly casters: readonly CasterItem[] }
export interface SpellItem
{
    readonly id: string;
    readonly name: string;
    /** Name with its marks: `Bless* ©`, `Darkness (2 ki)`. */
    readonly label: string;
    readonly spell: SpellView;
}
export interface SpellLevel { readonly level: number, readonly label: string, readonly items: readonly SpellItem[] }
export interface SpellsBlock
{
    readonly kind: "spells";
    readonly levels: readonly SpellLevel[];
}
export interface FeatureItem
{
    readonly id: string;
    readonly name: string;
    readonly level?: number;
    /** The full text; renderers summarise it. */
    readonly text: string;
}
export interface FeatureGroup
{
    readonly origin: string;
    readonly label: string;
    readonly items: readonly FeatureItem[];
}
export interface FeaturesBlock
{
    readonly kind: "features";
    readonly groups: readonly FeatureGroup[];
}
export interface EquipmentItem
{
    readonly id: string;
    readonly name: string;
    readonly quantity: number;
    readonly flags: readonly string[];
}
export interface EquipmentBlock { readonly kind: "equipment", readonly items: readonly EquipmentItem[] }
export interface PersonalityBlock { readonly kind: "personality", readonly fields: readonly LabelledText[] }
export interface ConditionsBlock { readonly kind: "conditions", readonly items: readonly string[] }
export interface NotesBlock
{
    readonly kind: "notes";
    readonly text?: string;
    readonly open: readonly { readonly key: string, readonly label: string, readonly progress: string }[];
}
export interface CreditItem
{
    readonly id: string;
    readonly version: string;
    readonly name: string;
    readonly sources: readonly { readonly title: string, readonly line: string }[];
}
export interface CreditsBlock { readonly kind: "credits", readonly packages: readonly CreditItem[] }

export type Block =
    IdentityBlock | ValuesBlock | AbilitiesBlock | SkillsBlock | TextBlock | PairsBlock | AttacksBlock | ActionsBlock |
    ResourcesBlock | SpellcastingBlock | SpellsBlock | FeaturesBlock | EquipmentBlock | PersonalityBlock |
    ConditionsBlock | NotesBlock | CreditsBlock;

// ---- wording ------------------------------------------------------------------------

const ABILITY_NAMES: Record<string, string> = {
    str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma"
};
const ACTIVATION_NAMES: Record<string, string> = {
    "action": "Actions", "bonus-action": "Bonus actions", "reaction": "Reactions", "free": "Free", "special": "Special"
};
const ORIGIN_NAMES: Record<string, string> = {
    species: "Species",
    subspecies: "Subspecies",
    class: "Class",
    subclass: "Subclass",
    background: "Background",
    feat: "Feats",
    item: "Items",
    condition: "Conditions",
    option: "Options",
    spell: "Active spells",
    custom: "Custom effects"
};
const ORIGIN_ORDER = Object.keys(ORIGIN_NAMES);
const OWNED_ORIGINS = new Set(["class", "subclass", "species", "subspecies", "background"]);
const ORDINALS = ["Cantrips", "1st level", "2nd level", "3rd level", "4th level", "5th level", "6th level", "7th level",
    "8th level", "9th level"];
const SECTION_TITLES: Record<string, string> = {
    identity: "",
    core: "Core",
    abilities: "Abilities",
    skills: "Skills",
    senses: "Senses",
    combat: "Combat",
    attacks: "Attacks",
    actions: "Actions",
    resources: "Resources",
    spellcasting: "Spellcasting",
    spells: "Spells",
    features: "Features & traits",
    equipment: "Equipment",
    personality: "Personality",
    conditions: "Conditions & effects",
    notes: "Notes",
    credits: "Credits"
};

/** `+3`, `−1`; strings pass through. */
export function signed(value: number | string): string
{
    if (typeof value !== "number") { return value; }

    return value < 0 ? `−${-value}` : `+${value}`;
}

/** `15`, `−1`; strings pass through. */
export function plain(value: number | string): string
{
    return typeof value === "number" && value < 0 ? `−${-value}` : String(value);
}

export function capitalise(text: string): string
{
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `sleight-of-hand` → `Sleight of hand`. */
export function words(id: string): string
{
    return capitalise(id.replace(/-/g, " "));
}

const TYPE_SEGMENT = /^(feature|feat|item|class|subclass|species|background|condition|spell|rule|table)\./;

/** `package · entity` with the package prefix and the type segment dropped; the ruleset itself is just the package. */
export function sourceLabel(contribution: Contribution, rulesetId: string): string
{
    const { source } = contribution;
    const pkg = source.package;
    const ref = source.feature ?? source.entity;
    if (ref === undefined || ref === rulesetId) { return pkg; }
    const short = ref.startsWith(`${pkg}.`) ? ref.slice(pkg.length + 1) : ref;
    const typed = short.replace(TYPE_SEGMENT, "");

    return pkg === "" ? typed : `${pkg} · ${typed}`;
}

/** How a contribution reads in a provenance line: `10`, `+3`, `×2`, `≥16`, `≤20`, `=15`. */
export function contributionText(c: Contribution): string
{
    switch (c.kind)
    {
        case "base": return plain(c.value);
        case "add": return signed(c.value);
        case "mul": return `×${plain(c.value)}`;
        case "min": return `≥${plain(c.value)}`;
        case "max": return `≤${plain(c.value)}`;
        default: return `=${plain(c.value)}`;
    }
}

// ---- the composer -----------------------------------------------------------------------

type Text = Readonly<Record<string, string | undefined>>;

class Composer
{
    private readonly _language: string;

    public constructor(private readonly _sheet: ComputedSheet, private readonly _options: ComposeOptions)
    {
        this._language = _options.language ?? _sheet.meta.language;
    }

    // ---- lookups ----

    private text(label: Text | LocalizedString | undefined): string
    {
        if (label === undefined) { return ""; }
        const map = label as Text;
        const any = Object.values(map).find((v) => v !== undefined);

        return map[this._language] ?? map["en"] ?? any ?? "";
    }

    private entityName(id: string | undefined): string
    {
        if (id === undefined) { return ""; }
        const data = this._options.packages.entities.get(id)?.data as { name?: Text } | undefined;

        return data?.name ? this.text(data.name) : id.split(".").pop() ?? id;
    }

    private entityText(id: string | undefined): string
    {
        if (id === undefined) { return ""; }
        const data = this._options.packages.entities.get(id)?.data as { text?: Text } | undefined;

        return data?.text ? this.text(data.text) : "";
    }

    private value(path: string): DerivedValue | undefined
    {
        return this._sheet.values[path];
    }

    private number(path: string, fallback = 0): number
    {
        const value = this.value(path)?.value;

        return typeof value === "number" ? value : fallback;
    }

    private line(c: Contribution): ExplanationLine
    {
        return {
            shown: contributionText(c),
            label: this.text(c.label),
            source: sourceLabel(c, this._options.packages.ruleset.id),
            ...(c.formula !== undefined ? { formula: c.formula } : {}),
            applied: c.applied
        };
    }

    public explanation(value: DerivedValue): Explanation
    {
        const expert = value.provenance.map((c) =>
        {
            const line = this.line(c);
            const shown = (c.kind === "set" || c.kind === "set-formula" || c.kind === "patch") ?
                `${c.kind} ${plain(c.value)}` :
                line.shown;

            return { ...line, shown: shown };
        });

        return {
            regular: value.provenance.filter((c) => c.applied).map((c) => this.line(c)),
            expert: expert,
            provenance: value.provenance
        };
    }

    /** The explanation of a value worth showing: more than one applied contribution. */
    private explainIf(
        value: DerivedValue | undefined,
        when: (applied: readonly Contribution[]) => boolean
    ): Explanation | undefined
    {
        if (value === undefined) { return undefined; }
        const applied = value.provenance.filter((c) => c.applied);

        return when(applied) ? this.explanation(value) : undefined;
    }

    private valueItem(id: string, label: string, path: string, shown: string): ValueItem
    {
        const value = this.value(path);
        const explanation = this.explainIf(value, (applied) => applied.length > 1);

        return {
            id: id,
            label: label,
            shown: shown,
            ...(value ? { value: value } : {}),
            ...(explanation ? { explain: explanation } : {})
        };
    }

    // ---- sections ----

    private identity(): Block[]
    {
        const sheet = this._sheet;
        const choices = this._options.character.choices;
        const subspecies = choices.subspecies ? `(${this.entityName(choices.subspecies)})` : "";
        const species = [this.entityName(choices.species), subspecies].filter((s) => s !== "").join(" ");
        const classes = sheet.classes.map((c) => ({
            id: c.class,
            name: this.entityName(c.class),
            levels: c.levels,
            ...(c.subclass ? { subclass: this.entityName(c.subclass) } : {})
        }));
        const classParts = classes.map((c) => `${c.name} ${c.levels}${c.subclass ? `, ${c.subclass}` : ""}`);
        const background = this.entityName(choices.background);
        const parts = [species, ...classParts, background, choices.alignment ?? ""].filter((p) => p !== "");

        return [{
            kind: "identity",
            name: sheet.meta.name,
            level: sheet.level,
            parts: parts,
            ...(choices.species ? { species: this.entityName(choices.species) } : {}),
            ...(choices.subspecies ? { subspecies: this.entityName(choices.subspecies) } : {}),
            classes: classes,
            ...(choices.background ? { background: background } : {}),
            ...(choices.alignment ? { alignment: choices.alignment } : {}),
            ruleset: sheet.meta.ruleset,
            packages: sheet.meta.packages.map((p) => ({ id: p.id, version: p.version }))
        }];
    }

    private core(): Block[]
    {
        const sheet = this._sheet;
        const state = this._options.character.state;
        const items: ValueItem[] = [];
        items.push(this.valueItem("ac", "Armor Class", "ac", plain(this.number("ac"))));
        items.push(this.valueItem("initiative", "Initiative", "initiative", signed(this.number("initiative"))));
        const speeds = Object.keys(sheet.values)
            .filter((p) => p.startsWith("speed.") && this.number(p) > 0)
            .sort((a, b) => (a === "speed.walk" ? -1 : b === "speed.walk" ? 1 : a.localeCompare(b)))
            .map((p) => (p === "speed.walk" ? `${this.number(p)} ft` : `${p.slice(6)} ${this.number(p)} ft`));
        items.push(this.valueItem("speed", "Speed", "speed.walk", speeds.join(", ")));
        const temporary = state.hp.temporary > 0 ? ` (+${state.hp.temporary} temporary)` : "";
        const hp = `${state.hp.current} / ${this.number("hp.max")}${temporary}`;
        items.push(this.valueItem("hp", "Hit Points", "hp.max", hp));
        const dice = sheet.play.hitDice.map((d) => `${d.total}d${d.die}`).join(" + ");
        const spent = state.hitDice.spent > 0 ? ` (${state.hitDice.spent} spent)` : "";
        items.push({ id: "hit-dice", label: "Hit Dice", shown: `${dice}${spent}` });
        const proficiency = signed(this.number("proficiencyBonus"));
        items.push(this.valueItem("proficiency", "Proficiency Bonus", "proficiencyBonus", proficiency));
        const perception = this.value("passive.perception");
        if (perception)
        {
            items.push({
                id: "passive-perception", label: "Passive Perception", shown: plain(perception.value), value: perception
            });
        }
        if (state.inspiration) { items.push({ id: "inspiration", label: "Inspiration", shown: "yes" }); }

        return [{ kind: "values", items: items }];
    }

    private abilities(): Block[]
    {
        const proficient = new Set(this._sheet.proficiencies.filter((p) => p.type === "save").map((p) => p.item));
        const rows: AbilityRow[] = this._options.packages.ruleset.abilities.map((ability) =>
        {
            const score = this.value(`ability.${ability}`);
            const modifier = this.value(`mod.${ability}`);
            const save = this.value(`save.${ability}`);

            return {
                id: ability,
                name: ABILITY_NAMES[ability] ?? ability.toUpperCase(),
                score: plain(this.number(`ability.${ability}`)),
                modifier: signed(this.number(`mod.${ability}`)),
                save: signed(this.number(`save.${ability}`)),
                proficient: proficient.has(ability),
                values: {
                    ...(score ? { score: score } : {}),
                    ...(modifier ? { modifier: modifier } : {}),
                    ...(save ? { save: save } : {})
                }
            };
        });

        return [{ kind: "abilities", rows: rows }];
    }

    private skills(): Block[]
    {
        const skillProficiencies = this._sheet.proficiencies.filter((p) => p.type === "skill");
        const held = new Map(skillProficiencies.map((p) => [p.item, p.expertise]));
        const rows: SkillRow[] = this._options.packages.ruleset.skills.map((skill) =>
        {
            const value = this.value(`skill.${skill.id}`);
            const mark = held.has(skill.id) ? (held.get(skill.id) ? "expertise" : "proficient") : "untrained";

            return {
                id: skill.id,
                name: words(skill.id),
                ability: skill.ability.toUpperCase(),
                mark: mark,
                bonus: signed(value?.value ?? 0),
                ...(value ? { value: value } : {})
            };
        });
        const groups: [string, string][] = [
            ["armor", "Armor"], ["weapon", "Weapons"], ["tool", "Tools"], ["language", "Languages"]
        ];
        const proficiencies: ProficiencyGroup[] = [];
        for (const [type, label] of groups)
        {
            const items = this._sheet.proficiencies.filter((p) => p.type === type).map((p) => words(p.item));
            if (items.length > 0) { proficiencies.push({ type: type, label: label, items: items }); }
        }

        return [{ kind: "skills", rows: rows, proficiencies: proficiencies }];
    }

    private senses(): Block[]
    {
        const parts: string[] = [];
        for (const path of Object.keys(this._sheet.values).filter((p) => p.startsWith("sense."))
            .sort())
        {
            const value = this.number(path);
            if (value > 0) { parts.push(`${words(path.slice(6))} ${value} ft`); }
        }
        for (const skill of ["perception", "investigation", "insight"])
        {
            const value = this.value(`passive.${skill}`);
            if (value) { parts.push(`Passive ${words(skill)} ${plain(value.value)}`); }
        }

        return parts.length === 0 ? [] : [{ kind: "text", items: parts }];
    }

    private combat(): Block[]
    {
        const sheet = this._sheet;
        const rows: { label: string, text: string }[] = [];
        const perAction = this.number("attacks.perAction", 1);
        if (perAction > 1) { rows.push({ label: "Attacks per action", text: String(perAction) }); }
        for (const defense of sheet.defenses)
        {
            rows.push({ label: capitalise(defense.defense.replace("-", " ")), text: defense.to.map(words).join(", ") });
        }
        for (const modifier of sheet.rollModifiers.filter((m) => m.applied))
        {
            const on = modifier.on;
            const target = [on.type, on.ability?.toUpperCase(), on.skill ? words(on.skill) : undefined,
                on.against ? `against ${on.against.map(words).join(", ")}` : undefined]
                .filter((s) => s !== undefined)
                .join(" ");
            const note = modifier.note ? ` (${this.text(modifier.note)})` : "";
            rows.push({ label: capitalise(modifier.kind), text: `on ${target}${note}` });
        }
        const carry = this.value("carry.capacity");
        if (carry) { rows.push({ label: "Carrying capacity", text: `${plain(carry.value)} lb` }); }

        return rows.length === 0 ? [] : [{ kind: "pairs", rows: rows }];
    }

    private attacks(): Block[]
    {
        const rows: AttackRow[] = this._sheet.attacks.map((attack) =>
        {
            const notes = [
                attack.ranged ? "ranged" : "melee",
                attack.ability.toUpperCase(),
                attack.magical ? "magical" : undefined,
                attack.critRange < 20 ? `crit ${attack.critRange}–20` : undefined,
                ...attack.extraDamage.map((x) =>
                    `+${x.dice ?? x.formula ?? ""}${x.damageType ? ` ${x.damageType}` : ""}`)

            ].filter((n) => n !== undefined);

            return {
                id: attack.id,
                name: this.text(attack.name),
                toHit: signed(attack.attackBonus.value),
                damage: `${attack.damage} ${attack.damageType}`,
                notes: notes,
                attack: attack
            };
        });

        return rows.length === 0 ? [] : [{ kind: "attacks", rows: rows }];
    }

    private actionItem(action: ActionView): ActionItem
    {
        const cost = action.cost
            .map((c) => "amount" in c ? `${c.amount} ${c.resource}` : `level ${c.level} slot`)
            .join(" + ");
        const details: string[] = [];
        if (action.requires?.afterAction) { details.push(`after ${words(action.requires.afterAction)}`); }
        if (action.dc) { details.push(`DC ${plain(action.dc.value)}`); }
        for (const roll of action.rolls ?? [])
        {
            if (roll.type === "attack" && roll.bonus) { details.push(`attack ${signed(roll.bonus.value)}`); }
            else if (roll.type === "damage")
            {
                const bonus = roll.bonus && roll.bonus.value !== 0 ? ` ${signed(roll.bonus.value)}` : "";
                const dice = (roll.dice ?? "").replace(/table\(([^)]+)\)/g, (_m, id: string) =>
                    `${words(id.split(".").pop() ?? id).toLowerCase()} die`);
                details.push(`${dice}${bonus}${roll.damageType ? ` ${roll.damageType}` : ""}`.trim());
            }
            else if (roll.type === "save" && roll.dc) { details.push(`save DC ${plain(roll.dc.value)}`); }
        }
        if (action.toggle) { details.push(`toggles ${words(action.toggle)}`); }

        return {
            id: action.id,
            name: this.text(action.name),
            cost: cost,
            details: details,
            available: action.available,
            ...(action.text ? { text: this.text(action.text) } : {}),
            action: action
        };
    }

    private actions(): Block[]
    {
        const sheet = this._sheet;
        if (sheet.actions.length === 0) { return []; }
        const base = sheet.actions
            .filter((a) => a.source.entity?.includes(".rule.") && a.cost.length === 0 && !a.rolls);
        const granted = sheet.actions.filter((a) => !base.includes(a));
        const groups: { activation: string, label: string, items: ActionItem[] }[] = [];
        for (const activation of ["action", "bonus-action", "reaction", "free", "special"])
        {
            const group = granted.filter((a) => a.activation === activation);
            if (group.length === 0) { continue; }
            groups.push({
                activation: activation,
                label: ACTIVATION_NAMES[activation] ?? activation,
                items: group.map((a) => this.actionItem(a))
            });
        }

        return [{ kind: "actions", groups: groups, base: base.map((a) => ({ id: a.id, name: this.text(a.name) })) }];
    }

    private resources(): Block[]
    {
        const items: ResourceItem[] = this._sheet.resources.map((resource) =>
        {
            const max = resource.max.value;
            const current = resource.current ?? (typeof max === "number" ? max : null);
            const recharge = resource.recharge.map((r) =>
            {
                const amount = r.amount === "full" ? "all" : String(r.amount);
                const on = r.on === "short-rest" ? "short rest" : r.on === "long-rest" ? "long rest" : r.on;

                return `${amount} on a ${on}`;
            }).join(", ");
            // The declared maximum alone is not worth explaining; modifiers to it are.
            const modifiers = (applied: readonly Contribution[]): number =>
                applied.filter((c) => c.kind !== "base").length;
            const explanation = this.explainIf(resource.max, (applied) => modifiers(applied) > 1);

            return {
                id: resource.id,
                name: this.text(resource.name),
                current: current,
                max: max,
                shownMax: plain(max),
                pips: typeof max === "number" && resource.display === "pips" && max <= 12 && current !== null,
                recharge: recharge === "" ? "" : `regains ${recharge}`,
                ...(explanation ? { explain: explanation } : {})
            };
        });

        return items.length === 0 ? [] : [{ kind: "resources", items: items }];
    }

    private spellcasting(): Block[]
    {
        const state = this._options.character.state;
        const casters: CasterItem[] = this._sheet.spellcasting.map((casting) =>
        {
            const parts = [`save DC ${plain(casting.dc.value)}`, `spell attack ${signed(casting.attackBonus.value)}`,
                `${casting.preparation} spells`, casting.ritual ? "ritual casting" : undefined]
                .filter((p) => p !== undefined);
            const known = [casting.cantripsKnown !== undefined ? `${casting.cantripsKnown} cantrips` : undefined,
                casting.spellsKnown !== undefined ? `${casting.spellsKnown} spells known` : undefined]
                .filter((p) => p !== undefined);
            const slots: SlotItem[] = casting.slots.map((slot) => ({
                label: ORDINALS[slot.level]?.replace(" level", "") ?? String(slot.level),
                current: state.spellSlots?.[String(slot.level)] ?? slot.max,
                max: slot.max
            }));
            if (casting.pact)
            {
                slots.push({
                    label: `pact (level ${casting.pact.level})`,
                    current: state.spellSlots?.["pact"] ?? casting.pact.slots,
                    max: casting.pact.slots
                });
            }

            return {
                id: casting.class,
                name: this.entityName(casting.class),
                ability: ABILITY_NAMES[casting.ability] ?? casting.ability,
                parts: parts,
                known: known,
                slots: slots
            };
        });

        return casters.length === 0 ? [] : [{ kind: "spellcasting", casters: casters }];
    }

    private spellLabel(spell: SpellView): string
    {
        const paid = spell.paidWith;
        const payment = "free" in paid ?
            (spell.level > 0 ? " (at will)" : "") :
            "resource" in paid ?
                ` (${paid.amount} ${paid.resource})` :
                "uses" in paid ? ` (${paid.uses}/${paid.recharge === "long-rest" ? "long rest" : paid.recharge})` : "";
        const concentration = spell.duration.concentration ? " ©" : "";
        const ritual = spell.as === "always-prepared" ? "*" : "";

        return `${this.text(spell.name)}${ritual}${concentration}${payment}`;
    }

    private spells(): Block[]
    {
        const sheet = this._sheet;
        if (sheet.spells.length === 0) { return []; }
        const levels: { level: number, label: string, items: SpellItem[] }[] = [];
        for (let level = 0; level <= 9; level += 1)
        {
            const spells = sheet.spells
                .filter((s) => s.level === level)
                .sort((a, b) => this.text(a.name).localeCompare(this.text(b.name)));
            if (spells.length === 0) { continue; }
            levels.push({
                level: level,
                label: ORDINALS[level] ?? String(level),
                items: spells.map((s) => ({ id: s.id, name: this.text(s.name), label: this.spellLabel(s), spell: s }))
            });
        }

        return [{ kind: "spells", levels: levels }];
    }

    private features(): Block[]
    {
        const sheet = this._sheet;
        if (sheet.features.length === 0) { return []; }
        const origins = [...new Set(sheet.features.map((f) => f.origin))]
            .sort((a, b) => ORIGIN_ORDER.indexOf(a) - ORIGIN_ORDER.indexOf(b));
        const groups: FeaturesBlock["groups"] = origins.map((origin) =>
        {
            const group = sheet.features.filter((f) => f.origin === origin);
            const owners = [...new Set(group.map((f) => f.owner))];
            const ownerList = owners.map((o) => this.entityName(o)).join(", ");
            const ownerNames = OWNED_ORIGINS.has(origin) ? ` — ${ownerList}` : "";

            return {
                origin: origin,
                label: `${ORIGIN_NAMES[origin] ?? capitalise(origin)}${ownerNames}`,
                items: group.map((f) => ({
                    id: f.id,
                    name: this.text(f.name),
                    ...(f.level !== undefined ? { level: f.level } : {}),
                    text: f.text ? this.text(f.text) : this.entityText(f.id)
                }))
            };
        });

        return [{ kind: "features", groups: groups }];
    }

    private equipment(): Block[]
    {
        const equipment = this._options.character.choices.equipment ?? [];
        if (equipment.length === 0) { return []; }
        const items: EquipmentItem[] = equipment.map((entry) => ({
            id: entry.item,
            name: this.entityName(entry.item),
            quantity: entry.quantity ?? 1,
            flags: [entry.equipped ? "equipped" : undefined, entry.attuned ? "attuned" : undefined]
                .filter((f) => f !== undefined)
        }));

        return [{ kind: "equipment", items: items }];
    }

    private personality(): Block[]
    {
        const choices = this._options.character.choices;
        const fields: { label: string, text: string }[] = [];
        const p = choices.personality;
        if (p?.traits) { fields.push({ label: "Traits", text: this.text(p.traits) }); }
        if (p?.ideals) { fields.push({ label: "Ideals", text: this.text(p.ideals) }); }
        if (p?.bonds) { fields.push({ label: "Bonds", text: this.text(p.bonds) }); }
        if (p?.flaws) { fields.push({ label: "Flaws", text: this.text(p.flaws) }); }
        if (choices.appearance) { fields.push({ label: "Appearance", text: this.text(choices.appearance) }); }

        return fields.length === 0 ? [] : [{ kind: "personality", fields: fields }];
    }

    private conditions(): Block[]
    {
        const state = this._options.character.state;
        const items: string[] = [];
        const expiry = (e: { readonly expires?: unknown }): string =>
        {
            const x = e.expires as Record<string, unknown> | undefined;
            if (x === undefined) { return ""; }
            const [key, value] = Object.entries(x)[0] ?? ["", ""];

            return key === "manual" ? " (until removed)" : ` (${key} ${String(value).replace(/-/g, " ")})`;
        };
        for (const c of state.conditions)
        {
            const level = c.level !== undefined ? ` level ${c.level}` : "";
            items.push(`${this.entityName(c.condition)}${level}${expiry(c)}`);
        }
        for (const t of state.toggles ?? []) { items.push(`${words(t.state)} (on)${expiry(t)}`); }
        for (const s of state.activeSpells ?? [])
        {
            const concentrating = state.concentration?.spell === s.spell ? ", concentrating" : "";
            items.push(`${this.entityName(s.spell)}${expiry(s)}${concentrating}`);
        }
        for (const e of state.customEffects ?? []) { items.push(`${this.text(e.name)}${expiry(e)}`); }

        return items.length === 0 ? [] : [{ kind: "conditions", items: items }];
    }

    private notes(): Block[]
    {
        const notes = this._options.character.choices.notes;
        const open = this._sheet.choices.filter((c) => !c.answered);
        if (!notes && open.length === 0) { return []; }

        return [{
            kind: "notes",
            ...(notes ? { text: this.text(notes) } : {}),
            open: open.map((c) => ({
                key: c.key,
                label: `${this.entityName(c.owner)}: ${words(c.choice)}`,
                progress: `${c.answers.length} of ${c.count} ${c.of}(s)`
            }))
        }];
    }

    private credits(): Block[]
    {
        const packages: CreditItem[] = this._options.packages.order.map((manifest) => ({
            id: manifest.id,
            version: manifest.version,
            name: this.text(manifest.name),
            sources: manifest.sources.map((source) =>
            {
                const who = source.publisher ?? source.author;

                const line = `${source.title}${who ? `, ${who}` : ""} — ${source.license}. ${source.attribution}`;

                return { title: source.title, line: line };
            })
        }));

        return [{ kind: "credits", packages: packages }];
    }

    public compose(): SectionTree
    {
        const handlers: Record<string, () => Block[]> = {
            identity: () => this.identity(),
            core: () => this.core(),
            abilities: () => this.abilities(),
            skills: () => this.skills(),
            senses: () => this.senses(),
            combat: () => this.combat(),
            attacks: () => this.attacks(),
            actions: () => this.actions(),
            resources: () => this.resources(),
            spellcasting: () => this.spellcasting(),
            spells: () => this.spells(),
            features: () => this.features(),
            equipment: () => this.equipment(),
            personality: () => this.personality(),
            conditions: () => this.conditions(),
            notes: () => this.notes(),
            credits: () => this.credits()
        };
        const sections: Section[] = this._sheet.sections.map((id) => ({
            id: id,
            title: SECTION_TITLES[id] ?? words(id),
            blocks: handlers[id]?.() ?? []
        }));

        return {
            sections: sections,
            warnings: this._sheet.warnings.map((w) => ({ code: w.code, message: w.message }))
        };
    }
}

/** Compose the section tree of a computed sheet. */
export function compose(sheet: ComputedSheet, options: ComposeOptions): SectionTree
{
    return new Composer(sheet, options).compose();
}

/** The explanation of one value path, inactive contributions included; `undefined` when the path has no value. */
export function explain(sheet: ComputedSheet, path: string, options: ComposeOptions): Explanation | undefined
{
    const value = sheet.values[path];

    return value === undefined ? undefined : new Composer(sheet, options).explanation(value);
}
