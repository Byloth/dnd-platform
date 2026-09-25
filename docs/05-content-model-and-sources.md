# 05 — Content model and sources

## Purpose

This document defines where game content comes from, how it is layered, how official copyrighted material and community homebrew coexist in one mechanism, and how content is localised. It answers "what does the platform ship, what does the user bring, and how are the two kept apart legally while being identical technically".

## Principles

- **One format for everything.** The SRD, the Player's Handbook, Tasha's Cauldron of Everything and a player's custom subclass are all content packages with the same structure, loaded by the same code, rendered by the same sheet (Principle 6).
- **The repository ships only what is free to ship.** The base package is the SRD, published by Wizards of the Coast under a free licence. Nothing else official is in the public repository.
- **Official books are private packages.** They exist in the same format, are stored under access control, and are never redistributed. Technically they are "homebrew that happens to reproduce a book"; legally they are the user's own transcription for personal use.
- **Attribution travels with content.** Every entity carries its source; every source carries its licence and attribution text.
- **Mechanics and text are separable.** Effects are language-neutral; names and descriptions are localised strings. A package can ship several languages, or a separate package can add a translation.

## How

### Content layers

The ruleset itself is content. The base package for SRD 5.1 is the first; a base package for SRD 5.2 is planned, and a character declares which one it depends on. The engine is edition-neutral: everything that differs between editions is expressed in packages, never in code (DEC-02, DEC-18).

```
┌──────────────────────────────────────────────┐
│ User homebrew packages (private / campaign / public)  │  e.g. "Tabaxi-like Feline species", "Bruised lung condition"
├──────────────────────────────────────────────┤
│ Official source packages (private)            │  PHB, Xanathar's, Tasha's, Mordenkainen's, setting books…
├──────────────────────────────────────────────┤
│ Base package (public, shipped)                │  SRD: core rules, 12 classes with one subclass each, species, spells, items, conditions
└──────────────────────────────────────────────┘
```

Loading order is dependency order. A character records the packages it uses and the version it last saw of each; newer versions apply automatically and the player is told what they changed (DEC-21). Packages higher in the stack may **extend** lower ones (add a subclass to an SRD class, add spells to a class list) or **patch** them (replace text, fix an effect), see [06](06-homebrew-and-extensibility.md).

### What the base package must contain

Everything in the SRD, structured with the entities and effects of [04](04-domain-model.md):
- the 12 core classes with their SRD subclass, full level tables;
- SRD species and sub-species; SRD backgrounds; SRD feats (few);
- the full SRD spell list with class relations;
- weapons, armour, adventuring gear, tools, a selection of magic items;
- the standard conditions;
- the reference rules used by the assistant and the cheat sheet: actions in combat, movement, cover, rests, death, concentration, spellcasting basics.

The base package is the reference implementation of the format: if the SRD cannot be expressed, the format is incomplete. Building it is Phase 0's main deliverable ([16](16-roadmap.md)).

### Official source packages

Scope (Decided): everything Wizards of the Coast publishes as official 5e player material is in scope as private packages, not only the Player's Handbook: Xanathar's Guide to Everything, Tasha's Cauldron of Everything, Mordenkainen's, Fizban's, setting books, and later releases.

