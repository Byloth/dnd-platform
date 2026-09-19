# Mechanics authoring — review notes (DEC-19, hybrid)

Decision taken on 2026-09-19: agents draft the overlay, a human reviews. This document collects what the drafting agents flagged as uncertain, grouped by the decision it needs, so the review pass is targeted. Every overlay file validates against the schemas (`check-overlay`), the base package loads in the engine with every reference resolved, and the golden fixtures pass; what follows is about *meaning*, not shape.

## Numbers

| Partition | Records | Files written | Skipped (text-only or already structured) |
|---|---|---|---|
| features-1 Barbarian, Bard, Cleric (+ subclasses) | 41 | 38 | 3 ASI |
| features-2 Druid, Fighter, Monk (+ subclasses) | 40 | 35 | 2 text-only, 3 ASI |
| features-3 Paladin, Ranger, Rogue (+ subclasses) | 49 | 44 | 2 text-only, 3 ASI |
| features-4 Sorcerer, Warlock, Wizard (+ subclasses) | 29 | 24 | 1 text-only, 3 ASI, 1 reference list |
| features-5 species, subspecies | 65 | 24 | speed/age/alignment/size/languages and generated ASI/darkvision |
| spells-2 (levels 3–9 half) | 75 | 67 | 8 with nothing executable |
| spells-1 (levels 0–2 and 3–9 first half) | 76 | 72 | 4 with nothing executable |
| items-1 | 75 | 74 | 1 text-only |
| items-2 | 75 | 74 | 1 text-only |
| items-3 | 73 | 73 | — |

Outcome after regeneration: 572 overlay files applied; class features with mechanics 98 of 124 (the 26 without are subclass-choice and ASI features whose choices live on the class levels, plus text-only ones), subclass 57 of 60, species traits 49 of 93 (the rest are speed, age, alignment, size and languages, structured elsewhere), spells with active effects or cast effects 149 of 319 (the others carry generated rolls only or are utility text), magic items with mechanics 221 of 239.

## Spell and item conventions that need an engine decision

- Option-dependent conditions (Blindness/Deafness, Eyebite, Contagion, Command, Divine Word): the overlays list every possible `applyCondition` with a note; the play engine must present them as a choice, never apply all.
- Instantaneous spells with `effects` (Feeblemind): the engine applies spell effects only while a spell is tracked as active; instantaneous permanent effects need a `permanent: true` flag or a custom effect on the character.
- One-shot bonuses expressed as `modify` while active (Guidance, Resistance, Bless-style dice): shown permanently while active; the play engine should consume them on use (v1: `consumedOnUse`).
- "Score is 19 unless higher" uses `op: min`; "+2 to a maximum of 20" cannot be expressed (`max` is a floor in the engine's precedence table, see 02); add a `cap` op in v1.
- Non-recharging charges use `recharge: [{ on: manual, amount: 0 }]`; day-based and dusk recharges are `manual` with a note; add `days` and `dusk` recharge triggers in v1.
- Items with rarity variants (+1/+2/+3, Ammunition, Armor, Potion of Healing tiers): either `open-choice` options or the +1 value with a note; v1 should split them into one entity per variant at import time.
- `defense.to` free strings (`nonmagical-damage`, "damage from ranged weapon attacks"): validated as strings; add tags for damage sources in v1.
- Spell-level costs, spell storage, stat-block summons and polymorph remain notes (D10).

## Catalogue gaps confirmed by authoring (candidates for v1)

- **Variable costs.** Twinned Spell (cost = spell level), Lay on Hands (any amount from the pool), Divine Smite/Primeval Awareness at higher slot levels: `cost` is a fixed number. Proposal: `cost.amount` may be a formula with a `chosen` variable, or a `costRange`.
- **Choice counts that grow with level.** Metamagic, Eldritch Invocations, Expertise at two levels: `open-choice.count` is an integer. Proposal: allow a formula (`table(sorcerer.metamagic-known)`) and level-gated picks.
- **Recharge changes.** Font of Inspiration: expressed as `modify resource.bardic-inspiration.recharge set short-rest`, which the engine now honours; the catalogue table should say so.
- **Per-weapon scoping.** Sacred Weapon, Hunter's Mark, Magic Weapon, Shillelagh, Thirsting Blade: `modify-attacks.filter` has `item` but no "the weapon you chose"; proposal: a `chosenItem` filter bound to a play-time selection.
- **Spellcasting ability in formulas.** Healing spells, Dark One's Blessing: no `mod(spellcasting)` variable. Proposal: `castingMod` variable resolved from the granting class.
- **Full-restore amounts.** Resurrection ("all its hit points"), Eldritch Master: `heal`/`restoreResource` amounts need a `full` literal or an `hp.max` variable.
- **Incoming-roll modifiers.** Reckless Attack, Escape the Horde, conditions like Blinded: "attacks against you have advantage" has no target. Proposal: `roll-advantage.on.incoming: true`.
- **Toggle end conditions.** Persistent Rage, Wild Shape duration formula, Frenzy exhaustion on rage end: expiries are fixed; proposal: `expires: { formula }` and an `onEnd` play effect.
- **Condition removal.** Lesser Restoration, Stillness of Mind: no `removeCondition` play effect. Add it.
- **Duplicate action ids across features.** Rogue and Hunter both declare `uncanny-dodge`; the engine should merge identical ids or content should namespace them.

## Modelling choices to confirm in review

- Expertise: features-1 used two `open-choice` of skill without doubling; features-3 used `grant-proficiency choose` with `expertise: true` (the engine applies the doubling). **Decision: the second form; `choose.id` now exists for features with two picks.** Bard's overlay must be rewritten accordingly.
- ASI features carry no choice (the class levels do). Consistent across partitions; keep.
- Subclass choice lives on the class level (`<class id>#<subclassChoice>`), not on the feature; the generator was changed to match the excerpt. Keep.
- Draconic Ancestry / Dragon Ancestor / Fiendish Resilience / Circle of the Land / Favored Enemy: inline options with `add-text` or `grant-spells`; per-option mechanics gated with `answer`. Keep.
- Breath Weapon: 2d6 with scaling in a note; a class-like table on a species feature is not addressable. Acceptable for v0.
- Lucky (halfling): an action with `reroll` play effects. Keep (the catalogue names it as the example).
- Relentless Rage / Overchannel: `unlimited` counters to track uses. Keep, document the pattern.
- Fighting Style options duplicated across Fighter, Paladin, Ranger overlays. Acceptable; a shared `features/` entity would be cleaner in v1.
- Improved/Superior Critical rely on later-feature precedence for `critRange`. Verify in the engine once `modify-attacks` is assembled (M0.5).
- `answer.choice` is used with the bare choice id everywhere; the evaluator accepts both forms. Keep.
- `trigger` is used on `special` actions ("when you hit"). Keep; document.
- Devil's Sight as darkvision 120 with a note. Keep.
- Draconic Resilience counts character levels, text says sorcerer levels: `hp.perLevel` should be class-scoped; engine change in M0.5 (multiply by the owning class level when `ownerClass` is set).

## Fixes applied during the wave

- Lightfoot ability score increase not generated: subrace matching by name added to the generator.
- Paladin's `channel-divinity` pool declared on Sacred Oath (no partition owned it).
- Equipment packs and ammunition items generated from 5e-database (Open5e lacks them); spell lists taken from 5e-database (Open5e mixes domain spells into class lists and lacks the paladin list).
- Rule id `use-object` aligned between ruleset and generated rules.
- Reference validation ignores `modify` targets (value paths, not entity ids).
