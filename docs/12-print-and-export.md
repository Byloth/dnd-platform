# 12 — Print and export

## Purpose

This document defines the printed playbook (Principle 7) and the portable character document (Principle 9). It turns the analysis of the original playbook into a specification: keep every piece of information that made it useful, remove its redundancies and mistakes, and generate it from the computed sheet so that paper and screen never disagree.

## Principles

- **Paper is a view, not a second source of truth.** The PDF is rendered from the same computed sheet, section activation ([08](08-dynamic-sheet.md)), combos and situations ([11](11-play-assistant.md)) as the screen.
- **Conditional on paper too** (Principle 5). A Monk's playbook has a Ki tracker and no spell slot grid; a Wizard's has the opposite. Pages that would be empty are not printed.
- **Fillable where play changes things.** Everything the play engine mutates ([09](09-play-mode.md)) is a fillable field or a pip on paper; everything derived is static text.
- **Legible before beautiful.** Real margins, text never over artwork, readable in black-and-white, at A4 and Letter.
- **Every fact once.** No rule or option is repeated across pages; a page references another page instead.
- **The character leaves with the player.** A full export can be re-imported to reproduce the same character, on this platform or another instance.

## The playbook structure

Derived from the six pages of the original, reorganised into five parts. Parts 3 to 5 are omitted or shortened in the compact variant.

### Part 1 — Cover (optional)

Name, epithet, species, class and subclass, level, player name, campaign, a portrait if the player uploaded one, a motto, up to four keywords. Purely for identity; off by default in the compact variant. Never carries rules.

### Part 2 — Character sheet

One page. The classic layout, generated from the computed sheet:
- header: name, species, class levels, background, alignment, XP or milestone, player;
- ability scores with modifier and saving throw, proficiency marked;
- proficiency bonus, inspiration, passive Perception;
- the five key values: AC, initiative, speed(s), HP maximum, current HP (fillable), plus temporary HP, Hit Dice, death saves;
- skills with the proficiency/expertise mark and the computed bonus;
- attacks: name, activation, to-hit bonus, damage with the modifier already summed, damage type, range;
- features by name only, with a page reference to the card in Part 3;
- resources declared by features, each as pips or a counter (fillable);
- spellcasting summary if granted: ability, save DC, attack bonus, slots per level as pips;
- personality (traits, ideals, bonds, flaws), proficiencies and languages, equipment lines (fillable, with blank lines), currency;
- a **Conditions and temporary effects** box (fillable) with the standard conditions as tick boxes and blank lines for custom ones, because the original player had to write "temporary debuffs" in the equipment area.

### Part 3 — Features and spells

Full text for everything Part 2 names only. Rendered as cards with a fixed anatomy taken from the original: icon of the activation type, name, cost in the resource's unit, activation (action / bonus action / reaction / passive), range and duration when present, concentration flag, the content's text, an optional usage note from `advice` content, and the source attribution in small print.

Grouped as: species traits; class features by level; subclass features; feats; background feature; equipped item properties; spells grouped by level (or by cost, when spells are gained through an alternative cost such as Ki), cantrips first.

