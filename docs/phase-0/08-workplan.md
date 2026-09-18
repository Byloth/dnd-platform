# Phase 0 — 08 Work plan

## Purpose

This document orders the work of Phase 0 into the eight milestones of [00-README.md](00-README.md), with the tasks of every other Phase 0 document placed in sequence, their dependencies, what each milestone releases, its specific risks, and the points where the project owner must explicitly confirm before work continues. Estimates are in relative *work sessions* (one focused sitting), not in calendar days.

## Decisions

- **Milestones are sequential, tasks inside a milestone may run in parallel.** A milestone closes only when its done criteria in [00-README.md](00-README.md) hold and the suite is green.
- **Every milestone ends in a tag** (`v0.0.<n>`) on the public repository, so that a bisect over the format's evolution is always possible.
- **Three explicit confirmation points** with the project owner: before creating the public repository (M0.1), before starting any transcription of Player's Handbook content (M0.6), and before launching any agent swarm for effect authoring (DEC-19, inside M0.4/M0.5). Nothing else needs confirmation; everything else is reversible.
- **The format may change until M0.5.** Content authored before a format change is migrated by script, never by hand. After M0.5 the format is `formatVersion: 0` frozen; changes require a migration and a version bump.

## Design

### Dependency graph

```
M0.1 scaffold ──► M0.2 format v0 ──► M0.3 engine core ──► M0.4 catalogue complete ──► M0.5 base package complete
                                            │                                                   │
                                            └──────────────► M0.7 play engine ◄─────────────────┤
                                                                                                 ▼
                                                                    M0.6 private + homebrew ──► M0.8 CLI ──► Phase 0 done
```

M0.7 needs only M0.3 (resources and values) and can proceed in parallel with M0.4–M0.6. M0.8 assembles what exists; parts of it (validate, build) are usable from M0.2 and are extended as milestones land.

### M0.1 — Repository and monorepo scaffold (≈ 2 sessions)

Tasks (from [01-monorepo.md](01-monorepo.md)):
1. **Confirmation point.** Confirm with the owner: repository name and location on GitHub, public visibility, AGPL-3.0, temporary scope `@byloth/dnd-platform`. Only then `git init` in `~/byloth/dnd`.
2. Root files: `LICENSE`, `NOTICE`, `README`, `.gitignore` (`content-private/`, `tools/import/cache/`, `*.pdf` at root, build outputs), `.nvmrc`, `.editorconfig`, `pnpm-workspace.yaml`, root `package.json` with the scripts.
3. Workspaces `packages/engine`, `packages/schema`, `packages/content/srd51`, `packages/cli`, each with `package.json`, `tsconfig`, an empty test.
4. Lint and typecheck configuration reusing the author's ESLint packages; husky pre-commit running lint and typecheck on staged packages.
5. Continuous integration: install, lint, typecheck, test, `validate:content` on every pull request; a job that asserts `content-private/` is untracked.
6. Commit `docs/` as it is.

Done: the criteria of M0.1 in the README. Release: `v0.0.1`.
Risks: none technical; the only risk is drifting into building the app shell early. The rule is: no `packages/web` in Phase 0.

### M0.2 — Content format v0 (≈ 4 sessions)

Tasks (from [02-content-format.md](02-content-format.md), [03-engine-contract.md](03-engine-contract.md)):
1. JSON Schemas for manifest, ruleset, every entity type, effect (all kinds), condition, character; the formula grammar documented and tested as a regular grammar.
2. Type generation from schemas into `packages/schema`; enumerations for `modify` targets, sections, activation types, proficiency types, skills, damage types, conditions.
3. Engine type definitions and function skeletons with exhaustive switches (compile-time completeness).
4. The three example packages as real fixtures: `fixtures/packages/srd51-excerpt` (Monk 1–3, one species, ten spells, the proficiency and slot tables, the ruleset), `fixtures/packages/homebrew-feline`, `fixtures/packages/phb14-stub` (Way of Shadow at level 3 only, marked private and non-redistributable, but kept as a *fixture stub* with placeholder text so it can live in the public repository).
5. `validate` for schema conformance only, wired into `validate:content`.

Done: the criteria of M0.2. Release: `v0.0.2`.
Risks: over-designing the catalogue before touching real content. Mitigation: only the kinds needed by the excerpt are implemented here; M0.4 completes the list against the full SRD.

