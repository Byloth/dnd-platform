# Phase 0 — 07 Ruleset switching

## Purpose

DEC-02 fixes SRD 5.1 as the first ruleset and requires that the move to SRD 5.2, and eventually a selectable ruleset, be easy. This document states how that is designed into Phase 0 rather than retrofitted: the ruleset is content, the engine has no edition constants, the effect catalogue is neutral, and a test proves the mechanism before any 2024 content exists.

## Decisions

- **The ruleset is the base package.** A package manifest declares `kind: base | extension | translation`. Exactly one `base` is present in any loaded set; it ships `ruleset.yaml` ([02-content-format.md](02-content-format.md)).
- **Extensions declare what they extend.** An `extension` depends on one base through its `dependencies`, or declares `ruleset: any` when it is edition-agnostic (an item pack, a condition pack, a pure homebrew species with no edition-specific mechanics).
- **The character pins its base** in `ruleset: { id, version }` and every other package in `packages`. Switching a character to another base is not automatic; it is a new character or a manual rebuild (out of scope for Phase 0 and for the platform until DEC-18 is taken).
- **The engine reads every rule it needs from `ruleset.yaml` and from `Table` and `Rule` entities.** No proficiency table, slot progression, rest rule, condition list, base action list, ability modifier formula or hit point rule exists in TypeScript.
- **No effect kind is edition-specific.** A 2024 mechanic that cannot be expressed is handled by adding a generic kind, condition key or proficiency type that would be equally meaningful in a 2014 package.
- **A fictional second base package is a Phase 0 fixture**, so the switching mechanism is tested long before `srd52` exists.

## Design

### What the engine takes from content

| Rule | Where it lives | Engine behaviour |
|---|---|---|
| Ability list and skill list | `ruleset.abilities`, `ruleset.skills` | Value paths `ability.<a>`, `skill.<s>` are created from these lists; an unknown skill in an effect is a validation error against *this* ruleset. |
| Ability modifier | `ruleset.abilityModifier` formula | `mod(ability)` evaluates this formula with `score` bound. |
| Proficiency bonus | `ruleset.proficiencyBonus.table` | `proficiencyBonus` value path reads the table by `level`. |
| Hit points | `ruleset.hitPoints.firstLevel` and `.perLevel` | `hp.max` base contribution; progression uses the same formulas. |
| Rests | `ruleset.rests.short`, `ruleset.rests.long` | `apply` for `short-rest` and `long-rest` reads what is restored, the Hit Dice formula, the rest lengths (`hours`, which timed effects end) and `conditionLevelsRecovered` (exhaustion). |
| Concentration | `ruleset.concentration.saveDc` (formula, `damage` bound) | `apply` for `damage` reports the check with this DC; without the key the check is reported without a DC. |
| Death saving throws | `ruleset.deathSaves` (`dc`, `successes`, `failures`, `natural20`, `natural1`, `damage`) | `apply` for `death-save`, `damage` at 0 hit points and `stabilise`; without the key `death-save` is rejected. |
| Spell slots | `ruleset.spellSlots.<progression>.table` and `.multiclass` | `grant-spellcasting` with `slots.progression` resolves through the ruleset; multiclass caster level uses `casterWeight` per class. |
| Base actions | `ruleset.baseActions` (ids of `Rule` entities) | Listed in the sheet's actions with `source: ruleset`; the assistant and the cheat sheet render them. |
| Standard conditions | `ruleset.conditions` (ids of `Condition` entities) | Offered in play mode; their effects come from the entities. |

Everything in this table is a reference into the base package. A base package that lists five abilities, a d20 proficiency table or a long rest that restores nothing is legal; the engine follows it.

### What stays in the engine

Only the *semantics* of the format: how `modify` precedence works, how a step table is read, how a `when` condition is evaluated, how provenance is recorded, how canonical output is produced. These are properties of the format version, not of an edition.

### Known 2024 differences and how v0 expresses them

| 2024 change | Expressible with v0? | Generic addition if not |
|---|---|---|
| "Species" replaces "race" | Yes: the entity type is already `species`; display names are localised strings per package. | — |
| Backgrounds grant ability score increases and an origin feat | Yes: background `features` with `modify` on `ability.<a>` and an `open-choice` of `feat` filtered by tag `origin`. | — |
| Weapon mastery properties (Sap, Vex, Topple…) | Partly: the effect is an `add-action` or a `roll-advantage`/`modify` with a `wielding` condition. Missing: a proficiency type for masteries and a `wielding.mastery` key. | `grant-proficiency` gains type `weapon-mastery`; condition language gains `wielding: { mastery }`; both are meaningful in any edition that defines item properties. |
| Every class gets its subclass at level 3 | Yes: `subclassLevel` is a class field. | — |
| Exhaustion as a flat −2 per level instead of a six-step table | Yes: the condition entity's `effects` use `modify` with a formula on the condition's own level; the 2014 version uses discrete effects per level. Requires the condition to carry a numeric level. | `apply-condition` events already accept a `level`; the condition schema gains an optional `levels` range. |
| Long rest and short rest details (e.g. Hit Dice regained, interruption) | Yes: `ruleset.rests`. | — |
| Unarmed strike offers damage, grapple or shove | Yes: three `add-action` entries on a base-package feature every character has, or one action with `options`. | If needed, `add-action` gains `options: [...]` for a single action with alternative outcomes. |
| Spell list reassignment (spells moved between class lists) | Yes: spell lists are `spell-list` entities per package; the 2024 base ships its own lists. | — |
| Reworked conditions (e.g. Surprised removed, Grappled changed) | Yes: `ruleset.conditions` lists the base's own condition entities. | — |
| Heroic Inspiration on a natural 1, more sources of Inspiration | Play-mode behaviour; the inspiration event exists. Rule text differs per base. | A `Rule` entity with category `inspiration` referenced from `ruleset`; no engine change. |
| Different starting equipment and gold option | Yes: `startingEquipment` is per class and per background. | — |

