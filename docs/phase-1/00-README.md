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
| DEC-13 | Taken 2026-09-22, amended 2026-09-29: **the page draws the PDF itself, in the browser, from a sheet template (DEC-26); its fields stay editable.** No print dialog, no print stylesheet. |
| DEC-26 | Taken 2026-09-29: **the first template is the platform's "classic" sheet, drawn from scratch with the layout of the official one**; other templates later on the same engine. |
| DEC-27 | Taken 2026-11-06: **famous characters as the wizard's ideas, in a fan-made "extension"** on by default, replacing the SRD's ideas, turned off from the packages page; no general extension infrastructure yet. |
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
11. The compendium: list, read and search the content of the loaded packages (DEC-25) — [13-compendium.md](13-compendium.md).
12. The wizard steps revision from the owner's review of 2026-11-06 (milestone M1.W), with the famous characters' extension (DEC-27) — [14-wizard-steps-revision.md](14-wizard-steps-revision.md).

## Milestones

| Id | Milestone | Done when |
|---|---|---|
| M1.1 | Web application scaffold and deployment | `packages/web` builds with `nuxt generate`; lint, typecheck and tests wired into the monorepo; the Pages workflow publishes it; the application loads the SRD bundle and renders a fixture character's sheet from the composer's section tree, unstyled. |
| M1.2 | Content store in the browser | Packages loaded from a zip or a bundle are validated, stored, listed and selectable; private ones are flagged and attributed; the reference Monk computes in the browser with `phb14` loaded from a zip. |
| M1.3 | Dynamic sheet, build mode | Every section of [../08-dynamic-sheet.md](../08-dynamic-sheet.md) with the explain views at the three help levels, on desktop and on a portrait phone; the composer goldens pass. |
| M1.4 | Guided character creation | Wizard steps 0–9 and the expert form; archetypes authored for every SRD class; a level 1 character of every SRD class can be built; warnings inline, nothing blocks. |
| M1.4r | Revisions from the owner's review | The integrity fixes, the interface revisions and the first Italian packet of documents 09–11. |
| M1.C | Compendium | Spells, items, creatures and conditions of every loaded package listed, filtered, searched and read in both languages; creatures fetched only by the bestiary; linked from the sheet and the wizard. |
| M1.5 | Character store, export and import | Characters persist in the browser; export file; import with version-mismatch handling; the byte-identical round trip runs in CI. |
| M1.6 | Print | The classic sheet as a PDF made in the browser: page 1, then background and spells, a blank sheet, the feature and spell cards and the credits; A4 and Letter, black-and-white acceptance; the reference Monk's PDF passes the checklist. |
| M1.7 | Italian | Interface in Italian and English; `srd51-it` translation package drafted, reviewed and loaded; the glossary check passes. |
| M1.W | Wizard steps revision | Step 0 only when there is a choice; step 1's question and the famous characters' extension; game details on the cards, folding the chosen one; every choice in its step and a Spells step; the custom background; the twelve classes still reach the review with nothing open. |
| M1.8 | Working directory, accessibility, newcomer test | The working-directory mirror where the browser supports it; the accessibility pass on every screen; the usability test with newcomers; the Phase 1 verification table; the MVP tag. |

Phase 1 is done when M1.1–M1.8 and M1.C are done and the done criteria of Phase 1 in [../16-roadmap.md](../16-roadmap.md) hold. The verification table is written at the close, as [../phase-0/00-README.md](../phase-0/00-README.md) did.

## Phase 1 verification (prepared 2026-10-07, M1.8d; closes with `v1.0.0`)

**Status: prepared, not closed.** Every row but the first was checked on 2026-10-07; the first waits for the newcomer test (M1.8c), and two manual passes wait for a person with the device. The phase closes when they are in.

