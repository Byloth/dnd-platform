# 04 — Domain model

## Purpose

This document defines the concepts the whole platform is built on: what a character *is*, what content *is*, and how the two combine into a sheet that is dynamic, explainable, playable and printable. It is deliberately independent of storage, serialisation and technology.

## Principles

- **A character is choices plus state, nothing else.** Everything else on the sheet is derived, and can be recomputed at any time from the character and the content packages it references (Principle 2).
- **Content is data.** No mechanic lives in code that could live in an effect. If the engine needs code for an official mechanic, homebrew cannot reproduce it, which violates Principle 6.
- **Derivation is deterministic and traceable.** Same character + same packages = same sheet, always. Every derived value carries its provenance (Principle 3).
- **Content declares, the engine interprets, the sheet renders.** Three layers, one direction.
- **The engine is edition-neutral.** Nothing in the engine assumes 2014 or 2024 rules; a base package defines the ruleset and a character depends on one (DEC-02).

## How

### The model at a glance

```
Content packages ──(entities, features, effects, choices)──┐
                                                            ▼
Character ── choices ──▶  Rules engine  ──▶  Computed sheet ──▶ build / play / print views
          └─ state  ──▶  Play engine  ──▶  updated state (log, undo)
```

### Entities (content side)

All entities share: a stable identifier, a display name (localisable), a source, descriptive text (localisable), and tags.