Numbers inside card text that depend on the character (Deflect Missiles' "1d10 + DEX + Monk level") are printed both as the formula and as the computed value with its provenance in a footnote, so the player learns and does not compute.

### Part 4 — Tactical guide

One or two pages, generated from [11](11-play-assistant.md):
- **quick stats strip**: speed with its decomposition, proficiency bonus, the class's scaling die if any, resource maximum, class save DC with its formula, the three primary abilities;
- **turn guide**: the five steps with the guiding questions;
- **main actions**: the character's own actions as small cards (name, cost, one-line effect, motto from `advice` content if present);
- **combos**: derived from prerequisites, with the total attack count and cost;
- **situations**: the six base situations, each listing the character's own tagged options;
- **resource tracker**: pips per resource, cost table per action, when each resource recharges;
- **next milestones**: the features the next three levels unlock, from the class and subclass level tables.

### Part 5 — Rules cheat sheet

Generic and identical for every character of the same rules edition, rendered from `Rule` entities of the base package: the phases of a turn and how many of each; the ten basic actions in one card each; bonus action, reaction and free interaction in one block each with their limits; the "golden rule" of the action economy; the "if you are stuck" list. The examples in this part are generic verbs, never abilities, so they can never describe something the character does not have.

## Redundancies and mistakes removed from the original

| In the original | In the playbook |
|---|---|
| "One bonus action per turn" and the list of the character's bonus-action options explained four times (pages 3, 4 twice, 6) | Rule stated once in Part 5; the character's options listed once in Part 4; Part 2 references Part 3 for their text. |
| The turn described in three versions (5 steps, 4 moves, phases) | One turn guide in Part 4; Part 5 states only the phases and their limits. |
| Rule examples using abilities the character does not have (Shield) or does not have yet (Shadow Step at level 6) | Part 5 uses no character abilities; Part 4 lists only features present at the current level; future features appear only under "next milestones", labelled with their level. |
| Textual error in the HP-per-level formula | Formulas are content, rendered once, tested against the engine. |
| Artwork behind text, text to the bleed, purple on parchment | Margins, white background behind text, colour used only as accent; a black-and-white test is part of the acceptance criteria. |
| Debuffs written into the equipment box | A dedicated conditions box on the sheet. |
| A resource tracker printed but not fillable | Pips and counters are fillable form fields. |

## Variants

- **Compact**: Part 2 plus a one-page Part 4 (quick stats, main actions, combos, resource tracker). Two pages, back to back. For experienced players and DM copies.
- **Extended**: all five parts. The newcomer's default.
- Both variants exist in A4 and Letter and in every supported language ([13](13-ux-and-accessibility.md)); the player picks once and the choice is remembered.

## Fillable fields

Fillable in every variant: current HP, temporary HP, Hit Dice remaining, death save pips, inspiration, resource pips and counters, spell slot pips, prepared-spell tick boxes when the spellcasting model is "prepared", condition tick boxes and blank lines, equipment and currency lines, notes. Everything else is static. A "print blank fields" option leaves current values empty; the default pre-fills them from play state so a mid-campaign print is ready to use.

## Credits page

Generated from the sources of every package the character depends on ([05](05-content-model-and-sources.md)): title, publisher or author, licence and attribution text. Required whenever content from a source with attribution requirements is present; appended as the last page.

## Character export and import

- **Export** produces one human-readable document containing: the character's choices, state, snapshots; the identifiers and exact versions of every package it depends on; optionally, embedded copies of the homebrew packages it depends on that the receiving instance may not have (never private official packages, which are not redistributable).
- **Round-trip guarantee**: import of an export on an instance that has the same package versions yields an identical computed sheet; the acceptance test compares the two sheets field by field.
- If a package version is missing on import, the platform offers the closest installed version and shows the resulting differences using provenance ([10](10-progression.md)); it never silently substitutes.
- Export is available from the sheet at any time, without account restrictions, in every phase from Phase 1.

## What needs to be done

1. Define the page templates for Parts 1–5 and the card anatomy, with conditional inclusion rules bound to section activation.
2. Define the fillable-field set and its mapping to play-engine state.
3. Specify the compact and extended variants and the page-size and language options.
4. Define the credits page and the attribution rules per licence.
5. Specify the export document: contents, embedded packages policy, versioning of the format itself.
6. Specify the import flow with version-mismatch handling.
7. Write acceptance tests: the reference Monk's extended playbook contains every information item catalogued in the analysis of the original (checklist), each exactly once; black-and-white legibility; A4 and Letter; Italian and English; round-trip export/import equality.
8. Tackle DEC-13 at Phase 1 when the first PDF is produced.

## How

- Rendering takes the computed sheet, the assistant's view model and the active sections and fills templates; no rule logic lives in the print layer ([15](15-logical-architecture.md)).
- Print styles are shared with the screen's print mode ([08](08-dynamic-sheet.md), [13](13-ux-and-accessibility.md)); the PDF is the print mode paginated.
- Export and import are functions of the character store only; they do not involve rendering.
- Phase 1 ships Part 2 and export/import; Part 3 and Part 4 follow in Phase 2 with play mode; Part 5 and the credits page complete in Phase 2; Part 1 and variants in Phase 3.

## Why

- The original showed that a newcomer benefits from carrying rules, features and tactics together; generating them from data is the only way to keep that without hand-written errors.
- Fillable fields answer the user's first complaint about the original ("not editable by hand during play").
- The export format is what makes Principle 9 real and what lets a group move between instances or keep a backup they can read.

## Deferred decisions

- DEC-13 PDF generation approach — Phase 1.
- DEC-11 Import from other platforms' formats — Phase 4.
- DEC-03 Serialisation format (also governs the export document) — Phase 0.
- DEC-09 Supported print languages — Phase 1.

## Depends on / feeds into

Depends on [04](04-domain-model.md) (computed sheet, provenance), [05](05-content-model-and-sources.md) (sources, attribution, package versions), [08](08-dynamic-sheet.md) (section activation, print mode), [09](09-play-mode.md) (state for fillable fields), [11](11-play-assistant.md) (tactical guide content). Feeds into [13](13-ux-and-accessibility.md) (shared print styles), [15](15-logical-architecture.md) (export service), [16](16-roadmap.md).
