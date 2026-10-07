# Phase 1 — 09 Interface revisions (owner's review, 2026-09-25)

## Purpose

After M1.4 closed, the owner reviewed the application and listed what to change before going on. This document plans the interface part of that review: the navigation bar and its menus, a settings page with a new setting for units of measure, the demo characters on the characters page, and the wizard's buttons and transitions. The integrity fixes of the same review are in [10-wizard-integrity.md](10-wizard-integrity.md), the Italian content in [11-italian-content.md](11-italian-content.md); the milestone that holds them is M1.4r in [08-workplan.md](08-workplan.md).

The owner's points are numbered as in the review: 1, 1.1, 2, 2.1, 3, 4, 6, 8.1, 8.2, 8.2.1.

## Decisions

Taken by the owner on 2026-09-25:

- **The navigation bar keeps three links: "Characters", "Packages" and "Settings"** (1). "New character" leaves the bar; it stays on the characters page, where creating starts. "Characters" and "Packages" get an icon each (1.1), like "Settings" already has. Re-evaluated by the owner on 2026-10-07: the bar keeps "Characters", "Compendium", "Packages" and "Settings", each with an icon of its own like "Settings"; "New character" leaves it.
- **After "Settings", two menus: the colour mode, then the language** (3, 2). Re-evaluated by the owner on 2026-10-07, unchanged: two extra icons, perhaps smaller than the links, for a quick switch; both settings stay on the settings page too. Each opens a clean dropdown whose items are `<icon> <text>`: system, light, dark for the mode; `<flag> <name>` for the language, listing only the languages the application has (2.1).
- **Flags are drawn, never emoji**: Windows shows no flag emoji. The United Kingdom flag stands for English, the Italian tricolour for Italian.
- **A dropdown closes when the player clicks outside it** (2.1), which the current "Settings" disclosure does not do.
- **A settings page** (4) shows every setting, the existing ones and a new one: **the units of measure**. Re-evaluated by the owner on 2026-10-07, confirmed: a page of its own, clear and orderly; "Settings" in the bar becomes a plain link to it, with no dropdown. Feet and pounds are not clear to everybody. The default follows the language: imperial in English, metric in Italian. The player can pick either explicitly.
- **Demo characters stay in view until the player has characters of their own** (6). With no stored character the demo list is open; with one or more, "Demo characters" becomes a disclosure, closed by default. Re-evaluated by the owner on 2026-10-07, with a new threshold: the demo list stays open while the player has none or one character of their own, and becomes the closed disclosure from two.
- **The wizard's "Back" and "Next" stay reachable without scrolling** (8.1): a bar fixed to the bottom of the screen. Re-evaluated by the owner on 2026-10-07, confirmed as planned.
- **The wizard fades between steps** (8.2), as the pages already fade between routes, and **the step indicator fades with it** (8.2.1). Re-evaluated by the owner on 2026-10-07, confirmed as planned.

## Design

### The navigation bar

Today `components/globals/NavigationBar.vue` holds the brand, three `RouterLink`s ("Characters", "New character" with a `--wide` modifier hidden on phones, "Packages") and a native `<details class="navigation-bar__settings">` with four `<select>`s (language, help level, theme, contrast). The disclosure has no outside-click, Escape or route handling, so it stays open until its summary is clicked again.

After the change, from left to right:

```
[d20] D&D Platform      [group] Characters   [box] Packages   [sliders] Settings   [mode ▾]   [flag ▾]
```

- Links: "Characters" (`user-group`), "Packages" (`box-open`), "Settings" (`sliders`, now a link to `/settings`). On a phone the three labels stay visible if they fit the 360 px width, otherwise they become screen-reader text beside the icon (the rule the brand already follows); the tap target stays 44 px.
- The mode menu: its button shows the icon of the current choice (`circle-half-stroke` for system, `sun`, `moon`) and is named "Colour mode: System". Items: `[circle-half-stroke] System`, `[sun] Light`, `[moon] Dark`.
- The language menu: its button shows the current flag and is named "Language: English". Items: the flag, then the language's own name (`English`, `Italiano`), from the i18n `locales` so a new language appears by itself.
- Contrast and help level leave the bar: they are on the settings page.

Icons: `faUserGroup`, `faBoxOpen`, `faSun`, `faMoon`, `faCircleHalfStroke` join the list in `components/ui/icons.ts` (imported one by one, as now).

### The dropdown menu

One component, `components/ui/DropdownMenu.vue`, serves both menus and any later one.

