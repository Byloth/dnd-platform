# Phase 1 — 07 Testing, accessibility and performance

## Purpose

This document extends the testing strategy of [../phase-0/04-testing-strategy.md](../phase-0/04-testing-strategy.md) to the web application, and turns the accessibility and performance requirements of [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md) into gates a milestone must pass. It also fixes the reference low-end phone and the newcomer usability test that closes the phase.

## Decisions

- **Vitest stays the single runner**, as a projects configuration: the Node project (engine, schema, cli, composer, the doc-examples and repository-rules tests) and the Nuxt project (`packages/web`, with `@nuxt/test-utils` and a browser-like DOM environment for components and composables). `pnpm test` runs both.
- **The composer's section trees are golden** (`section-tree.json` beside `snapshot.json` and `sheet.txt` of the four reference characters), compared by `dnd fixtures`; the text renderer's goldens remain as the reference of the regular help level.
- **Every screen has a component test** that renders it with a fixture character in both languages at 360 px and 1280 px width and checks: no untranslated key, the accessibility assertions below, and a snapshot of the accessible tree (roles and names), not of the markup.
- **Accessibility is automated and manual.** Automated: an axe-core pass over every screen in the component tests (no violation of the WCAG 2.1 AA rules), the contrast of the theme tokens tested numerically, keyboard reachability of every control asserted by tabbing through the rendered screen. Manual: before each milestone closes, one pass with a keyboard only and one with a screen reader (VoiceOver on macOS or NVDA on Windows), following the nine-point checklist of [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md); the result is recorded in the workplan's progress log.
- **The reference low-end phone** is an Android phone of the 2019 class with 2 GB of RAM running Chrome (the owner names the actual device at M1.1; a Moto G7 Play or equivalent). In CI, Lighthouse reproduces it with the mobile preset, 4× CPU throttling and "Slow 4G": the sheet route must be interactive under two seconds, and a derivation triggered by a wizard change must complete under one hundred milliseconds measured in the browser (a performance mark around `derive` in the `useEngine` composable, asserted in a component test with the level 20 multiclass caster).
- **Budgets tracked in CI**: first load of the site without content under 300 KB compressed; the SRD bundle under 500 KB compressed; both measured by the generate step and failing the workflow when exceeded.
- **The newcomer usability test** is the phase's last gate: at least three people who have never played, each building a level 1 character on their own phone within fifteen minutes and then answering "what does this number mean?" for five numbers of their sheet; observed, not helped; the protocol and the results are recorded in `docs/phase-1/usability/` (no names).

## Design

### Test levels

| Level | What | Where | Gate |
|---|---|---|---|
| Composer goldens | section trees of the four reference characters | `fixtures/characters/*/section-tree.json` | CI |
| Component tests | every screen and component, both languages, two widths, axe, keyboard, accessible-tree snapshot | `packages/web/tests/` | CI |
| Flow tests | the wizard for the twelve SRD classes; export → import round trip; package load from zip and bundle; the private Monk end to end | `packages/web/tests/flows/` | CI (private one skipped without the book) |
| Print acceptance | the reference Monk's checklist, A4 and Letter page counts, black-and-white contrast | `fixtures/print/` | CI where automatable, manual for the greyscale inspection |
| Performance | Lighthouse on the generated site; the derive mark | workflow step; component test | CI |
| Manual passes | keyboard, screen reader, the phone in hand | progress log | milestone close |
| Usability | the newcomer test | `docs/phase-1/usability/` | phase close |

### Accessibility assertions in components

- Sections are landmarks with the section title as the accessible name.
- Every value has an accessible name "label, value" ("Armor Class, 15"); pips expose "n of m {resource}".
- Every interactive element is focusable in visual order and has a visible focus style; no hover-only affordance.
- Icons have text labels; colour never carries information alone (the tests strip colour and check that the meaning survives through text).
- Zoom to 200 % keeps a single-column layout readable: tested by rendering at 640 px with the base font size doubled.
- Animations respect `prefers-reduced-motion`.

### Performance rules

- The engine and the composer are imported once and shared; no derivation on scroll or on every keystroke: inputs debounce to the next frame, and the derivation is memoised per document.
- The SRD bundle is fetched once and cached; the site's first paint does not wait for it (the characters list renders from the store, the bundle loads while the user reads).
- Component lists are not virtualised in Phase 1: the largest list (spells of a level 20 caster) stays under two hundred rows.

## Tasks

1. Vitest projects configuration, the Nuxt project with the DOM environment, the accessible-tree snapshot helper — M1.1.
2. Section-tree goldens in `dnd fixtures` — M1.1.
3. axe-core, keyboard and contrast assertions as a shared test helper — M1.3.
4. Lighthouse step in the workflow with the phone preset and the budgets; the derive performance mark — M1.3.
5. Flow tests: the twelve classes, the round trip, the package loads — M1.4, M1.5.
6. Print acceptance fixtures — M1.6.
7. The manual pass procedure written once and run at every milestone close from M1.3 — M1.3.
8. The usability protocol, the sessions, the report — M1.8 (confirmation point before recruiting).

## Open points

- Whether the accessible-tree snapshots are stable enough across library versions to be golden; if they churn, keep them as assertions on roles and names of the key elements instead.
- Screen reader passes need a person with the device; the owner or a tester; recorded per milestone.
- Lighthouse in CI is noisy on shared runners; use the median of three runs and a tolerance of 10 % on the time budgets, none on the size budgets.
