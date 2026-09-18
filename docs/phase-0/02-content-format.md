# Phase 0 — 02 Content format v0

## Purpose

This document specifies the first version of the content format: the files a package is made of, the entities they contain, the effect catalogue that gives content its mechanics, the small languages for conditions and formulas, and how text is localised. It is the reference for the `schema` package (JSON Schema is the source of truth; TypeScript types are derived from it) and for every author of content, official or homebrew.

Everything below is edition-neutral: nothing in the format assumes 2014 or 2024 rules ([07-ruleset-switching.md](07-ruleset-switching.md)).

## Decisions

- **One entity per file**, grouped by type in directories. Diffable, reviewable, authorable in parallel; an entity never needs to know about its neighbours.
- **Identifiers** are `<package>.<type>.<name>`, lowercase, `-` inside names, `.` as separator. The package segment is the package id. Example: `srd51.class.monk`, `phb14.subclass.monk.way-of-shadow` (a subclass name may carry its class as a further segment for readability).
- **Localised strings are inline maps** keyed by language tag: `name: { en: Darkness, it: Oscurità }`. A translation package supplies the same fields for another package through `translations/<lang>/<entity-id>.yaml`. Fallback order: requested language → package default language → any.
- **YAML is authored, JSON is canonical.** `build` converts YAML to JSON with sorted keys; the engine consumes JSON only.
- **Mechanics are a closed catalogue of effect kinds.** Anything not expressible is a format gap to be filled by adding a kind, never by adding code paths for a specific entity.
- **Tables and rules are content.** Proficiency bonus, spell slot progressions, rest rules, the list of base actions live in the base package as entities.
- **Extensions are by reference, patches are explicit.** A subclass in another package extends a class simply by naming it; changing an existing entity requires a `patch` entity.

## Design

### Package layout

```
<package-dir>/
  package.yaml                  # manifest
  ruleset.yaml                  # only in kind: base
  classes/<name>.yaml
  subclasses/<class>/<name>.yaml
  species/<name>.yaml
  backgrounds/<name>.yaml
  feats/<name>.yaml
  features/<name>.yaml          # shared features referenced by id (optional; features may be inline)
  spells/<name>.yaml
  spell-lists/<name>.yaml
  items/<name>.yaml
  conditions/<name>.yaml
  rules/<name>.yaml
  tables/<name>.yaml
  archetypes/<name>.yaml        # newcomer recommendations (docs/07)
  patches/<name>.yaml
  translations/<lang>/<entity-id>.yaml
```

### Manifest (`package.yaml`)

```yaml
id: srd51
name: { en: "System Reference Document 5.1" }
version: 1.0.0
kind: base                      # base | extension | translation
defaultLanguage: en
languages: [en]
visibility: public              # public | campaign | private
redistributable: true
dependencies: []                # extensions: [{ id: srd51, version: "^1.0.0" }]
sources:
  - id: srd51
    title: "System Reference Document 5.1"
    publisher: "Wizards of the Coast"
    edition: "2014"
    license: CC-BY-4.0
    attribution: "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode."
```

An extension package:

```yaml
id: phb14
name: { en: "Player's Handbook (2014)" }
version: 0.1.0
kind: extension
defaultLanguage: en
languages: [en]
visibility: private
redistributable: false
dependencies:
  - { id: srd51, version: "^1.0.0" }
sources:
  - id: phb14
    title: "Player's Handbook"
    publisher: "Wizards of the Coast"
    edition: "2014"
    license: all-rights-reserved
    attribution: "Player's Handbook © 2014 Wizards of the Coast LLC. Personal transcription, not for redistribution."
```

Rules: `id` is unique across all loaded packages; `version` is semver; a `base` package has no dependencies and ships `ruleset.yaml`; an `extension` depends on exactly one `base` (directly or through another extension) or declares `ruleset: any` if it is edition-agnostic (e.g. a pure item pack); a `translation` depends on the packages it translates and contains only `translations/`.

### Ruleset (`ruleset.yaml`, base packages only)

