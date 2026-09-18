# Phase 0 — Foundations: execution plan

## Purpose

Phase 0 builds the two things everything else depends on: a **content format** expressive enough to encode the complete SRD 5.1 and any official or homebrew extension, and a **rules engine** that turns a character into a computed sheet with provenance, deterministically and testably. No user interface is built in this phase.

This directory is the execution plan: concrete enough to start work, still free of choices that belong to later phases. Unlike the top-level documents, these files **do** name technologies, because the Phase 0 decisions have been taken (see below).

## Decisions in force

Taken on 2026-09-18 and recorded in [../17-open-decisions.md](../17-open-decisions.md):

| Id | Decision |
|---|---|
| DEC-01 | TypeScript everywhere. Vue ecosystem for the future web application. Monorepo with workspace packages under the temporary scope `@byloth/dnd-platform`. Application shell (single-page vs Nuxt) deferred to Phase 1, leaning Nuxt. |
| DEC-02 | SRD 5.1 (2014) is the first base package. The engine is edition-neutral; SRD 5.2 (2024) arrives later as a second base package and the ruleset becomes selectable (granularity: DEC-18). |
| DEC-03 | YAML for authoring, JSON Schema for validation, JSON as canonical exchange form. |
| DEC-08 | AGPL-3.0. Public repository from the first commit. Copyrighted official content is integrated from day one in a git-ignored directory, in the same format, and must work exactly like public content. |

Still open inside Phase 0: **DEC-19**, how the mechanical effects of SRD content are authored (by hand, by an agent swarm after explicit confirmation, or hybrid). [05-srd-import-pipeline.md](05-srd-import-pipeline.md) frames the choice.

Fixed requirement from the project owner: **everything is deterministic and testable**. A given set of packages plus a given character produces one computed sheet, and every such case can be written as a test. When a bug appears, the workflow is: write the failing test, watch it fail, fix, watch it pass.

## Deliverables

1. **Monorepo** with workspace packages `engine`, `schema`, `content` (base package SRD 5.1), `cli`, and a git-ignored `content-private/` root — [01-monorepo.md](01-monorepo.md).
2. **Content format v0**: package manifest, entity files, effect catalogue, condition language, localisation, references, all as JSON Schema with YAML examples — [02-content-format.md](02-content-format.md).
3. **Engine contract**: `loadPackages`, `validate`, `derive`, `apply`, with the provenance and error models — [03-engine-contract.md](03-engine-contract.md).
4. **Testing strategy** and the first golden fixtures — [04-testing-strategy.md](04-testing-strategy.md).
5. **SRD import pipeline**: sources, licences, stages, what is imported and what is authored — [05-srd-import-pipeline.md](05-srd-import-pipeline.md).
6. **Private packages** working from day one — [06-private-packages.md](06-private-packages.md).
7. **Ruleset switching** designed in, not bolted on — [07-ruleset-switching.md](07-ruleset-switching.md).
8. **Work plan** with ordered milestones and their done criteria — [08-workplan.md](08-workplan.md).

## Milestones

| Id | Milestone | Done when |
|---|---|---|
| M0.1 | Repository and monorepo scaffold | Public repository exists, workspaces build, lint, typecheck and run an empty test suite; `content-private/` is git-ignored and documented. |
| M0.2 | Content format v0 | JSON Schemas published from the `schema` package; three hand-written example packages (a base excerpt with one class, one species, ten spells; a homebrew species; a private-package stub) validate. |
| M0.3 | Engine core | `derive` computes ability modifiers, proficiency, saves, skills, AC, HP, speed, senses with provenance for the example packages; golden fixtures pass. |
| M0.4 | Effect catalogue complete for the SRD | Every SRD 5.1 class, subclass, species, background and feat feature is expressible; `validate` rejects anything outside the catalogue. |
| M0.5 | Base package complete | The whole SRD 5.1 is in `content`, validated, with attribution; one golden fixture per class at levels 1, 5, 11 and 20 passes. |
| M0.6 | Private and homebrew paths proven | A Player's Handbook package in `content-private/` extends the base Monk with Way of Shadow; a homebrew feline species package exists; the reference Monk fixture computes correctly from base + private + homebrew, and the test suite passes with `content-private/` absent. |
| M0.7 | Play engine core | `apply` handles damage, healing, temporary HP, resource spend/restore, rests with automatic recovery, conditions, death saves, with log and undo; session fixtures pass. |
| M0.8 | CLI | `validate`, `build` (YAML → canonical JSON), `derive` (character → sheet as JSON and as a readable text dump), `fixtures` (run golden fixtures) work from the command line. |

Phase 0 is done when M0.1–M0.8 are done and the done criteria of Phase 0 in [../16-roadmap.md](../16-roadmap.md) hold.

## Conventions for this directory

- Each document opens with **Purpose**, then **Decisions** (what this document fixes), **Design**, **Tasks** (numbered, referencing milestones), **Open points** (small questions to settle while working, not DEC-level decisions).
- Package names use the temporary scope: `@byloth/dnd-platform-engine`, `@byloth/dnd-platform-schema`, `@byloth/dnd-platform-content-srd51`, `@byloth/dnd-platform-cli`. Renaming is a single search-and-replace before publication.
- Identifiers inside content are stable, lowercase, dot-separated: `srd51.class.monk`, `srd51.spell.darkness`, `phb14.subclass.monk.way-of-shadow`, `homebrew.byloth.species.feline`. The first segment is the package identifier.
- Every example in these documents is valid against the schema it illustrates; examples are copied into the test suite as fixtures.
- Kuro, the character of the playbook that inspired the project, is not a fixture and is not referenced. The reference fixtures are described in [04-testing-strategy.md](04-testing-strategy.md).
