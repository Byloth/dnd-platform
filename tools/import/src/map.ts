/**
 * Map stage: upstream SRD 5.1 datasets → packages/content/srd51 in the
 * content format v0, with hand-authored mechanics merged from the overlay.
 *
 *   node tools/import/src/map.ts
 *
 * Open5e is the primary source (texts, names, spells, items, conditions,
 * rules); 5e-database supplies structure the Open5e fixtures lack (class
 * proficiencies and equipment, level tables, race bonuses, backgrounds).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseDocument } from "yaml";

import * as db from "./fivedb.ts";
import { CONTENT_DIR, cleanGenerated, emit, slug, text } from "./emit.ts";
import * as o5e from "./open5e.ts";
import { applyOverlays, readOverlays } from "./overlay.ts";

const PKG = "srd51";
const id = (type: string, name: string): string => `${PKG}.${type}.${name}`;
type Entity = Record<string, unknown>;

cleanGenerated();
const overlays = readOverlays();
const usedOverlays = new Set<string>();
let count = 0;

function write(dir: string, file: string, entity: Entity): void
{
    const tagged = dir === "items" ? withCategoryTags(file, entity) : entity;
    emit(`${dir}/${file}.yaml`, applyOverlays(tagged, overlays, usedOverlays));
    count += 1;
}

// The 5e-database equipment categories a starting-equipment filter names (a holy symbol, an arcane focus…): every
// item in one of them carries it as a tag, so the grant's `filter: { category }` finds it. Only those categories,
// to keep the items' tags about what the content uses.
let _categoryMembers: Map<string, Set<string>> | undefined;
function categoryMembers(): Map<string, Set<string>>
{
    if (_categoryMembers) { return _categoryMembers; }

    interface DbCategory { index: string, equipment: { index: string }[] }
    const named = new Set<string>();
    const walk = (node: unknown): void =>
    {
        if (Array.isArray(node)) { node.forEach(walk); }
        else if (node && typeof node === "object")
        {
            const record = node as Record<string, unknown>;
            const category = (record["equipment_category"] as { index?: string } | undefined)?.index;
            if (category) { named.add(category); }
            Object.values(record).forEach(walk);
        }
    };
    [...db.rows<Entity>("Classes"), ...db.rows<Entity>("Backgrounds")]
        .forEach((row) => walk([row["starting_equipment_options"], row["starting_equipment"]]));
    // A category the filters turn into a weapon kind needs no tag; the one they keep (melee weapons) does.
    const tags = new Set([...named].flatMap((c) =>
    {
        const filter = EQUIPMENT_FILTERS[c];

        return filter ? [filter["category"]].filter((t): t is string => typeof t === "string") : [c];
    }));
    _categoryMembers = new Map();
    for (const category of db.rows<DbCategory>("Equipment-Categories").filter((c) => tags.has(c.index)))
    {
        for (const { index } of category.equipment)
        {
            _categoryMembers.set(index, new Set([..._categoryMembers.get(index) ?? [], category.index]));
        }
    }

    return _categoryMembers;
}

function withCategoryTags(index: string, entity: Entity): Entity
{
    const categories = [...categoryMembers().get(index) ?? []].sort();
    if (!categories.length) { return entity; }
    const tags = [...new Set([...(entity["tags"] as string[] | undefined) ?? [], ...categories])];

    return { ...entity, tags: tags };
}

function compact<T extends object>(value: T): T
{
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null)) as T;
}

// ---- upstream indexes -----------------------------------------------------------

const dbClasses = new Map(db.rows<db.DbClass>("Classes").map((c) => [c.index, c]));
const dbLevels = db.rows<db.DbLevel>("Levels");
const dbRaces = new Map(db.rows<db.DbRace>("Races").map((r) => [r.index, r]));
const dbSubraces = new Map(db.rows<db.DbSubrace>("Subraces").map((r) => [r.index, r]));
const dbBackgrounds = new Map(db.rows<db.DbBackground>("Backgrounds").map((b) => [b.index, b]));
const dbFeats = new Map(db.rows<db.DbFeat>("Feats").map((f) => [f.index, f]));
const dbEquipment = new Map(db.rows<db.DbEquipment>("Equipment").map((e) => [e.index, e]));
const dbMagic = db.rows<db.DbMagicItem>("Magic-Items").filter((m) => !m.variant);
const dbSpells = new Map(db.rows<db.DbSpell>("Spells").map((s) => [s.index, s]));
const dbFeatures = db.rows<{ index: string, name: string, level: number, class: db.Ref }>("Features");

const classes = o5e.rows<o5e.CharacterClass>("CharacterClass");
const features = o5e.rows<o5e.ClassFeature>("ClassFeature");
const featureItems = o5e.rows<o5e.ClassFeatureItem>("ClassFeatureItem");
const speciesRows = o5e.rows<o5e.Species>("Species");
const traits = o5e.rows<o5e.SpeciesTrait>("SpeciesTrait");
const backgrounds = o5e.rows<o5e.Background>("Background");
const backgroundBenefits = o5e.rows<o5e.BackgroundBenefit>("BackgroundBenefit");
const feats = o5e.rows<o5e.Feat>("Feat");
const featBenefits = o5e.rows<o5e.FeatBenefit>("FeatBenefit");
const spells = o5e.rows<o5e.Spell>("Spell");
const spellOptions = o5e.rows<o5e.SpellCastingOption>("SpellCastingOption");
const items = o5e.rows<o5e.Item>("Item");
const weapons = new Map(o5e.rows<o5e.Weapon>("Weapon").map((w) => [String(w.pk), w.fields]));
const armors = new Map(o5e.rows<o5e.Armor>("Armor").map((a) => [String(a.pk), a.fields]));
const conditions = o5e.rows<o5e.ConditionDescription>("ConditionDescription");
const rules = o5e.rows<o5e.Rule>("Rule");
const ruleSets = o5e.rows<o5e.RuleSet>("RuleSet");

const itemsByFeature = new Map<string, o5e.ClassFeatureItem[]>();
for (const row of featureItems)
{
    itemsByFeature.set(row.fields.parent, [...(itemsByFeature.get(row.fields.parent) ?? []), row.fields]);
}
const featuresByOwner = new Map<string, { pk: string, fields: o5e.ClassFeature }[]>();
for (const row of features)
{
    const entry = { pk: String(row.pk), fields: row.fields };
    featuresByOwner.set(row.fields.parent, [...(featuresByOwner.get(row.fields.parent) ?? []), entry]);
}
const traitsByOwner = new Map<string, { pk: string, fields: o5e.SpeciesTrait }[]>();
for (const row of traits)
{
    const entry = { pk: String(row.pk), fields: row.fields };
    traitsByOwner.set(row.fields.parent, [...(traitsByOwner.get(row.fields.parent) ?? []), entry]);
}

// ---- proficiency mapping ---------------------------------------------------------

const WEAPON_RENAMES: Record<string, string> = { "crossbows-light": "light-crossbow", "crossbows-hand": "hand-crossbow", "crossbows-heavy": "heavy-crossbow" };
interface Prof { type: "skill" | "save" | "armor" | "weapon" | "tool" | "language", item: string }

function proficiency(index: string): Prof | undefined
{
    if (index.startsWith("saving-throw-")) { return { type: "save", item: index.slice("saving-throw-".length) }; }
    if (index.startsWith("skill-")) { return { type: "skill", item: index.slice("skill-".length) }; }
    if (index === "simple-weapons") { return { type: "weapon", item: "simple" }; }
    if (index === "martial-weapons") { return { type: "weapon", item: "martial" }; }
    if (index === "all-armor") { return { type: "armor", item: "all" }; }
    if (index === "shields") { return { type: "armor", item: "shield" }; }
    if (/^(light|medium|heavy)-armor$/.test(index)) { return { type: "armor", item: index.replace("-armor", "") }; }
    if (WEAPON_RENAMES[index]) { return { type: "weapon", item: WEAPON_RENAMES[index] }; }
    const asWeapon = index.replace(/s$/, "");
    if (dbEquipment.get(asWeapon)?.equipment_category.index === "weapon") { return { type: "weapon", item: asWeapon }; }

    return { type: "tool", item: index };
}

function leafOptions(set: db.OptionSet): string[]
{
    const out: string[] = [];
    for (const option of set.options ?? [])
    {
        if (option.option_type === "reference" && option.item) { out.push(option.item.index); }
        else if (option.option_type === "choice" && option.choice) { out.push(...leafOptions(option.choice.from)); }
    }

    return out;
}

/** ProficiencyGrants block of the content format from 5e-database fixed proficiencies and choices. */
function grants(fixed: db.Ref[], choices: db.ChoiceBlock[]): Entity
{
    const lists: Record<string, string[]> = {
        armor: [], weapons: [], tools: [], skills: [], savingThrows: [], languages: []
    };
    const keyOf: Record<Prof["type"], string> = {
        armor: "armor",
        weapon: "weapons",
        tool: "tools",
        skill: "skills",
        save: "savingThrows",
        language: "languages"
    };
    for (const ref of fixed)
    {
        const p = proficiency(ref.index);
        if (!p) { continue; }
        if (p.item === "all") { lists["armor"]!.push("light", "medium", "heavy"); }
        else { lists[keyOf[p.type]]!.push(p.item); }
    }
    const out: Entity = {};
    for (const [key, list] of Object.entries(lists))
    {
        if (list.length) { out[key] = list; }
    }
    for (const choice of choices)
    {
        const options = leafOptions(choice.from)
            .map(proficiency)
            .filter((p): p is Prof => p !== undefined);
        const type = options[0]?.type;
        if (type === undefined) { continue; }
        out[keyOf[type]] = { choose: choice.choose, from: options.map((p) => p.item) };
    }

    return out;
}

