# 08 — Dynamic sheet

## Purpose

This document specifies the character sheet as a *composition of sections* driven by content, not a fixed template. It defines the section catalogue, the rules that decide which sections exist for a given character, the three layout modes (build, play, print), the information hierarchy for newcomers, and the "explain this number" behaviour built on provenance from [04](04-domain-model.md).

## Principles

- **Sections are activated by content, never by template** (Principle 5). A section exists because a feature, resource, action or spell belongs to it. An empty section is a bug in the content or the composer, never something to show.
- **Names on the sheet, full text one tap away** (Principle 4). The playbook's strongest idea: page 2 lists feature *names*, page 3 gives the *text*. The sheet reproduces that split: the summary layer is the sheet, the detail layer opens on demand.
- **Every number is explainable** (Principle 3). Any derived value opens its provenance in newcomer language.
- **Same data, three views.** Build, play and print are layouts over the same computed sheet; they never compute anything themselves.
- **Homebrew sections are ordinary sections** (Principle 6). A package can declare a new section and target it exactly like the base package does.

## What needs to be done

1. Write the section catalogue below as a formal registry: identifier, activation rule, contents per mode, default priority.
2. Define the *section composer*: input the computed sheet, output an ordered list of active sections with their content, for a given mode and help level.
3. Define the activation rules as predicates over the computed sheet (has resource X, has any action of type Y, has spellcasting, has spells without spellcasting, has items…).
4. Define how a package declares a section (identifier, localised title, default priority, activation predicate, icon slot) and how effects target it (`add to section`, `add text to section`).
5. Define the detail layer: for each summary element (feature name, action, spell, resource) what its expanded view contains.
6. Define the provenance presentation: the newcomer wording for each contribution kind, the regular wording, the expert (raw) view.
7. Define the ordering rules and per-user overrides (pin, collapse, reorder within limits).
8. Define validation warnings surfaced on the sheet (unanswered choice, unmet prerequisite, missing package).
9. Encode the reference Monk's sheet as the first golden output of the composer (list of active sections and their content) alongside a full caster and a martial class with no resources, to cover the three shapes.

## How

### Section catalogue

Priority is the default position in build and play (1 = first). Print has its own layout ([12](12-print-and-export.md)) but consumes the same list.

