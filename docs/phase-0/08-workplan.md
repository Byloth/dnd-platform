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

### M0.2 — Inventory and content format v0 (≈ 3 sessions for the inventory, 4 for the format)

Reordered on 2026-09-18 at the owner's request: the effect catalogue can only be closed against the complete list of what the SRD contains, so the inventory comes first and the schemas are written from evidence, not from a chosen example.

**Part A — inventory and classification** (from [05-srd-import-pipeline.md](05-srd-import-pipeline.md), pulled forward):
1. `fetch` stage with pinned commits and a lock file (`tools/import/sources.lock.yaml`); Open5e as primary, 5e-database as cross-check.
2. `inventory` stage: human-readable inventory in `docs/phase-0/inventory/` (summary counts, classes with level tables, subclasses, species, backgrounds, feats, spells, items, conditions, rules) plus classification skeletons for features, spells and magic items.
3. Classification of every feature, trait and benefit against the catalogue vocabulary ([inventory/classification-vocabulary.md](inventory/classification-vocabulary.md)), of every spell and every magic item with reduced vocabularies; done by parallel agents on partitions, merged and validated by `merge-classification`.
4. Human review of low-confidence records and of every `needs-new-kind` proposal; `inventory/README.md` states the catalogue revisions (kinds to add, rename or drop, condition keys and `modify` targets to add, features that stay text-only).

**Part B — format v0** (from [02-content-format.md](02-content-format.md), [03-engine-contract.md](03-engine-contract.md)):
5. Apply the revisions to the catalogue in 02, then JSON Schemas for manifest, ruleset, every entity type, effect (all kinds), condition, character; the formula grammar documented and tested as a regular grammar.
6. Type generation from schemas into `packages/schema`; enumerations for `modify` targets, sections, activation types, proficiency types, skills, damage types, conditions.
7. Engine type definitions and function skeletons with exhaustive switches (compile-time completeness).
8. The three example packages as real fixtures: `fixtures/packages/srd51-excerpt` (Monk 1–3, one species, ten spells, the proficiency and slot tables, the ruleset), `fixtures/packages/homebrew-feline`, `fixtures/packages/phb14-stub` (Way of Shadow at level 3 only, marked private and non-redistributable, kept as a *fixture stub* with placeholder text so it can live in the public repository).
9. `validate` for schema conformance only, wired into `validate:content`.

Done: the criteria of M0.2 in [00-README.md](00-README.md). Release: `v0.0.2`.
Risks: classification drift between agents (different agents, different readings). Mitigation: one fixed vocabulary, a merge step that rejects anything outside it, and a human pass on every proposal for a new kind.

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
| M0.7 | 2026-09-22 | — (folded into v0.2.0) | `apply`/`undo` for 23 event types in `packages/engine/src/play/` with minimal log slices, validation with `force`, damage with defenses and the concentration check, rests and death saves read from the ruleset (additive optional keys `concentration`, `deathSaves`, `rests.*.hours`, `rests.long.conditionLevelsRecovered`; format stays v0), one expiry model (turn counters on `end-turn`, rounds on `start-turn`, timed effects through rest lengths), play effects executed or reported. The sheet gained `play`, `toggles`, the ruleset's base actions, spell durations and active spells / custom effects as features; 90 snapshots regenerated (additive). 47 unit tests, 25 property tests (undo identity for every event, frozen inputs, random sequences), nine session fixtures run by `dnd fixtures` (one private). Patient Defense fixed to expire at the start of the next turn. |
| M0.6 | 2026-09-21 | v0.1.1 | Private root discovery and guards in `dnd validate` (`--all`, `--references`), fixture runner with `requires` by id and the private fixture root; DEC-20 content selection in the loader (inactive entities, hard/contains/soft pruning, cascade report, `W_EXCLUDED_CONTENT`), loader indexes inline features and subspecies after patches and attributes patched-in entries to the patching package; `page` on patches; `tools/import/src/phb-scope.ts` partitions the owned book's OCR text into agent packets. Private (never committed): `content-private/phb14` transcribed in full — 28 subclasses, 5 subraces + variant human, 17 backgrounds, 42 feats, 42 spells, 8 spell-list patches, 4 tables; Way of Shadow, subraces, Healer and the list patches by hand, the rest drafted by ten Opus agents on fixed ids and reviewed; 30 private fixtures including the reference Monk with hand-computed expectations. Suite green with `content-private/` absent. |
| M0.5 | 2026-09-19 | v0.1.0 | Fifty-nine golden fixtures with hand-computed expectations (every class at 1/5/11/20, multiclass casters, pact magic, magic items, all conditions, every species and subspecies), attack rows in the engine, per-class hit points, multiclass proficiency rules, choice gating and spell/language choices, coverage report gated at 100 % for classes, subclasses, species, backgrounds, feats and conditions, performance test, unit tests for every effect kind and condition key, format frozen at v0. Thirteen engine and content bugs found by the fixtures and fixed. |
| M0.4 | 2026-09-19 | v0.0.4 | Import pipeline map stage generates the whole SRD 5.1 (1106 entities) with an overlay for mechanics; DEC-19 decided as hybrid: ten agents drafted 572 overlay files (features, spells, magic items) under the fixed vocabulary, every file schema-validated, the package loads in the engine with every reference resolved; spellcasting assembly (slots by progression, DC, known/prepared spells) and referential `validate` in the engine; five golden fixtures including two on the real base package. Review notes and catalogue gaps in `inventory/authoring-review.md`. |
| M0.3 | 2026-09-19 | v0.0.3 | Formula AST parser (schema) and evaluator with symbolic dice; condition evaluator for every `when` key; `loadPackages` (dependency order, single base, pins, patches with `patchedBy`, translations, inline features and subspecies indexed); `derive` with lazy value graph, precedence, provenance, resources, actions, proficiencies, choices, sections; `explain`; canonical JSON; `dnd fixtures` runner with expected values + snapshots and skip-when-missing; three golden fixtures with hand-computed expectations; property tests (idempotence, order independence, patches, load diagnostics). |
| M0.2 | 2026-09-19 | v0.0.2 | Part B: 23 JSON Schemas (draft 2020-12) with generated TypeScript types and a CI diff check, formula grammar checker, four valid example packages (`srd51-excerpt`, `homebrew-feline`, `phb14-stub`, `mini-ruleset-b`) and five invalid ones with expected diagnostics, `dnd validate` (schema conformance + structural checks), engine types taken from the schemas with exhaustive dispatch over effect kinds. |
| M0.2 part A | 2026-09-18 | — | SRD 5.1 inventoried (391 features, 319 spells, 239 magic items) and classified by seven agents on a fixed vocabulary; ten catalogue decisions recorded in `inventory/README.md`. Part B (schemas) next. |
| M0.1 | 2026-09-18 | v0.0.1 | Local repository only; the owner creates the remote and pushes. pnpm 12, Node 24, TypeScript 6, Vitest 4, ESLint 10 with `@byloth/eslint-config-typescript`. Engine import restriction and private-content rule tests verified by probe. |
