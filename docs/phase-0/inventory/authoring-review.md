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

- **`cap` operator for `modify`** (M0.6): `op: max` is a floor (Darkvision 60 vs 120), so "+1 to a maximum of 20" (most PHB feats) cannot be expressed; v0 authors `add 1` plus a note.
- **Additive v0 extension for the play engine (M0.7, no migration):** optional ruleset keys `concentration.saveDc`, `deathSaves`, `rests.short.hours`, `rests.long.hours`, `rests.long.conditionLevelsRecovered`; the formula variable `damage`; `state.turn.active`; no cap on `state.deathSaves` counts (the thresholds are the ruleset's). Every existing package stays valid; a ruleset without the new keys gets no concentration DC and a rejected `death-save` event. Candidates that surfaced while implementing `apply`: play effects with `target: other` need a target model (Phase 2), a "combat over" event for minutes and rounds outside rests, a `castingMod` variable for healing spells; `removeCondition` is already listed above.
- **`campaign.selection` / `character.selection`** (DEC-20, M0.6): the content selection is an engine input and a fixture-harness field for now; the document field belongs to the campaign entity of Phase 6 and enters the format with v1.

- **From the Player's Handbook transcription (M0.6, private package):** play effects and modifiers that land on *another* creature (temporary hit points or healing granted to an ally, advantage/disadvantage imposed on a target, conditions the target suffers from a feature, auras); an `onHit` hook on spells ("the next time you hit" riders); forced movement and teleport play effects; condition removal; contested checks; a flat damage reduction; per-target cooldowns; "all damage types except X"; ritual-only and at-will spell grants next to slot casting; variable costs (ki to upscale, any-level slot); a choice count that grows with level; a school filter on `grant-spellcasting`; a proficiency block mixing fixed entries and a choice; roll-table and stat-block entities.

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

## Bugs found by the golden fixtures (M0.5) and their fixes

Fifty-nine fixtures with hand-computed expectations (one per class at levels 1, 5, 11, 20, plus multiclass, items, conditions, species and subspecies coverage) surfaced these defects, all fixed with the test kept:

- Shields added no Armour Class: the generator typed them as gear and the engine had no shield term. Both fixed.
- The Cleric lacked its 12th-level Ability Score Improvement and the Warlock its 16th: Open5e misses those rows; ASI levels now come from 5e-database's per-level bonus counts.
- Features without level rows upstream (Druid's Timeless Body) landed at level 1; the level now falls back to 5e-database.
- Spells and languages chosen through feature choices (High Elf cantrip, Bonus Cantrip, Extra Language) never reached the sheet; answered `open-choice` of spell, skill, tool or language now produce spells and proficiencies.
- `open-choice.level` was ignored (Mystic Arcanum, Magical Secrets, Expertise at 10 registered early); choices now open at their level.
- Half casters prepared `level + modifier` spells instead of `⌊level/2⌋ + modifier`.
- Multiclass characters received saving throws and full proficiencies from every class; only the first class grants them, later classes grant their multiclass proficiencies.
- `wieldingOnly` was false with nothing wielded, so Martial Arts never applied to a bare-handed Monk; an empty hand now satisfies "unarmed or wielding only".
- Initiative ignored bonuses to all ability checks (Jack of All Trades); it is an ability check.
- Two `grant-proficiency` picks on one feature collided on the same answer key (Rogue and Bard Expertise): `choose.id` added and both overlays rewritten; expertise now doubles.
- Font of Inspiration was text only: modelled as a recharge override; a short-rest recharge now also lists the long rest.
- Duplicate action ids with `when` variants (Divine Strike 1d8/2d8) warned instead of picking the applicable one.
- Rage at 20th level is unlimited (override on the resource maximum).

Still open, recorded for v1: attunement limit not enforced; option prerequisites on inline options not checked; choice counts fixed at the level gained (Metamagic, Invocations); pact slots cannot be stored in the character state schema (now allowed as `pact`); `always-prepared` at-will spells display as slot-paid; spell-typed choices (Spell Mastery, Signature Spells) list the spell but not its free casting.

## Fixes applied during the wave

- Lightfoot ability score increase not generated: subrace matching by name added to the generator.
- Paladin's `channel-divinity` pool declared on Sacred Oath (no partition owned it).
- Equipment packs and ammunition items generated from 5e-database (Open5e lacks them); spell lists taken from 5e-database (Open5e mixes domain spells into class lists and lacks the paladin list).
- Rule id `use-object` aligned between ruleset and generated rules.
- Reference validation ignores `modify` targets (value paths, not entity ids).