// ---- equipment mapping --------------------------------------------------------------

function itemRef(index: string, quantity: number): Entity
{
    return quantity > 1 ? { item: id("item", index), quantity: quantity } : { item: id("item", index) };
}

/** A 5e-database equipment category as a grant's filter; any other category is an item tag of the same name. */
const EQUIPMENT_FILTERS: Record<string, Entity> = {
    "simple-weapons": { weapon: "simple" },
    "martial-weapons": { weapon: "martial" },
    "simple-melee-weapons": { weapon: "simple", category: "melee-weapons" },
    "martial-melee-weapons": { weapon: "martial", category: "melee-weapons" }
};

function equipmentOption(option: db.Option): Entity[] | undefined
{
    switch (option.option_type)
    {
        case "counted_reference": return option.of ? [itemRef(option.of.index, option.count ?? 1)] : undefined;
        case "reference": return option.item ? [itemRef(option.item.index, 1)] : undefined;
        case "multiple":
        {
            const parts = (option.items ?? []).map(equipmentOption);
            if (parts.some((p) => p === undefined)) { return undefined; }

            return parts.flatMap((p) => p ?? []);
        }
        case "choice":
        {
            const category = option.choice?.from.equipment_category?.index;
            if (!category) { return undefined; }
            const filter = EQUIPMENT_FILTERS[category] ?? { category: category };
            const quantity = option.choice?.choose ?? 1;

            return [quantity > 1 ? { filter: filter, quantity: quantity } : { filter: filter }];
        }
        default: return undefined;
    }
}

function startingEquipment(
    fixed: { equipment: db.Ref, quantity: number }[],
    options: db.ChoiceBlock[],
    fallbackText?: string
): Entity
{
    const out: Entity = { fixed: fixed.map((e) => itemRef(e.equipment.index, e.quantity)), choices: [] };
    const unmapped: string[] = [];
    for (const block of options)
    {
        const mapped = (block.from.options ?? []).map(equipmentOption);
        if (block.from.option_set_type === "equipment_category" && block.from.equipment_category)
        {
            const category = block.from.equipment_category.index;
            (out["fixed"] as Entity[]).push({
                filter: EQUIPMENT_FILTERS[category] ?? { category: category },
                ...(block.choose > 1 ? { quantity: block.choose } : {})
            });

            continue;
        }
        if (mapped.length >= 2 && mapped.every((m) => m !== undefined))
        {
            (out["choices"] as Entity[]).push({ options: mapped as Entity[][] });
        }
        else { unmapped.push(block.desc ?? "an option that could not be mapped"); }
    }
    const notes = [fallbackText, ...unmapped.map((u) => `Choose: ${u}`)].filter((t): t is string => Boolean(t));
    if (notes.length) { out["text"] = { en: notes.join("\n") }; }

    return out;
}