| Section | Activated by | Build mode shows | Play mode shows | Print | Priority |
|---|---|---|---|---|---|
| **Identity** | always | name, species, class levels, subclass, background, alignment, player, portrait, XP or milestone | name, class/level, portrait thumbnail | cover + sheet header | 1 |
| **Vital block** | always | AC, initiative, speed(s), HP max, Hit Dice, proficiency bonus, each with provenance | current HP / temp HP / max, AC, speed, death saves when at 0 HP, inspiration | the five "shields" of the playbook | 2 |
| **Ability scores** | always | six scores with modifier and save, editing per ability score method | six modifiers as roll buttons, scores secondary | full | 3 |
| **Saving throws** | always | proficiency marks, totals, provenance | roll buttons | full | 4 |
| **Skills** | always | 18 skills, proficiency/expertise marks, totals, provenance; passive Perception | roll buttons, passive Perception | full | 5 |
| **Senses & passive** | any effect modifying senses (darkvision, blindsight…) or any passive score other than Perception | list with ranges | list | inline with skills | 6 |
| **Resources** | at least one declared resource other than spell slots and Hit Dice | maximum with provenance, recharge rule in plain words | pips or counters, spend/restore, recharge hint ("back after a short rest") | pips with fillable boxes | 7 |
| **Actions** | at least one action granted by a feature, item or species | list grouped by activation type with cost, text summary, prerequisites | primary play surface: roll/use buttons, grouped Action / Bonus action / Reaction / Other, greyed when resource is empty | the "your main actions" panel | 8 |
| **Attacks** | at least one equipped weapon, natural weapon or unarmed strike action | table: name, type, ability used, to-hit, damage, properties, provenance | to-hit and damage buttons, per-attack breakdown | attack table | 9 |
| **Spell slots** | `grant spellcasting` present (including multiclass slot table, pact slots as a separate resource) | slots per level with provenance, spellcasting ability, save DC, attack bonus | slots as pips per level, DC and attack bonus visible | slot boxes | 10 |
| **Spells** | any spell known, prepared or granted (with or without spellcasting) | known/prepared management, per-level lists, cost shown per spell (slot or alternative cost such as Ki), preparation limits | cast buttons grouped by level or by cost; concentration flag; ritual flag | spell cards | 11 |
| **Features & traits** | always non-empty (every character has species traits and a class feature) | grouped by origin (species, class, subclass, background, feats, items); name + one-line summary; expanded text | names only, tap to expand; passive features de-emphasised, ones with actions link to Actions | full text pages (the "support sheet") | 12 |
| **Equipment & inventory** | always | owned items, equipped state, attunement, currency, weight if tracked | quick toggle equipped, consumables with use buttons | list with blank lines | 13 |
| **Personality** | always | traits, ideals, bonds, flaws, backstory, appearance | collapsed, one tap | the four panels | 14 |
| **Conditions & temporary effects** | always in play mode; in build mode only if something is active | list of active conditions with their text and mechanical effects | add/remove, expiry, custom temporary effects ("bruised lung"), effects applied to rolls shown as badges | blank boxes | 15 |
| **Notes** | always | free text, session notes | quick note field | blank lines | 16 |
| **Proficiencies & languages** | always | armour, weapons, tools, languages with provenance | collapsed | full | 17 |
| **Credits & sources** | always | list of packages and sources in use with attribution | hidden | last page | 18 |
| **Homebrew-declared sections** | package predicate | as declared | as declared | as declared | as declared (clamped between 6 and 16) |

### Conditional activation rules, with examples

- **Ki** appears because the Monk class declares a resource named Ki with maximum `Monk level` and short-rest recharge. No Monk-specific code; a homebrew "Psion" declaring "Psi points" gets the same section behaviour.
- **Spells without slots**: a Way of Shadow Monk's subclass grants Darkness, Darkvision, Pass Without Trace, Silence with an alternative cost of 2 Ki and Minor Illusion at 0 cost. The Spells section is active (spells exist), the Spell slots section is *not* (no `grant spellcasting`). Each spell card shows its Ki cost, and casting spends Ki, not a slot.
- **Rage**: a Barbarian's Rage feature declares a resource (uses per long rest, from a table) and a bonus action. Result: a Resources entry with pips and an Actions entry under Bonus action, exactly like Ki and Flurry of Blows.
- **Fighter with no resources at level 1**: no Resources section at all. Second Wind at level 1 declares a resource of 1 use per short rest, so the section appears only if the class table grants it; Action Surge adds another line at level 2.
- **Attacks without weapons**: an unarmed strike action from Martial Arts or Claws activates Attacks even with an empty inventory.
- **Senses**: a human with no darkvision has no Senses section; a feline-species character (darkvision, keen hearing) does.
- **Multiclass caster**: one Spell slots section computed from the multiclass table, with Spells grouped by class.

### Information hierarchy for newcomers

Three layers, derived from the playbook's structure:

1. **Summary layer (the sheet).** What the character *has* and the numbers to roll. Feature names, action names with costs, spell names with costs, resource pips.
2. **Detail layer (one tap).** The full rules text of the tapped element, its source, and its mechanical consequences in plain words: "Flurry of Blows — 1 Ki, Bonus action. Right after you take the Attack action, make two unarmed strikes. You have 3 attacks in total this turn."
3. **Tactical layer (the assistant, [11](11-play-assistant.md)).** Why and when to use it, combos, common situations. Rendered as a separate tab in play mode and as the tactical guide in print.

Help level adjusts the layers: *newcomer* shows the one-line summary under every name and surfaces the tactical layer by default; *regular* shows names only; *expert* hides summaries and shows raw values and provenance inline.

### "Explain this number"

