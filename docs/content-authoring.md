# Content authoring — how the base package is built and extended

Short map of the content workflow; the detailed rules are in [tools/import/AUTHORING.md](../tools/import/AUTHORING.md) and the format in [docs/phase-0/02-content-format.md](phase-0/02-content-format.md).

| Step | Command | What it does |
|---|---|---|
| Fetch | `node tools/import/src/fetch.ts` | Downloads the pinned upstream SRD datasets into `tools/import/cache/` (git-ignored). |
| Map | `node tools/import/src/map.ts` | Regenerates `packages/content/srd51/` (texts, structure, tables) and merges the mechanics from `tools/import/overlay/`. |
| Author | edit `tools/import/overlay/<entity-id>.yaml` | Effects, choices, toggles, play effects for one entity. Never edit the generated files. |
| Check | `node tools/import/src/check-overlay.ts <id>...` | Validates overlays merged onto their entities against the schemas. |
| Validate | `pnpm validate:content` | Schema and structural validation of every package directory. |
| Load | `pnpm test` (base-package test) | The base package loads in the engine with every reference resolved. |
| Fixtures | `pnpm fixtures` / `pnpm fixtures:coverage` | Golden character fixtures with hand-computed expectations; coverage of the base package by fixtures. |

Homebrew and private packages follow the same layout and the same schemas; they are validated by `dnd validate <dir>` and loaded next to the base package by pinning them in a character's `packages`.

The format is frozen at `formatVersion: 0`. Changes to the catalogue are recorded as candidates for version 1 in [docs/phase-0/inventory/authoring-review.md](phase-0/inventory/authoring-review.md).