```yaml
id: srd51.ruleset
abilities: [str, dex, con, int, wis, cha]
skills:
  - { id: acrobatics, ability: dex }
  - { id: stealth, ability: dex }
  # ... all 18
proficiencyBonus: { table: srd51.table.proficiency-bonus }
abilityModifier: "floor((score - 10) / 2)"
hitPoints:
  firstLevel: "hitDie + mod(con)"
  perLevel: "average(hitDie) + mod(con)"          # default; rolling handled in play/progression
rests:
  short: { hitDice: spend }
  long:
    hitPoints: full
    hitDiceRecovered: "max(1, floor(level / 2))"
spellSlots:
  full: { table: srd51.table.spell-slots.full }
  half: { table: srd51.table.spell-slots.half }
  third: { table: srd51.table.spell-slots.third }
  multiclass: { table: srd51.table.spell-slots.multiclass, casterLevel: "sum(classLevel * casterWeight)" }
baseActions: [srd51.rule.action.attack, srd51.rule.action.dash, srd51.rule.action.disengage, srd51.rule.action.dodge, srd51.rule.action.help, srd51.rule.action.hide, srd51.rule.action.ready, srd51.rule.action.search, srd51.rule.action.use-object, srd51.rule.action.cast-a-spell]
conditions: [srd51.condition.blinded, srd51.condition.charmed, srd51.condition.deafened, srd51.condition.frightened, srd51.condition.grappled, srd51.condition.incapacitated, srd51.condition.invisible, srd51.condition.paralyzed, srd51.condition.petrified, srd51.condition.poisoned, srd51.condition.prone, srd51.condition.restrained, srd51.condition.stunned, srd51.condition.unconscious, srd51.condition.exhaustion]
```

The engine reads these instead of hard-coding them. A 2024 base package supplies its own `ruleset.yaml`.

### Common fields of every entity

```yaml
id: srd51.spell.darkness        # full id, must match package + directory type
name: { en: Darkness }
text: { en: "Magical darkness spreads from a point you choose..." }   # Markdown allowed
source: srd51                   # a source id from the manifest
tags: [darkness, area, stealth] # free tags; the assistant maps tags to situations (docs/11)
page: 230                       # optional; page in the source, ignored by the engine, useful for review
```

### Entities

**Feature** — the reusable unit. May be inline inside classes, species, etc., or standalone in `features/` and referenced by id.

```yaml
id: srd51.feature.monk.unarmored-defense
name: { en: Unarmored Defense }
text: { en: "While you are wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier." }
source: srd51
effects:
  - kind: modify
    target: ac
    op: set-formula
    formula: "10 + mod(dex) + mod(wis)"
    when: { armorCategory: none, shield: false }
```

**Class**

```yaml
id: srd51.class.monk
name: { en: Monk }
text: { en: "..." }
source: srd51
hitDie: 8
primaryAbilities: [dex, wis]
savingThrows: [str, dex]
proficiencies:
  armor: []
  weapons: [simple, shortsword]
  tools: { choose: 1, from: [artisans-tools, musical-instrument] }
  skills: { choose: 2, from: [acrobatics, athletics, history, insight, religion, stealth] }
startingEquipment: { text: { en: "(a) a shortsword or (b) any simple weapon; ..." } }
multiclass:
  prerequisites: { dex: 13, wis: 13 }
  proficiencies: { weapons: [simple, shortsword] }
subclassLevel: 3
subclassChoice: monastic-tradition
casterWeight: 0                 # 1 full, 0.5 half, 0.334 third, 0 none; used by the multiclass slot formula
levels:
  1:
    features: [srd51.feature.monk.unarmored-defense, srd51.feature.monk.martial-arts]
  2:
    features: [srd51.feature.monk.ki, srd51.feature.monk.unarmored-movement]
  3:
    features: [srd51.feature.monk.deflect-missiles]
    choices: [{ id: monastic-tradition, of: subclass, count: 1 }]
  4:
    choices: [{ id: asi-4, of: asi-or-feat }]
    features: [srd51.feature.monk.slow-fall]
  # ...
tables:
  martial-arts: { by: classLevel, rows: { 1: "1d4", 5: "1d6", 11: "1d8", 17: "1d10" } }
  unarmored-movement: { by: classLevel, rows: { 2: 10, 6: 15, 10: 20, 14: 25, 18: 30 } }
  ki-points: { by: classLevel, rows: { 2: "classLevel" } }
```

