# SRD import pipeline

Tooling that turns the openly licensed SRD datasets into the platform's
content format. Design: `docs/phase-0/05-srd-import-pipeline.md`.

Scripts run on Node 24 directly (native TypeScript type stripping), with the
`yaml` package from the repository root as the only dependency.

| Script | What it does |
|---|---|
| `node tools/import/src/fetch.ts [--force]` | Downloads the files pinned in `sources.lock.yaml` into `cache/` (git-ignored) and records their sha256 in the lock. A second run downloads nothing. |
| `node tools/import/src/inventory.ts` | Generates `docs/phase-0/inventory/` (human-readable inventory of the SRD 5.1) and the classification skeletons and work partitions under `work/` (git-ignored). |
| `node tools/import/src/merge-classification.ts` | Merges the classified partitions from `work/classification/*.classified.yaml` into `docs/phase-0/inventory/classification*.yaml` and writes the summary `classification.md`. |

## Sources

Pinned by commit in `sources.lock.yaml`:

- **Open5e v2** (`open5e/open5e-api`, `data/v2/wizards-of-the-coast/srd-2014/`): primary source. Data of the `srd-2014` document is CC-BY-4.0. Creature files are excluded (monsters are out of scope).
- **5e-database** (`5e-bits/5e-database`, `src/2014/en/`): cross-check and structured level tables (`Levels.json`). Code MIT; data stated OGL 1.0a upstream, while the SRD 5.1 itself is also published under CC-BY-4.0, which is the licence this project relies on.

No upstream code is copied. Content that reaches `packages/content/srd51`
carries the SRD 5.1 attribution (see `NOTICE`).