Every derived value is tappable. The view lists the provenance entries in newcomer wording, then offers the regular and expert views.

Mock, AC 15 (newcomer):

```
Armor Class 15
How it is built:
  10   Everyone starts from 10.
  +3   Your Dexterity (17) gives +3.            ← Ability scores
  +2   Unarmored Defense: as a Monk with no armour you also add
       your Wisdom (15) → +2.                    ← Monk, level 1, base package
You are not wearing armour or a shield. Wearing armour would turn Unarmored Defense off.
```

Mock, Stealth +5 (newcomer):

```
Stealth +5   (Dexterity)
  +3   Your Dexterity gives +3.
  +2   You are proficient in Stealth: add your proficiency bonus (+2).   ← Criminal background
Also: you roll with advantage to move silently thanks to Cat's Talent.  ← Feline species
Tap "Roll" in play mode to roll d20 + 5.
```

Expert view of the same: the raw provenance list `{value, kind, feature, entity, package@version}` and the formula.

### Layout modes

| | Build | Play | Print |
|---|---|---|---|
| Goal | choose, edit, understand | act fast, one thumb | read at the table, write by hand |
| Interaction | forms, choice pickers, validation | buttons, pips, tap targets, undo | fillable fields for state |
| Density | full, all sections expanded on desktop | vital block and actions pinned to the top, everything else collapsed | fixed page layout per [12](12-print-and-export.md) |
| Numbers | with provenance visible on hover/tap | as roll buttons | static, computed |
| Warnings | inline, next to the value; nothing blocks ([07](07-character-creation.md)) | non-blocking badge | listed in an appendix |
| Help level effect | explanations beside every choice | summaries under names, tactical tab default | extra rules pages for newcomer |

Mode switch is instant and never loses state; play mode is specified in [09](09-play-mode.md), print in [12](12-print-and-export.md).

### Ordering and overrides

- Default order is the catalogue priority; sections declared by packages are inserted at their declared priority, clamped so they never displace Identity, Vital block or Ability scores. As built (M1.3): the format has no priority field yet, so declared sections sit after Features and before Equipment, sorted by id.
- Within Actions and Spells, order is activation type then cost then name; the player can pin favourites to the top.
- The player can collapse sections and reorder within the middle band (priorities 6–16); the order is a per-character preference, not part of choices or state, and is not exported.
- The composer emits a deterministic order for the same inputs, which is what print relies on.

### Homebrew sections

A package may declare: section identifier, localised title, default priority, activation predicate (over the same vocabulary as effect conditions), and whether it renders as list, pips, table or text. Effects target it with `add to section`. Example: a homebrew "Reputation" package declares a section with a manual resource "Renown" and a text block; it appears in build, play and print like Ki.

## Why

- Content-driven activation is the only way to get Principle 5 without per-class code and without a newcomer ever seeing a Ki box on a Wizard.
- The two-layer hierarchy comes directly from what worked in the playbook: names to scan, text to read when needed. The playbook had to print both on separate pages; the sheet can nest them.
- Provenance in words, not in formulas, is what makes a newcomer trust a number and learn the rule at the same time (Principle 1).
- One computed sheet feeding three layouts guarantees that what is printed is what is played, and removes an entire class of "the PDF says something else" bugs.
- Letting packages declare sections closes the last gap where homebrew would have needed code.

## Deferred decisions

- DEC-01 Technology stack — Decided. The composer's output is described as data so the rendering technology stays replaceable.
- DEC-09 Supported languages — Decided: Italian and English.
- DEC-13 PDF generation approach — Decided (2026-09-22): print consumes the composer output through the print mode of the sheet.

## Depends on / feeds into

Depends on [01](01-vision.md), [03](03-glossary.md), [04](04-domain-model.md), [05](05-content-model-and-sources.md), [06](06-homebrew-and-extensibility.md). Feeds into [07](07-character-creation.md), [09](09-play-mode.md), [11](11-play-assistant.md), [12](12-print-and-export.md), [13](13-ux-and-accessibility.md), [15](15-logical-architecture.md).
