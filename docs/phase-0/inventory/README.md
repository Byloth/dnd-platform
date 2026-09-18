# SRD 5.1 inventory — findings and catalogue revisions

Outcome of M0.2 part A (2026-09-18). The whole SRD 5.1 was inventoried from the pinned upstream datasets and every feature, spell and magic item was classified against the effect catalogue v0 of [02-content-format.md](../02-content-format.md) by seven parallel agents on a fixed vocabulary ([classification-vocabulary.md](classification-vocabulary.md)), merged and validated by `tools/import/src/merge-classification.ts`. This document is the human review: what the evidence says, and the revisions to apply to the catalogue before the schemas are written (M0.2 part B).

Files in this directory: `00-summary.md` (counts), `classes.md`, `subclasses.md`, `species.md`, `backgrounds.md`, `feats.md`, `spells.md`, `items.md`, `conditions.md`, `rules.md` (the inventory, generated), `features.yaml`, `spells-classification.yaml`, `magic-items-classification.yaml` (skeletons, generated), `classification.yaml`, `spells-classified.yaml`, `magic-items-classified.yaml` (merged classifications), `classification.md` (generated summary with every proposal and every low-confidence record).

## Numbers

| Set | Records | Text-only | Need a new kind | Low confidence | Medium |
|---|---|---|---|---|---|
| Features, traits, benefits | 391 | 43 (11%) | 18 (5%) | 4 | 107 |
| Spells | 319 | 89 (28%) | 27 (8%) | 1 | 94 |
| Magic items | 239 | 16 (7%) | 15 (6%) | 1 | 48 |

Reading: the catalogue v0 expresses about 95% of the SRD as classified. The remaining 5% clusters into a handful of generic gaps, listed below with a decision each. Two further findings are more important than any single gap: **play-mode is a quarter of everything** (92 features, 125 items and most damaging spells have mechanics that live in play events, not in sheet derivation), and **`modify` needs to reach attacks, checks and resources**, which it cannot today.

## Decisions on the catalogue

Each item says what the evidence was, what changes in the format, and what stays a known limitation.

### D1. Add a kind `modify-attacks`

