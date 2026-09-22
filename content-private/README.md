# Private content

This directory holds content that must never be redistributed: personal
transcriptions of official books, for the use of the group that owns them.
Everything under it is git-ignored except this file. The design is in
[`docs/phase-0/06-private-packages.md`](../docs/phase-0/06-private-packages.md).

## Layout

```
content-private/
  README.md            this file, the only tracked path
  <package-id>/        one private package per book, same layout as packages/content/*
    package.yaml       visibility: private, redistributable: false
    subclasses/ species/ backgrounds/ feats/ spells/ tables/ patches/ …
  fixtures/            private golden fixtures (same format as fixtures/characters/)
  fixtures/sessions/   private play session fixtures (same format as fixtures/sessions/)
  sources/             the books themselves and their extracted text, never read by the tooling
```

Package ids are the community abbreviation of the book, plus the two-digit
year when the same title exists in more than one edition: `phb14`, `dmg14`,
`mm14`, `xge`, `tce`, `mpmm`. Entity ids follow the usual
`<package>.<type>.<name>`; every entity carries `page:` (printed page number)
so a transcription can be checked against the book.

## Rules

- **Technically indistinguishable.** The loader, the validator, the engine and
  the fixture runner treat a private package exactly like a public one. `dnd
  validate` scans `packages/content/*` and `content-private/*` together and
  prints which roots it found.
- **Additive only.** A private package extends the base by reference
  (a subclass names its class, a subrace is appended to the SRD species by a
  patch, new spells are appended to the SRD spell lists by patches). It never
  duplicates an SRD entity.
- **Transcription by hand, from the owned book.** No script in the repository
  produces private content and no upstream dataset is used for it. Text is
  copied verbatim; mechanics are modelled with the same catalogue as the SRD.
- **Nothing private leaks.** No book text in commit messages, issues, public
  fixtures or test names. Private fixtures live in `content-private/fixtures/`
  and are skipped, never failed, when the directory is absent (as in CI).

## Guards

Enforced by `dnd validate` (and by `pnpm test` through
`tests/repository-rules.test.ts`):

| Code | Meaning |
|---|---|
| `E_PRIVATE_OUTSIDE_ROOT` | a manifest with `redistributable: false` was found outside this directory |
| `E_PRIVATE_TRACKED` | git tracks a path under this directory other than this README |

The pre-commit hook refuses staged paths under `content-private/` for the same
reason.
