# Character fixtures (golden tests)

Each subdirectory is one golden fixture run by `dnd fixtures` (and by `pnpm test` through
`packages/cli/test/fixtures.test.ts`). See `docs/phase-0/04-testing-strategy.md`.

| File | Role |
|---|---|
| `packages.yaml` | `packages`: package directories to load, relative to the repository root, in dependency order; `requires`: the package ids the fixture needs. A missing directory or a missing required id makes the fixture **skipped**, never failed (private packages are absent in CI). `selection` (optional): a content selection applied at load, as a campaign would (DEC-20); the cascade is printed when the fixture fails. |
| `character.yaml` | The character document (`packages/schema/schemas/character.schema.json`). |
| `expected.yaml` | Hand-computed expectations with the arithmetic in comments: `values` (path → value), `provenance` (path → applied contribution labels in order), `resources`, `actions`, `proficiencies` (`type:item`), `sections` (`active`/`inactive`), `warnings` (codes that must be present). Written **before** the engine runs the fixture: red, then green. |
| `snapshot.json` | Canonical JSON of the whole computed sheet, for regression. |

Review rule for `--update`: `dnd fixtures --update` rewrites `snapshot.json` only. Run it after a deliberate
change, read the diff of every snapshot it touched, and explain the change in the commit message. Never update a
snapshot to make a failing `expected.yaml` pass: `expected.yaml` is the specification, the snapshot is the record.

Names in fixtures are neutral; no real person's character is used.
