# Character-first D&D 5e platform — project plan

This directory is the complete plan for a web platform where a player who knows little or nothing about Dungeons & Dragons can create a character, understand every number on the sheet, play a whole session from a phone, level up without a rulebook, print a clean playbook, and extend the game with homebrew content that works exactly like official content.

The plan is written before any code exists. It fixes *what* to build, *how* it fits together and *why*, and it deliberately postpones every choice that does not need to be made yet (technology, hosting, edition, …) to the phase that needs it.

## How to read

Read in order the first time; afterwards, each document stands on its own.

| # | Document | One line |
|---|---|---|
| 01 | [Vision](01-vision.md) | Why the platform exists, who it is for, the ten principles every other document obeys. |
| 02 | [Personas and journeys](02-personas-and-journeys.md) | Who uses it and what a complete path looks like, from first character to printed playbook. |
| 03 | [Glossary](03-glossary.md) | Game terms (English and Italian) and platform terms, fixed once. |
| 04 | [Domain model](04-domain-model.md) | What a character is, what content is, how the rules engine turns them into a sheet with provenance. |
| 05 | [Content model and sources](05-content-model-and-sources.md) | The free base package, private official books and homebrew as one layered mechanism; localisation. |
| 06 | [Homebrew and extensibility](06-homebrew-and-extensibility.md) | The package format, extension and patching, validation, versioning, sharing, authoring. |
| 07 | [Character creation](07-character-creation.md) | The guided wizard for newcomers and the expert mode. |
| 08 | [Dynamic sheet](08-dynamic-sheet.md) | Sections that exist only when the character has something to put in them; "explain this number". |
| 09 | [Play mode](09-play-mode.md) | The session at the table: rolls, attacks, spells, resources, rests, conditions, undo. |
| 10 | [Progression](10-progression.md) | Level up, multiclass, snapshots, package updates and errata. |
| 11 | [Play assistant](11-play-assistant.md) | "What can I do now?", turn guide, combos, situational advice; proposes, never decides. |
| 12 | [Print and export](12-print-and-export.md) | The playbook PDF, fillable fields, and portable character data. |
| 13 | [UX and accessibility](13-ux-and-accessibility.md) | Phone-first at the table, progressive disclosure, accessibility, interface languages. |
| 14 | [Accounts, sharing and campaigns](14-accounts-sharing-and-campaigns.md) | Ownership, sharing with the DM, campaigns, private packages, privacy. |
| 15 | [Logical architecture](15-logical-architecture.md) | The blocks and their contracts, independent of any technology; testing strategy. |
| 16 | [Roadmap](16-roadmap.md) | Phases 0–6 with goals, scope, done criteria and the decisions each phase must take. |
| 17 | [Open decisions](17-open-decisions.md) | The register of postponed choices (`DEC-nn`), each tied to a phase. |
| 18 | [Risks](18-risks.md) | Risks and mitigations, each pointing to the document that addresses it. |
| 19 | [Catalogues](19-catalogues.md) | Searchable item and creature catalogues from every loaded package, for players and game masters (proposed 2026-09-25). |
| 20 | [Official books as packages](20-official-book-packages.md) | Every owned book as a package per language, creatures included, then gathered into a few collections (to-do, 2026-09-25). |
| — | [Phase 0 execution plan](phase-0/00-README.md) | Monorepo, content format v0, engine contract, testing, SRD import pipeline, private packages, ruleset switching, work plan. Done at `v0.2.0`. |
| — | [Phase 1 execution plan](phase-1/00-README.md) | The web application, content and character stores in the browser, sheet composer, guided creation, print and export, localisation, testing and accessibility, work plan. |

Suggested shorter paths:
- **"What is this?"** — 01, 02, 16.
- **"How does the content system work?"** — 03, 04, 05, 06.
- **"What does the player see?"** — 07, 08, 09, 10, 11, 12, 13.
- **"What must I decide and when?"** — 16, 17, 18.

## Conventions

- **Language.** Documents are in English. Game terms use the official English name; the official Italian name is given in parentheses at first use where it helps, because the first users and the first printed output are Italian.
- **Document schema.** Documents 02 and 04–15 share the same sections: Purpose, Principles, What needs to be done, How, Why, Deferred decisions, Depends on / feeds into. 01 (vision), 03 (glossary), 16 (roadmap), 17 (decisions) and 18 (risks) have their own shape.
- **Decided / Deferred.** A choice marked *Decided* is settled and is not reopened without updating [17](17-open-decisions.md). A choice marked *Deferred* always names a `DEC-nn` entry, which names the phase at which it is taken.
- **No technology names** appear outside [17](17-open-decisions.md). Architecture is described in terms of responsibilities and contracts.
- **Principles** are cited by number ("Principle 3") and live in [01](01-vision.md).
- **Reference fixtures** are the yardstick of every phase: one character per SRD class at fixed levels (public), a level 3 Way of Shadow Monk from a private Player's Handbook package, and a character with a homebrew feline species. Together they exercise the base, private and homebrew paths. The ChatGPT-generated playbook that inspired this project is analysed in [12](12-print-and-export.md); it is not part of the repository and its character is not supported.

## Status legend

- **Draft** — written, not yet reviewed against the others.
- **Reviewed** — cross-checked for terminology and links.
- **Living** — expected to change continuously (17, 18, 03).

All documents are currently *Draft*, except 03, 17 and 18 which are *Living*.

## Contributing to the plan

1. Keep the schema; add subsections rather than new top-level sections.
2. A new term goes into [03](03-glossary.md) before it is used twice.
3. A new postponed choice goes into [17](17-open-decisions.md) and into the phase list of [16](16-roadmap.md).
4. A new risk goes into [18](18-risks.md) with the document that mitigates it.
5. Never add a technology choice to a functional document; add a `DEC-nn` instead.