### M0.3 — Engine core (≈ 6 sessions)

Tasks (from [03-engine-contract.md](03-engine-contract.md), [04-testing-strategy.md](04-testing-strategy.md), [07-ruleset-switching.md](07-ruleset-switching.md)):
1. Formula parser and evaluator; condition evaluator; tables as step functions. Unit tests table-driven.
2. `loadPackages`: dependency resolution, pinning, patches, translations merge, deterministic order.
3. `derive` steps 1–5: feature collection, effect filtering, value graph, topological evaluation, provenance. `explain`. Canonical serialiser.
4. Golden fixture runner: `character.yaml` + `expected.yaml` + `snapshot.json`, with `--update` and skip-when-private-missing behaviour.
5. First golden fixtures on the excerpt packages: a level 1 Monk, a level 3 Monk with the feline species, and the `mini-ruleset-b` character proving the engine reads rules from the base package.
6. Property tests: idempotence, package-order independence, YAML/JSON round trip.

Done: the criteria of M0.3. Release: `v0.0.3`.
Risks: the value graph and precedence rules are the heart of the engine; getting `set-formula` vs `add` vs `max` semantics wrong shows up late. Mitigation: a dedicated precedence test matrix in M0.3 before any real content is authored.

### M0.4 — Effect catalogue complete for the SRD (≈ 5 sessions, plus authoring time under DEC-19)

Tasks (from [02-content-format.md](02-content-format.md), [05-srd-import-pipeline.md](05-srd-import-pipeline.md)):
1. Import pipeline stages `fetch`, `normalise`, `merge`, `map` for classes, species, backgrounds, feats, spells, items, conditions, rules, tables; text and tables land in `packages/content/srd51` with attribution.
2. Walk every class, subclass, species, background and feat feature of the SRD; record the effect kinds each needs; extend the catalogue and the schemas where a feature is inexpressible; each new kind ships with a unit test and a fixture.
3. `derive` steps 6–9: resources, actions, spellcasting (slot tables, multiclass caster level), spells by payment, proficiencies, choices, sections.
4. `validate` full rule set with a negative fixture per rule.
5. **Confirmation point (DEC-19).** Present the owner with the count of features to author and the three options; if an agent swarm is chosen, define the exact brief, the schema gate, the review process, and launch only after explicit confirmation. Authored effects go into the overlay directory that `map` never overwrites.

Done: every SRD feature is expressible and the catalogue is closed; `validate` rejects anything outside it. Release: `v0.0.4`.
Risks: catalogue explosion (one kind per special case). Mitigation: a new kind is accepted only if at least two features need it or if it is a clear generic (e.g. `weapon-mastery` for 2024); otherwise the feature is modelled with `add-text` and a note, and listed as a known limitation.

### M0.5 — Base package complete (≈ 6 sessions, plus authoring)

Tasks (from [04-testing-strategy.md](04-testing-strategy.md), [05-srd-import-pipeline.md](05-srd-import-pipeline.md)):
1. Finish authoring effects for all SRD content (overlay), run `review`, merge.
2. Golden fixtures: one character per SRD class at levels 1, 5, 11, 20; a multiclass caster; a character with no resources and no spells. Expected values hand-computed for the key numbers; snapshots reviewed.
3. Coverage script: every entity of the base package loaded by at least one fixture; every effect kind and condition key exercised.
4. Performance test on a level 20 multiclass caster.
5. Authoring guide written from [02-content-format.md](02-content-format.md) and the experience of authoring; translation file skeleton generator prepared for Phase 1.
6. Freeze `formatVersion: 0`.

Done: the criteria of M0.5. Release: `v0.1.0`: the first artefact useful outside the team (a validated SRD 5.1 in an open format).
Risks: volume; the SRD is large and the effects are the slow part. Mitigation: classes first (they drive fixtures), then species, backgrounds, feats, then items; spells last because most need no effects.

### M0.6 — Private and homebrew paths proven (≈ 3 sessions, plus transcription)