A feature at level *n* is active when the character's level in that class is ≥ *n*. Tables declared on a class are addressed as `table(monk.martial-arts)` in formulas; rows are step functions (highest key ≤ lookup value).

**Subclass** — extends a class by reference; lives in any package.

```yaml
id: phb14.subclass.monk.way-of-shadow
name: { en: Way of Shadow }
class: srd51.class.monk
source: phb14
levels:
  3:
    features:
      - id: phb14.feature.monk.shadow-arts
        name: { en: Shadow Arts }
        text: { en: "You can use your ki to duplicate the effects of certain spells..." }
        effects:
          - kind: grant-spells
            spells: [srd51.spell.darkness, srd51.spell.darkvision, srd51.spell.pass-without-trace, srd51.spell.silence]
            as: always-prepared
            ability: wis
            cost: [{ resource: ki, amount: 2 }]
          - kind: grant-spells
            spells: [srd51.spell.minor-illusion]
            as: always-prepared
            ability: wis
  6:
    features: [phb14.feature.monk.shadow-step]
```

**Species** (called race in 2014 text; the entity type is `species` in both editions)

```yaml
id: homebrew.byloth.species.feline
name: { en: Feline }
source: homebrew.byloth
size: medium
speed: { walk: 30, climb: 20 }
languages: { fixed: [common], choose: 1 }
features:
  - id: homebrew.byloth.feature.feline.claws
    name: { en: Claws }
    text: { en: "Your claws are natural weapons, which you can use to make unarmed strikes. On a hit, they deal slashing damage equal to 1d4 + your Strength modifier." }
    effects:
      - kind: add-action
        action: claws
        activation: action
        rolls:
          - { type: attack, ability: str, proficient: true }
          - { type: damage, dice: "1d4", ability: str, damageType: slashing }
  - id: homebrew.byloth.feature.feline.darkvision
    name: { en: Darkvision }
    text: { en: "You can see in dim light within 60 feet of you as if it were bright light..." }
    effects:
      - { kind: modify, target: sense.darkvision, op: max, value: 60 }
  - id: homebrew.byloth.feature.feline.cats-grace
    name: { en: Cat's Grace }
    text: { en: "You have advantage on Dexterity (Stealth) checks made to move silently." }
    effects:
      - { kind: roll-advantage, on: { type: check, skill: stealth }, note: { en: "to move silently" } }
subspecies:
  - id: homebrew.byloth.species.feline.puma
    name: { en: Puma }
    features:
      - id: homebrew.byloth.feature.feline.puma.pounce
        name: { en: Pounce }
        text: { en: "Your long jump is up to twice your Strength score in feet." }
        effects:
          - { kind: modify, target: jump.long, op: set-formula, formula: "2 * score(str)" }
```

**Background**, **Feat**: `features` list plus, for backgrounds, `proficiencies`, `languages`, `equipment`, `personality` (suggested traits/ideals/bonds/flaws); for feats, `prerequisites` in the condition language.

**Spell**

```yaml
id: srd51.spell.darkness
name: { en: Darkness }
source: srd51
level: 2
school: evocation
castingTime: { activation: action }
range: { type: point, distance: 60 }
area: { shape: sphere, radius: 15 }
components: { v: true, s: false, m: { en: "bat fur and a drop of pitch or piece of coal" } }
duration: { type: timed, minutes: 10, concentration: true }
ritual: false
text: { en: "Magical darkness spreads from a point you choose within range..." }
tags: [darkness, area, obscurement]
effects: []                     # non-mechanical for the engine; description drives play
```

