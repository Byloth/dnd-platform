# Phase 1 — 08 Work plan

## Purpose

This document orders the work of Phase 1 into the eight milestones of [00-README.md](00-README.md), with the tasks of every other Phase 1 document placed in sequence, their dependencies, what each milestone releases, its specific risks, and the points where the project owner must explicitly confirm before work continues. Estimates are in relative *work sessions* (one focused sitting), as in Phase 0, where the estimates proved conservative by a factor of two to three with agent assistance.

## Decisions

- **Milestones are sequential; tasks inside a milestone may run in parallel.** A milestone closes only when its done criteria in [00-README.md](00-README.md) hold, the suite is green, the accessibility pass of [07-testing-accessibility-performance.md](07-testing-accessibility-performance.md) is recorded, and the site generates.
- **Every milestone ends in a tag** `v0.3.<n>`; Phase 1 closes with `v1.0.0`, the MVP. The owner pushes to `master` (the default branch of the public repository; the workflows trigger on it); the Pages deployment follows the push.
- **Three explicit confirmation points**: before the first public deployment on GitHub Pages (M1.1: the owner enables Pages and pushes; until then the site exists only locally), before launching the agent drafting of the Italian translation (M1.7), before recruiting people for the newcomer test (M1.8). Nothing else needs confirmation.
- **The content format stays at v0.** Additions Phase 1 needs (an `abilityScores` block in the ruleset for point buy, an export document schema) are additive and recorded in [../phase-0/inventory/authoring-review.md](../phase-0/inventory/authoring-review.md); a breaking change waits for v1 and its migration.
- **No back end and no accounts in Phase 1** (DEC-04, DEC-12): a task that needs one is out of scope and goes to the open points. A service worker is in, since M1.5c (DEC-06, owner 2026-09-29).

## Design

### Dependency graph

```
M1.1 scaffold + composer ──► M1.2 content store ──► M1.3 build-mode sheet ──► M1.4 creation ──► M1.5 character store, export/import
                                                              │                                          │
                                                              └──────────► M1.6 print ◄──────────────────┤
                                                                                                         ▼
                                                                    M1.7 Italian ──► M1.8 working directory, accessibility, newcomer test ──► Phase 1 done
```

