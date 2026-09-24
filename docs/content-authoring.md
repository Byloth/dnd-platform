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

## Releasing a change to a public package (DEC-21)

Every released version of a public package is published by the site and never changes, and characters follow new versions automatically. So any change to the content of `packages/content/<id>/`:

1. bumps `version` in `package.yaml` (patch for fixes, minor for additions);
2. adds a `## <version> — <date>` section at the top of the package's `CHANGELOG.md`, in words a player understands (what changes on a sheet, not which file);
3. runs `pnpm build && pnpm release:content`, which writes `releases/content/<id>@<version>.json`, and commits it with the change.

CI runs `pnpm release:content:check`: changed content under a released version, or a version without its release file or changelog section, fails the build.

## Archetypes and packs

**Archetypes** (`archetypes/<name>.yaml`) are the creation wizard's starting ideas for a newcomer: `pitch`, `recommends` (species, subspecies, class, subclass when chosen at level 1, background, `abilityPriority` in the order the standard array is dealt, `answers` keyed like `choices.answers`) and a `why` sentence per recommendation, in words a newcomer understands. They are hand-written, not generated. The base package test (`packages/cli/test/creation-content.test.ts`) builds each archetype's level 1 character and requires a clean derivation, answers that fit the choices the engine opens, and a first ability among the class's `primaryAbilities`. Every class of a package that ships archetypes should have at least one.

**Packs** are items with `contents: [{ item, quantity? }]`. In srd51 the import writes them from the 5e-database, together with the items only a pack holds; a homebrew or campaign package defines its own packs the same way, with the items it wants.

Reminders (`add-text`) are shown to the player at the end of their section, with the name of the feature, item, condition or spell that adds them: write them as a sentence the player can act on, in the second person.