// ---- level tables -----------------------------------------------------------------------

function kebab(key: string): string
{
    return key.replace(/_/g, "-");
}

/** Rows compressed to the levels where the value changes (tables are step functions). */
function stepRows(values: Map<number, number | string>): Record<string, number | string>
{
    const rows: Record<string, number | string> = {};
    let previous: number | string | undefined;
    for (const level of [...values.keys()].sort((a, b) => a - b))
    {
        const value = values.get(level)!;
        if (value !== previous)
        {
            rows[String(level)] = value;
            previous = value;
        }
    }

    return rows;
}

function classTables(classIndex: string): Record<string, Entity>
{
    const levels = dbLevels
        .filter((l) => l.class.index === classIndex && !l.subclass)
        .sort((a, b) => a.level - b.level);
    const tables: Record<string, Entity> = {};
    const columns = new Map<string, Map<number, number | string>>();
    for (const level of levels)
    {
        for (const [key, raw] of Object.entries(level.class_specific ?? {}))
        {
            let value: number | string | undefined;
            if (typeof raw === "number") { value = raw; }
            else if (raw && typeof raw === "object" && "dice_count" in raw && "dice_value" in raw)
            {
                const r = raw as { dice_count: number, dice_value: number };
                value = r.dice_count > 0 ? `${r.dice_count}d${r.dice_value}` : 0;
            }
            if (value === undefined) { continue; }
            if (!columns.has(key)) { columns.set(key, new Map()); }
            columns.get(key)!.set(level.level, value);
        }
        if (level.spellcasting)
        {
            for (const key of ["cantrips_known", "spells_known"])
            {
                const v = level.spellcasting[key];
                if (v === undefined) { continue; }
                if (!columns.has(key)) { columns.set(key, new Map()); }
                columns.get(key)!.set(level.level, v);
            }
        }
    }
    for (const [key, values] of columns)
    {
        if ([...values.values()].every((v) => v === 0)) { continue; }
        tables[kebab(key)] = { by: "classLevel", rows: stepRows(values) };
    }
    const slots = levels.filter((l) => l.spellcasting).map((l) => [l.level, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => l.spellcasting![`spell_slots_level_${n}`] ?? 0)] as [number, number[]]);
    if (slots.length && slots.some(([, row]) => row.some((n) => n > 0)))
    {
        const rows: Record<string, number[]> = {};
        let previous = "";
        for (const [level, row] of slots)
        {
            const key = row.join(",");
            if (key !== previous)
            {
                rows[String(level)] = row;
                previous = key;
            }
        }
        tables["spell-slots"] = { by: "classLevel", rows: rows };
    }

    return tables;
}

// ---- classes and subclasses --------------------------------------------------------------

const CASTER: Record<string, { progression: "full" | "half" | "pact", preparation: "known" | "prepared" | "spellbook", ritual: boolean }> = {
    bard: { progression: "full", preparation: "known", ritual: true },
    cleric: { progression: "full", preparation: "prepared", ritual: true },
    druid: { progression: "full", preparation: "prepared", ritual: true },
    sorcerer: { progression: "full", preparation: "known", ritual: false },
    wizard: { progression: "full", preparation: "spellbook", ritual: true },
    paladin: { progression: "half", preparation: "prepared", ritual: false },
    ranger: { progression: "half", preparation: "known", ritual: false },
    warlock: { progression: "pact", preparation: "known", ritual: false }
};
const CASTER_WEIGHT: Record<string, number> = { full: 1, half: 0.5, pact: 0, none: 0 };

/** Upstream lists these as features; the format carries them as structured class fields instead. */
const STRUCTURAL_FEATURES = new Set(["Hit Points", "Proficiencies", "Equipment"]);

/** Upstream models table columns as features whose text is "[Column data]"; real features keep their text. */
function isTableColumn(desc: string): boolean
{
    return desc.trim() === "[Column data]";
}

function featureSlugOf(ownerSlug: string, pk: string): string
{
    return slug(o5e.slug(pk).replace(`${ownerSlug}_`, ""));
}

function featureEntity(ownerSlug: string, pk: string, fields: o5e.ClassFeature, extra: Entity = {}): Entity
{
    const featureSlug = featureSlugOf(ownerSlug, pk);

    return compact({
        id: id("feature", `${ownerSlug}.${featureSlug}`),
        name: { en: fields.name },
        source: PKG,
        text: text(fields.desc),
        ...extra
    });
}

interface LevelsBlock
{
    levels: Record<string, Entity>;
    subclassChoice?: string;
    subclassLevel?: number;
}

