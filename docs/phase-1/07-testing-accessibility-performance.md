# Phase 1 — 07 Testing, accessibility and performance

## Purpose

This document extends the testing strategy of [../phase-0/04-testing-strategy.md](../phase-0/04-testing-strategy.md) to the web application, and turns the accessibility and performance requirements of [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md) into gates a milestone must pass. It also fixes the reference low-end phone and the newcomer usability test that closes the phase.

## Decisions

- **Vitest stays the single runner**, as a projects configuration: the Node project (engine, schema, cli, composer, the doc-examples and repository-rules tests) and the Nuxt project (`packages/web`, with `@nuxt/test-utils` and a browser-like DOM environment for components and composables). `pnpm test` runs both.
- **The composer's section trees are golden** (`section-tree.json` beside `snapshot.json` and `sheet.txt` of the four reference characters), compared by `dnd fixtures`; the text renderer's goldens remain as the reference of the regular help level.
- **Every screen has a component test** that renders it with a fixture character in both languages at 360 px and 1280 px width and checks: no untranslated key, the accessibility assertions below, and a snapshot of the accessible tree (roles and names), not of the markup. As built (M1.3d): happy-dom has no layout, so widths make no difference there; the accessible tree is asserted on its key elements (the first heading, named regions, "Armor Class, 18"), not stored as a golden (see the open points). Layout at phone width is Lighthouse's and the manual pass's job.
- **Accessibility is automated and manual.** Automated: an axe-core pass over every screen in the component tests (no violation of the WCAG 2.1 AA rules), the contrast of the theme tokens tested numerically, keyboard reachability of every control asserted by tabbing through the rendered screen. As built (M1.3d), in `packages/web/tests/accessibility.ts`:
  - `expectNoAxeViolations`: axe-core with the WCAG 2.1 A and AA tags. Rules that need layout or the whole document are off, because happy-dom has no layout and a component is not a page: colour contrast, "label in name", landmarks, level-one heading, document title and language.
  - `expectKeyboardOperable`: tabbing needs a browser, so it checks the structure behind it. No positive `tabindex`, so the tab order is the document's. Every custom control can take focus, with roving focus allowed as in a tab list. "Label in name" (WCAG 2.5.3): a control named by `aria-label` holds the text it shows.
  - `accessibleName`, `byName` and `accessibleTree`: the name computed as a screen reader reads it, with `aria-hidden` parts left out. The tests find controls by that name, not by attribute.

  `tests/contrast.test.ts` parses `assets/scss/_tokens.scss` into the four looks and holds the pairs the components use to 4.5:1 for text and 3:1 for marks and focus. `border` and `border-strong` are decoration only; a boundary that identifies a control uses a mark colour. Lighthouse runs the layout-bound rules in a real browser with the accessibility score required at 100. Manual: before each milestone closes, one pass with a keyboard only and one with a screen reader (VoiceOver on macOS or NVDA on Windows), following the nine-point checklist of [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md); the result is recorded in the workplan's progress log.
- **The reference low-end phone** is an Android phone of the 2019 class with 2 GB of RAM running Chrome (the owner names the actual device at M1.1; a Moto G7 Play or equivalent). In CI, Lighthouse reproduces it with the mobile preset, 4× CPU throttling and "Slow 4G": the sheet route must be interactive under two seconds, and a derivation triggered by a wizard change must complete under one hundred milliseconds measured in the browser (a performance mark around `derive` in the `useEngine` composable, asserted in a component test with the level 20 multiclass caster).
  - As built (M1.3d), the derive mark: `useEngine().sheet` leaves the `dnd:derive` measure around the derivation and its composition, with package loading excluded and only the last measure kept. `tests/engine.test.ts` asserts it on `perf-caster-l20`, the Phase 0 performance fixture (a level 20 wizard with a full spell list), with the soft 100 ms and hard 500 ms limits of the Phase 0 test. It measured 2.6 ms on a laptop.
  - As built, Lighthouse: `packages/web/lighthouserc.json` runs the characters page and that caster's sheet three times each on a static server that behaves like GitHub Pages (`scripts/serve-site.ts`: base path, SPA fallback, gzip). It asserts on the median.
  - Measured cold, time to interactive is 3.1 s on the characters page and 6.5 s on the sheet. At Slow 4G's ~180 KB/s the SRD bundle alone (427 KB compressed) takes 2.3 s, so two seconds cold is incompatible with the SRD's own 500 KB budget.
  - Decided by the owner on 2026-09-24: CI guards cold time to interactive at 3.5 s and 7 s against regressions. The two-second target applies to the repeat visit, with the SRD kept in the browser and the route's JavaScript trimmed, and it is a task of M1.5.
- **Budgets tracked in CI**: first load of the site without content under 300 KB compressed; the SRD bundle under 500 KB compressed; both measured by the generate step and failing the workflow when exceeded. As built (M1.3d): `pnpm web:budgets` (`scripts/check-budgets.ts`) runs after `web:generate`. It gzips what `index.html` links (the stylesheet and the modules it preloads) and counts the latin woff2 files of the two type families as they are. It also reports every JavaScript and CSS file of the site. At M1.3d: first load 202.8 KB, SRD 416.8 KB, all JavaScript and CSS 284.9 KB.
- **The newcomer usability test** is the phase's last gate: at least three people who have never played, each building a level 1 character on their own phone within fifteen minutes and then answering "what does this number mean?" for five numbers of their sheet; observed, not helped; the protocol and the results are recorded in `docs/phase-1/usability/` (no names).