Evidence: Martial Arts and Ki-Empowered Strikes (`modify-attack`, 2), Improved and Superior Critical (target `attack.critRange` proposed), Extra Attack in four classes (target `attacks.perAction` proposed), Fighting Style options, Sacred Weapon, every +N weapon and 6 `modify-item` items (Sun Blade, Dwarven Thrower, Vorpal Sword…), and the weapon-rider spells (Magic Weapon, Shillelagh, Hunter's Mark).

Decision: one generic kind that changes attack rows selected by a filter: `{ kind: modify-attacks, filter: { unarmed?, item?, property?, category?, ranged? }, set: { ability?, damageDie?, damageType?, magical?, critRange?, attackBonus?, damageBonus?, extraDamage?, properties+? } }`. `attacks.perAction` becomes a plain `modify` target. Per-weapon +N bonuses stop abusing `attack.melee.bonus` (which stays for global bonuses).

### D2. `modify` reaches checks, resources, ability maxima, and accepts dice

Evidence: Remarkable Athlete, Jack of All Trades, Stone of Good Luck (raw ability checks); Font of Inspiration, Archdruid, Rages "Unlimited" (`modify-resource`, 2 + 1); Primal Champion and the manuals (ability score cap); Bless, Bane, Guidance (dice-valued bonuses).

Decision: new `modify` targets `check.<ability>`, `check.all`, `save.all`, `resource.<id>.max`, `resource.<id>.recharge`, `ability.<a>.max`, `attacks.perAction`, `damage.spell.bonus`; `max` may be the literal `unlimited`; `value` may be a dice string, shown as "+1d4" and rolled in play mode. No `modify-resource` kind.

### D3. Starting equipment is entity data, not an effect

Evidence: 8 class Equipment records (`grant-items` / `grant-equipment`), the Acolyte equipment benefit.

Decision: no kind. `Class.startingEquipment` and `Background.equipment` become structured: `{ fixed: [items], choices: [{ options: [[items]] }] }`, consumed once by character creation ([../../07-character-creation.md](../../07-character-creation.md)) and turned into inventory. The `open-choice.of` enumeration gains `equipment` and `ability` (Half-elf's two +1s).

### D4. Play effects get a vocabulary of their own

Evidence: `play-mode` on 92 features and 125 items; `restore-resource` (Sorcerous Restoration, Arcane Recovery, Eldritch Master); healing on use (Second Wind, Lay on Hands), extra damage on hit (Sneak Attack, Divine Smite, Flame Tongue), temporary hit points, rerolls, imposing conditions.

Decision: `add-action` (and features, for passive triggers) may carry `onUse`, `onHit`, `onRest`, `onTurnStart` lists of **play effects**: `heal`, `tempHp`, `extraDamage`, `restoreResource` (amount or formula, optional budget), `applyCondition`, `reroll`, `note`. The play engine executes the ones it implements and shows the note for the rest; the sheet renders the action either way. `declare-resource.recharge` becomes a list allowing partial amounts: `[{ on: short-rest, amount: 4 }, { on: long-rest, amount: full }]`. No `restore-resource` kind.

### D5. Toggles: player-controlled states declared by features

Evidence: Rage (benefits "while raging"), Dragon Wings (`featureToggled`), Hide in Plain Sight, Wild Shape's transformed state, Patient Defense until next turn; the agents modelled these as `conditionActive` with invented condition ids.

Decision: a feature or action may declare `toggle: <state-id>` (with optional duration/expiry); `when: { toggled: <state-id> }` gates effects. Toggles are play state, shown as switches in play mode. `conditionActive` stays for real conditions only.

### D6. Spell effects apply while the spell is active

Evidence: `spell-granted-action` (12) + `add-action` (10) among spells; `buff-modify` on 66 spells (Haste, Barkskin with a minimum AC, Shield of Faith…); resistances granted by spells.

Decision: no new kind. `Spell.effects` may contain `add-action`, `modify`, `roll-advantage`, `defense`, `modify-attacks`; the play engine applies them to the target while the spell is tracked as active (concentration or timed duration, [../../09-play-mode.md](../../09-play-mode.md)). The action Haste grants appears on the target's sheet only while Haste is active.

### D7. Condition keys to add

Evidence: `answer` (4, Dragonborn), `wieldingAll` (4, Dueling and Martial Arts), `knowsSpell` (2), `featureToggled` (1, solved by D5), `armorStrengthUnmet` (1).

Decision: add `answer: { choice, is }`, `wieldingOnly: { … }` (every wielded weapon matches, optional count), `knowsSpell: <spell-id>`, `toggled` (D5), `armorStrengthUnmet: true` (the engine knows both numbers). Rejected: `situation` (Stonecunning, Artificer's Lore) and `movementUsed` (Supreme Sneak) are player-asserted or turn-tracker facts; they stay `add-text` with a reminder in play mode.

### D8. Choices with option entities

Evidence: Draconic Ancestry (a table that is really the options of a choice, each with a damage type and breath shape), Fighting Style, Metamagic, Hunter's options, Eldritch Invocations (one record bundling ~32 options, low confidence).

Decision: `open-choice` may carry inline `options: [{ id, name, text, effects, prerequisites }]`; an option's effects apply when chosen (equivalent to `answer` gating, but self-contained). Invocations and similar lists are authored as one option each. The Draconic Ancestry "table" is not a `define-table`.

### D9. Vocabulary widenings without new kinds

- `defense.to` accepts, beyond damage types and conditions, the ids `disease`, `magical-sleep`, and a spell id (Brooch of Shielding). Validated against that union.
- `roll-advantage.on.against` is a descriptive tag list (creature types, "magic", "the target of your Hunter's Mark") shown to the player, not evaluated by the engine, because the engine does not know the enemy.
- `grant-proficiency` is added to the magic-item vocabulary (Belt of Dwarvenkind, Bracers of Archery, Elven Chain, Sun Blade); an item may scope the proficiency to itself (`items: [self]`).
- Magic items that change their own base item (Mithral Armor, Sun Blade's finesse, Dwarven Thrower's thrown) declare the full item properties themselves; the base item is only a reference for the name. No `modify-item` kind.
- `grant-spells` gains `level` (cast at a fixed slot level, e.g. Infernal Legacy's Hellish Rebuke at 2nd) and `uses: { count, recharge }`.
- `add-action.cost` may name spell slots (`{ resource: spell-slot, level: 1 }`) for Divine Smite and Primeval Awareness; `add-action.dc` may declare a save DC formula (Ki, Breath Weapon).
- `define-table` rows whose key duplicates are rejected by `validate` (the Open5e 2nd-level slot columns carry a duplicated key `4`; the import takes slot tables from 5e-database `Levels`, not from Open5e columns).

### D10. Known limitations, accepted for v0

- **Stat-block replacement** (Wild Shape, Polymorph, True Polymorph, Shapechange, Animal Shapes, Magic Jar): the sheet shows the feature or spell, its uses and its action; the transformed statistics are not computed. Design belongs to Phase 2 as a play-mode "alternate form" state (`../../09-play-mode.md`). 6 records.
- **Spell storage** (Ring of Spell Storing, Rod of Absorption, Ioun Stone of Reserve): a resource with a level budget and stored spells, Phase 2. 3 records.
- **Apply-spell-effect** (Purity of Spirit, Tranquility): modelled as the spell's concrete effects written on the feature (`defense`, `roll-disadvantage`, `add-text`), not by reference. 2 records.
- **Mirror Image**, contested checks, forced movement, "can't regain HP" riders and similar: play-mode text, no engine state. Listed in `classification.md` under low confidence and in notes.
- Mounts, vehicles and familiars are not sheets of their own in Phase 0.

## Consequences for the schemas (M0.2 part B)

1. Effect kinds: 14 → 15 (`modify-attacks` added; nothing removed).
2. `modify`: targets enumeration extended (D2); `value` accepts dice; `unlimited` literal for resource maxima.
3. `declare-resource.recharge`: list of `{ on, amount }`.
4. `add-action`: `onUse`/`onHit`/`onTurnStart`, `dc`, `cost` with spell slots, `toggle`.
5. Feature: `toggle`, `onRest`, `onTurnStart`.
6. `open-choice`: inline `options`, `of` gains `equipment` and `ability`.
7. Condition language: `answer`, `wieldingOnly`, `knowsSpell`, `toggled`, `armorStrengthUnmet`.
8. Class and Background: structured `startingEquipment`.
9. Spell: `effects` allowed kinds documented; Item: full self-declared properties for magic variants; `grant-spells.level` and `uses`.
10. Play-effect vocabulary as its own schema (`play-effect.schema.json`), shared by actions, features, items and spells.
11. Character state: `toggles: [{ state, since, expires }]`, `activeSpells: [...]`.

## Data issues found upstream (to handle in the import)

- Open5e 2nd-level spell-slot columns for bard, cleric, druid, sorcerer and wizard have a duplicated level key `4`; slot tables are imported from 5e-database `Levels` instead.
- Druid Timeless Body has no level row upstream (text says 18th); the import sets it.
- Structured `saving_throw_ability` disagrees with the text for Animal Friendship, Detect Thoughts, Ray of Enfeeblement, Beacon of Hope, Gaseous Form, Haste, Heroes' Feast, Shapechange, Glyph of Warding, Symbol, Irresistible Dance, Earthquake, Holy Aura; `attack_roll` is false for Inflict Wounds; `damage_roll` is empty for Phantasmal Killer, Weird, Delayed Blast Fireball and partial for Flame Strike and Meteor Swarm. The text wins; the import records these as overrides.
- The Warlock invocation list is one feature upstream; it is authored as options (D8).

## What happens next

M0.2 part B applies D1–D9 to [02-content-format.md](../02-content-format.md), then writes the JSON Schemas, the generated types, the three example packages and `dnd validate`. The classification files stay as the acceptance evidence: when the base package is authored (M0.4–M0.5), a script will check that every record classified with a kind is authored with that kind, and every `text-only` record has no effects.