| Criterion ([../16-roadmap.md](../16-roadmap.md)) | Evidence | Result |
|---|---|---|
| A tester who has never played builds a level 1 character in under 15 minutes and can say what each number on the sheet means | The protocol [usability/protocol.md](usability/protocol.md), confirmed by the owner on 2026-10-07; the report [usability/report.md](usability/report.md) | **Pending** (M1.8c: recruiting and sessions, the owner's) |
| The reference Monk's printed playbook contains every kind of panel of the original except the tactical guide and the rules cheat sheet, with no redundant explanation and no mention of abilities the character does not have | `packages/sheets/test/cards.test.ts` against `private/fixtures/reference-monk/print-checklist.yaml` (every Part 2 value filled, every card and credit once, nothing the character lacks, none of the parts Phase 1 does not print); the page counts of the public characters in A4 and Letter (`fixtures/print/page-counts.json`); see [05-print-and-export.md](05-print-and-export.md), "As built (M1.6c)" | Holds (verified locally on 2026-10-07, with the book; skipped in CI where it is absent) |
| A character exported and re-imported produces a byte-identical computed sheet | `packages/web/tests/character-files.test.ts`, "the round trip": every public fixture character (over 60) exported with its homebrew, read, imported and derived, equal byte for byte, in CI; the reference Monk the same way, without the book inside the file (`tests/flows/private-monk.test.ts`, added at M1.8d) | Holds (the public round trip in CI; the Monk's verified locally on 2026-10-07) |
| The sheet is usable on a phone in portrait orientation | `pnpm web:a11y` in CI: every screen at 360 px and reflow at 320 px, with no horizontal scroll ([accessibility/m1.8b-report.md](accessibility/m1.8b-report.md)); Lighthouse on the phone preset (4× CPU, Slow 4G) in CI, cold time to interactive guarded; `pnpm web:repeat-visit` in CI (added at M1.8d): the sheet of the level 20 caster interactive in 1.1–1.4 s on the repeat visit (median of three, limit 2 s) | Holds for what a browser can check; **the phone in hand pending** ([accessibility/screen-reader-pass.md](accessibility/screen-reader-pass.md)) |

The requirements the owner fixed for the whole phase (see the top of this document):

| Requirement | Evidence | Result |
|---|---|---|
| The text sheet of `dnd derive` is the reference the web sheet reproduces | `tests/flows/private-monk.test.ts` and the composer goldens: the sheet and the section tree in the browser equal the CLI's snapshot and tree | Holds |
| Everything visible is usable on a phone in portrait | As the fourth criterion above | Holds, the phone in hand pending |
| Nothing private ever leaves the browser | Private packages are never embedded in an export (`character-files.test.ts`; the Monk's round trip checks the file); no network request but the site's own assets and, with consent, anonymous events (DEC-22, [12-analytics.md](12-analytics.md)); the working folder writes only to the player's disk (M1.8a) | Holds |
| Every screen passes the accessibility checklist of [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md) | `pnpm web:a11y` (axe with layout in two languages and three themes, phone and computer, reflow, keyboard, Escape: 364 page loads clean at M1.8b) and the component checks of M1.3d, in CI | Holds for the automated part; **the screen-reader pass pending** (a person with the device) |
| Budgets: first load under 300 KB, the SRD under 500 KB, compressed | `pnpm web:budgets` in CI; on 2026-10-07: first load 209.7 KB, SRD 454.8 KB, Italian SRD 397.9 KB | Holds |

## Conventions for this directory

- Each document opens with **Purpose**, then **Decisions** (what this document fixes), **Design**, **Tasks** (numbered, referencing milestones), **Open points**.
- Package names keep the temporary scope: `@byloth/dnd-platform-web`, `@byloth/dnd-platform-composer`, `@byloth/dnd-platform-content-srd51-it`.
- Interface strings are never hard-coded: every visible text is a catalogue key with an English and an Italian value ([06-localisation.md](06-localisation.md)).
- Every screen is specified for a portrait phone first, then widened.
- Nothing in `packages/web` computes a rule: numbers come from the engine, structure from the composer, text from content and catalogues.
- The reference characters of [../phase-0/04-testing-strategy.md](../phase-0/04-testing-strategy.md) remain the yardstick: the Monk with the private Player's Handbook, a full caster, a martial class without resources.