M1.4r (the owner's review of 2026-09-25) and M1.C (the compendium, owner 2026-09-27) sit between M1.4 and M1.5; M1.C is done first, then the rest of M1.4r (owner, 2026-09-27). M1.6 needs the composer and the sheet (M1.3) and the stored character (M1.5). M1.7 can start its content work (OCR, skeleton, packets) as soon as M1.1 exists and lands after M1.6 so that the Italian goldens include print. M1.8 is the closing milestone.

### M1.1 — Web application scaffold and deployment (≈ 3 sessions)

Tasks (from [01-web-application.md](01-web-application.md), [03-sheet-composer.md](03-sheet-composer.md), [07-testing-accessibility-performance.md](07-testing-accessibility-performance.md)):
1. `packages/web` from `nuxtplate`; `ssr: false`; base URL; Vitest with the Nuxt environment; `@nuxtjs/i18n` with empty catalogues; root wiring (`web:*` scripts, ESLint block, Vitest projects, `tsc --build` exclusion, `.gitignore`).
2. `packages/composer`: tree types, the composer over today's sections, the newcomer wording catalogue in English; the CLI text renderer rewired on it with its `sheet.txt` goldens unchanged; `section-tree.json` goldens.
3. The shared validator moved from the CLI to the schema package.
4. The SRD bundle as a static asset; a first page that derives `monk-l3-base` and renders the tree unstyled.
5. `.github/workflows/pages.yml`; CI steps for the web package; the size budgets.
6. **Confirmation point.** The owner enables Pages on the repository and pushes; the first deployment is checked from a phone.

Done: the criteria of M1.1. Release: `v0.3.1`.
Risks: Nuxt's own TypeScript setup and the monorepo's project references disagree (`exactOptionalPropertyTypes`, DOM libs); the template's `nuxt.config.ts` already relaxes `noUncheckedIndexedAccess`; keep the engine and composer strict and let the web package carry Nuxt's defaults.

### M1.2 — Content store in the browser (≈ 3 sessions)

Tasks (from [02-content-and-character-stores.md](02-content-and-character-stores.md)):
1. `useBrowserStorage` on `IndexedDatabase` of `@byloth/core`, and the persistence request. The template's alert handler is back (pnpm 12.5.1, see 01).
2. Package loading from zip and bundle with validation and bundling, on the new `packages/loader` (engine → loader → schema; `loadPackages` and `validate` moved there); the packages page; the private flag and attribution.
3. The site's releases of public packages (`dnd release`, `releases/content/`, `index.json`, DEC-21); `useEngine` with memoisation. The update alert and the changelog page are M1.5, with the stored characters.
4. Tests: `homebrew-feline` and `phb14-stub` from zips, the invalid fixtures refused, the private Monk equal to the CLI snapshot.

Done: the criteria of M1.2. Release: `v0.3.2`.
Risks: storage quota and eviction on phones; the packages page must report the quota state and the persistence answer, and the export must be offered at every risk of loss.

### M1.3 — Dynamic sheet, build mode (≈ 4 sessions)

Tasks (from [03-sheet-composer.md](03-sheet-composer.md), [06-localisation.md](06-localisation.md), [07-testing-accessibility-performance.md](07-testing-accessibility-performance.md)):
1. Explain views (newcomer, regular, expert) and the condition-to-words function with its coverage test.
2. The build-mode screen and its components, phone first, then desktop; help-level switch; package-declared sections; pin/collapse preferences.
3. Sheet catalogue strings in both languages; the newcomer provenance wording in Italian.
4. Accessibility helpers (axe, keyboard, contrast) and the first manual pass; Lighthouse step and the derive performance mark.

Progress: split into M1.3a (composer: help levels, the three explain views, the EN/IT sheet catalogue), M1.3a-bis (content reminders and declared sections on the sheet), M1.3b (preferences, the sheet in the interface language and help level, demo characters and the character route): done 2026-09-23/24; M1.3c (our design system without Bootstrap, BEM, the build-mode screen and its components, Markdown with marked + DOMPurify): done 2026-09-24. M1.3d (icons as inline SVG, the derive measure, the accessibility helpers and token contrast, the size budgets, Lighthouse in CI, the manual pass procedure): done 2026-09-24.

Done: the criteria of M1.3. Release: `v0.3.3`.
Risks: the newcomer wording of provenance meets contributions no sentence fits; the generic fallback is acceptable and listed; the sentences are content-independent (labels come from content), so a package never needs code.

### M1.4 — Guided character creation (≈ 5 sessions, plus archetype authoring)

Tasks (from [04-character-creation.md](04-character-creation.md)):
1. Archetypes for the twelve SRD classes and `primaryAbilities` where missing (content, English; Italian in M1.7).
2. Wizard route and stepper; steps 0–4 with cards and recommendation marks.
3. Step 5 with the three methods; the additive ruleset block for point buy.
4. Steps 6–8 and the review; the "as created" snapshot.
5. Expert mode as the single page; editing from the sheet.
6. Wizard copy for the newcomer level in both languages.
7. Flow test of the twelve classes; the private Monk through the edit flow.

Progress: split into M1.4a (content and format), M1.4b (wizard shell, steps 0–4), M1.4c (step 5), M1.4d (steps 6–9, the character stored), M1.4e (expert mode, editing, copy, the twelve-class test, close). M1.4a was done on 2026-09-24:
- srd51 0.2.0: twelve archetypes, `primaryAbilities`, `ruleset.abilityScores` (from SRD 5.2) and pack contents;
- the additive fields `item.contents` and `state.currency`;
- the ability adjustment in the explanation and `ChoiceView.filter` in the engine.

M1.4b was done on 2026-09-24: the wizard's route, store and self-saving draft, the dots and the step list, the choice cards, steps 0–4 in both languages, and the entry points. Lighthouse runs on the wizard too: accessibility 100, and 3.9 s to interactive cold, guarded at 5 s.

M1.4d is split into d1 (step 6), d2 (step 7) and d3 (steps 8–9, the character stored), by the owner on 2026-09-24. M1.4d1 was done that day:
- `ruleset.languages` and srd51 0.3.0;
- `ChoiceView.optionDetails`;
- step 6, with every remaining choice named and counted.

M1.4d2 was done on 2026-09-24:
- item category tags for the grants' filters, `matchesItemFilter`, srd51 0.4.0;
- step 7, with the class options, filters as menus, unpacked packs, removable granted items, the shop, equipped toggles and the coins beside the suggested purse.

M1.4d3 was done on 2026-09-25:
- `ruleset.alignments`, the acolyte's ideals, srd51 0.6.0;
- step 8, with the name needed to save (owner), the alignment menu and the background's suggestions that fill the fields;
- step 9, the sheet under what is still open, each with its step; saving stores the character at full hit points with its "as created" snapshot, and the characters page lists it.

M1.4e is split into e1 (editing), e2 (expert mode) and e3 (the twelve-class test, the private Monk, the close), by the owner on 2026-09-25. M1.4e1 was done that day: the wizard reopens a stored character from its sheet, the subclass moves to step 3, typed scores and an owned equipment list are edited as they are, and a change that forgets answers names them first; the private test reopens the level 3 Monk and finds Way of Shadow at step 3.

M1.4e3 was done on 2026-09-25: the twelve-class flow test (`tests/flows/twelve-classes.test.ts`, fixtures `created-<class>`); M1.4 closed.

M1.4e2 was done on 2026-09-25: the expert's wizard as one page (dense cards, typed scores, coins following the suggestion until typed) and, asked by the owner ahead of M1.5, deleting a stored character after a confirmation.

M1.4c was done on 2026-09-24: step 5, with the standard array, point buy and roll, the swap menus, species bonuses and totals from the derived sheet, and the manual adjustments.

Done: the criteria of M1.4. Release: `v0.3.4`.
Risks: starting equipment turned out to be structured content, with only the pack contents in prose; M1.4a made those data too. The rule stands: never invent items in code.

### M1.4r — Revisions from the owner's review (≈ 4 sessions, plus the first Italian packet)

The owner reviewed the application after M1.4 (2026-09-25) and asked for these changes before M1.5. The plans are:
- [10-wizard-integrity.md](10-wizard-integrity.md): the versions a save records (point 9), and deactivating a package under a choice (point 10).
- [09-interface-revisions.md](09-interface-revisions.md): the navigation bar with the mode and language menus, drawn flags and dropdowns that close on an outside click (1–3); a settings page with the units of measure (4); demo characters behind a disclosure once the player has characters (6); the wizard's sticky Back/Next bar and its transitions (8.1–8.2.1).
- [11-italian-content.md](11-italian-content.md): the Italian content started now (5). The loader fixes, `srd51-it` as a package and site bundle, and the first packet (what the wizard shows) are part of this milestone. The bulk stays in M1.7, behind its confirmation point.

Order: the integrity fixes first (they correct wrong behaviour), then the interface, then the Italian parts A–B. Point 7 (famous characters) is set aside by the owner; see the open points. Point 8's detailed notes on the sheet and on each wizard step are to come from the owner.

Done: the tasks of the three documents for this milestone. Release: none of its own; it ships with `v0.3.5` at the close of M1.5.

Also in M1.4r, asked by the owner on 2026-09-25 and done that day: the usage statistics of DEC-22 ([12-analytics.md](12-analytics.md)). Also done, on 2026-09-27: "Roll for me" in step 5 ([04-character-creation.md](04-character-creation.md), task 3), and dropping package files on the packages page ([09-interface-revisions.md](09-interface-revisions.md), task 8).

**Status (corrected 2026-09-27): M1.4r is still open.** On that date the milestone was wrongly recorded as closed: "Done:" above is its criterion, not its state. Done so far:
- the Italian content of [11-italian-content.md](11-italian-content.md);
- the usage statistics;
- "Roll for me";
- dropping package files.

Still to do:
- [09-interface-revisions.md](09-interface-revisions.md), tasks 1–7 and 9: the dropdown menus and flags, the navigation bar, the settings page with units, the units in the composer, the demo characters' disclosure, the wizard's sticky bar, its transitions and focus;
- [10-wizard-integrity.md](10-wizard-integrity.md), all its tasks.

Order decided by the owner on 2026-09-27: the compendium (M1.C) first, then the rest of M1.4r, then M1.5.

### M1.C — Compendium (≈ 4 sessions)

Asked by the owner on 2026-09-27 (DEC-25); the plan is [13-compendium.md](13-compendium.md). Parts:
1. M1.Ca: `composeEntry` for spells, items and conditions in the composer; `dnd show` for every kind; goldens in both languages.
2. M1.Cb: the compendium's package set, creatures fetched on request; the index, search and filters as a pure composable.
3. M1.Cc: `/compendium`, `/compendium/<kind>`, `/compendium/<kind>/<id>`; the stat block; the navigation link.
4. M1.Cd: links from the sheet and the wizard; accessibility, budgets, Lighthouse, statistics; docs.

**M1.C done on 2026-09-28** with M1.Cd: links from the sheet and the wizard, the statistics, Lighthouse on the list page. It ships with v0.3.5. Next: the rest of M1.4r (docs 09 and 10), then M1.5.

M1.Cc done on 2026-09-27: `/compendium`, `/compendium/<kind>`, `/compendium/<kind>/<id>`, the components of `components/compendium/`, the navigation link (icons over labels on a phone), the rich-text fix found by axe.

M1.Cb done on 2026-09-27: the compendium's sources (creatures fetched only when asked), `useCompendium().set` with stored packages that do not fit skipped, the index, search, filters and address in `composables/compendium.ts`, the composer's `spellClassIds`.

M1.Ca done on 2026-09-27: `composeEntry` for spells, items and conditions in EN/IT on a base shared with the stat block (`display.ts`), `dnd show` for every kind, goldens in `fixtures/entries`, a sweep of every SRD spell, item and condition in both languages.

Done: the criteria of M1.C. Release: none of its own; it ships with `v0.3.5` at the close of M1.5 (see the open point in 13).
Risks: the creatures' bundle on a slow connection (fetched only by the bestiary, with a visible loading state); long lists on cheap phones (60 entries, then "Show more").

### M1.5 — Character store, export and import (≈ 2 sessions)

Tasks (from [02-content-and-character-stores.md](02-content-and-character-stores.md), [05-print-and-export.md](05-print-and-export.md)):
1. Character store: list, create, update, delete (create, update and delete arrived with M1.4); the missing-package state; the export offered before deleting.
2. Export document schema (additive), download; import with matching and mismatch handling.
3. Round trip test over every fixture character.
4. The sheet interactive under two seconds on the repeat visit (owner's decision at M1.3d): the site's packages kept in the browser store, so that a second visit does not fetch the SRD, and the sheet route's JavaScript trimmed. Lighthouse measures the repeat visit, and the cold guards of M1.3d tighten with it.

Split by the owner's order of 2026-09-28 (M1.5 before the rest of M1.4r):
- **M1.5a, export and import**: tasks 1–3. Done 2026-09-28: the export schema, `character-files.ts`, the export from the sheet and the list, the copy before deleting, the import with its plan, and the round trip over every public fixture ([05-print-and-export.md](05-print-and-export.md), "As built").
- **M1.5b, "what changed" (DEC-21)**: the alert when a newer version changes a stored character's numbers, the changelog page, the recorded versions moving on. It brings in doc 10's `recordVersions` (M1.4r). Done 2026-09-29:
  - `diffTrees` in the composer: two section trees compared by the ids of what they show, so the labels are the sheet's own.
  - `composables/versions.ts`: `outdated`, `recordVersions`, and `useVersionCheck().check`, which derives the sheet with the recorded version of each site package (its release, `content/<id>@<version>.json`) and compares.
  - The sheet of a stored character shows `components/sheet/UpdateNotice.vue` ("Armor Class: 19 → 18", a link to the changelog); "Got it" records the versions. Nothing changed means the versions are recorded silently. A version the site no longer has, or a stored package, gives the update without numbers. Demo characters are left alone.
  - `pages/changelog/[id].vue`: the versions after the character's shown open, the earlier ones behind a disclosure, the file's preamble for maintainers left out.
  - Doc 10's point 9: `edit`, `resume`, `choosePackages` and `finish` record the loaded versions, and the review no longer lists a version mismatch. Doc 10's other tasks (a missing chosen entity, deactivating a package under a choice) stay in M1.4r.
  - Found on the way: the web tests get 15 s each by default, since they timed out under the hooks' load.
- **M1.5c, the repeat visit**: task 4. Done 2026-09-29 as a PWA (owner): the site's packages fetched by their versioned file; the service worker, the manifest and the icons; new versions at the next page change without a pop-up; `pnpm web:pwa` in CI and before deploying; the privacy page. DEC-06 is decided in part and DEC-21 amended. The two-second repeat visit is not yet measured by CI: Lighthouse CI opens every run in a fresh browser profile, so a warm run needs a Puppeteer script sharing the browser (open point). Measured by hand meanwhile: Chrome's Lighthouse with "Clear storage" off, after a first visit.

**M1.5 done on 2026-09-29.** It ships with `v0.3.5`, to be tagged by the owner.

Done: the criteria of M1.5. Release: `v0.3.5`.
Risks: none technical; the risk is UX, losing a guest's character; every destructive action offers the export first.

### M1.6 — Print (≈ 4 sessions)

Replanned by the owner on 2026-09-29 (DEC-13 amended, DEC-26): the page draws the PDF from the platform's "classic" sheet template; no print route.

- **M1.6a**, the engine and page 1. Done 2026-09-29: `packages/sheets` (values, drawing, the classic sheet's page 1, A4 and Letter, blank without a character), `sheet-values.json` goldens, "PDF" on the sheet with download or share, fonts precached. As built in [05-print-and-export.md](05-print-and-export.md).
- **M1.6b**, pages 2 and 3, the blank sheet, the paper and the hand as preferences. Done 2026-09-30: page 2 (details, appearance, backstory, allies with a symbol, resources as pips, conditions, additional features, treasure), page 3 (spellcasting classes, cantrips and the nine levels with slots and prepared boxes; printed for a character with spells and on the blank sheet), `CasterItem.dc`/`attackBonus` and `SlotItem.level`/`pact` in the composer (additive), "Blank sheet (PDF)" on the characters page, "PDF paper" and "PDF writing" in the settings menu. The Italian sheet is still for the owner to check.
- **M1.6b-bis**, the owner's notes on the sheet (2026-09-30). Done 2026-09-30: writing lines that follow the text, one initiative field and the other speeds apart, allies with "title: description" lines beside the symbol, formulas in the PDF (modifiers, saves, skills, passive Perception, initiative, spell DC and attack), no manifest error in development.
- **M1.6c**, Part 3 (feature and spell cards), the credits page, the acceptance. Done 2026-09-30: a card for every feature and spell after page 3 (page 1 says on which page), the credits last, the reference Monk's checklist written from doc 12 (the original is not in the repository; owner, 2026-09-30), page counts in `fixtures/print/page-counts.json`, the contrast of every text colour tested. Opening the PDF in Acrobat and on a phone is the owner's.

**M1.6 done on 2026-09-30.**

Done: the criteria of M1.6. Release: `v0.3.6`.
Risks: PDF viewers differ in how they redraw an edited field (some fall back to a print font); the library's size (outside the first load, precached for offline).

### M1.7 — Italian (≈ 3 sessions, plus the drafting)

Tasks (from [06-localisation.md](06-localisation.md)):
1. Skeleton extended; packet partition of the OCR'd Italian SRD.
2. **Confirmation point.** Packet count and brief presented to the owner; agents launched only after confirmation.
3. Review, coverage at 100 % of names and texts; `srd51-it` as a package and as a site bundle; auto-selection by language.
4. `sheet.it.txt` goldens; the Italian derive-all probe; metres beside feet.
5. Wizard copy, archetype `why` sentences and the newcomer wording in Italian.

Done: the criteria of M1.7. Release: `v0.3.7`.
Risks: OCR quality of the Italian PDF and terminology drift between agents; the glossary is the fixed vocabulary, the review log records every deviation, exactly as for the Player's Handbook.

### M1.8 — Working directory, accessibility, newcomer test (≈ 3 sessions)

Tasks (from [02-content-and-character-stores.md](02-content-and-character-stores.md), [07-testing-accessibility-performance.md](07-testing-accessibility-performance.md)):
1. The working-directory backend where the API exists: connect, README files, mirror, package loading from `packages/`, reconciliation.
2. The accessibility pass on every screen (keyboard, screen reader, the phone in hand), recorded.
3. **Confirmation point.** The usability protocol presented; recruiting after confirmation; sessions; report.
4. Phase 1 verification table in [00-README.md](00-README.md); the risk register reviewed; the open points of the Phase 1 documents closed or promoted.

Done: the criteria of M1.8 and the done criteria of Phase 1 in [../16-roadmap.md](../16-roadmap.md) verified one by one. Release: `v1.0.0`.
Risks: the newcomer test fails the fifteen-minute target; that is a finding, not a blocker: the report says where the minutes went and Phase 2 opens with the fixes.

### Summary

| Milestone | Sessions | Depends on | Tag |
|---|---|---|---|
| M1.1 | 3 | Phase 0 | v0.3.1 |
| M1.2 | 3 | M1.1 | v0.3.2 |
| M1.3 | 4 | M1.2 | v0.3.3 |
| M1.4 | 5 + authoring | M1.3 | v0.3.4 |
| M1.4r | 4 + the first Italian packet | M1.4 | — (ships with v0.3.5) |
| M1.C | 4 | M1.4r | — (ships with v0.3.5) |
| M1.5 | 2 | M1.C | v0.3.5 |
| M1.6 | 4 | M1.3, M1.5 | v0.3.6 |
| M1.7 | 3 + drafting | M1.1 (content), M1.6 (goldens) | v0.3.7 |
| M1.8 | 3 | M1.7 | v1.0.0 |

## Tasks

1. Keep this document current: when a milestone closes, record the tag and the date here — every milestone.
2. At each milestone boundary, re-read [../18-risks.md](../18-risks.md) (R-04, R-11, R-12 own Phase 1 signals) and the open points of the Phase 1 documents; close or promote them — every milestone.
3. At Phase 1 close, write the Phase 2 execution plan at the opening of Phase 2, starting with DEC-05 and DEC-06 — M1.8 records the hand-over.

## Open points

- Whether M1.6 (print) should come before M1.4 (creation) to give the owner a printable playbook of the fixture characters earlier; possible, since print depends on the sheet and the stored character only when printing a created one. Decide at the close of M1.3.
- Whether the project name (and the site path) is settled during Phase 1; the base URL is one line, the package scope a search-and-replace.
- DEC-23 (one package per official book, or one "core" package) is to be decided before the next private package (dmg14 or mm14); the catalogues it serves are in [../19-catalogues.md](../19-catalogues.md).
- Famous characters from other works (Geralt of Rivia, Uther the Lightbringer…) as demo characters and as wizard concepts: proposed by the owner on 2026-09-25, set aside to evaluate later. A well-delineated fictional character is protected by copyright and its name is often a trademark; the public content is CC-BY, which cannot cover them. The options recorded: a private package (like phb14), a separate fan package with notices that follows each owner's fan-content policy, or original concepts "in the manner of" with names of our own.
- Session estimates assume agent assistance for repetitive work (archetype authoring, translation, component boilerplate); revise after M1.3.

## Progress log

| Milestone | Closed | Tag | Notes |
|---|---|---|---|
| M1.6 | 2026-09-30 | v0.3.6 | Replanned by the owner (DEC-13 amended, DEC-26): the page draws the PDF from the platform's "classic" sheet, drawn from scratch with the official one's layout (`packages/sheets`, pdf-lib). M1.6a: page 1, the "PDF" button with download or share. M1.6b: pages 2 and 3, the blank sheet, paper and hand as preferences (Patrick Hand, owner). M1.6b-bis (owner's notes): lines that follow the text, allies' details, formulas in the PDF (modifiers, saves, skills, passive Perception, initiative, spell DC and attack) that keep the engine's bonuses. M1.6c: cards with the full text of every feature and spell, the credits, the acceptance (checklist, page counts, contrast). Found on the way: pdf-lib embeds a whole WOFF unconverted (so every font is a subset, the hand with all of Latin-1); fontkit cannot subset some WOFF2; ligatures off; the hooks' flaky tests (the twelve-class flow's races, waits of 10 s). Not done: tagged PDF (pdf-lib cannot), the formula-and-provenance footnote of doc 12 (the cards show the computed numbers "for you"). |
| M1.C | 2026-09-28 | — (ships with v0.3.5) | The compendium (DEC-25, [13-compendium.md](13-compendium.md)): `composeEntry` and `dnd show` for spells, items and conditions in EN/IT with goldens (M1.Ca); the compendium's set with the creatures fetched only when asked, the index, a search that forgives accents and knows the English names, filters in the address (M1.Cb); `/compendium`, a section's list, an entry or a stat block, the navigation link with icons over labels on a phone (M1.Cc); links from the sheet and, in a new tab, from the wizard, four statistics events, Lighthouse on the list (M1.Cd). Fixes found on the way: rich text losing its first element in the tests' document; four heavy tests given more time. |
| M1.4 | 2026-09-25 | v0.3.4 | Creation content: srd51 0.2.0–0.6.0 (twelve archetypes, `primaryAbilities`, `ruleset.abilityScores` from SRD 5.2, pack contents, `state.currency`, `ruleset.languages`, item category tags, `open-choice.amount` for the half-elf, `ruleset.alignments`, the acolyte's ideals), all additive at v0. The wizard (M1.4b–d): a self-saving draft, steps 0–9 in both languages with copy by help level, archetypes that prefill everything, the three ability methods, every open choice in step 6, starting equipment from structured grants with the suggested purse, personality with the background's suggestions, the review with what is still open and the character stored with its "as created" snapshot. M1.4e: editing a stored character from its sheet (its own draft, the subclass in step 3, typed scores, the owned list, the reset confirmation), the expert's single page, deleting a character (owner). Acceptance: the twelve classes through the wizard with nothing open at the review, as fixtures `created-*` equal to the CLI's derivation; the reference Monk reopened at level 3 offers Way of Shadow at step 3 (private). Manual pass: keyboard and axe covered by the tests on every new screen; the screen reader pass pending the owner, tagged by the owner's decision (2026-09-25). |
| M1.3 | 2026-09-24 | v0.3.3 | The composer's three help levels and explain views, the EN/IT sheet catalogue, content reminders and declared sections (M1.3a); preferences on `JSONStorage`, the sheet in the interface language, demo characters and `/characters/[id]` (M1.3b); our design system (tokens, four looks, BEM, Cinzel and Atkinson Hyperlegible, no Bootstrap), the build-mode screen and its components, Markdown through marked and DOMPurify (M1.3c); M1.3d: Font Awesome as inline SVG, which removed 235 KB of webfonts and cut the entry CSS from 95 KB to 13 KB; the `dnd:derive` measure (2.6 ms for the level 20 caster on a laptop); axe, keyboard, label-in-name and token-contrast checks over every screen in both languages; the budgets (first load 202.8 KB of 300, SRD 416.8 KB of 500); Lighthouse in CI (accessibility 100; cold time to interactive 3.1 s on the characters page and 6.5 s on the sheet, guarded at 3.5 s and 7 s; two seconds on the repeat visit moved to M1.5 by the owner). Fixes the checks found: the brass and unavailable colours brought to 4.5:1; values, to-hit buttons and resource counts named by their content, not by an `aria-label` that differed from the text shown; `lang` on the document. Manual pass: keyboard-level structure checked by the tests; the screen reader pass (07, "The manual pass") pending the owner. Tagged on 2026-09-25 by the owner's decision, the pass still pending. |
| M1.2 | 2026-09-23 | v0.3.2 | `useBrowserStorage` on `IndexedDatabase` of `@byloth/core`, persistence requested at the first write; `packages/loader` split from engine and CLI (engine → loader → schema; `loadPackages`, `validate`, the package checks and bundles moved, outputs byte-identical); packages loaded in the browser from a zip or a bundle, checked like `dnd validate`, one version per id; DEC-21 (editions are packages, fixes propagate with an alert, every release published: `dnd release`, `releases/content/`, `index.json`, SRD never in the browser); the packages page and `useContentStore`; memoised `useEngine`; the template's alert handler back (pnpm 12.5.1); the reference Monk computes in the browser with `phb14` from a zip, equal to the CLI snapshot (private test). Left to the owner: measuring the quota on the reference phones, push. |
| M1.1 | 2026-09-22 | v0.3.1 | `packages/composer` (pure; `compose` and `explain`; the CLI text renderer is typography over its tree, the four `sheet.txt` byte-identical, four `section-tree.json` goldens); the Ajv validator shared as `@byloth/dnd-platform-schema/validate`; `packages/web` from `nuxtplate` on pnpm (Nuxt 4.5 `ssr: false`, `github-pages` preset, `@nuxtjs/i18n` EN/IT, Pinia, VueUse), the sample sheet page rendering `cleric-l5` from the composer's tree, component and catalogue tests in the Nuxt Vitest project, `pages.yml` and CI steps, root scripts `web:*`. Left out: the template's alert handler (pnpm link issue with the vuert prerelease, see 01). Pending the owner: enable Pages, push, check the site from a phone. |
| — | 2026-09-22 | — | Phase 1 opened: decisions DEC-01 (shell), DEC-04, DEC-09, DEC-12, DEC-13, DEC-15 taken by the owner; execution plan written (this directory). |