function levelsBlock(ownerPk: string, ownerSlug: string, classIndex: string | undefined): LevelsBlock
{
    const levels: Record<string, Entity> = {};
    let subclassChoice: string | undefined;
    let subclassLevel: number | undefined;
    const push = (level: number, key: "features" | "choices", value: Entity | string): void =>
    {
        const block = (levels[String(level)] ??= {});
        const list = block[key] as unknown[] | undefined;
        if (list) { list.push(value); }
        else { block[key] = [value]; }
    };
    const own = featuresByOwner.get(ownerPk) ?? [];
    const dbClass = classIndex ? dbClasses.get(classIndex) : undefined;
    const subclassFlavor = dbClass ?
        db.rows<db.DbSubclass>("Subclasses").find((s) => s.class.index === classIndex)?.subclass_flavor :
        undefined;

    for (const feature of own.sort((a, b) => a.fields.name.localeCompare(b.fields.name)))
    {
        const rows = itemsByFeature.get(feature.pk) ?? [];
        if (isTableColumn(feature.fields.desc) || STRUCTURAL_FEATURES.has(feature.fields.name)) { continue; }
        const dbFeatureLevel = dbFeatures.find((x) => x.name === feature.fields.name && x.class.index === (classIndex ?? ""))?.level;
        const minLevel = rows.length ? Math.min(...rows.map((r) => r.level)) : (dbFeatureLevel ?? 1);
        const featureSlug = featureSlugOf(ownerSlug, feature.pk);
        if (feature.fields.name === "Ability Score Improvement")
        {
            // Levels with an ASI come from 5e-database (Open5e misses some rows, e.g. the Cleric's 12th).
            const dbAsiLevels = dbLevels
                .filter((l) => l.class.index === classIndex && !l.subclass)
                .sort((a, b) => a.level - b.level)
                .filter((l, i, all) => l.ability_score_bonuses > (all[i - 1]?.ability_score_bonuses ?? 0))
                .map((l) => l.level);
            const asiLevels = classIndex ? dbAsiLevels : rows.map((r) => r.level);
            push(Math.min(...asiLevels, minLevel), "features", featureEntity(ownerSlug, feature.pk, feature.fields));
            for (const level of asiLevels) { push(level, "choices", { id: `asi-${level}`, of: "asi-or-feat" }); }

            continue;
        }
        if (subclassFlavor && feature.fields.name === subclassFlavor)
        {
            subclassChoice = featureSlug;
            subclassLevel = minLevel;
            push(minLevel, "features", featureEntity(ownerSlug, feature.pk, feature.fields));
            push(minLevel, "choices", { id: featureSlug, of: "subclass" });

            continue;
        }
        if (feature.fields.name === "Spellcasting" || feature.fields.name === "Pact Magic")
        {
            const caster = classIndex ? CASTER[classIndex] : undefined;
            const ability = dbClass?.spellcasting?.spellcasting_ability.index;
            const tables = classIndex ? classTables(classIndex) : {};
            const effects: Entity[] = [];
            if (caster && ability)
            {
                effects.push(compact({
                    kind: "grant-spellcasting",
                    ability: ability,
                    list: id("spell-list", classIndex!),
                    preparation: caster.preparation,
                    slots: { progression: caster.progression },
                    cantrips: tables["cantrips-known"] ? { table: id("table", `${classIndex}.cantrips-known`) } : undefined,
                    known: tables["spells-known"] ? { table: id("table", `${classIndex}.spells-known`) } : undefined,
                    ritual: caster.ritual
                }));
            }
            push(minLevel, "features", featureEntity(ownerSlug, feature.pk, feature.fields, effects.length ? { effects: effects } : {}));

            continue;
        }
        push(minLevel, "features", featureEntity(ownerSlug, feature.pk, feature.fields));
    }
    for (const level of Object.keys(levels).sort((a, b) => Number(a) - Number(b)))
    {
        const block = levels[level]!;
        for (const key of ["features", "choices"] as const)
        {
            if (Array.isArray(block[key]))
            {
                (block[key] as Entity[]).sort((a, b) => String(a["id"]).localeCompare(String(b["id"])));
            }
        }
    }

    const subclassPart = subclassChoice ? { subclassChoice: subclassChoice, subclassLevel: subclassLevel } : {};

    return { levels: levels, ...subclassPart };
}

for (const cls of classes.filter((c) => c.fields.subclass_of === null))
{
    const index = o5e.slug(cls.pk);
    const dbClass = dbClasses.get(index);
    if (!dbClass) { throw new Error(`class ${index} missing in 5e-database`); }
    const blocks = levelsBlock(String(cls.pk), index, index);
    const caster = CASTER[index];
    const multi = dbClass.multi_classing;
    const multiclassPrerequisites = multi.prerequisites?.length ?
        Object.fromEntries(multi.prerequisites.map((p) => [p.ability_score.index, p.minimum_score])) :
        undefined;
    const hasMulticlassProficiencies = Boolean(multi.proficiencies?.length || multi.proficiency_choices?.length);
    const entity = compact({
        id: id("class", index),
        name: { en: cls.fields.name },
        source: PKG,
        text: text(cls.fields.name === "Barbarian" ? undefined : undefined),
        hitDie: dbClass.hit_die,
        primaryAbilities: cls.fields.primary_abilities.length ? cls.fields.primary_abilities : undefined,
        savingThrows: dbClass.saving_throws.map((s) => s.index),
        proficiencies: grants(dbClass.proficiencies.filter((p) => !p.index.startsWith("saving-throw-")), dbClass.proficiency_choices),
        startingEquipment: startingEquipment(dbClass.starting_equipment, dbClass.starting_equipment_options),
        multiclass: compact({
            prerequisites: multiclassPrerequisites,
            proficiencies: hasMulticlassProficiencies ?
                grants(multi.proficiencies ?? [], multi.proficiency_choices ?? []) :
                undefined
        }),
        subclassLevel: blocks.subclassLevel,
        subclassChoice: blocks.subclassChoice,
        casterWeight: CASTER_WEIGHT[caster?.progression ?? "none"],
        levels: blocks.levels,
        tables: Object.keys(classTables(index)).length ? classTables(index) : undefined
    });
    write("classes", index, entity);
    for (const name of ["cantrips-known", "spells-known"])
    {
        const table = classTables(index)[name];
        if (table)
        {
            write("tables", `${index}.${name}`, {
                id: id("table", `${index}.${name}`),
                name: { en: `${cls.fields.name}: ${name.replace("-", " ")}` },
                source: PKG,
                by: "classLevel",
                rows: table["rows"]
            });
        }
    }
}

for (const sub of classes.filter((c) => c.fields.subclass_of !== null))
{
    const subSlug = o5e.slug(sub.pk);
    const classIndex = o5e.slug(sub.fields.subclass_of!);
    const blocks = levelsBlock(String(sub.pk), subSlug, undefined);
    write(`subclasses/${classIndex}`, subSlug, compact({
        id: id("subclass", `${classIndex}.${subSlug}`),
        name: { en: sub.fields.name },
        source: PKG,
        class: id("class", classIndex),
        levels: blocks.levels
    }));
}

