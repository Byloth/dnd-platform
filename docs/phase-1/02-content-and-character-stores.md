# Phase 1 — 02 Content and character stores

## Purpose

This document fixes how the browser holds content and characters without a server: where packages come from, how a user loads their own, where characters persist, how the export file works, and how the optional working directory on disk mirrors all of it. It is the Phase 1 implementation of the content store, the character store and the identity block of [../15-logical-architecture.md](../15-logical-architecture.md), under DEC-04 and DEC-12.

## Decisions

- **A workspace package for loading, `packages/loader` (`@byloth/dnd-platform-loader`),** taken 2026-09-23. It owns every step from the files of a package to the package set the engine computes with: reading a package from a list of paths and a reader (`readPackageFiles`), from a zip (`readPackageZip`, with `fflate`) or from a bundle (`parseBundle`); the checks of `dnd validate` that need nothing but the packages (`checkPackage`, `checkReferences`, the shared `DIAGNOSTIC_CODES`); the `PackageSource`; the bundle (`toBundle`, `bundleText`); and `loadPackages` and `validate` with their types (`PackageSource`, `PackageSet`, `Selection`, the DEC-20 cascade, `Diagnostic`), moved from the engine with the same names. It is pure and browser-safe; the separate entry `@byloth/dnd-platform-loader/node` reads a directory on disk for the CLI and the tests. Dependency direction: `engine → loader → schema`. The engine keeps the rules only and imports the package-set types it computes with; the engine tests build their input with the loader, which would be a cycle the other way round. The CLI keeps discovery, the repository guards (`E_PRIVATE_OUTSIDE_ROOT`, `E_PRIVATE_TRACKED`) and writing; the canonical JSON serialiser (`stableStringify`) moved to the schema package, used by both sides. The move changed no output: bundles byte-identical, `dnd validate` and `dnd fixtures` identical.
- **One storage interface, two backends.** `useBrowserStorage` (`packages/web/composables/storage.ts`; not `useStorage`, which VueUse auto-imports) exposes `packages`, `characters` and `exports` collections; the default backend is the browser's IndexedDB through `IndexedDatabase` of `@byloth/core`, whose store definitions and migrations version the database schema; the optional backend is a directory on disk through the File System Access API, used as a mirror when connected. The rest of the application never touches either API directly.
- **Packages are stored as bundles**, the `PackageSource` JSON of `dnd build`, keyed by `id@version`. Whatever the user loads (a zip of the package directory, or a bundle file) is converted to a bundle in the browser and validated before it is stored; an invalid package is refused with the same diagnostics `dnd validate` prints, pointing at the file and the path.
- **The SRD is the base and always present, and never stored in the browser** (DEC-21): the site publishes every released version of its public packages (`content/<id>@<version>.json`, `content/index.json`, `content/<id>.changelog.md`, from `releases/content/` written by `dnd release`); the application fetches the latest, and a character's last-seen version when it must show what an update changed (M1.5). The HTTP cache, and the service worker in Phase 2, are the only caches.
- **Privacy by construction.** A package with `redistributable: false` is stored, listed and used exactly like any other, with one difference: it is flagged "private, loaded locally" wherever it is listed, its attribution appears on the sheet and in print, and the export of a character lists it by id and version and never embeds it. Nothing is ever sent anywhere: the application makes no network request except for its own assets.
- **Characters are documents**, stored as they are authored (the `Character` of the schema), never with derived values. The store keeps one entry per character plus its snapshots; derived sheets are memoised in memory only.
- **Export is a file download, import is a file selection**; the document is defined in [05-print-and-export.md](05-print-and-export.md).
- **Storage persistence is requested** (`navigator.storage.persist()`) at the first write, once per session, and the answer is kept in `meta`; when it is refused or unknown, the interface says that the browser may evict the data and offers the export and the working directory.

## Design

### The content store

```
IndexedDB "dnd-platform", version 1
  packages   key "homebrew.byloth@0.1.0" → { source: PackageSource, loadedAt, origin: "file", fileName? }
  characters keyPath "id"      → Character document (with snapshots)
  meta       key "storage-persisted", …
```

- **Loading is serialised**: every load (zip, bundle, the SRD refresh) goes through one `PromiseQueue` of `@byloth/core`, so two files dropped together never interleave their validation and writes. Long steps (unzipping, YAML parsing, Ajv on every file) call `yieldToEventLoop` every few files, so the page stays responsive and can show progress.
- **Refusals are typed**: a refused package rejects with an exception of `@byloth/core` carrying the `dnd validate` code and the file and path, which the tests assert and the packages page lists inline.

