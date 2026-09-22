# dnd-platform

A character-first platform for Dungeons & Dragons 5e, built for people who
know little or nothing about the game: guided character creation, a sheet
whose sections exist only when the character has something to put in them,
every number explainable, a play mode for the table, level-ups without a
rulebook, a printable playbook, and homebrew content that works exactly like
official content because there is a single content format.

The plan lives in [`docs/`](docs/00-README.md); Phase 0 (content format and
rules engine) is described in [`docs/phase-0/`](docs/phase-0/00-README.md).

## Status

Phase 0, milestone M0.7 done: the base package covers the whole SRD 5.1 with authored mechanics, the engine derives every class at every tier with provenance, 60 public golden fixtures guard it, private packages load from a git-ignored root next to the base (the owner's Player's Handbook transcription proves the path, with 30 private fixtures that run only where the book is), a content selection (DEC-20) lets a campaign exclude content without breaking anything, and the play engine applies and undoes every play event (damage, healing, resources, spells and concentration, conditions and toggles with expiry, rests, death saves, the turn tracker) with the rules read from the ruleset; eight public session fixtures replay whole scenes. Content format frozen at v0. Next: the CLI (M0.8). Nothing playable from a screen yet.

## Development

Requires Node 24 (see `.nvmrc`) and pnpm.

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm validate:content        # validate every content package directory against the schemas
pnpm fixtures                # run the golden character fixtures and the play session fixtures (add --update to refresh snapshots after review)
pnpm generate:types          # regenerate packages/schema/src/generated from the JSON Schemas
```

Content format: `docs/phase-0/02-content-format.md`; schemas in `packages/schema/schemas/`; example packages in `fixtures/packages/`.

### Private content

Official books are copyrighted and never committed. They are transcribed by hand into private packages under
`content-private/`, a git-ignored directory with the same package format as `packages/content/`. The tooling
scans both roots (`dnd validate` prints what it found), private fixtures under `content-private/fixtures/` are
skipped when the directory is absent, and two guards (`E_PRIVATE_OUTSIDE_ROOT`, `E_PRIVATE_TRACKED`) plus the
pre-commit hook make sure nothing private leaves the machine. See
[`content-private/README.md`](content-private/README.md) and
[`docs/phase-0/06-private-packages.md`](docs/phase-0/06-private-packages.md).

## Licence

AGPL-3.0-only. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for the SRD 5.1
attribution.
