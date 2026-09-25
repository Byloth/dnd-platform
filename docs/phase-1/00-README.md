# Phase 1 — MVP: create, view, print: execution plan

## Purpose

Phase 1 turns the content format and the rules engine of Phase 0 into something a newcomer can use: a web application that guides the creation of a character, shows its sheet with every number explained, and prints the playbook. It runs entirely in the browser, ships only the public SRD, and lets the owner of an official book load it locally.

This directory is the execution plan: concrete enough to start work, still free of choices that belong to later phases. Like [../phase-0/](../phase-0/00-README.md), these files name technologies, because the Phase 1 decisions have been taken.

## Decisions in force

| Id | Decision |
|---|---|
| DEC-01 | TypeScript everywhere; Vue ecosystem. Phase 1 part, taken 2026-09-22: **Nuxt 4 application shell used as a single-page, statically generated application** (no server rendering, no server routes in Phase 1), from the author's `nuxtplate`; Vitest for tests. |
| DEC-04 | Taken 2026-09-22: **static front end on GitHub Pages, deployed by a GitHub Actions workflow, no back end.** The application ships the SRD; every other package is loaded by the user into the browser from a zip or a bundle file and never leaves the device. |
| DEC-09 | Italian and English interface; Italian translation package of the SRD in Phase 1; no further language before Phase 4. |
| DEC-12 | Taken 2026-09-22: **no accounts in Phase 1–3.** Every user is a guest; characters live in the browser's storage and in export files, optionally mirrored to a working directory on disk. |
| DEC-13 | Taken 2026-09-22: **the print mode of the sheet is a paginated print stylesheet; the PDF is the browser's "print to PDF".** Pen-fillable fields in Phase 1, digital form fields in Phase 3. |
| DEC-15 | Taken 2026-09-22: **standard array** by default; point buy and rolling available. |
| DEC-20 | Content selection (from Phase 0): a character or campaign carries the packages it uses, their order and exclusions; the engine prunes and reports. |
| DEC-21 | Taken 2026-09-23: **an edition is a package, an implementation is a version, and versions propagate by themselves.** Fixes reach every character; the user is told only when their sheet changed, with the changelog. Every release of a public package is published by the site as a static file; the SRD is never stored in the browser. |

Recorded in [../17-open-decisions.md](../17-open-decisions.md). Three scope adjustments taken with them, recorded in [../16-roadmap.md](../16-roadmap.md) and [../12-print-and-export.md](../12-print-and-export.md): Phase 1 prints Part 2 (the sheet), Part 3 (feature and spell cards) and the credits page, not the tactical guide (Phase 5), the rules cheat sheet (Phase 2) or the compact variant (Phase 3); the roadmap's "simplest persistent account" waits for a back end; low-end phone testing is a Phase 1 criterion.

Requirements the owner fixed for the whole phase: the text sheet of `dnd derive` is the reference the web sheet must reproduce and then surpass; everything visible must be usable on a phone in portrait orientation; nothing private ever leaves the browser; every screen passes the accessibility checklist of [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md) before its milestone closes.

## Deliverables

1. The web application workspace `packages/web`, built and published as static files — [01-web-application.md](01-web-application.md).
2. Content and character stores in the browser, package loading from files, export and import, the optional working directory — [02-content-and-character-stores.md](02-content-and-character-stores.md).
3. The sheet composer as a pure package shared by the web sheet, the print mode and the CLI text renderer, with golden section trees — [03-sheet-composer.md](03-sheet-composer.md).
4. Guided character creation with archetypes as content, and the expert form — [04-character-creation.md](04-character-creation.md).
5. Print of the playbook (Parts 2 and 3, credits) and the portable character document — [05-print-and-export.md](05-print-and-export.md).
6. Italian and English interface and the Italian translation package of the SRD — [06-localisation.md](06-localisation.md).
7. Tests, accessibility and performance gates, the newcomer usability test — [07-testing-accessibility-performance.md](07-testing-accessibility-performance.md).
8. The work plan with milestones, confirmation points and the progress log — [08-workplan.md](08-workplan.md).
9. Revisions from the owner's review of 2026-09-25 (milestone M1.4r): the interface — [09-interface-revisions.md](09-interface-revisions.md); the wizard's integrity — [10-wizard-integrity.md](10-wizard-integrity.md); the Italian content started early — [11-italian-content.md](11-italian-content.md).
10. Usage statistics with opt-in consent (DEC-22) — [12-analytics.md](12-analytics.md).

## Milestones

| Id | Milestone | Done when |
|---|---|---|
| M1.1 | Web application scaffold and deployment | `packages/web` builds with `nuxt generate`; lint, typecheck and tests wired into the monorepo; the Pages workflow publishes it; the application loads the SRD bundle and renders a fixture character's sheet from the composer's section tree, unstyled. |
| M1.2 | Content store in the browser | Packages loaded from a zip or a bundle are validated, stored, listed and selectable; private ones are flagged and attributed; the reference Monk computes in the browser with `phb14` loaded from a zip. |
| M1.3 | Dynamic sheet, build mode | Every section of [../08-dynamic-sheet.md](../08-dynamic-sheet.md) with the explain views at the three help levels, on desktop and on a portrait phone; the composer goldens pass. |
| M1.4 | Guided character creation | Wizard steps 0–9 and the expert form; archetypes authored for every SRD class; a level 1 character of every SRD class can be built; warnings inline, nothing blocks. |
| M1.4r | Revisions from the owner's review | The integrity fixes, the interface revisions and the first Italian packet of documents 09–11. |
| M1.5 | Character store, export and import | Characters persist in the browser; export file; import with version-mismatch handling; the byte-identical round trip runs in CI. |
| M1.6 | Print | The print route with Parts 2 and 3 and the credits page, A4 and Letter, black-and-white acceptance; the reference Monk's printed playbook passes the checklist. |
| M1.7 | Italian | Interface in Italian and English; `srd51-it` translation package drafted, reviewed and loaded; the glossary check passes. |
| M1.8 | Working directory, accessibility, newcomer test | The working-directory mirror where the browser supports it; the accessibility pass on every screen; the usability test with newcomers; the Phase 1 verification table; the MVP tag. |

Phase 1 is done when M1.1–M1.8 are done and the done criteria of Phase 1 in [../16-roadmap.md](../16-roadmap.md) hold. The verification table is written at the close, as [../phase-0/00-README.md](../phase-0/00-README.md) did.

## Conventions for this directory

- Each document opens with **Purpose**, then **Decisions** (what this document fixes), **Design**, **Tasks** (numbered, referencing milestones), **Open points**.
- Package names keep the temporary scope: `@byloth/dnd-platform-web`, `@byloth/dnd-platform-composer`, `@byloth/dnd-platform-content-srd51-it`.
- Interface strings are never hard-coded: every visible text is a catalogue key with an English and an Italian value ([06-localisation.md](06-localisation.md)).
- Every screen is specified for a portrait phone first, then widened.
- Nothing in `packages/web` computes a rule: numbers come from the engine, structure from the composer, text from content and catalogues.
- The reference characters of [../phase-0/04-testing-strategy.md](../phase-0/04-testing-strategy.md) remain the yardstick: the Monk with the private Player's Handbook, a full caster, a martial class without resources.