A damaging spell adds `rolls` and `scaling`:

```yaml
rolls:
  - { type: save, ability: dex, onSuccess: half }
  - { type: damage, dice: "8d6", damageType: fire }
scaling: { by: slotLevel, from: 3, add: { dice: "1d6" } }
```

**Spell list**: `{ id: srd51.spell-list.cleric, spells: [ids] }`. Extension packages add to it with an `extend-spell-list` effect or a patch.

**Item**: `type` (weapon, armor, shield, tool, gear, consumable, wondrous), `cost`, `weight`; weapons: `category` (simple/martial), `damage`, `damageType`, `properties` (finesse, light, two-handed, versatile: "1d10", range: {normal, long}); armor: `category` (light/medium/heavy), `ac: { base: 12, dexMax: 2 }`, `strengthMin`, `stealthDisadvantage`; magic items: `features` with effects applied while equipped/attuned, `attunement: true`.

**Condition**: `text` plus `effects` active while applied, e.g. the custom one:

```yaml
id: homebrew.byloth.condition.bruised-lung
name: { en: Bruised lung }
text: { en: "Disadvantage on Constitution saving throws and on checks against exhaustion, suffocation and forced marches." }
source: homebrew.byloth
effects:
  - { kind: roll-disadvantage, on: { type: save, ability: con } }
  - { kind: roll-disadvantage, on: { type: check, ability: con }, note: { en: "exhaustion, suffocation, forced marches" } }
```

**Rule**: reference text with a `category` (action, movement, cover, rest, combat, spellcasting, condition) and optional `summary` for the cheat sheet and the assistant.

**Table**: `{ id, by: level|classLevel|casterLevel|slotLevel, rows: { key: value } }`; values may be numbers, dice strings or arrays (slot tables: `rows: { 1: [2], 2: [3], 3: [4, 2], ... }`).

**Archetype**: a newcomer recommendation: `{ id, name, pitch, recommends: { species, class, subclass, background, abilityPriority, answers } , why: { ... } }`. Content, not code ([../07-character-creation.md](../07-character-creation.md)).

**Patch**: `{ id: phb14.patch.monk-text, target: srd51.class.monk, set: { "text.en": "..." }, append: { "levels.3.features": [..] } }`. Applied in dependency order; every patched field records the patching package in provenance.

### Effect catalogue v0

Every effect has `kind`, optional `when` (condition), optional `note` (localised).

| kind | fields | meaning |
|---|---|---|
| `modify` | `target`, `op` (`add`, `set`, `set-formula`, `min`, `max`, `mul`), `value` or `formula` | Change a derived value. `set-formula` replaces the base computation (Unarmored Defense); `max`/`min` clamp (Darkvision 60 vs 120); `add` stacks. Precedence: set-formula → mul → add → min/max, then ties broken by package order. |
| `grant-proficiency` | `type` (`skill`, `save`, `armor`, `weapon`, `tool`, `language`), `items` or `choose: { count, from }`, `expertise: bool` | Add proficiencies, possibly as a choice. |
| `declare-resource` | `resource`, `name`, `max` (number or formula), `recharge` (`short-rest`, `long-rest`, `dawn`, `manual`), `display` (`pips`, `counter`), `section?` | Create a pool. Drives the Resources section, rests and costs. |
| `add-action` | `action`, `name?`, `activation` (`action`, `bonus-action`, `reaction`, `free`, `special`), `cost: [{ resource, amount }]`, `requires: { afterAction?, condition? }`, `trigger?` (reactions), `rolls?`, `range?`, `duration?`, `concentration?`, `text?` | Something the character can do. Drives Actions, play mode, assistant combos. |
| `grant-spellcasting` | `ability`, `list`, `preparation` (`known`, `prepared`, `spellbook`), `slots: { progression: full\|half\|third\|pact }` or `{ table }`, `cantrips: { table }`, `known: { table }?`, `ritual: bool`, `focus?` | Enable slot-based casting from a list. Activates the Spellcasting and Spell slots sections. |
| `grant-spells` | `spells`, `as` (`known`, `prepared`, `always-prepared`), `ability`, `cost?` (alternative resource cost), `uses?: { count, recharge }`, `level?` | Specific spells, optionally paid with a resource instead of slots. Activates Spells without Spell slots when no spellcasting is granted. |
| `extend-spell-list` | `list`, `spells` | Add spells to a list from another package. |
| `roll-advantage` / `roll-disadvantage` | `on: { type: attack\|check\|save\|initiative\|death-save, ability?, skill?, against? }` | Conditional advantage or disadvantage; shown on the sheet, applied in play mode. |
| `defense` | `defense` (`resistance`, `immunity`, `vulnerability`, `condition-immunity`), `to: [damageType or condition id]` | Defensive traits. |
| `add-text` | `section`, `text` | Narrative content placed in a section (Senses, Features…). |
| `add-section` | `section`, `name`, `layout?` | Declare a custom sheet section; homebrew may need one. |
| `open-choice` | `choice`, `of` (`subclass`, `skill`, `spell`, `feat`, `asi-or-feat`, `fighting-style`, `language`, `tool`, `option`), `count`, `from?` (ids) or `filter?`, `level?`, `prerequisites?` | Ask the player something; answers live in the character's `answers`. |
| `define-table` | `table`, `by`, `rows` | A table addressable in formulas (alternative to `tables:` on a class). |

