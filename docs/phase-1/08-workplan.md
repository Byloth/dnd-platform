# Phase 1 — 08 Work plan

## Purpose

This document orders the work of Phase 1 into the eight milestones of [00-README.md](00-README.md), with the tasks of every other Phase 1 document placed in sequence, their dependencies, what each milestone releases, its specific risks, and the points where the project owner must explicitly confirm before work continues. Estimates are in relative *work sessions* (one focused sitting), as in Phase 0, where the estimates proved conservative by a factor of two to three with agent assistance.

## Decisions

- **Milestones are sequential; tasks inside a milestone may run in parallel.** A milestone closes only when its done criteria in [00-README.md](00-README.md) hold, the suite is green, the accessibility pass of [07-testing-accessibility-performance.md](07-testing-accessibility-performance.md) is recorded, and the site generates.
- **Every milestone ends in a tag** `v0.3.<n>`; Phase 1 closes with `v1.0.0`, the MVP. The owner pushes to `master` (the default branch of the public repository; the workflows trigger on it); the Pages deployment follows the push.
- **Three explicit confirmation points**: before the first public deployment on GitHub Pages (M1.1: the owner enables Pages and pushes; until then the site exists only locally), before launching the agent drafting of the Italian translation (M1.7), before recruiting people for the newcomer test (M1.8). Nothing else needs confirmation.
- **The content format stays at v0.** Additions Phase 1 needs (an `abilityScores` block in the ruleset for point buy, an export document schema) are additive and recorded in [../phase-0/inventory/authoring-review.md](../phase-0/inventory/authoring-review.md); a breaking change waits for v1 and its migration.
- **No back end, no accounts, no service worker in Phase 1** (DEC-04, DEC-12, DEC-06): a task that needs one is out of scope and goes to the open points.

## Design

### Dependency graph

```
M1.1 scaffold + composer ──► M1.2 content store ──► M1.3 build-mode sheet ──► M1.4 creation ──► M1.5 character store, export/import
                                                              │                                          │
                                                              └──────────► M1.6 print ◄──────────────────┤
                                                                                                         ▼
                                                                    M1.7 Italian ──► M1.8 working directory, accessibility, newcomer test ──► Phase 1 done
```

M1.6 needs the composer and the sheet (M1.3) and the stored character (M1.5). M1.7 can start its content work (OCR, skeleton, packets) as soon as M1.1 exists and lands after M1.6 so that the Italian goldens include print. M1.8 is the closing milestone.

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

Done: the criteria of M1.4. Release: `v0.3.4`.
Risks: starting equipment turned out to be structured content, with only the pack contents in prose; M1.4a made those data too. The rule stands: never invent items in code.

### M1.5 — Character store, export and import (≈ 2 sessions)

Tasks (from [02-content-and-character-stores.md](02-content-and-character-stores.md), [05-print-and-export.md](05-print-and-export.md)):
1. Character store: list, create, update, delete; the missing-package state.
2. Export document schema (additive), download; import with matching and mismatch handling.
3. Round trip test over every fixture character.
4. The sheet interactive under two seconds on the repeat visit (owner's decision at M1.3d): the site's packages kept in the browser store, so that a second visit does not fetch the SRD, and the sheet route's JavaScript trimmed. Lighthouse measures the repeat visit, and the cold guards of M1.3d tighten with it.

Done: the criteria of M1.5. Release: `v0.3.5`.
Risks: none technical; the risk is UX, losing a guest's character; every destructive action offers the export first.

### M1.6 — Print (≈ 4 sessions)

Tasks (from [05-print-and-export.md](05-print-and-export.md)):
1. Print route, page-size preference, print stylesheet, Part 2 components.
2. Part 3 cards and the credits page.
3. The reference Monk's checklist from the original playbook; black-and-white and page-size acceptance; the three browser engines checked.

Done: the criteria of M1.6. Release: `v0.3.6`.
Risks: `@page` support differs across browsers; the layout must degrade to a readable print everywhere and be perfect in one (Chromium).

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
| M1.5 | 2 | M1.4 | v0.3.5 |
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
- Session estimates assume agent assistance for repetitive work (archetype authoring, translation, component boilerplate); revise after M1.3.

## Progress log

| Milestone | Closed | Tag | Notes |
|---|---|---|---|
| M1.3 | 2026-09-24 | v0.3.3 | The composer's three help levels and explain views, the EN/IT sheet catalogue, content reminders and declared sections (M1.3a); preferences on `JSONStorage`, the sheet in the interface language, demo characters and `/characters/[id]` (M1.3b); our design system (tokens, four looks, BEM, Cinzel and Atkinson Hyperlegible, no Bootstrap), the build-mode screen and its components, Markdown through marked and DOMPurify (M1.3c); M1.3d: Font Awesome as inline SVG, which removed 235 KB of webfonts and cut the entry CSS from 95 KB to 13 KB; the `dnd:derive` measure (2.6 ms for the level 20 caster on a laptop); axe, keyboard, label-in-name and token-contrast checks over every screen in both languages; the budgets (first load 202.8 KB of 300, SRD 416.8 KB of 500); Lighthouse in CI (accessibility 100; cold time to interactive 3.1 s on the characters page and 6.5 s on the sheet, guarded at 3.5 s and 7 s; two seconds on the repeat visit moved to M1.5 by the owner). Fixes the checks found: the brass and unavailable colours brought to 4.5:1; values, to-hit buttons and resource counts named by their content, not by an `aria-label` that differed from the text shown; `lang` on the document. Manual pass: keyboard-level structure checked by the tests; the screen reader pass (07, "The manual pass") pending the owner; the tag follows it. |
| M1.2 | 2026-09-23 | v0.3.2 | `useBrowserStorage` on `IndexedDatabase` of `@byloth/core`, persistence requested at the first write; `packages/loader` split from engine and CLI (engine → loader → schema; `loadPackages`, `validate`, the package checks and bundles moved, outputs byte-identical); packages loaded in the browser from a zip or a bundle, checked like `dnd validate`, one version per id; DEC-21 (editions are packages, fixes propagate with an alert, every release published: `dnd release`, `releases/content/`, `index.json`, SRD never in the browser); the packages page and `useContentStore`; memoised `useEngine`; the template's alert handler back (pnpm 12.5.1); the reference Monk computes in the browser with `phb14` from a zip, equal to the CLI snapshot (private test). Left to the owner: measuring the quota on the reference phones, push. |
| M1.1 | 2026-09-22 | v0.3.1 | `packages/composer` (pure; `compose` and `explain`; the CLI text renderer is typography over its tree, the four `sheet.txt` byte-identical, four `section-tree.json` goldens); the Ajv validator shared as `@byloth/dnd-platform-schema/validate`; `packages/web` from `nuxtplate` on pnpm (Nuxt 4.5 `ssr: false`, `github-pages` preset, `@nuxtjs/i18n` EN/IT, Pinia, VueUse), the sample sheet page rendering `cleric-l5` from the composer's tree, component and catalogue tests in the Nuxt Vitest project, `pages.yml` and CI steps, root scripts `web:*`. Left out: the template's alert handler (pnpm link issue with the vuert prerelease, see 01). Pending the owner: enable Pages, push, check the site from a phone. |
| — | 2026-09-22 | — | Phase 1 opened: decisions DEC-01 (shell), DEC-04, DEC-09, DEC-12, DEC-13, DEC-15 taken by the owner; execution plan written (this directory). |