Rules:
1. Each book is one package (or one package per chapter if a book is large) depending on the base package and, where needed, on other official packages.
2. Packages are marked `private` in their manifest and carry the book's citation as source. The platform refuses to publish a `private` package to a public listing.
3. Who can load and see private packages is a per-deployment setting ([14](14-accounts-sharing-and-campaigns.md)): in a self-hosted instance for one group, everyone; in a public instance, only users who upload their own copy.
4. The repository documents the format and provides tooling to *author* such packages; it does not provide the packages.
5. When official content overlaps the SRD (e.g. the PHB's version of a class), the official package extends the base entity rather than duplicating it, so characters built on the SRD do not change when the book package is added.

Extended by the owner (2026-09-25): the scope also covers **game-master material** for the item and creature catalogues of [19](19-catalogues.md). This means the Dungeon Master's Guide (magic items), the Monster Manual and other bestiaries (creatures), and **adventure books** (the starter sets, Curse of Strahd, Journeys through the Radiant Citadel and others), which bring magic items, creatures and sometimes player options. Whether the three core books are one package or three is DEC-23; creatures need an entity type, DEC-24.

#### Further sources

Books the owner has, as `content-private/sources` (2026-09-25):
- the Player's Handbook, the Dungeon Master's Guide and the Monster Manual (2014);
- Xanathar's Guide to Everything, Tasha's Cauldron of Everything, Mordenkainen Presents: Monsters of the Multiverse and Volo's Guide to Monsters;
- Historia, a third-party Italian book.

Books that would add the most, for a later choice (point 2.2 of the owner's notes):

| Book | Adds |
|---|---|
| Eberron: Rising from the Last War | the Artificer (a whole class), Eberron species, dragonmarks, magic items |
| Sword Coast Adventurer's Guide | subclasses, backgrounds, a few cantrips |
| Explorer's Guide to Wildemount | the Echo Knight, the dunamancy wizards, Wildemount backgrounds |
| Fizban's Treasury of Dragons | dragonborn variants, feats, a subclass, dragons (creatures), hoard items |
| Van Richten's Guide to Ravenloft | lineages, subclasses, dark gifts, creatures |
| Mythic Odysseys of Theros | subclasses, supernatural gifts, creatures |
| Strixhaven: A Curriculum of Chaos | a species, feats, backgrounds |
| Spelljammer: Adventures in Space | species, creatures, items |
| The Wild Beyond the Witchlight | two species, a background, creatures |
| Bigby Presents: Glory of the Giants | a subclass, feats, giants (creatures), items |
| The Book of Many Things | a subclass, feats, creatures, the Deck of Many Things |
| The 2024 Player's Handbook, Dungeon Master's Guide and Monster Manual | the revised rules, with SRD 5.2 as the public base `srd52` (DEC-02, DEC-21) |

Mordenkainen's Tome of Foes and most of Volo's are superseded by Monsters of the Multiverse; adventure books matter for the catalogues, not for character options.

### User homebrew packages

Same format, three visibility levels: `private` (author only), `campaign` (members of a campaign), `public` (listed and installable by anyone). The full mechanism is specified in [06](06-homebrew-and-extensibility.md).

### Localisation of content

- Every human-readable field (name, description, flavour, feature text) is a localised string with at least one language.
- Mechanics (effects, tables, formulas) are never localised.
- A translation can live inside the package or in a separate *translation package* that depends on it and only supplies strings. This lets the community translate an official package without redistributing the original.
- Fallback order: the user's language, then the package's default language, never an empty string.
- The Italian official terminology in [03](03-glossary.md) is the reference for the first translation of the base package.

### Source and attribution

A source has: identifier, title, publisher/author, edition, licence (e.g. CC-BY-4.0 for the SRD, "all rights reserved" for books, a chosen licence for homebrew), attribution text to display, and a `redistributable` flag. The print output and the UI show the attribution wherever content from that source appears, at least in a credits section ([12](12-print-and-export.md)).

### Content coverage by phase

| Phase | Content available |
|---|---|
| 0 Foundations | Base package complete (SRD 5.1); a sample homebrew package (feline species, custom condition); the first private official package (Player's Handbook) present locally and git-ignored, loaded by the same tooling. |
| 1 MVP | Everything from Phase 0 plus the Italian translation package of the base package; private packages usable from the app. |
| 4 Homebrew | Public authoring and sharing; community translation packages. |
| Later | Additional official packages authored as needed by the groups using the instance. |

## What needs to be done

1. Define the package manifest (identifier, version, dependencies, visibility, sources, languages) — detailed in [06](06-homebrew-and-extensibility.md).
2. Author the base package from the SRD, entity by entity, validating the effect catalogue as you go.
3. Author the sample homebrew package (feline species, custom condition) to prove the extension path.
4. Define the translation-package mechanism and produce the Italian translation of the base package.
5. Write the authoring guide that a group would follow to transcribe an official book into a private package.
6. Decide and document the deployment policy for private packages ([14](14-accounts-sharing-and-campaigns.md)).

## Why

- Treating official books as private packages is the single decision that keeps the public project clean, lets a private group use all their books, and forces the homebrew format to be as expressive as the books (the user's stated requirement: "the PHB is homebrew that extends the base").
- Separating text from mechanics is what makes the Italian print output possible without duplicating the rules engine or the content.
- Recording the last version seen on the character, and publishing every release, is what makes errata and package updates safe: they apply to everyone and each player sees what changed ([10](10-progression.md), DEC-21).

## Deferred decisions

- DEC-02 Rules edition — Decided: SRD 5.1 first; SRD 5.2 as a second base package later, selectable (granularity: DEC-18, Phase 3).
- DEC-19 How the mechanical effects of SRD content are authored (hand, agents, hybrid) — Phase 0.
- DEC-03 Serialisation format — Decided: YAML authored, JSON Schema validated, JSON canonical.
- DEC-11 Import from other platforms' export formats — Phase 4.
- DEC-09 Which languages are supported for content and when — Phase 1.

## Depends on / feeds into

Depends on [01](01-vision.md), [04](04-domain-model.md). Feeds into [06](06-homebrew-and-extensibility.md), [07](07-character-creation.md), [12](12-print-and-export.md), [14](14-accounts-sharing-and-campaigns.md), [16](16-roadmap.md), [18](18-risks.md).