## Design

### Test levels

| Level | What | Where | Gate |
|---|---|---|---|
| Composer goldens | section trees of the four reference characters | `fixtures/characters/*/section-tree.json` | CI |
| Component tests | every screen and component, both languages, axe, keyboard and label in name, key elements of the accessible tree; token contrast | `packages/web/tests/` | CI |
| Flow tests | the wizard for the twelve SRD classes; export → import round trip; package load from zip and bundle; the private Monk end to end | `packages/web/tests/flows/` | CI (private one skipped without the book) |
| Print acceptance | the reference Monk's checklist, A4 and Letter page counts, black-and-white contrast | `fixtures/print/` | CI where automatable, manual for the greyscale inspection |
| Performance and budgets | Lighthouse on the generated site (accessibility 100, time to interactive); the derive mark; the size budgets | `pnpm web:lighthouse`, `pnpm web:budgets`; `tests/engine.test.ts` | CI |
| Manual passes | keyboard, screen reader, the phone in hand | progress log | milestone close |
| Usability | the newcomer test | `docs/phase-1/usability/` | phase close |

### Accessibility assertions in components

- Sections are landmarks with the section title as the accessible name.
- Every value has an accessible name "label, value" ("Armor Class, 15"); pips expose "n of m {resource}".
- Every interactive element is focusable in visual order and has a visible focus style; no hover-only affordance.
- Icons have text labels; colour never carries information alone (the tests strip colour and check that the meaning survives through text).
- Zoom to 200 % keeps a single-column layout readable: tested by rendering at 640 px with the base font size doubled.
- Animations respect `prefers-reduced-motion`.

### The manual pass

It runs at every milestone close, on the screens the milestone delivered, and it is recorded in the workplan's progress log: who ran it, on what, and what they found. It has two parts.

With a keyboard only, in a desktop browser:
1. Tab from the address bar through the whole screen. Every control is reached, in the order it is seen, with a visible focus ring, and nothing that is not a control takes focus.
2. Open and close every disclosure (a section's collapse, the explanation drawer, the settings menu) with Enter or Space, and close overlays with Escape. Focus returns to the control that opened them.
3. In the drawer's tab list, the arrow keys move between the tabs.
4. Zoom to 200 %: one column, nothing cut off, no horizontal scroll.

With a screen reader (VoiceOver on macOS or iOS, NVDA on Windows, TalkBack on the phone):
1. The landmarks list shows the bar, the main content and one region per sheet section, named by its title.
2. Reading the sheet from the top gives the character's name, then each section's values as "label, value" ("Armor Class, 13"), skills as "Stealth, +3", and attacks as "Dagger, To hit +9".
3. A resource reads "n of m {resource}", never "n slash m".
4. Opening a value's explanation says what opened, reads the lines in words, and reads the close button's name.
5. Change the help level and the language in the settings. The sheet reads in the new language and `lang` follows (Italian names are read with Italian pronunciation).
6. No icon is read on its own; every icon-only button has a name.
7. Run the same pass in the light and dark themes and with more contrast. Nothing becomes unreadable.

### Performance rules

- The engine and the composer are imported once and shared; no derivation on scroll or on every keystroke: inputs debounce to the next frame, and the derivation is memoised per document.
- The SRD bundle is fetched once and cached; the site's first paint does not wait for it (the characters list renders from the store, the bundle loads while the user reads).
- Component lists are not virtualised in Phase 1: the largest list (spells of a level 20 caster) stays under two hundred rows.

## Tasks

1. Vitest projects configuration, the Nuxt project with the DOM environment, the accessible-tree snapshot helper — M1.1.
2. Section-tree goldens in `dnd fixtures` — M1.1.
3. axe-core, keyboard and contrast assertions as a shared test helper — M1.3 (done, M1.3d).
4. Lighthouse step in the workflow with the phone preset and the budgets; the derive performance mark — M1.3 (done, M1.3d; the two-second repeat visit in M1.5).
5. Flow tests: the twelve classes, the round trip, the package loads — M1.4, M1.5.
6. Print acceptance fixtures — M1.6.
7. The manual pass procedure written once and run at every milestone close from M1.3 — M1.3 (written, M1.3d: "The manual pass" above).
8. The usability protocol, the sessions, the report — M1.8 (confirmation point before recruiting).

## Open points

- ~~Whether the accessible-tree snapshots are stable enough across library versions to be golden~~ — M1.3d: assertions on the roles and names of the key elements, no golden.
- Screen reader passes need a person with the device; the owner or a tester; recorded per milestone.
- Lighthouse in CI is noisy on shared runners; use the median of three runs and a tolerance of 10 % on the time budgets, none on the size budgets. As built: the median of three; the cold guards (3.5 s, 7 s) already include the margin over the measured 3.1 s and 6.5 s. Locally, `CHROME_PATH` names a Chromium, for example Playwright's. Under WSL, chrome-launcher writes its profile directories into the working directory, and the script removes them.