// ---- species ----------------------------------------------------------------------------------

const ABILITY_SHORT: Record<string, string> = {
    strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha"
};
const ABILITY = (index: string): string => ABILITY_SHORT[index.toLowerCase()] ?? index.toLowerCase();

interface AbilityBonus { ability_score: db.Ref, bonus: number }

function traitFeatures(ownerPk: string, ownerSlug: string, bonuses: AbilityBonus[]): Entity[]
{
    return (traitsByOwner.get(ownerPk) ?? []).map((trait) =>
    {
        const traitSlug = slug(o5e.slug(trait.pk).replace(`${ownerSlug}_`, ""));
        const effects: Entity[] = [];
        if (trait.fields.name === "Ability Score Increase")
        {
            for (const b of bonuses)
            {
                effects.push({ kind: "modify", target: `ability.${ABILITY(b.ability_score.index)}`, op: "add", value: b.bonus });
            }
        }
        const darkvision = /darkvision/i.test(trait.fields.name) ? /within (\d+) feet/i.exec(trait.fields.desc) : null;
        if (darkvision) { effects.push({ kind: "modify", target: "sense.darkvision", op: "max", value: Number(darkvision[1]) }); }

        return compact({
            id: id("feature", `${ownerSlug}.${traitSlug}`),
            name: { en: trait.fields.name },
            source: PKG,
            text: text(trait.fields.desc),
            effects: effects.length ? effects : undefined
        });
    });
}

for (const species of speciesRows.filter((s) => s.fields.subspecies_of === null))
{
    const index = o5e.slug(species.pk);
    const race = dbRaces.get(index);
    const subspecies = speciesRows.filter((s) => s.fields.subspecies_of === species.pk).map((sub) =>
    {
        const subSlug = o5e.slug(sub.pk);
        const subrace = dbSubraces.get(subSlug) ?? [...dbSubraces.values()].find((r) => slug(r.name) === subSlug || r.index.startsWith(`${subSlug}-`));

        return compact({
            id: id("species", `${index}.${subSlug}`),
            name: { en: sub.fields.name },
            source: PKG,
            text: text(sub.fields.desc),
            features: traitFeatures(String(sub.pk), subSlug, subrace?.ability_bonuses ?? [])
        });
    });
    write("species", index, compact({
        id: id("species", index),
        name: { en: species.fields.name },
        source: PKG,
        text: text(species.fields.desc),
        size: race ? race.size.toLowerCase() : undefined,
        speed: race ? { walk: race.speed } : undefined,
        languages: race ?
            compact({ fixed: race.languages.map((l) => l.index), choose: race.language_options?.choose }) :
            undefined,
        features: traitFeatures(String(species.pk), index, race?.ability_bonuses ?? []),
        subspecies: subspecies.length ? subspecies : undefined
    }));
}

// ---- backgrounds and feats -----------------------------------------------------------------------

for (const background of backgrounds)
{
    const index = o5e.slug(background.pk);
    const dbBackground = dbBackgrounds.get(index);
    const benefits = backgroundBenefits.filter((b) => b.fields.parent === background.pk).map((b) => b.fields);
    const featureBenefit = benefits.find((b) => b.type === "feature");
    const equipmentText = benefits.find((b) => b.type === "equipment")?.desc;
    const suggested = benefits.find((b) => b.type === "suggested_characteristics")?.desc;
    const gold = equipmentText ? /(\d+) gp/.exec(equipmentText)?.[1] : undefined;
    const personalityList = (block: { from: db.OptionSet } | undefined): { en: string }[] | undefined =>
    {
        const strings = (block?.from.options ?? []).map((o) => o.string ?? o.desc)
            .filter((s): s is string => Boolean(s));

        return strings.length ? strings.map((s) => ({ en: s })) : undefined;
    };
    let equipment: Entity | undefined;
    if (dbBackground)
    {
        equipment = {
            ...startingEquipment(
                dbBackground.starting_equipment,
                dbBackground.starting_equipment_options,
                equipmentText
            ),
            ...(gold ? { gold: Number(gold) } : {})
        };
    }
    let backgroundFeatures: Entity[] | undefined;
    if (featureBenefit)
    {
        backgroundFeatures = [compact({
            id: id("feature", `${index}.${slug(featureBenefit.name)}`),
            name: { en: featureBenefit.name },
            source: PKG,
            text: text(featureBenefit.desc)
        })];
    }
    write("backgrounds", index, compact({
        id: id("background", index),
        name: { en: background.fields.name },
        source: PKG,
        text: text(background.fields.desc),
        proficiencies: dbBackground ? grants(dbBackground.starting_proficiencies, []) : undefined,
        languages: dbBackground?.language_options ? { choose: dbBackground.language_options.choose } : undefined,
        equipment: equipment,
        features: backgroundFeatures,
        personality: compact({
            traits: personalityList(dbBackground?.personality_traits),
            ideals: personalityList(dbBackground?.ideals),
            bonds: personalityList(dbBackground?.bonds),
            flaws: personalityList(dbBackground?.flaws),
            suggested: text(suggested)
        })
    }));
}

for (const feat of feats)
{
    const index = o5e.slug(feat.pk);
    const dbFeat = dbFeats.get(index);
    const benefits = featBenefits.filter((b) => b.fields.parent === feat.pk).map((b) => `- ${b.fields.desc.trim()}`);
    const prerequisites = dbFeat?.prerequisites.map((p) => ({
        ability: { ability: ABILITY(p.ability_score.index), min: p.minimum_score }
    }));
    let prerequisite: Entity | undefined;
    if (prerequisites?.length === 1) { prerequisite = prerequisites[0]; }
    else if (prerequisites?.length) { prerequisite = { all: prerequisites }; }
    write("feats", index, compact({
        id: id("feat", index),
        name: { en: feat.fields.name },
        source: PKG,
        text: text([feat.fields.desc, ...benefits].join("\n")),
        prerequisites: prerequisite
    }));
}

// ---- spells and spell lists ---------------------------------------------------------------------------

