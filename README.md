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

Phase 0, milestone M0.1: repository scaffold. Nothing usable yet.

## Development

Requires Node 24 (see `.nvmrc`) and pnpm.

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```

## Licence

AGPL-3.0-only. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for the SRD 5.1
attribution.