| Entity | Holds | Notes |
|---|---|---|
| `Species` (Race in 2014 terminology) | Traits (features), size, speed, sub-species options, language options. | The playbook's "Feline family / Puma" is a species with a sub-species. |
| `Class` | Hit die, primary abilities, saving throw proficiencies, starting proficiencies and equipment, a level table of features and choices, subclass unlock level, spellcasting definition if any, multiclass prerequisites. | |
| `Subclass` | Additional features per level, extra spells, resources. Depends on a class. | Way of Shadow adds spells cast with Ki: the subclass declares actions with a Ki cost. |
| `Background` | Proficiencies, languages/tools, equipment, a feature, suggested personality traits. | |
| `Feat` | Prerequisites, features. | |
| `Spell` | Level, school, casting time, range, components, duration, concentration, ritual, description, damage/save/attack behaviour, scaling. | Class spell lists are relations, not copies. |
| `Item` | Type (weapon, armour, tool, gear, consumable), properties, weight, cost, damage, AC formula, magical effects (features). | Equipping an item may add effects. |
| `Condition` | Text and effects while active. | Standard conditions plus homebrew ones (the playbook's "bruised lung" is a custom condition). |
| `Rule` | Reference text used by the assistant and the cheat sheet: actions in combat, rests, cover. | Structured so the assistant can link to it. |
| `Feature` | Name, text, level, effects, choices, activation (passive or an action). | The reusable unit; other entities own features. |

### Effects: the mechanical vocabulary

An effect is a small declarative instruction. The set of effect kinds *is* the expressive power of the content format, so it must be complete enough to describe every official mechanic. Initial catalogue (to be validated against the SRD in Phase 0):

- **Modify a value**: add, set, set-minimum, multiply a derived value (AC, speed, HP max, a skill, an ability score), optionally with a formula (e.g. "AC = 10 + DEX + WIS if unarmoured").
- **Grant proficiency / expertise**: skills, saves, weapons, armour, tools, languages; possibly as a choice ("pick two").
- **Declare a resource**: name, maximum (constant or formula: "Monk level"), recharge (short/long rest, dawn, manual), display style (pips, counter).
- **Add an action**: activation type, resource cost, text, rolls involved, prerequisites ("after the Attack action"), duration/concentration.
- **Grant spellcasting**: ability, spell list, known/prepared model, slot progression table, cantrips, ritual casting.
- **Grant spells**: specific spells always known/prepared, with an optional alternative cost (Ki instead of slots).
- **Apply advantage/disadvantage** on a class of rolls, conditionally.
- **Add a condition immunity / damage resistance / vulnerability**.
- **Add a sheet section** or **add text to a section** (for purely narrative features).
- **Open a choice**: subclass, fighting style, skill, spell, ASI-or-feat, at a level.
- **Extend a table** (e.g. Martial Arts die by level, Sneak Attack dice).

Effects can be conditional on character facts (level, equipped armour, another feature present) and on play state (a condition active, a resource above zero). The condition language is deliberately small and enumerable; anything it cannot express is a signal to add an effect kind, not a code path.

### Character (player side)

**Choices** (immutable per level, versioned):
- species and sub-species; class levels in order (supports multiclass); subclass per class; background;
- ability score method and results; ASIs and feats;
- every answer to a content-opened choice (skills, languages, fighting style, spells known/prepared, expertise…);
- equipment owned and equipped; personality (traits, ideals, bonds, flaws); name, alignment, appearance, notes.

**State** (mutable during play, not versioned per level but logged):
- current HP, temporary HP, Hit Dice remaining, death save successes/failures;
- current value of every resource (Ki, slots by level, feature uses);
- active conditions and custom temporary effects with optional expiry;
- concentration (which spell); inspiration; attunement; currency; session notes.

**Snapshots**: a full copy of choices taken at each level-up and on demand, so progression can be reviewed and rolled back ([10](10-progression.md)).

### Rules engine (derivation)

Input: character choices, character state (for conditional effects), the ordered set of packages.
Output: the computed sheet.

Steps, in order:
1. **Resolve** every entity referenced by the choices; fail loudly on missing packages or entities.
2. **Collect features** from species, class levels, subclass, background, feats, equipped items, active conditions.
3. **Collect effects** from those features, filtered by their conditions.
4. **Evaluate derived values** in dependency order (ability scores → modifiers → proficiency bonus → skills, saves, AC, HP, DCs, attacks). Each contribution is recorded as a provenance entry: `{value, kind, source feature, source entity, source package}`.
5. **Assemble resources** with computed maxima, **actions** with computed bonuses, **spellcasting** blocks with slots and lists.
6. **Activate sections**: a section is present if any effect targets it or any resource/action/spell belongs to it.
7. **Validate**: unanswered required choices, prerequisites not met, illegal combinations. Produce warnings, not crashes: the sheet is always renderable.

Provenance is the basis for "explain this number" ([08](08-dynamic-sheet.md)), for debugging content packages ([06](06-homebrew-and-extensibility.md)), and for showing newcomers what changed on level up ([10](10-progression.md)).

### Play engine (state changes)

Events, each producing a new state and a log entry with an inverse for undo:
damage, heal, temporary HP, spend/restore resource, cast spell (spend slot or alternative cost, set concentration), apply/remove condition, short rest, long rest, death save, gain inspiration, note.

Rests are derived from content: each resource's recharge rule tells the engine what to restore. Nothing about rests is hard-coded per class ([09](09-play-mode.md)).

### Worked example: a level 3 Way of Shadow Monk with a homebrew feline species

- Species features: Claws (adds an unarmed attack action with 1d4 slashing), Cat's Talent-like stealth advantage, Darkvision (modify senses), keen hearing (advantage on hearing Perception), climbing speed, jump (modify a derived value with a formula).
- Class features (Monk 1–3, base package): Unarmored Defense (AC formula), Martial Arts (table: die by level; adds bonus-action unarmed strike action), Ki (declares resource, max = Monk level, short-rest recharge; adds actions Flurry of Blows 1 Ki, Patient Defense 1 Ki, Step of the Wind 1 Ki), Unarmored Movement (speed +10 ft at level 2, table), Deflect Missiles (reaction action with formula 1d10 + DEX + Monk level), Monastic Tradition (opens the subclass choice at level 3).
- Subclass features (Way of Shadow 3, private Player's Handbook package): Shadow Arts (grants spells Darkness, Darkvision, Pass Without Trace, Silence as actions costing 2 Ki, and cantrip Minor Illusion at 0 cost).
- Sections activated: Ki resource (pips), Actions (with costs), a Spells section that is *not* slot-based (because spellcasting was not granted, only spells with an alternative cost), no Spell Slots section.
- Provenance of AC 15: 10 (base) + 3 (DEX, from ability score 17) + 2 (WIS, from Unarmored Defense, Monk, base package).
- The print output ([12](12-print-and-export.md)) produces every kind of panel found in the original playbook from this data.
- Three packages contribute: base (Monk, spells, conditions), private (Way of Shadow), homebrew (species). Provenance shows which.

This example is the first fixture of the engine's test suite ([15](15-logical-architecture.md)).

## What needs to be done

1. Write the entity catalogue with required and optional fields per entity.
2. Write the effect catalogue and the condition language, then check them against every SRD class, species, background and feat; extend until nothing needs code.
3. Define the derived-value graph (which values depend on which) and the evaluation order.
4. Define the provenance record and how it is exposed to the UI and the print output.
5. Define the character document (choices, state, snapshots) and its portability guarantees ([12](12-print-and-export.md)).
6. Define the play events, their inverses and the log format.
7. Encode the worked example as the first end-to-end fixture, then one character per SRD class.

## Why

- Choices-plus-state keeps the character small, portable and always recomputable; it also makes content errata safe to apply ([10](10-progression.md)).
- A closed vocabulary of effects is the only way to make homebrew as expressive as official content while keeping the engine finite and testable.
- Provenance is cheap to produce during derivation and impossible to reconstruct afterwards; recording it from day one is what makes Principle 3 possible.
- Rests and recovery driven by resource declarations remove an entire class of per-class special cases.

## Deferred decisions

- DEC-02 Rules edition — Decided: SRD 5.1 first, engine edition-neutral, second base package later.
- DEC-03 Serialisation format — Decided: YAML + JSON Schema, JSON canonical.

## Depends on / feeds into

Depends on [01](01-vision.md), [03](03-glossary.md). Feeds into [05](05-content-model-and-sources.md), [06](06-homebrew-and-extensibility.md), [08](08-dynamic-sheet.md), [09](09-play-mode.md), [10](10-progression.md), [11](11-play-assistant.md), [12](12-print-and-export.md), [15](15-logical-architecture.md).