const optionsBySpell = new Map<string, o5e.SpellCastingOption[]>();
for (const row of spellOptions)
{
    optionsBySpell.set(row.fields.parent, [...(optionsBySpell.get(row.fields.parent) ?? []), row.fields]);
}
const spellLists = new Map<string, string[]>();

function castingTime(value: string, reaction: string | null): Entity
{
    if (value === "action" || value === "bonus-action") { return { activation: value }; }
    if (value === "reaction") { return compact({ activation: "reaction", trigger: text(reaction) }); }
    const minutes = /^(\d+)minutes?$/.exec(value);
    if (minutes) { return { activation: "special", minutes: Number(minutes[1]) }; }
    const hours = /^(\d+)hours?$/.exec(value);
    if (hours) { return { activation: "special", hours: Number(hours[1]) }; }

    return { activation: "special" };
}

function duration(value: string, concentration: boolean): Entity
{
    if (value === "instantaneous") { return { type: "instantaneous" }; }
    if (value.startsWith("until dispelled")) { return { type: "until-dispelled" }; }
    if (value === "special") { return { type: "special" }; }
    const match = /^(\d+) (round|minute|hour|day)s?$/.exec(value);
    if (!match) { return { type: "special" }; }
    const unit = `${match[1] === "1" ? match[2] : match[2]}s` as "rounds" | "minutes" | "hours" | "days";

    return compact({ type: "timed", [unit]: Number(match[1]), concentration: concentration || undefined });
}

function range(fields: o5e.Spell): Entity
{
    const t = fields.range_text.toLowerCase();
    if (t === "self") { return { type: "self" }; }
    if (t === "touch") { return { type: "touch" }; }
    if (t === "sight") { return { type: "sight" }; }
    if (t === "unlimited") { return { type: "unlimited" }; }
    if (t === "special") { return { type: "special" }; }
    const feetMatch = /^(\d+) feet$/.exec(t);
    const milesMatch = /^(\d+) miles?$/.exec(t);
    let feet: number | undefined;
    if (feetMatch) { feet = Number(feetMatch[1]); }
    else if (milesMatch) { feet = Number(milesMatch[1]) * 5280; }
    let type = "point";
    if (fields.target_type === "creature") { type = "creature"; }
    else if (fields.target_type === "object") { type = "object"; }

    return compact({ type: type, distance: feet });
}

function area(fields: o5e.Spell): Entity | undefined
{
    if (!fields.shape_type || fields.shape_size === null) { return undefined; }
    const shape = fields.shape_type === "sphere" || fields.shape_type === "cylinder" ? { radius: fields.shape_size } : { size: fields.shape_size };

    return { shape: fields.shape_type, ...shape };
}

function scaling(fields: o5e.Spell, pk: string): Entity | undefined
{
    const options = optionsBySpell.get(pk) ?? [];
    const base = fields.damage_roll;
    const next = options.find((o) => o.type === `slot_level_${fields.level + 1}`)?.damage_roll;
    if (base && next)
    {
        const b = /^(\d+)d(\d+)/.exec(base);
        const n = /^(\d+)d(\d+)/.exec(next);
        if (b && n && b[2] === n[2] && Number(n[1]) > Number(b[1])) { return { by: "slotLevel", from: fields.level + 1, add: { dice: `${Number(n[1]) - Number(b[1])}d${b[2]}` } }; }
    }
    if (fields.level === 0)
    {
        const rows: Record<string, string> = {};
        for (const o of options)
        {
            const level = /^player_level_(\d+)$/.exec(o.type);
            if (level && o.damage_roll) { rows[level[1]!] = o.damage_roll; }
        }
        if (Object.keys(rows).length) { return { by: "level", table: rows }; }
    }

    return undefined;
}

for (const spell of spells)
{
    const index = o5e.slug(spell.pk);
    const f = spell.fields;
    const dbSpell = dbSpells.get(index);
    const rolls: Entity[] = [];
    if (f.attack_roll) { rolls.push({ type: "attack" }); }
    if (f.saving_throw_ability)
    {
        rolls.push({ type: "save", ability: ABILITY(f.saving_throw_ability), onSuccess: f.damage_roll ? "half" : "none" });
    }
    if (f.damage_roll && /^\d+d\d+/.test(f.damage_roll))
    {
        rolls.push(compact({ type: "damage", dice: f.damage_roll.replace(/\s+/g, ""), damageType: f.damage_types[0] }));
    }
    for (const cls of dbSpell?.classes ?? []) { spellLists.set(cls.index, [...(spellLists.get(cls.index) ?? []), id("spell", index)]); }
    let material: boolean | { en: string } = false;
    if (f.material) { material = f.material_specified ? { en: f.material_specified } : true; }
    write("spells", index, compact({
        id: id("spell", index),
        name: { en: f.name },
        source: PKG,
        level: f.level,
        school: f.school,
        castingTime: castingTime(f.casting_time, f.reaction_condition),
        range: range(f),
        area: area(f),
        components: compact({
            v: f.verbal,
            s: f.somatic,
            m: material,
            cost: f.material_cost ? Number(f.material_cost) : undefined,
            consumed: f.material_consumed || undefined
        }),
        duration: duration(f.duration, f.concentration),
        ritual: f.ritual || undefined,
        text: text(f.desc),
        higherLevel: text(f.higher_level),
        rolls: rolls.length ? rolls : undefined,
        scaling: scaling(f, String(spell.pk)),
        tags: dbSpell?.area_of_effect ? ["area"] : undefined
    }));
}
for (const [cls, list] of spellLists)
{
    write("spell-lists", cls, {
        id: id("spell-list", cls),
        name: { en: `${cls[0]!.toUpperCase()}${cls.slice(1)} spells` },
        source: PKG,
        spells: list.sort()
    });
}

// ---- items ----------------------------------------------------------------------------------------------

const SIMPLE_MELEE_MONK = new Set<string>();
const MAGIC_TYPES: Record<string, string> = {
    weapon: "weapon", armor: "armor", shield: "shield", ammunition: "ammunition", potion: "consumable", scroll: "consumable"
};

