# Phase 0 — 01 Monorepo

## Purpose

This document fixes the shape of the repository: which workspace packages exist, what each may depend on, which tooling runs them, what is committed and what is git-ignored, and what continuous integration checks. It is the blueprint for milestone M0.1 and the frame every later milestone fills.

The repository root is the current `~/byloth/dnd` folder, which already holds `docs/`. Nothing is initialised in git until the owner confirms (see Tasks).

## Decisions

- **One repository, pnpm workspaces.** Proposal: pnpm for strict dependency isolation and fast installs; npm workspaces are acceptable if the owner prefers, nothing below depends on the choice beyond the lockfile and the workspace file.
- **Four workspace packages in Phase 0**, all `private: true`: `@byloth/dnd-platform-engine`, `@byloth/dnd-platform-schema`, `@byloth/dnd-platform-content-srd51`, `@byloth/dnd-platform-cli`. The web application package is added in Phase 1.
- **Strict dependency direction.** `schema` depends on nothing. `engine` depends on `schema` types only and has zero runtime dependencies. `content-srd51` contains no code. `cli` depends on `engine`, `schema`, a YAML parser and a JSON Schema validator. Nothing depends on `cli`.
- **Since Phase 1** two more library packages exist: `composer` ([../phase-1/03-sheet-composer.md](../phase-1/03-sheet-composer.md)) and `loader` ([../phase-1/02-content-and-character-stores.md](../phase-1/02-content-and-character-stores.md)), which took `loadPackages`, `validate`, the package-source types and the reading of package files from `engine` and `cli`. The direction is now `schema ← loader ← engine ← composer`, with `cli` and `web` on top; the tree below is the Phase 0 layout.
- **Private content lives outside `packages/`** in a git-ignored `content-private/` root whose subdirectories are package directories in the exact layout of [02-content-format.md](02-content-format.md). Everything must pass with that directory absent.
- **TypeScript strict, project references, Vitest, ESLint** with the author's `@byloth/eslint-config-*` packages, husky pre-commit and an `.editorconfig`, mirroring the tuemplate and nuxtplate conventions so the Phase 1 application feels native.
- **Current Node LTS**, pinned in `.nvmrc` and in the root `engines` field.

## Design

### Tree

```
dnd/                                  # repository root (~/byloth/dnd)
  .editorconfig
  .gitignore
  .nvmrc
  LICENSE                             # AGPL-3.0
  NOTICE                              # SRD 5.1 CC-BY-4.0 attribution (text as in the srd51 manifest)
  README.md                           # short, public
  CONTRIBUTING.md                     # written at Phase 0 close (R-09)
  package.json                        # root scripts, workspaces glue, devDependencies shared
  pnpm-workspace.yaml
  pnpm-lock.yaml
  tsconfig.base.json                  # strict options shared by every package
  tsconfig.json                       # project references to every package
  eslint.config.js
  vitest.workspace.ts
  docs/                               # this plan and the authoring guide
  packages/
    schema/                           # @byloth/dnd-platform-schema
      package.json
      schemas/                        # package.schema.json, ruleset.schema.json, effect.schema.json, condition.schema.json, character.schema.json, <entity>.schema.json
      src/index.ts                    # re-exports generated types + enumerations (modify targets, sections, activation types)
      src/generated/                  # types generated from schemas at build time (committed for consumers, regenerated in CI and diffed)
    engine/                           # @byloth/dnd-platform-engine
      package.json
      src/
        index.ts                      # loadPackages, validate, derive, apply, undo, explain
        load/                         # dependency resolution, pinning, patches
        validate/
        derive/                       # value graph, formulas, conditions, assembly, sections, canonical serialiser
        play/                         # apply, undo, events
      test/                           # unit tests next to the golden runner
    content/
      srd51/                          # @byloth/dnd-platform-content-srd51 — a package directory (package.yaml, ruleset.yaml, classes/, spells/, ...)
        package.json                  # name only, no scripts, no code
    cli/                              # @byloth/dnd-platform-cli
      package.json
      src/
        index.ts                      # commands: validate, build, derive, fixtures
        io/                           # read YAML/JSON from disk → PackageSource
  fixtures/
    packages/                         # srd51-excerpt/, homebrew-feline/, phb14-stub/, mini-ruleset-b/
    characters/                       # <name>/character.yaml + expected.yaml + snapshot.json
    sessions/                         # <name>/session.yaml (event sequence + expected states)
  tools/
    import/                           # SRD import pipeline (05-srd-import-pipeline.md)
      cache/                          # downloaded sources, git-ignored
  content-private/                    # git-ignored; <package-id>/ directories in the standard layout
    phb14/
```

### Workspace and root manifests

`pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
  - packages/content/*
```

Root `package.json` (fragment):

```json
{
  "name": "@byloth/dnd-platform",
  "private": true,
  "license": "AGPL-3.0-only",
  "engines": { "node": ">=24" },
  "packageManager": "pnpm@10",
  "scripts": {
    "build": "pnpm -r --filter './packages/**' run build",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc --build",
    "validate:content": "pnpm --filter @byloth/dnd-platform-cli exec dnd validate packages/content/srd51 fixtures/packages/* content-private/* --allow-missing",
    "fixtures": "pnpm --filter @byloth/dnd-platform-cli exec dnd fixtures fixtures/characters fixtures/sessions",
    "prepare": "husky"
  }
}
```