- A `<button>` with `aria-expanded` and `aria-controls`, and a list of choices. It follows the disclosure-with-choices pattern: each item is a `<button>` with `aria-pressed` on the current one, a tick beside it, and the visible text as its name. It is not an ARIA `menu`, which would promise menu keyboard semantics users do not expect on a website.
- It closes on:
  - a click or tap outside it (VueUse's `onClickOutside`, already auto-imported through `@vueuse/nuxt`);
  - Escape, with focus back on the button;
  - a choice;
  - a route change;
  - opening another dropdown.
- Keyboard: Tab moves through the items; Up and Down move between them; Home and End jump to the first and last.
- Position: below its button, aligned to the right edge of the bar. On a phone its width is capped to the viewport minus the gutters.
- Look: `mixins.card(3)`, a 44 px row per item, icon or flag at 1.25 rem, the current item in the accent-soft colour. The BEM block is `dropdown-menu`.

### Flags

Two components, `components/ui/flags/FlagGb.vue` and `FlagIt.vue`, draw each flag as inline SVG at a 3:2 ratio.

- They are `aria-hidden`: the language's name is always written beside the flag.
- A thin border in `--color-border` keeps the white of the tricolour visible on a light surface.
- A map from locale code to flag component lives next to the i18n config. A language without a flag shows the `globe` icon.

### The settings page

`pages/settings.vue`, route `settings`, titled "Settings". The sections below are landmarks with `h2` headings. Each setting is a radio group of cards, the pattern of the wizard's `ChoiceCard`, with one sentence under each option:

| Section | Setting | Options | Stored as |
|---|---|---|---|
| Language | interface language | English, Italiano (with flags) | `language` |
| Help | help level | newcomer, regular, expert, each with what it changes | `helpLevel` |
| Appearance | colour mode | system, light, dark | `theme` |
| Appearance | contrast | as the system, more | `contrast` |
| Units | units of measure | from the language, imperial (feet, pounds), metric (metres, kilograms) | `units` (new) |
| Print | page size | A4, Letter | `pageSize` (exists, unused until M1.6) |

The page saves through `stores/preferences.ts` as today (`JSONStorage`, key `preferences`, values validated by `ALLOWED`). A short line at the top says that the settings stay in this browser and are never part of a character.

### Units of measure

Today "ft" and "lb" are fixed in the composer's messages:

- `packages/composer/src/messages/en.ts` and `it.ts` define `units.feet`, `units.pounds`, `core.speedOther` and `senses.sense`.
- `packages/composer/src/index.ts` uses them through `feet()` (speed), in the senses (darkvision and the others) and in carrying capacity.
- No conversion exists anywhere. Structured distances and weights in the content (spell `range.distance`, item `weight`) are not rendered yet.

The plan:

1. **The preference.** `units: "auto" | "imperial" | "metric"`, default `auto`. The web resolves `auto` from the interface language: `it` gives metric, everything else imperial. The resolved value goes to the composer.
2. **A composer option `units: "imperial" | "metric"`**, default imperial, so the CLI and every golden keep their output. Conversion follows the Italian manuals' convention rather than exact arithmetic:
   - distances: 5 ft = 1,5 m, so feet × 0.3 (30 ft → 9 m, 60 ft → 18 m);
   - weights: 1 lb = 0.5 kg (carrying capacity 150 lb → 75 kg).
   One function, `measure(value, kind)`, does it. The messages gain `units.metres`, `units.kilograms` and metric forms of `core.speedOther` and `senses.sense`.
3. **Number formatting follows the locale**: 1,5 m in Italian, 1.5 m in English metric.
4. **The CLI gains `--units imperial|metric`**. The goldens stay imperial. One new golden, `sheet.metric.txt` for the level 5 cleric, guards the metric path.
5. **Limits, stated in the interface's help text:**
   - Prose written in the content ("a range of 60 feet") is not converted. The Italian translation writes metres, as the Italian manuals do ([11-italian-content.md](11-italian-content.md)); the English text stays in feet.
   - Exports and the stored character keep feet and pounds ([06-localisation.md](06-localisation.md)): the unit is display only.

This replaces the earlier decision of 06-localisation, "metres beside feet in Italian". There, the unit follows the setting.

### Demo characters on the characters page

`pages/index.vue` groups the list by origin: stored first, then demo, with an `h2` each.

- With no stored character or only one, the demo section stays as today, open (owner, 2026-10-07).
- With two stored characters or more, the demo group becomes a `<details>` whose `<summary>` holds the heading and the count ("Demo characters (6)"). It is closed by default.

It is a native disclosure, so the keyboard and screen readers get it for free. Opening it is not remembered: the page always starts closed once the player has characters.

### The wizard's buttons

`components/wizard/WizardStep.vue` ends each step with a `<footer class="wizard-step__footer">` holding Back and Next, after the step's content. On a long step (equipment, spells) the player scrolls to reach them.

The plan:

- The footer becomes a bar fixed at the bottom of the viewport (`position: sticky; bottom: 0`):
  - the surface colour, a top border, and a shadow while content scrolls beneath it;
  - `padding-bottom: env(safe-area-inset-bottom)` for phones with a gesture bar;
  - Back and Next as today, and a compact "Step n of 10" between them on a phone, since the dots scroll away.
- The page gains bottom padding of the bar's height, so the last card is never hidden behind it.
- The expert page (one form) has no bar. Its review, at the end, holds the save button.
- The bar never covers a focused field: the step content uses `scroll-padding-bottom` equal to the bar's height.

### Transitions

The pages already fade: `nuxt.config.ts` sets `app.pageTransition` (`page`, out-in), and `app.vue` fades opacity over `--duration` with `--easing`. The wizard changes step by replacing `?step=` on the same route, so no page transition runs.

The plan:

- In `components/wizard/WizardView.vue`, the step's content sits inside `<Transition name="step" mode="out-in">`, keyed by the step, with the same fade as the pages. The heading and copy of `WizardStep` fade with it.
- The step indicator (8.2.1):
  - in `WizardStepper`, the current dot's fill and ring and the line up to it animate over `--duration`;
  - the "Step n of 10 · Name" line under the dots fades between values (a keyed `<Transition>` on the text);
  - the side list's current marker slides to the new item.
- Focus: after a step change the step's `h1` receives focus (`tabindex="-1"`), so a screen reader announces the new step. This also answers an open need of the manual pass.
- `prefers-reduced-motion: reduce` turns every one of these transitions off. So does the global rule, if the tokens already carry it; check `_tokens.scss` and add it where it is missing.

### The packages page: dropping files (owner, 2026-09-25)

Done on 2026-09-27. A dropped file that is not a package gets the status line of an unreadable file, as one chosen through the picker does.

The upload area of `pages/packages/index.vue` looks like a drop zone (the `file-picker` card with its icon and hint), but it is only a `<label>` around an `<input type="file">`: files dropped on it are ignored, and the browser may open them instead.

The fix:
- The card handles `dragenter`, `dragover`, `dragleave` and `drop`. A highlighted state (`file-picker--over`, border in the accent colour) shows while files are over it.
- `preventDefault` on `dragover` and `drop` of the whole page, so a file dropped next to the card does not navigate away.
- The dropped files go through the same `store.loadFiles` as the picker. Anything not `.zip` or `.json` is refused with a status line, as a wrong file chosen by the picker is.
- The hint says both ways: "Choose a file or drop it here". A screen reader keeps the picker, since dropping is a pointer-only extra.
- Tests: a synthetic `drop` event with a zip of `fixtures/packages/homebrew-feline` loads it; a dropped `.txt` is refused; `dragover` sets the highlighted state and `dragleave` clears it.

## Tasks

Each is a commit. Tests and lint pass through the hooks.

1. **`DropdownMenu` and the flags**: the component, `FlagGb`, `FlagIt`, the locale-to-flag map; unit tests for opening, outside click, Escape (focus back), a choice, a route change and arrow keys.
2. **Navigation bar**: three links with icons, the mode menu, the language menu; "New character" removed from the bar; catalogue keys EN/IT with translator notes; accessibility tests updated (axe, keyboard, names such as "Language: English").
3. **Settings page**: `pages/settings.vue`, the "Settings" link, the sections above; the `units` preference in `stores/preferences.ts` (`ALLOWED`, default `auto`); tests for each setting being saved and applied.
4. **Units in the composer**: the `units` option, `measure()`, metric messages in both languages, locale number formatting; `--units` in the CLI; the metric golden; the web passing the resolved preference to `useEngine().sheet`; tests of the conversion table (5 → 1,5; 30 → 9; 150 lb → 75 kg).
5. **Demo characters disclosure** on the characters page; tests with and without stored characters.
6. **Sticky wizard bar**: the fixed footer, the page padding, `scroll-padding-bottom`; the expert page unchanged; tests that Back and Next exist once per step and that the bar is absent on the expert page.
7. **Wizard transitions and focus**: the keyed step transition, the indicator transitions, focus on the step heading, reduced motion; tests of focus after "Next".
8. **Dropping packages** on the packages page, as above.
9. **Docs**: 01-web-application (navigation and settings), 03-sheet-composer (units option), 04-character-creation (bar, transitions), 06-localisation (units replace "metres beside feet"); the workplan's M1.4r progress.

### As built (2026-10-07): the bar, the quick switches, the settings page, the units (tasks 1–4)

- **The bar** (`components/globals/NavigationBar.vue`):
  - links: Characters, Compendium, Packages and Settings, each with its icon at every width; "New character" left it;
  - then the two quick switches, smaller than the links: the theme (the current choice's icon: half circle, sun, moon) and the language (the current flag);
  - narrowing step by step: under 992 px the brand keeps its mark only, under 720 px each link is its icon over its label, under 560 px the labels go to the screen reader, and under 360 px the brand gives way (Characters is the home page). Checked with screenshots from 320 to 1280 px in both languages: nothing leaves the screen.
- **`components/ui/DropdownMenu.vue`**: a disclosure with `aria-pressed` choices and a tick on the current one. It closes on a click outside (VueUse `onClickOutside`), on Escape wherever the focus is (`onKeyStroke`, focus back on its button), on a choice, on a route change, and when the other opens. Up, Down, Home and End move between the choices.
- **Flags**: `components/ui/flags/FlagGb.vue` and `FlagIt.vue` (inline SVG, 3:2), and `components/ui/LanguageFlag.vue` with the locale-to-flag map and the globe for a language without one.
- **The settings page** (`pages/settings.vue`): eight settings, each a `fieldset` whose legend is its `h2`, with one sentence under it and a card per option (`ChoiceCard`, always with its summary). The settings are language, help level, theme, contrast, units of measure, PDF paper, PDF writing and usage statistics; the last gives or withdraws the consent, with a link to the privacy page.
- **Units** (task 4's web part; the composer's part came with M1.7):
  - `units: "auto" | "imperial" | "metric"` in the preferences, `auto` by default;
  - `preferredUnits(language)` in `composables/sheet.ts` resolves `auto` through the language;
  - `useEngine().sheet` uses it when no `units` option is given, and keeps it in its cache key;
  - the compendium's entries use it too;
  - the `preference` statistics event includes it.
- **Checks**: `tests/settings-page.test.ts` (every setting, the consent, the dropdowns' Escape, arrows and "one open at a time"), the units in the engine's cache, the settings page in the accessibility tests. `pnpm web:a11y` gains the settings page and the two switches open, with Escape and a click outside checked in Chromium (the simulated DOM of the unit tests does not run VueUse's outside click). The quick run is clean on 58 screens; the first load is 211.0 KB of 300.
- **The roadmap**: "Clear settings" moved to what is available now; the "Coming next" group hides while it is empty.

### As built (2026-10-07): the demo characters (task 5)

`pages/index.vue`: from the player's second character of their own, the demo group is a native `<details>`, closed and never remembered. Its `<summary>` holds the `h2` with the count ("Demo characters (6)") and a chevron. With none or one, the group is open as before (owner's threshold). The list is written once (VueUse `createReusableTemplate`). Tests: `tests/demo-characters.test.ts` with 0, 1 and 2 stored; `pnpm web:a11y` has a "two stored" screen.

## Tests

- Component tests in both languages: axe, keyboard operation and accessible names for the bar, both dropdowns, the settings page, the characters page in both states, and the wizard with its bar.
- The dropdown's closing rules each have their own test.
- Composer: the conversion table, both unit systems in both languages, and imperial output byte-identical to today's goldens.
- Lighthouse keeps accessibility at 100 on the characters page, the sheet and the wizard. The new transitions must not push time-to-interactive past the guards.
- The manual pass (07) adds the bar with a screen reader and the dropdowns on a phone.

## Open points

- The label of the "system" colour mode: "System" or "As the device". Settle with the Italian wording ("Come il sistema"). The owner's (M1.8d, 2026-10-07; listed in [08-workplan.md](08-workplan.md), "Carried into Phase 2").
- Whether the settings page should also hold the storage section now on the packages page (persistence, usage, eviction warning). Leaning: it stays with the packages, where the data is; the settings page links to it.
- Measures inside structured content not rendered yet (spell ranges, item weights): they use `measure()` when M1.6 (cards) or a later sheet change shows them. Carried into Phase 2 (M1.8d, 2026-10-07; [08-workplan.md](08-workplan.md), "Carried into Phase 2").
