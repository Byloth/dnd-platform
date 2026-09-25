# Phase 1 — 01 Web application

## Purpose

This document fixes the shape of the web application: the workspace package, the framework and its mode, how it consumes the engine and the content, how it is built, tested and published, and how it integrates with the monorepo of [../phase-0/01-monorepo.md](../phase-0/01-monorepo.md). It does not describe screens: those are in [03-sheet-composer.md](03-sheet-composer.md), [04-character-creation.md](04-character-creation.md) and [05-print-and-export.md](05-print-and-export.md).

## Decisions

- **One workspace package, `packages/web`, named `@byloth/dnd-platform-web`, private.** It depends on `@byloth/dnd-platform-engine`, `@byloth/dnd-platform-schema`, `@byloth/dnd-platform-loader` (the package loader of [02-content-and-character-stores.md](02-content-and-character-stores.md), M1.2) and `@byloth/dnd-platform-composer` (the new pure package of [03-sheet-composer.md](03-sheet-composer.md)) through workspace links, and on nothing else of the monorepo. Nothing depends on `web`.
- **Nuxt 4, statically generated, client-rendered.** `ssr: false`; `nuxt generate` produces the site; there are no server routes, no Nitro handlers and no runtime configuration read from a server in Phase 1. The choice is DEC-01: the same project can gain a service worker (Phase 2, DEC-06) and a back end (Phase 6) without moving.
- **Started from `nuxtplate`**, the author's Nuxt 4 template, as updated on 2026-09-22: Nuxt 4.5, Vue 3.5, vue-router 5, Pinia 4 with `@pinia/nuxt`, Bootstrap 5.3 and Font Awesome 7 with SASS, `@byloth/nuxt-vuert-module` 2 for alerts and dialogs, `@byloth/eslint-config-nuxt` 4, TypeScript 6, `vue-tsc`, husky. Added: Vitest 4 with `@nuxt/test-utils` and a browser-like environment for component tests, `@nuxtjs/i18n` for the interface catalogues, `@vueuse/core` for the browser APIs the stores need (storage, file system access, media queries).
- **Published to GitHub Pages** by a workflow of the public repository, on every push to the default branch; the site lives under the repository path (`/dnd-platform/`, https://byloth.github.io/dnd-platform/), so `app.baseURL` comes from `NUXT_APP_BASE_URL` with that default (the workflow passes the repository name), and Nitro's `github-pages` preset writes the `404.html` single-page fallback and `.nojekyll`.
- **The SRD travels as a static asset, every release of it** (DEC-21). `web:prepare-content` puts into the site's `public/content/` the current build (`srd51.json`, 2.7 MB, 430 KB compressed), every released version from `releases/content/` (`srd51@0.1.0.json`, …), `index.json` (`{ packages: { id: { latest, versions } } }`) and the changelog (`srd51.changelog.md`). The application fetches the latest; the browser's HTTP cache is the only cache.
- **Everything runs in the browser.** The engine is imported as a library; package validation uses the same JSON Schemas and the same Ajv configuration as `dnd validate`, shared through the separate export `@byloth/dnd-platform-schema/validate` (so Ajv never enters a bundle that needs the types alone; M1.1); YAML is parsed in the browser with the same `yaml` library the CLI uses.
- **The monorepo build stays `tsc --build` for the library packages;** the web package is excluded from the root project references and has its own scripts (`nuxt typecheck`, `nuxt generate`, `vitest` with the Nuxt environment), called from root scripts prefixed `web:`; root `lint` and `typecheck` chain the web ones, so the pre-commit hook and CI cover it. ESLint: the web package lints itself with `@byloth/eslint-config-nuxt` (its own `eslint.config.mjs`, ignoring through the repository's `.gitignore`); the root configuration ignores `packages/web/**`. The root Vitest configuration is a projects configuration: the Node project for schema, loader, engine, composer and cli; the Nuxt project for web (`environmentOptions.nuxt.rootDir` explicit, `happy-dom`).

- **Usage statistics, with consent only** (DEC-22, owner 2026-09-25): Umami Cloud, loaded after an opt-in banner, never in development, never carrying a character or a package loaded from a file; a privacy page. See [12-analytics.md](12-analytics.md).

## Design

### Layout of `packages/web`

The template's layout, kept flat as `nuxtplate` ships it:

```
packages/web/
  nuxt.config.ts          # ssr: false, app.baseURL, modules, i18n, typescript (DOM libs), test-utils
  app.vue                 # shell: header (language switch, working directory state), <NuxtPage>
  layouts/default.vue     # navigation: Characters, Create, Packages; footer with credits
  pages/
    index.vue             # characters list (the guest's store), "new character", import
    create/[step].vue     # the wizard, one route per step (04)
    characters/[id]/
      index.vue           # build-mode sheet (03)
      print.vue           # print mode (05)
      export.vue          # export document download (05)
    packages/index.vue    # content store: loaded packages, load from file, remove (02)
  components/             # value tile, provenance drawer, choice picker, section blocks… (03, 04)
  composables/            # useEngine (derive with memoisation), useBrowserStorage, usePackageLoader, useContent, useCharacterStore, useWorkingDirectory
  stores/                 # Pinia: content (useContentStore, M1.2), preferences (usePreferencesStore, M1.3b), characters
  plugins/preferences.client.ts   # applies language and colour mode at start (M1.3b)
  i18n/i18n.config.ts     # merges the composer's SHEET_MESSAGES under `sheet` (M1.3b)
  i18n/locales/{en,it}.json, en.notes.json
  public/content/         # written by web:prepare-content, git-ignored: srd51.json, releases, index.json,
                          # characters/ (the demo characters until M1.5)
  tests/                  # component and composable tests
```

### How a sheet reaches the screen

```
content store (IndexedDB) ──► PackageSource[] ──► loadPackages(sources, { pins, selection }) ──► PackageSet
character store (IndexedDB) ──► Character ──────► derive(character, set, { language }) ──► ComputedSheet
                                                    composer(sheet, character, set, { mode, helpLevel, language }) ──► SectionTree
                                                    Vue components render the SectionTree; explain drawers read provenance from the sheet
```

`derive` is memoised per (character document, package versions, language, engine version): the same rule as the cache of [../15-logical-architecture.md](../15-logical-architecture.md). A change in the wizard produces a new character document and a new derivation; on the reference low-end phone this must stay under the 100 ms budget of [07-testing-accessibility-performance.md](07-testing-accessibility-performance.md) (the Phase 0 performance test measures a level 20 multiclass caster well under it on a laptop; the phone measurement is a Phase 1 task).

Built in M1.2 as `composables/engine.ts`: `useEngine().sheet(character, sources, language)` goes through two small in-memory LRU caches, package sets keyed by the package versions and the pins, sheets by the character document (canonical JSON), the versions and the language. The engine version is constant within one page load, which is as long as these caches live; a cache that outlived the page would add it to the key.

### Loading the engine in the browser

The engine has no runtime dependency and no platform import; it bundles as is. The schema package exports the JSON Schemas as constants and the formula checker; the Ajv setup of `packages/cli/src/commands/validate.ts` (`createAjv`, the `formula` format, the error filtering) moves to `packages/schema/src/validate.ts` so the CLI and the web share one validator. Ajv adds about 120 KB compressed to the site: acceptable, loaded lazily with the package-loading page.

### Build and deployment

- `pnpm web:prepare-content` (`dnd build --out packages/web/public/content` for the SRD plus the sample character as JSON) then `pnpm web:generate`. Output `.output/public/` with `index.html`, `404.html`, `.nojekyll`, hashed assets, `content/srd51.json`.
- `.github/workflows/pages.yml`: on push to the default branch, install, build the library packages, `pnpm web:generate`, upload the artifact, deploy with the Pages actions. Enabling Pages on the repository and the first push are the owner's (confirmation point of [08-workplan.md](08-workplan.md)).
- The CI workflow gains `pnpm web:lint`, `pnpm web:typecheck`, `pnpm web:test` and `pnpm web:generate` as a build check on pull requests; no deployment from pull requests.
- Site headers cannot be set on Pages: no service worker in Phase 1, cache control by hashed file names only.
- The template's alert handler and errors composable (`@byloth/vuert` and `@byloth/exceptions` imported directly) were left out in M1.1 because of a pnpm bug: an incremental `pnpm add` of a package already present as a peer-resolved transitive dependency wrote the importer entry without its peer suffix, linking to a store directory that did not exist. pnpm 12.5.1 fixes it; they are back since 2026-09-23, with their messages in the interface catalogues. The repository no longer pins pnpm (`packageManager` removed): locally the developer's own pnpm, in CI the latest 12.x.

### What the shell guarantees

- No network call other than fetching the site's own assets and the SRD bundle. No analytics, no fonts from third parties (Font Awesome and the text font are bundled).
- The application works with the SRD alone; every other package is optional and loaded by the user ([02-content-and-character-stores.md](02-content-and-character-stores.md)).
- The URL carries the character id and the wizard step, so reloads and shared links within the same browser keep the place; nothing else is in the URL.
- Language, help level, page size and theme are preferences in the browser's storage (`JSONStorage` of `@byloth/core`), applied at render time only.

## Tasks

1. Create `packages/web` from `nuxtplate`, rename, set `ssr: false` and `app.baseURL`, add Vitest with the Nuxt environment, `@nuxtjs/i18n` with empty EN/IT catalogues, `@vueuse/core` — M1.1.
2. Root wiring: `web:*` scripts, ESLint block, Vitest projects, exclusion from `tsc --build`, `.gitignore` for `packages/web/public/content/` and `.output/` — M1.1.
3. Move the Ajv setup of the CLI into the schema package and make `dnd validate` use it — M1.1.
4. The SRD bundle as a static asset with its version; a first page that derives a fixture character and renders the composer's section tree unstyled — M1.1.
5. Pages workflow and CI steps — M1.1.
6. Memoised `useEngine` composable with the cache-invalidation rule — M1.2 (done).
7. Preferences store (language, help level, page size, theme) — M1.3 (done, M1.3b: `stores/preferences.ts` on `JSONStorage`, help level *newcomer* by default, theme `system` / `light` / `dark` through Bootstrap's `data-bs-theme`; the header's Settings menu writes them). Until the character store (M1.5) the home page lists the site's demo characters (six SRD-only fixtures published by `web:prepare-content`) and `/characters/[id]` shows their sheet through `useCharacters`, the seam the stored characters will join.

## Open points

- ~~Whether the site path should be `/dnd/` or the future project name~~ Settled at M1.1 close: the repository is `dnd-platform`, the site is https://byloth.github.io/dnd-platform/; the base URL stays an environment variable for any rename.
- ~~Whether to keep Bootstrap's grid and utilities or only its reset and forms~~ — decided by the owner on 2026-09-24 (M1.3c): Bootstrap removed; our own design system in SCSS: tokens as custom properties (`assets/scss/_tokens.scss`: colour roles, a light "parchment and ink" and a dark "slate and brass" theme, a high-contrast variant of each, spacing, radii, elevation, type scale, motion), `modern-normalize` as the reset, **BEM** class names and no utility classes in the markup (utility frameworks only through PostCSS `@apply`, should one ever be used). Bundled fonts from `@fontsource`: Cinzel for headings and names, Atkinson Hyperlegible for text. Content Markdown is rendered by `components/sheet/RichText.vue` with `marked` (raw HTML shown as text, only http(s), mailto and relative links) and `DOMPurify`. Generated site at M1.3c: about 266 KB of JavaScript and 32 KB of CSS compressed, all chunks included, plus 388 KB of fonts; budgets are checked in M1.3d.
  - Icons (M1.3d): Font Awesome's solid set as inline SVG. `components/ui/FontAwesome.vue` keeps its `icon` prop and draws the path from `components/ui/icons.ts`, a registry of single imports from `@fortawesome/free-solid-svg-icons`. Only the icons used are bundled, with no webfont and no Font Awesome stylesheet. An icon is decorative (`aria-hidden`) unless it gets a `label`. A new icon is added to the registry.
  - The document's `lang` follows the interface language (`plugins/preferences.client.ts`).
- Bundle size budget: the site without the SRD should stay under 300 KB compressed on first load; measured at M1.1 and tracked in CI. As built at M1.3d: `pnpm web:budgets` in CI. The first load is 202.8 KB, the SRD 416.8 KB, and every JavaScript and CSS file of the site 284.9 KB (see [07-testing-accessibility-performance.md](07-testing-accessibility-performance.md)).