Targets of `modify` (the derived value paths): `ability.<a>` (score), `mod.<a>` is never a target (computed), `save.<a>`, `skill.<s>`, `ac`, `hp.max`, `hp.perLevel`, `initiative`, `speed.<walk|climb|fly|swim|burrow>`, `sense.<darkvision|blindsight|tremorsense|truesight>`, `passive.<skill>`, `proficiencyBonus`, `attack.<melee|ranged|spell>.bonus`, `damage.<melee|ranged>.bonus`, `spell.dc`, `jump.<long|high>`, `carry.capacity`, `size`. The `schema` package publishes the exact enumeration; `validate` rejects unknown targets.

### Condition language (`when`, `prerequisites`, `requires.condition`)

An object whose keys are all required (AND). Composition with `any: [..]`, `all: [..]`, `not: {..}`.

| key | value | true when |
|---|---|---|
| `level` | `{ min?, max? }` | character level in range |
| `classLevel` | `{ class, min?, max? }` | levels in that class in range |
| `hasFeature` | feature id | the feature is active |
| `armorCategory` | `none`, `light`, `medium`, `heavy` | worn armour's category (none = no armour) |
| `shield` | bool | a shield is equipped |
| `wielding` | `{ property?: finesse\|light\|…, category?: simple\|martial, twoHanded?: bool }` | an equipped weapon matches |
| `conditionActive` | condition id | the condition is applied to the character |
| `resourceAtLeast` | `{ resource, amount }` | current value ≥ amount (play state) |
| `ability` | `{ ability, min }` | ability score ≥ min (feat prerequisites) |
| `proficient` | `{ type, item }` | proficiency held |
| `species` / `class` | id | character has it |

Anything else is a validation error. New keys are added to the catalogue, with a test, when a real entity needs them.

### Formula language

Deterministic arithmetic over character facts, evaluated to a number or a dice expression.

- Literals: integers, dice strings `"1d4"`.
- Variables: `level`, `proficiencyBonus`, `hitDie`, `slotLevel` (in scaling), `score`, `hitDieCount`.
- Functions: `mod(ability)`, `score(ability)`, `classLevel(class-name)`, `table(name)` / `table(id, key)`, `max(...)`, `min(...)`, `floor(x)`, `ceil(x)`, `average(dice)`, `sum(...)`.
- Operators: `+ - * /` and parentheses. Division is real; use `floor`/`ceil`.
- No strings, no conditionals (use `when` on the effect), no recursion, no user-defined functions. A formula references derived values only through the functions above; the engine builds the dependency graph from those references.