- **Loading a file** (`usePackageLoader`, `packages/web/composables/packages.ts`, M1.2): a `.zip` is read with `readPackageZipAsync` (the package at the root of the archive or under its single top-level folder), a `.json` bundle with `parseBundle` and turned back into its files with `filesOfSource`, so both are checked by the same `checkPackageAsync` as `dnd validate` (Ajv and the schemas load lazily, with the first package). The package is then loaded next to the stored packages it depends on (the newest stored version of each dependency, recursively) and `checkReferences` reports what concerns it: its unresolved references, duplicate ids, a missing dependency or base. Any error refuses the file with a `PackageRefusedException` carrying the diagnostics; the repository guards of the CLI do not apply. Otherwise the bundle (`toBundle`) is stored with `origin: "file"` and the file name. Loads go through one `PromiseQueue`; the reading and the checks pause with `yieldToEventLoop` every 16 files. A directory of the working directory (M1.8) goes the same way through `readPackageFilesAsync`.
- **Listing** (`pages/packages/index.vue`, `stores/content.ts`, M1.2): the packages page shows the site's packages first (the SRD, "comes with the site", never removable), then every stored bundle, with name (in the interface language), id, version, kind, sources and licence, the number of entities and the private flag ("private, loaded on this device", text and icon); a "remove" action asks for confirmation and is refused while a stored character uses the package, with the list of those characters. Loads show one status line per file; a refusal is one plain sentence with the next step, the codes and paths in a details drawer. The storage section shows the persistence answer, usage and quota, and the Safari/iOS eviction warning. `useContentStore` keeps manifests and counts reactive, never the bundles.
- **One version per package** (DEC-21): loading a newer version of a stored package replaces it; the characters that use it follow, with the update alert.
- **Selection**: a character's `packages` (ids, and the version last seen) is the selection; the creation wizard's step 0 picks among the site's and the stored packages and records their current versions; `loadPackages` runs with the latest versions and, when the character carries one, the DEC-20 selection. A missing package at load time produces the "this character uses content that is not installed here" state of [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md), with the package id and the option to load it.
- **Translation packages** are stored and selected like any other; the derivation language comes from the interface preference ([06-localisation.md](06-localisation.md)).

### The character store

- Create, read, update, delete, list; each write also refreshes `updatedAt` and, when a working directory is connected, writes the document as `characters/<id>.yaml` (YAML for readability, the same document).
- Snapshots stay inside the document as the schema defines them; Phase 1 writes one at the end of creation ("as created") and none after.
- As built in M1.4d3: `useBrowserStorage().characters` has `get`, `list` and `put`; the creation wizard writes through `put`, and `useCharacters()` lists the stored characters before the site's demo ones (`origin: "stored" | "demo"`), naming their classes from the content. Update, delete and the missing-package state for stored characters remain M1.5.
- Deleting a character deletes its document only; packages are never deleted implicitly.
- On start, the application lists the store; with a connected working directory it reconciles both ways by `updatedAt`, newest wins, and shows what changed.

### The export document

Defined in [05-print-and-export.md](05-print-and-export.md): the character document, its pinned package ids and versions, the format version of the export; never a private package; optionally the homebrew bundles the character depends on (the user chooses, default off). Import reads the file, checks the format version, matches packages by id against the site and the store, offers to load missing homebrew bundles embedded in the file, then stores the character and derives it; a newer version than the one recorded goes through the update alert of DEC-21, like any other.

### The working directory (File System Access API)

Available in Chromium desktop browsers only; feature-detected, never required. When the user connects a directory:

```
<working directory>/
  README.txt        what this directory is, which browser connected it, how to disconnect
  packages/         one directory or bundle per package the user loads; the app reads them at start
    README.txt
  characters/       one YAML document per character, kept in sync with the browser's store
    README.txt
  exports/          every export the user saves here instead of downloading
    README.txt
```

- The handle is kept in IndexedDB and re-permissioned on the next visit (the browser asks once per session); when permission is refused, the store works as before and the interface shows "working directory disconnected".
- Packages found in `packages/` are validated and loaded like a zip; a package that fails validation is reported and skipped, never blocks the others.
- A file changed on disk while the application is open is not watched in Phase 1; the reconciliation happens at start and on an explicit "reload from directory".
- The working directory is a mirror and a convenience: the browser's store remains the source of truth for the running session, so every feature works identically without it.

### What never happens

- No package, character or export is sent over the network.
- No package is written to the working directory except by the user's own action (loading it, or reloading the directory).
- No derived value is stored anywhere.

## Tasks

1. `useBrowserStorage` with the IndexedDB backend (`IndexedDatabase` of `@byloth/core`), the object stores above, and the persistence request — M1.2.
2. Package loading from zip and bundle: reading, YAML parsing, schema validation with the shared validator, structural checks, bundling, storing; the packages page; the private flag and attribution — M1.2.
3. ~~The SRD bundle as a stored package with version tracking~~ — replaced by DEC-21: the site publishes every release (`dnd release`), the browser never stores the SRD — M1.2.
4. Character store with list, create, update, delete, and the missing-package state — M1.5.
5. Export download and import from file with format version and package matching — M1.5.
6. The working-directory backend: connect, README files, mirror of characters and exports, package loading from `packages/`, reconciliation at start — M1.8.
7. Tests: a zip of `fixtures/packages/homebrew-feline` and of `phb14-stub` loads and validates; an invalid package from `fixtures/packages/invalid/*` is refused with the expected code; the reference Monk's sheet in the browser equals the CLI snapshot (private test, skipped without the book); export → import → derive equals the original derivation byte for byte — M1.2, M1.5.

## Open points

- Whether `packages/` in the working directory should hold the zips as loaded or the unpacked directories; unpacked is readable and editable by hand (a homebrew author's loop), zips are what the user loaded. Leaning: unpacked directories, and a zip is unpacked when copied there.
- Storage quota on phones: Safari grants little and evicts; if the SRD bundle plus a book exceed what a device grants, the packages page must say so before the load fails. The numbers come from `navigator.storage.estimate()`; `SystemInfo` of `@byloth/core` recognises Safari and iOS for the eviction warning, since the estimate alone does not tell it. Measure at M1.2 on the reference devices.
- ~~Whether to keep several versions of the same package~~: no, one per id (DEC-21); older versions of public packages stay available on the site.
