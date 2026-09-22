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

**Phase 1 in progress** (M1.1 done, `v0.3.1`, 2026-09-22): the web application exists as a static Nuxt 4 site in `packages/web`, publishable on GitHub Pages, showing a fixture character's sheet composed by the new `packages/composer`; the content store, the dynamic sheet, guided creation, print and Italian follow milestone by milestone (`docs/phase-1/`). **Phase 0 done** (`v0.2.0`, 2026-09-22): the content format (frozen at v0) and the rules engine exist and are proven. The base package covers the whole SRD 5.1 with authored mechanics; the engine derives every class at every tier with provenance and applies and undoes every play event with the rules read from the ruleset; 60 public golden characters, 8 play sessions and 3 readable sheets guard it; private packages load from a git-ignored root next to the base (the owner's Player's Handbook transcription proves the path with 30 private fixtures); a content selection (DEC-20) lets a campaign exclude content without breaking anything; the `dnd` command validates, bundles and derives from the terminal. Next: Phase 1, the web application (guided creation, dynamic sheet, print), whose plan is written at its opening. Nothing playable from a screen yet.

## Development

Requires Node 24 (see `.nvmrc`) and pnpm.

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm validate:content        # validate every content package directory against the schemas
pnpm build:content           # write the canonical JSON bundle of every package (build/content/, content-private/build/)
pnpm fixtures                # run the golden characters, the play sessions and the readable sheets (--update after review)
pnpm generate:types          # regenerate packages/schema/src/generated from the JSON Schemas
pnpm web:prepare-content     # copy the SRD bundle and the sample character into the site (git-ignored)
pnpm web:dev                 # the web application's development server (after pnpm build)
pnpm web:generate            # the static site in packages/web/.output/public/
```

The web application (`packages/web`, Nuxt 4, client-rendered) consumes the workspace packages from their `dist`, so `pnpm build` comes first; `pnpm lint`, `pnpm typecheck` and `pnpm test` cover it too. The site is published on GitHub Pages by `.github/workflows/pages.yml` on every push to the default branch, under the repository's path (`NUXT_APP_BASE_URL`).

Content format: `docs/phase-0/02-content-format.md`; schemas in `packages/schema/schemas/`; example packages in `fixtures/packages/`. How to contribute: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## CLI

`dnd` is the command of `packages/cli` (`node packages/cli/dist/index.js` after `pnpm build`; `pnpm exec dnd` inside the workspace). Every command exits with 0 on success, 1 on a failure it reports, 2 on a usage error.

- **`dnd validate [dirs…] [--all] [--references] [--allow-missing] [--json]`** validates package directories against the schemas and the structural rules. Without directories (or with `--all`) it discovers every package under `packages/content/` and `content-private/`. `--references` also loads the packages into the engine and resolves every reference. Example: `dnd validate --references fixtures/packages/homebrew-feline`.
- **`dnd build [dirs…] [--out <dir>] [--json]`** writes one canonical JSON bundle per package: the engine's `PackageSource` (manifest, ruleset, entities sorted by type and id, sorted keys), which `loadPackages` accepts as it is. Redistributable packages land in `build/content/<id>.json`, a non-redistributable one in `content-private/build/<id>.json` and never elsewhere.
- **`dnd derive <character.yaml> [--json | --text] [--package <dir>]… [--explain <path>] [--language <code>] [--no-color] [--width <n>]`** computes a character's sheet. Packages come from a `packages.yaml` next to the character (as in the fixtures) or, without one, from the content roots by id plus any `--package`. `--text` (the default) prints the readable sheet: every section of the dynamic sheet, the core numbers with their provenance, abilities, skills, attacks, actions, resources, spells, features, equipment, credits and warnings; colour only on a terminal. `--json` prints the canonical sheet, byte for byte a fixture's `snapshot.json`. `--explain ac` prints every contribution to one value, inactive ones included. Example: `dnd derive fixtures/characters/monk-l3-base/character.yaml`.
- **`dnd fixtures [dirs…] [--update] [--filter <name>] [--coverage] [--json]`** runs the golden characters (`fixtures/characters/`: `expected.yaml`, `snapshot.json` and, when present, the readable `sheet.txt`) and the play sessions (`fixtures/sessions/`), plus the private ones under `content-private/fixtures/` when they exist. `--update` rewrites snapshots and sheets after review; `--coverage` reports which base-package entities no fixture touches.

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