for (const item of items)
{
    const index = o5e.slug(item.pk);
    const f = item.fields;
    const equipment = dbEquipment.get(index);
    const weapon = f.weapon ? weapons.get(f.weapon) : undefined;
    const armor = f.armor ? armors.get(f.armor) : undefined;
    let cost: Entity | undefined;
    if (f.cost && Number(f.cost) > 0) { cost = { amount: Number(f.cost), currency: "gp" }; }
    else if (equipment?.cost) { cost = { amount: equipment.cost.quantity, currency: equipment.cost.unit }; }
    const base: Entity = {
        id: id("item", index),
        name: { en: f.name },
        source: PKG,
        text: text(f.desc),
        cost: cost,
        weight: f.weight && Number(f.weight) > 0 ? Number(f.weight) : undefined
    };
    let entity: Entity;
    if (weapon)
    {
        const properties = (equipment?.properties ?? []).map((p) => p.index).filter((p) => p !== "monk");
        const ranged = weapon.range > 5 && !properties.includes("thrown");
        const simpleMelee = weapon.is_simple && !ranged && !properties.includes("two-handed") && !properties.includes("heavy");
        const monkWeapon = index === "shortsword" || simpleMelee;
        if (monkWeapon) { SIMPLE_MELEE_MONK.add(index); }
        const hasRange = weapon.range > 5 || properties.includes("thrown");
        const weaponRange = {
            normal: equipment?.throw_range?.normal ?? weapon.range,
            long: equipment?.throw_range?.long ?? weapon.long_range
        };
        entity = compact({
            ...base,
            type: "weapon",
            category: weapon.is_simple ? "simple" : "martial",
            damage: /^\d+d\d+/.test(weapon.damage_dice) ? weapon.damage_dice : undefined,
            damageType: weapon.damage_type,
            properties: properties.length ? properties : undefined,
            versatile: equipment?.two_handed_damage?.damage_dice,
            range: hasRange ? weaponRange : undefined,
            ranged: ranged || undefined,
            monkWeapon: monkWeapon || undefined
        });
    }
    else if ((f.category === "shield") && !armor)
    {
        const dbShield = dbEquipment.get(index);
        entity = compact({ ...base, type: "shield", ac: { bonus: dbShield?.armor_class?.base ?? 2 } });
    }
    else if (armor)
    {
        const category = equipment?.armor_category?.toLowerCase();
        if (category === "shield") { entity = compact({ ...base, type: "shield", ac: { bonus: armor.ac_base } }); }
        else
        {
            entity = compact({
                ...base,
                type: "armor",
                category: category,
                ac: compact({
                    base: armor.ac_base,
                    addDex: armor.ac_add_dexmod,
                    dexMax: armor.ac_cap_dexmod ?? undefined
                }),
                strengthMin: armor.strength_score_required ?? undefined,
                stealthDisadvantage: armor.grants_stealth_disadvantage || undefined
            });
        }
    }
    else
    {
        const type = f.category === "tools" ? "tool" : f.category === "ammunition" ? "ammunition" : f.category === "poison" ? "consumable" : "gear";
        entity = compact({ ...base, type: type, tags: f.category !== "adventuring-gear" ? [f.category] : undefined });
    }
    write("items", index, entity);
}
const producedItems = new Set(items.map((i) => o5e.slug(i.pk)));
// The 5e-database's index of an item Open5e names differently.
const DB_ITEM_ALIASES: Record<string, string> = { "oil-flask": "lamp-oil-flask" };
const dbItemIndex = (index: string): string => DB_ITEM_ALIASES[index] ?? index;
interface DbContents { contents?: { item: db.Ref, quantity: number }[] }
// Items a pack holds that no dataset sells on their own (a censer, a small knife): emitted from the 5e-database.
const heldOnly = new Set<string>();
for (const equipment of dbEquipment.values())
{
    for (const { item } of (equipment as unknown as DbContents).contents ?? [])
    {
        if (!producedItems.has(dbItemIndex(item.index))) { heldOnly.add(item.index); }
    }
}
for (const equipment of dbEquipment.values())
{
    if (producedItems.has(equipment.index)) { continue; }
    const category = equipment.gear_category?.index ?? equipment.equipment_category.index;
    if (!["equipment-packs", "ammunition"].includes(category) && !heldOnly.has(equipment.index)) { continue; }
    const contents = (equipment as unknown as DbContents).contents ?? [];
    const description = (equipment as unknown as { desc?: string[] }).desc?.join("\n\n") ?? "";
    const list = contents.length ? `Includes: ${contents.map((c) => `${c.quantity} × ${c.item.name}`).join(", ")}.` : "";
    write("items", equipment.index, compact({
        id: id("item", equipment.index),
        name: { en: equipment.name },
        source: PKG,
        text: text([description, list].filter(Boolean).join("\n\n")),
        cost: equipment.cost?.quantity ? { amount: equipment.cost.quantity, currency: equipment.cost.unit } : undefined,
        weight: equipment.weight || undefined,
        contents: contents.length ?
            contents.map((c) => compact({
                item: id("item", dbItemIndex(c.item.index)),
                quantity: c.quantity > 1 ? c.quantity : undefined
            })) :
            undefined,
        type: category === "ammunition" ? "ammunition" : "gear",
        tags: category === "equipment-packs" || category === "ammunition" ? [category] : undefined
    }));
}
for (const magic of dbMagic)
{
    const category = magic.equipment_category.index;
    const type = MAGIC_TYPES[category] ?? "wondrous";
    const desc = magic.desc.join("\n\n");
    const rarity = slug(magic.rarity.name);
    write("items", magic.index, compact({
        id: id("item", magic.index),
        name: { en: magic.name },
        source: PKG,
        text: text(desc),
        type: type,
        magical: true,
        rarity: rarity === "varies" ? undefined : rarity,
        attunement: /requires attunement/i.test(desc) || undefined,
        tags: ["magic-item", category]
    }));
}

// ---- conditions, rules, tables ------------------------------------------------------------------------------

