# Phase 0 — 06 Private packages

## Purpose

DEC-08 requires that copyrighted official content be integrated from the first day, in the same format as everything else, while never being committed to the public repository. This document fixes where private packages live, how the tooling finds and validates them, how the first one (`phb14`, the Player's Handbook 2014) extends the base package, and how the test suite behaves with and without them.

## Decisions

- **One directory, git-ignored: `content-private/`.** It sits at the repository root, next to `packages/`, and holds one sub-directory per private package, each with the exact layout of [02-content-format.md](02-content-format.md).
- **Technically indistinguishable.** The loader, the validator, the engine and the fixtures treat a private package exactly like a public one. The only differences are the manifest flags and the directory it is read from.
- **Two mechanical guards, enforced by tests.** A package with `redistributable: false` found outside `content-private/` fails `validate:content`; a file under `content-private/` tracked by git fails the same step.
- **Transcription by hand, from the owned book, for the group's personal use.** No script in the repository produces private content; no upstream dataset is used for it, because none may contain it.
- **Attribution is shown, text is never redistributed.** A sheet or PDF built with private content cites the book; the platform never exports the package itself.
- **Deployment policy is not decided here.** Who may upload or see private packages in a running instance belongs to DEC-04, DEC-12 and DEC-14 in Phase 1 ([../14-accounts-sharing-and-campaigns.md](../14-accounts-sharing-and-campaigns.md)).

## Design

### Layout

```
content-private/                # git-ignored
  phb14/
    package.yaml
    subclasses/monk/way-of-shadow.yaml
    subclasses/fighter/battle-master.yaml
    species/…
    backgrounds/…
    feats/…
    spells/…
    spell-lists/…               # only when the book adds a list the SRD lacks
    items/…
    patches/…
  xge/                          # later: Xanathar's Guide to Everything
  tce/                          # later: Tasha's Cauldron of Everything
```

`.gitignore` contains `content-private/` and nothing else about it. A `content-private/README.md` is *not* ignored: it is committed and explains the layout, the flags and the guards, so a new contributor knows what goes there without any private file existing.

### Manifest

```yaml
id: phb14
name: { en: "Player's Handbook (2014)" }
version: 0.1.0
kind: extension
defaultLanguage: en
languages: [en]
visibility: private
redistributable: false
dependencies:
  - { id: srd51, version: "^1.0.0" }
sources:
  - id: phb14
    title: "Player's Handbook"
    publisher: "Wizards of the Coast"
    edition: "2014"
    license: all-rights-reserved
    attribution: "Player's Handbook © 2014 Wizards of the Coast LLC. Personal transcription, not for redistribution."
```

`validate` already enforces that `redistributable: false` implies `visibility: private` ([03-engine-contract.md](03-engine-contract.md)). The two directory guards are added on top in the CLI's `validate:content` command.

### Package ids of official books

Lowercase book abbreviation as used by the community, plus the two-digit year only when the same title exists in more than one edition: `phb14`, `phb24`, `dmg14`, `xge`, `tce`, `mpmm`, `scag`. Source ids match package ids. Entity ids follow the usual `<package>.<type>.<name>`.

### Loader roots

The CLI discovers packages from two roots and passes their parsed contents to `loadPackages` in one call:

1. public root: `packages/content/*` (every directory with a `package.yaml`);
2. private root: `content-private/*` (same rule; absent directory is not an error).

Discovery order is irrelevant to the result: `loadPackages` orders the set topologically by dependencies and breaks ties by id, so a run with the private root present differs from a run without it only by the packages that exist. The CLI prints which roots were scanned and which packages were found, with their `visibility`, so a developer sees at a glance whether private content is loaded.

### What `phb14` contains and how it extends `srd51`

The SRD 5.1 ships one subclass per class; the book ships several. The book also has races, subraces, backgrounds, feats, spells and equipment the SRD lacks. `phb14` adds exactly the difference:

- **Subclasses** for every class, as `subclasses/<class>/<name>.yaml` entities naming the base class (`class: srd51.class.monk`). Way of Shadow is transcribed first because the reference Monk fixture of [04-testing-strategy.md](04-testing-strategy.md) needs it. No patch to the class is required: the engine resolves subclasses by reference.
- **Species and subspecies** absent from the SRD, as new `species/` entities; subraces of SRD species (for example additional dwarf or elf subraces) are added with a `patch` that appends to `subspecies` of the SRD entity, so the player sees one species with all its options.
- **Backgrounds** as new entities.
- **Feats** as new entities.
- **Spells** absent from the SRD as new entities, attached to class lists through `extend-spell-list` effects declared on a `phb14.feature.spell-lists` feature, or through patches to `spell-lists/` entities.
- **Equipment** differences as new items; SRD items are not duplicated.
- **Patches** only where the book's text differs from the SRD in a way that matters to play (rare) and never to replace SRD text wholesale.

Because everything is additive by reference, a character built on `srd51` alone computes identically whether or not `phb14` is loaded; provenance names `phb14` only for what comes from it ([../05-content-model-and-sources.md](../05-content-model-and-sources.md), rule 5).

### Transcription rules

- Copy from the physical or legally owned digital book; write the text in `text.en`, mechanics in `effects` under the same catalogue as the base package.
- Record the page in a `page` field of the entity (accepted by the schema for any entity, ignored by the engine) to make review possible.
- One entity per commit-sized unit of work in the private directory's own history if the group keeps one (a separate private repository is allowed and recommended for backup; it is never a submodule of the public one).
- No private text in commit messages, issues, fixtures or test names of the public repository. Private fixtures live under `content-private/fixtures/` and are discovered by the same two-root rule.

### Test behaviour with and without the directory

| Situation | `validate:content` | Golden fixtures | Result |
|---|---|---|---|
| CI (no `content-private/`) | Public packages only | Public fixtures run; fixtures declaring `requires: [phb14]` are reported as **skipped** with the missing package id | Green |
| Developer with `content-private/` | Public and private packages | All fixtures run, including the reference Monk (base + `phb14` + `homebrew.byloth`) | Green, or red on a real problem |
| Private package outside its root | Fails on the redistributable guard | — | Red |
| Private file tracked by git | Fails on the tracking guard | — | Red |

A skipped private fixture is counted and printed, never silently omitted, so a developer who forgot to mount the directory notices.

### Attribution in output

Every sheet section, feature card and spell card carries its source; the print output adds a credits block listing each source's attribution string ([../12-print-and-export.md](../12-print-and-export.md)). For `phb14` that block cites the book and states that the content is a personal transcription. Export of a character that depends on a private package embeds the package *reference* (id and version), never the package.

## Tasks

1. Add `content-private/` to `.gitignore`, commit `content-private/README.md`, and document the two roots in the repository README — M0.1.
2. Implement two-root discovery in the CLI with deterministic ordering and a printed summary of scanned roots and found packages — M0.3.
3. Implement the redistributable guard and the git-tracking guard in `validate:content`, each with a test using a temporary directory — M0.3.
4. Add `requires: [<package-id>]` to the fixture format and the skipped-with-reason behaviour to the fixture runner — M0.3.
5. Create the `phb14` manifest and the Way of Shadow subclass as the private-package stub used by M0.2 (the stub is a fixture package under `fixtures/packages/phb14-stub/` with placeholder text and real mechanics; it is committed because it contains no book text) — M0.2.
6. Obtain the owner's confirmation, then transcribe the real `phb14` starting with Way of Shadow, the Monk-relevant equipment and the reference Monk fixture; verify the fixture passes locally and is skipped in CI — M0.6. **Done (2026-09-21):** confirmation given; the whole book is transcribed (see the progress log of [08-workplan.md](08-workplan.md)); `content-private/fixtures/reference-monk/` is green locally and absent in CI.
7. Continue `phb14` transcription class by class as needed by later fixtures; it is not required to be complete for Phase 0 — M0.6. **Done (2026-09-21):** complete for the Player's Handbook; other books are later milestones.
8. Write the naming convention and the additive-only rule into `content-private/README.md` — M0.6. **Done (2026-09-21).**
9. Loader *selection mode* (DEC-20): `loadPackages` accepts an optional selection `{ packages, order, exclude: [{ package, type?, tags?, ids? }] }`, prunes transitively, marks pruned entities inactive, returns a cascade report; unresolved references to excluded entities are diagnostics, not errors. Fixture: a selection excluding the PHB species with a feline-only homebrew, asserting the cascade — M0.6. **Done (2026-09-21):** `packages/engine/src/load/select.ts`, tests in `packages/engine/test/selection.test.ts` (placeholder species and feat added to `fixtures/packages/phb14-stub/`), golden fixture `fixtures/characters/monk-l3-excluded-species/` proving that a character keeps computing on excluded content. A fixture declares its selection in `packages.yaml`:

   ```yaml
   selection:
     exclude:
       - { package: phb14, type: species }
       - { ids: [srd51.spell.darkness] }
   ```
10. Suite guard for DEC-20: load every Wizards package present (`srd51` plus whatever exists under `content-private/`) with an empty exclusion list and assert an empty cascade report; skipped when no private package is present — M0.6. **Done (2026-09-21):** `packages/cli/test/selection-cascade.test.ts` loads every package `dnd validate` discovers; with no private package it covers the base alone.
11. Source books for transcription live in `content-private/sources/` (git-ignored with the rest): one PDF per book with a text layer, and `text/<id>.md` with one marker per page for searching; see the README there. Planned private packages beyond `phb14`: `dmg14`, `mm14`, `tce`, `xge`, `mpmm` (Wizards) and `historia` (Mana Project Studio, Italian, a setting: ships a preset selection) — M0.6 onwards, as fixtures need them.

## Open points

- ~~Whether the committed `phb14-stub` fixture package is acceptable~~ Kept (2026-09-21): placeholder text only, plus a placeholder species and feat that correspond to nothing in any book (DEC-20 tests).
- Whether a developer should be able to point the CLI at an additional private root through an environment variable (for a shared network drive). Cheap to add; decide when a second developer joins.
- ~~Whether private fixtures should be allowed to assert against private text~~ Decided (2026-09-21): numbers, ids and codes only; no book text in `expected.yaml`.