Every entry in the third column is a generic extension: the same fields would be valid, and useful, in a 2014 homebrew package. That is the acceptance test for neutrality: **no addition may mention an edition in its name or its semantics**.

### Fixture: `fixtures/packages/mini-ruleset-b`

A deliberately fictional base package, small enough to read in one sitting:

```yaml
# fixtures/packages/mini-ruleset-b/package.yaml
id: minib
name: { en: "Mini ruleset B (test fixture)" }
version: 1.0.0
kind: base
defaultLanguage: en
languages: [en]
visibility: public
redistributable: true
dependencies: []
sources:
  - { id: minib, title: "Test fixture", publisher: "dnd-platform", edition: "fixture", license: CC0-1.0, attribution: "Test fixture, no rights reserved." }
```

```yaml
# fixtures/packages/mini-ruleset-b/ruleset.yaml
id: minib.ruleset
abilities: [str, dex, con, int, wis, cha]
skills:
  - { id: stealth, ability: dex }
  - { id: perception, ability: wis }
proficiencyBonus: { table: minib.table.proficiency-bonus }   # +3 at level 1, +4 at level 5 (different from srd51)
abilityModifier: "floor((score - 10) / 2)"
hitPoints:
  firstLevel: "hitDie + mod(con)"
  perLevel: "average(hitDie) + mod(con)"
rests:
  short: { hitDice: spend }
  long:
    hitPoints: full
    hitDiceRecovered: "level"                                 # all Hit Dice, unlike srd51's floor(level / 2)
spellSlots: {}
baseActions: [minib.rule.action.attack]
conditions: []
```

Plus one class (`minib.class.scout`, hit die 8, one feature per level up to 5), one species and the two tables. A fixture character `fixtures/characters/minib-scout-5/` built on `minib` has `expected.yaml` asserting a proficiency bonus of +4 with provenance pointing at `minib.table.proficiency-bonus`, and the session fixture `fixtures/sessions/minib-scout-long-rest/` asserts that a long rest recovers 5 Hit Dice, that two successes at DC 11 stabilise, that damage at 0 hit points counts two failures and that a natural 20 regains 5 hit points. The same engine build passes the `srd51` fixtures with +3 and 2 Hit Dice. If either set needs a code change to pass, the engine has an edition constant and the change is rejected.

### Future path

- **`srd52` base package.** Authored with the same pipeline ([05-srd-import-pipeline.md](05-srd-import-pipeline.md)); Open5e and the official 5.2.1 documents already cover it. Its `ruleset.yaml` differs; its entities have their own ids under `srd52.`.
- **Selection granularity (DEC-18, Phase 3).** Whether a campaign forces a base, a character chooses one, or both. The character document already carries the pin, so any answer is a policy on top of existing data.
- **Extensions compatible with two bases.** A homebrew package that works under both `srd51` and `srd52` cannot express that today: `dependencies` is a list of required packages. The manifest would need an alternative form, e.g. `dependencies: [{ anyOf: [{ id: srd51, version: "^1" }, { id: srd52, version: "^1" }] }]`, and the loader would satisfy it with whichever base is present. Deferred to the moment a second base exists (see Open points).
- **No character conversion.** A character pinned to `srd51` is never migrated to `srd52` by the platform; that is a rebuild with the creation wizard ([../07-character-creation.md](../07-character-creation.md)). Out of scope for every phase currently planned.

## Tasks

1. Implement `loadPackages` so that the single `base` in a set is located, its `ruleset.yaml` is exposed as `PackageSet.ruleset`, and a set with zero or two bases is an error diagnostic — M0.3.
2. Route every engine lookup listed in the "What the engine takes from content" table through `PackageSet.ruleset`; add an ESLint-checked convention that `engine/src` contains no numeric proficiency, slot or Hit Dice literals — M0.3.
3. Author `fixtures/packages/mini-ruleset-b` (manifest, ruleset, two tables, one class, one species, one rule) and make it validate — M0.3.
4. Author `fixtures/characters/minib-scout-5` with `expected.yaml` and a session fixture for the long rest; they pass with the same engine build as the `srd51` fixtures — M0.6.
5. Add the neutrality review step to the effect-catalogue extension procedure: every new kind, condition key or proficiency type is checked against the "no edition in name or semantics" rule and gets a test on a non-edition fixture — M0.4.
6. Record in [../17-open-decisions.md](../17-open-decisions.md) under DEC-18 the manifest form for multi-base compatibility once a second base is scheduled — M0.6.

## Open points

- Manifest form for extensions compatible with more than one base (`anyOf` in `dependencies`, or a separate `compatibleBases` list). Decide when `srd52` is scheduled; until then `ruleset: any` covers edition-agnostic packages and a dual-base package is published twice.
- Whether `ruleset.yaml` should allow a `formatVersion`-independent `extends` so that a variant base (house-rule ruleset) can inherit from `srd51` and override a few fields, rather than copying the whole file. Attractive for campaign house rules ([../14-accounts-sharing-and-campaigns.md](../14-accounts-sharing-and-campaigns.md)); not needed in Phase 0.
- Where the numeric level of a condition (exhaustion) is stored in `CharacterState.conditions`: as `{ condition, level }` entries from the start, so the 2024 form needs no state change later.