Tasks (from [06-private-packages.md](06-private-packages.md)):
1. Loader with two roots and deterministic ordering; tests that fail if a non-redistributable package is outside `content-private/` or if anything under it is tracked.
2. Homebrew package `homebrew.byloth` (feline species with subspecies, bruised-lung condition) as a public fixture package.
3. **Confirmation point.** Confirm with the owner before transcribing any Player's Handbook content. Then `content-private/phb14`: manifest, Way of Shadow first, then the other missing subclasses, races, backgrounds, feats, spells, as time allows.
4. Reference Monk fixture (base + `phb14` + homebrew) with hand-computed expectations; verified locally; skipped in CI.
5. Verify the suite is green with `content-private/` deleted.

Done: the criteria of M0.6. Release: `v0.1.1`.
Risks: accidental commit of private content. Mitigation: the tracked-files test, the `.gitignore`, and a pre-commit hook that refuses paths under `content-private/`.

### M0.7 — Play engine core (≈ 4 sessions; can start after M0.3)

Tasks (from [03-engine-contract.md](03-engine-contract.md), [04-testing-strategy.md](04-testing-strategy.md)):
1. `apply` and `undo` for every `PlayEvent`, with `before`/`after` slices and summaries.
2. Rests driven by resource recharge rules and the ruleset's Hit Dice formula; concentration warning on damage; turn tracker with action ids taken.
3. Session fixtures: a full combat with attack, resource spend, damage to 0 HP, death saves, healing, short rest; a long rest; a concentration scenario; a custom temporary effect with expiry.
4. Property test: `undo(apply())` identity for every event type.

Done: the criteria of M0.7. Release: folded into the next tag.
Risks: play rules that look global but are edition-specific (death saves thresholds, exhaustion). Mitigation: read them from `ruleset.yaml` and `Rule` entities; add fields there rather than constants in code ([07-ruleset-switching.md](07-ruleset-switching.md)).

### M0.8 — CLI (≈ 2 sessions)

Tasks:
1. `validate [roots…]`, `build` (YAML → canonical JSON bundle per package), `derive <character.yaml> [--json | --text]`, `fixtures [--update] [--filter] [--coverage]`.
2. The `--text` dump: a readable sheet in the terminal (values with provenance, resources, actions, spells, sections), which is the first "user interface" of the project and the reference for the web sheet in Phase 1.
3. Documentation of the CLI in the repository README.

Done: the criteria of M0.8; Phase 0 done criteria in [../16-roadmap.md](../16-roadmap.md) verified one by one. Release: `v0.2.0`.

### Summary

| Milestone | Sessions (excluding content authoring) | Depends on | Tag |
|---|---|---|---|
| M0.1 | 2 | — | v0.0.1 |
| M0.2 | 4 | M0.1 | v0.0.2 |
| M0.3 | 6 | M0.2 | v0.0.3 |
| M0.4 | 5 + authoring | M0.3 | v0.0.4 |
| M0.5 | 6 + authoring | M0.4 | v0.1.0 |
| M0.6 | 3 + transcription | M0.5 | v0.1.1 |
| M0.7 | 4 | M0.3 | — |
| M0.8 | 2 | M0.5, M0.6, M0.7 | v0.2.0 |

Content authoring time depends on DEC-19 and is estimated in [05-srd-import-pipeline.md](05-srd-import-pipeline.md).

## Tasks

1. Keep this document current: when a milestone closes, record the tag and the date here — every milestone.
2. At each milestone boundary, re-read [../18-risks.md](../18-risks.md) and the Open points of the Phase 0 documents; close or promote them — every milestone.
3. At Phase 0 close, write the Phase 1 execution plan following the same structure, starting with the decisions DEC-04, DEC-09, DEC-12, DEC-13, DEC-15 and the SPA-vs-Nuxt part of DEC-01 — M0.8.

## Open points

- Whether M0.7 should be pulled before M0.4 to give the owner something "playable" from the CLI earlier; it is possible since it depends only on M0.3.
- Whether the `phb14-stub` fixture (placeholder text, public) is acceptable, or whether even a stub with the subclass *structure* of a copyrighted book should stay private. Leaning: structure and feature names are facts, placeholder text is ours; acceptable.
- Session estimates assume one developer plus agent assistance for repetitive content work; revise after M0.2.

## Progress log

| Milestone | Closed | Tag | Notes |
|---|---|---|---|
| M0.1 | 2026-09-18 | v0.0.1 | Local repository only; the owner creates the remote and pushes. pnpm 12, Node 24, TypeScript 6, Vitest 4, ESLint 10 with `@byloth/eslint-config-typescript`. Engine import restriction and private-content rule tests verified by probe. |