`packages/engine/package.json` (fragment):

```json
{
  "name": "@byloth/dnd-platform-engine",
  "private": true,
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "dependencies": {},
  "devDependencies": { "@byloth/dnd-platform-schema": "workspace:*" }
}
```

`packages/cli/package.json` (fragment):

```json
{
  "name": "@byloth/dnd-platform-cli",
  "private": true,
  "type": "module",
  "bin": { "dnd": "./dist/index.js" },
  "dependencies": {
    "@byloth/dnd-platform-engine": "workspace:*",
    "@byloth/dnd-platform-schema": "workspace:*",
    "yaml": "^2",
    "ajv": "^8"
  }
}
```

The `schema` package's dependency on the engine types is absent by design: the engine's `Character`, `PackageManifest`, `Ruleset` and entity types are the generated ones from `schema`, so `engine` imports types from `schema` and never the reverse.

### Rules enforced by tooling

- `engine` has an empty `dependencies` object and an ESLint rule forbidding imports of `node:*`, `fs`, `path`, `fetch` and any non-relative module except `@byloth/dnd-platform-schema`.
- `content-srd51` has no `src/`; a test asserts the directory contains only YAML, `package.json` and `README.md`.
- `validate:content` runs on every package directory found under `packages/content/`, `fixtures/packages/` and `content-private/`; the `--allow-missing` flag makes an absent `content-private/` a no-op, never a failure.
- A test fails if any package with `redistributable: false` is found outside `content-private/` ([06-private-packages.md](06-private-packages.md)).
- The generated types under `packages/schema/src/generated/` are committed; CI regenerates them and fails on a diff, so schema and types cannot drift.

### `.gitignore`

```
node_modules/
dist/
coverage/
content-private/
tools/import/cache/
/*.pdf
.env*
```

The playbook PDF at the root is not the owner's material and never enters history; the `/*.pdf` line covers it and any similar file.

### Continuous integration

On every pull request and on the default branch, one workflow with these jobs in order: install (frozen lockfile), lint, typecheck, build, test, validate:content, fixtures. Only public content is present in CI; fixtures whose `character.yaml` pins a package that is not loaded are reported as skipped with the package id, never as failed ([04-testing-strategy.md](04-testing-strategy.md)). A second, manual workflow runs the same steps with a `content-private/` restored from a private artifact the owner controls; it is optional and never required for merging.

### Root files

- `LICENSE`: AGPL-3.0 text, verbatim.
- `NOTICE`: the SRD 5.1 attribution sentence from the `srd51` manifest in [02-content-format.md](02-content-format.md), plus a line stating that official books are not part of this repository.
- `README.md`: one paragraph on what the project is, the licence, the link to `docs/00-README.md`, and how to run `pnpm install && pnpm test`.
- `CONTRIBUTING.md`: written at Phase 0 close, since the risk register names a contribution guide as a Phase 0 mitigation of the single-maintainer risk (R-09); expanded in Phase 4 when external contributions are expected.

## Tasks

1. Ask the owner to confirm `git init` in `~/byloth/dnd` and the creation of the public GitHub repository; do nothing in git before that confirmation — M0.1.
2. Create `.editorconfig`, `.nvmrc`, `.gitignore`, `LICENSE`, `NOTICE`, `README.md`, root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.js`, `vitest.workspace.ts` — M0.1.
3. Scaffold the four packages with their `package.json`, `tsconfig.json` and an `index.ts` that exports the function skeletons of [03-engine-contract.md](03-engine-contract.md) (engine), an empty schema set (schema), an empty `package.yaml` (content-srd51) and a `--help` command (cli) — M0.1.
4. Add the ESLint import restriction for `engine`, the "no code in content" test and the "no private package outside `content-private/`" test — M0.1.
5. Write the CI workflow with the seven jobs and the skip semantics for private fixtures; make the first push green with an empty test suite — M0.1.
6. Add the schema generation step (`schema` build → `src/generated/`) and the CI diff check — M0.2.
7. Add the `validate:content` and `fixtures` root scripts once the CLI commands exist — M0.8.
8. Write the root `README.md` section "Private content" describing `content-private/` and pointing at [06-private-packages.md](06-private-packages.md) — M0.6.

## Open points

- pnpm versus npm workspaces: the owner's templates do not pin a package manager; confirm before M0.1.
- Whether the generated types are committed (proposed) or produced only at build time; committing keeps editor tooling working without a build step at the cost of the CI diff check.
- Whether `fixtures/` should be a fifth workspace package so that it can declare its own test runner config, or stay a plain directory read by the `cli` runner; plain directory until a reason appears.
- ~~Exact CLI command names (`dnd validate` versus `dnd-platform validate`)~~ Closed in M0.8: the bin is `dnd` (`validate`, `build`, `derive`, `fixtures`); it is renamed together with the scope before publication.
