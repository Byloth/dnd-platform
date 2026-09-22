# Phase 1 — 02 Content and character stores

## Purpose

This document fixes how the browser holds content and characters without a server: where packages come from, how a user loads their own, where characters persist, how the export file works, and how the optional working directory on disk mirrors all of it. It is the Phase 1 implementation of the content store, the character store and the identity block of [../15-logical-architecture.md](../15-logical-architecture.md), under DEC-04 and DEC-12.

## Decisions

- **One storage interface, two backends.** `packages/web/composables/useStorage` exposes `packages`, `characters` and `exports` collections; the default backend is the browser's IndexedDB; the optional backend is a directory on disk through the File System Access API, used as a mirror when connected. The rest of the application never touches either API directly.
- **Packages are stored as bundles**, the `PackageSource` JSON of `dnd build`, keyed by `id@version`. Whatever the user loads (a zip of the package directory, or a bundle file) is converted to a bundle in the browser and validated before it is stored; an invalid package is refused with the same diagnostics `dnd validate` prints, pointing at the file and the path.
- **The SRD is the base and always present**: fetched from the site, cached like any other bundle, replaced when the site ships a newer version (pinned characters keep computing with the version they pin, as [../10-progression.md](../10-progression.md) requires; the migration proposal is Phase 3).
- **Privacy by construction.** A package with `redistributable: false` is stored, listed and used exactly like any other, with one difference: it is flagged "private, loaded locally" wherever it is listed, its attribution appears on the sheet and in print, and the export of a character lists it by id and version and never embeds it. Nothing is ever sent anywhere: the application makes no network request except for its own assets.
- **Characters are documents**, stored as they are authored (the `Character` of the schema), never with derived values. The store keeps one entry per character plus its snapshots; derived sheets are memoised in memory only.
- **Export is a file download, import is a file selection**; the document is defined in [05-print-and-export.md](05-print-and-export.md).
- **Storage persistence is requested** (`navigator.storage.persist()`) at the first write; when it is refused or unknown, the interface says that the browser may evict the data and offers the export and the working directory.

## Design

### The content store

```
IndexedDB "dnd-platform"
  packages   key "srd51@0.1.0" → { manifest, ruleset?, entities, loadedAt, origin: "site" | "file", fileName? }
  characters key id            → Character document (with snapshots)
  meta       key "srd51-version", "storage-persisted", …
```

- **Loading a zip**: the zip is read in the browser (`fflate`), every entry under a single top-level directory or at the root is mapped to the package layout (`package.yaml`, `ruleset.yaml`, `<type>/…yaml`, `translations/<lang>/…yaml`); the YAML is parsed; the schema validation of the schema package runs on every file; the structural rules of `dnd validate` (`E_PRIVATE_PUBLIC`, base and dependencies, duplicate ids) run on the result; the bundle is built with the same sorting as `dnd build`; it is stored. The same code path serves a `.json` bundle, skipping the YAML step, and a directory of the working directory.
- **Listing**: the packages page shows every stored bundle with name, id, version, kind, sources and licence, the private flag, the number of entities, and a "remove" action (refused while a stored character pins it, with the list of those characters).
- **Selection**: a character's `packages` (ids and versions) is the selection; the creation wizard's step 0 picks among stored packages and pins the stored versions; `loadPackages` runs with the pins and, when the character carries one, the DEC-20 selection. A missing package at load time produces the "this character uses content that is not installed here" state of [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md), with the package id and the option to load it.
- **Translation packages** are stored and selected like any other; the derivation language comes from the interface preference ([06-localisation.md](06-localisation.md)).

### The character store

- Create, read, update, delete, list; each write also refreshes `updatedAt` and, when a working directory is connected, writes the document as `characters/<id>.yaml` (YAML for readability, the same document).
- Snapshots stay inside the document as the schema defines them; Phase 1 writes one at the end of creation ("as created") and none after.
- Deleting a character deletes its document only; packages are never deleted implicitly.
- On start, the application lists the store; with a connected working directory it reconciles both ways by `updatedAt`, newest wins, and shows what changed.

### The export document

Defined in [05-print-and-export.md](05-print-and-export.md): the character document, its pinned package ids and versions, the format version of the export; never a private package; optionally the homebrew bundles the character depends on (the user chooses, default off). Import reads the file, checks the format version, matches packages by id and version against the store, offers to load missing homebrew bundles embedded in the file, refuses silently substituting a version and shows the mismatch instead, then stores the character and derives it.

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

1. `useStorage` with the IndexedDB backend (`idb` library), the object stores above, and the persistence request — M1.2.
2. Package loading from zip and bundle: reading, YAML parsing, schema validation with the shared validator, structural checks, bundling, storing; the packages page; the private flag and attribution — M1.2.
3. The SRD bundle as a stored package with version tracking — M1.2 (fetch at M1.1).
4. Character store with list, create, update, delete, and the missing-package state — M1.5.
5. Export download and import from file with format version and package matching — M1.5.
6. The working-directory backend: connect, README files, mirror of characters and exports, package loading from `packages/`, reconciliation at start — M1.8.
7. Tests: a zip of `fixtures/packages/homebrew-feline` and of `phb14-stub` loads and validates; an invalid package from `fixtures/packages/invalid/*` is refused with the expected code; the reference Monk's sheet in the browser equals the CLI snapshot (private test, skipped without the book); export → import → derive equals the original derivation byte for byte — M1.2, M1.5.

## Open points

- Whether `packages/` in the working directory should hold the zips as loaded or the unpacked directories; unpacked is readable and editable by hand (a homebrew author's loop), zips are what the user loaded. Leaning: unpacked directories, and a zip is unpacked when copied there.
- Storage quota on phones: Safari grants little and evicts; if the SRD bundle plus a book exceed what a device grants, the packages page must say so before the load fails. Measure at M1.2 on the reference devices.
- Whether to keep several versions of the same package (a character pinned to an older SRD version after a site update). Yes by key design; the packages page shows them grouped by id.