for (const condition of conditions)
{
    const index = condition.fields.describes;
    write("conditions", index, {
        id: id("condition", index),
        name: { en: index[0]!.toUpperCase() + index.slice(1) },
        source: PKG,
        text: text(condition.fields.desc) ?? { en: index }
    });
}

/** Rule slugs aligned with the ids the ruleset refers to. */
const RULE_RENAMES: Record<string, string> = { "use-an-object": "use-object" };
/** Upstream data errors: the Open5e v2 rule `use-an-object` is named "Search". */
const RULE_NAMES: Record<string, string> = { "use-object": "Use an Object" };
const RULE_CATEGORY: Record<string, string> = {
    "actions-in-combat": "action",
    "movement": "movement",
    "cover": "cover",
    "between-adventures": "rest",
    "combat-sequence": "combat",
    "attacking": "combat",
    "damage-and-healing": "combat",
    "mounted-combat": "combat",
    "underwater-combat": "combat",
    "spellcasting": "spellcasting",
    "abilities": "ability",
    "saving-throws": "ability"
};
for (const ruleSet of ruleSets)
{
    const setSlug = o5e.slug(ruleSet.pk);
    const category = RULE_CATEGORY[setSlug] ?? "general";
    const own = rules.filter((r) => r.fields.ruleset === ruleSet.pk).sort((a, b) => a.fields.index - b.fields.index);
    for (const rule of own)
    {
        const ruleSlug = slug(o5e.slug(rule.pk).replace(`${setSlug}_`, ""));
        const renamed = RULE_RENAMES[ruleSlug] ?? ruleSlug;
        const name = category === "action" ? `action.${renamed}` : `${setSlug}.${renamed}`;
        write("rules", name, {
            id: id("rule", name),
            name: { en: RULE_NAMES[renamed] ?? rule.fields.name },
            source: PKG,
            category: category,
            text: text(rule.fields.desc) ?? { en: rule.fields.name },
            tags: [setSlug]
        });
    }
}

const profRows = new Map<number, number>();
for (const level of dbLevels.filter((l) => l.class.index === "wizard" && !l.subclass))
{
    profRows.set(level.level, level.prof_bonus);
}
write("tables", "proficiency-bonus", {
    id: id("table", "proficiency-bonus"),
    name: { en: "Proficiency bonus" },
    source: PKG,
    by: "level",
    rows: stepRows(profRows)
});
const slotTable = (name: string, title: string, by: string, rows: Record<string, number[]>, note?: string): void =>
{
    write("tables", `spell-slots.${name}`, compact({
        id: id("table", `spell-slots.${name}`),
        name: { en: title },
        source: PKG,
        by: by,
        rows: rows,
        text: note ? { en: note } : undefined
    }));
};
const slotRows = (classIndex: string): Record<string, number[]> =>
{
    const rows: Record<string, number[]> = {};
    const classLevels = dbLevels
        .filter((l) => l.class.index === classIndex && !l.subclass)
        .sort((a, b) => a.level - b.level);
    for (const level of classLevels)
    {
        rows[String(level.level)] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => level.spellcasting?.[`spell_slots_level_${n}`] ?? 0);
    }

    return rows;
};
const full = slotRows("wizard");
slotTable("full", "Spell slots, full casters", "casterLevel", full);
slotTable("multiclass", "Spell slots, multiclass casters", "casterLevel", full);
slotTable("half", "Spell slots, half casters", "classLevel", slotRows("paladin"));
const third: Record<string, number[]> = {};
for (let level = 1; level <= 20; level += 1)
{
    third[String(level)] = level < 3 ? [0, 0, 0, 0, 0, 0, 0, 0, 0] : full[String(Math.ceil(level / 3))]!;
}
slotTable("third", "Spell slots, third casters", "classLevel", third, "Derived from the full-caster table at ceil(level / 3); no SRD class uses it alone.");
const pact: Record<string, number[]> = {};
for (const level of dbLevels.filter((l) => l.class.index === "warlock" && !l.subclass))
{
    const slots = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => level.spellcasting?.[`spell_slots_level_${n}`] ?? 0);
    const slotLevel = slots.findIndex((n) => n > 0) + 1;
    pact[String(level.level)] = [slots[slotLevel - 1] ?? 0, slotLevel];
}
slotTable("pact", "Pact Magic slots", "classLevel", pact, "Rows are [slots, slot level].");

// ---- the ruleset's languages and alignments --------------------------------------------------------------------

// ruleset.yaml is hand-authored: only its `languages` and `alignments` keys are written, through a YAML document
// that keeps the file's comments and layout.
interface DbLanguage { index: string, name: string, type: "Standard" | "Exotic" }
const rulesetPath = resolve(CONTENT_DIR, "ruleset.yaml");
const ruleset = parseDocument(readFileSync(rulesetPath, "utf8"));
ruleset.set("languages", db.rows<DbLanguage>("Languages").map((l) => compact({
    id: l.index,
    name: { en: l.name },
    exotic: l.type === "Exotic" || undefined
})));
const languages = ruleset.get("languages", true) as { commentBefore?: string | null };
languages.commentBefore = " Written by tools/import (map stage) from the 5e-database's SRD languages; edit them there.";
interface DbAlignment { index: string, name: string, abbreviation: string, desc: string }
ruleset.set("alignments", db.rows<DbAlignment>("Alignments").map((a) => ({
    id: a.index,
    name: { en: a.name },
    abbreviation: a.abbreviation,
    text: { en: a.desc }
})));
const alignments = ruleset.get("alignments", true) as { commentBefore?: string | null };
alignments.commentBefore = " Written by tools/import (map stage) from the 5e-database's SRD alignments; edit them there.";
writeFileSync(rulesetPath, ruleset.toString({ lineWidth: 0, indentSeq: false, flowCollectionPadding: false }));

const unused = [...overlays.keys()].filter((k) => !usedOverlays.has(k));
const unusedNote = unused.length ? `; unused: ${unused.join(", ")}` : "";
console.log(`wrote ${count} entities to packages/content/srd51; overlays applied: ${usedOverlays.size}/${overlays.size}${unusedNote}`);
void SIMPLE_MELEE_MONK;
void cleanGenerated;