### Choices and answers

A `choices` entry (on a class level, a feature, a background…) has `id`, `of`, `count`, and either `from` (explicit ids) or `filter` (`{ type: spell, list: srd51.spell-list.wizard, maxLevel: "ceil(classLevel(wizard)/2)" }`). The character stores `answers[<owner-id>#<choice-id>] = [ids]`. An unanswered required choice is a warning, not an error: the sheet still renders.

### Character document

```yaml
id: 0f3c...                     # opaque
name: "Reference Monk"
ruleset: { id: srd51, version: "1.0.0" }
packages:
  - { id: srd51, version: "1.0.0" }
  - { id: phb14, version: "0.1.0" }
  - { id: homebrew.byloth, version: "0.1.0" }
choices:
  species: homebrew.byloth.species.feline
  subspecies: homebrew.byloth.species.feline.puma
  classes:
    - { class: srd51.class.monk, subclass: phb14.subclass.monk.way-of-shadow, levels: 3 }
  background: srd51.background.acolyte
  abilityScores: { method: standard-array, base: { str: 11, dex: 15, con: 14, int: 8, wis: 13, cha: 8 }, bonuses: { dex: 2, wis: 2 } }
  answers:
    "srd51.class.monk#skills": [stealth, acrobatics]
    "srd51.class.monk#monastic-tradition": [phb14.subclass.monk.way-of-shadow]
  equipment:
    - { item: srd51.item.shortbow, quantity: 1, equipped: true }
    - { item: srd51.item.arrow, quantity: 20 }
  personality: { traits: { en: "..." }, ideals: { en: "..." }, bonds: { en: "..." }, flaws: { en: "..." } }
state:
  hp: { current: 24, temporary: 0 }
  hitDice: { spent: 0 }
  resources: { ki: 3 }
  conditions: []
  deathSaves: { successes: 0, failures: 0 }
  inspiration: false
  concentration: null
snapshots: []
```

### JSON Schema and types

The `schema` package ships one JSON Schema per entity type plus `package.schema.json`, `ruleset.schema.json`, `character.schema.json`, and the shared `effect.schema.json`, `condition.schema.json`. TypeScript types are generated from the schemas at build time; hand-written types are not allowed for content. Schemas are versioned with the format (`formatVersion: 0` in every manifest).

## Tasks

1. Write `package.schema.json`, `ruleset.schema.json`, `effect.schema.json` (all kinds), `condition.schema.json`, `formula` grammar as a documented regular grammar, and one schema per entity type — M0.2.
2. Generate TypeScript types from the schemas; publish the enumerations of `modify` targets, sections, activation types, proficiency types — M0.2.
3. Write the three example packages of this document as real files (`fixtures/packages/srd51-excerpt`, `fixtures/packages/homebrew-feline`, `fixtures/packages/phb14-stub`) and make them validate — M0.2.
4. Implement the formula parser and evaluator with a table of test cases — M0.3.
5. Implement the condition evaluator with a test per key — M0.3.
6. Walk every SRD 5.1 class, subclass, species, background and feat feature and record which effect kinds it needs; extend the catalogue where needed, each extension with a test — M0.4.
7. Write the authoring guide (`docs/content-authoring.md` in the repository) from this document once the schemas exist — M0.5.

## Open points

- Whether inline features inside classes should be forbidden in the base package (standalone files only) to make translation files simpler. Leaning: allow inline for one-off features, standalone for anything referenced twice.
- Exact spelling of the 2014 skill and damage-type identifiers (`sleight-of-hand`, `animal-handling`) — fix in `ruleset.yaml` and the schema enumeration at M0.2.
- Whether `grant-spells` with `cost` should also record a `uses` limit for the "once per long rest without a slot" pattern, or whether that is a separate `uses` field on the effect. Decide when the first such feature is authored (M0.4).
- Dice expression grammar: `NdM`, `NdM + K`, `NdM kh1`? Keep to `NdM` and `NdM+K` in v0.
