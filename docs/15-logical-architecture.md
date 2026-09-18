# 15 — Logical architecture

## Purpose

This document describes the platform as a set of blocks with clear responsibilities and contracts, independent of any technology. It exists so that the technology choice (DEC-01) is made against a known shape, and so that every block can be built and tested on its own. It also fixes the properties the whole system must have: deterministic derivation, portable data, safe handling of bad content.

## Principles

- **The rules engine is pure.** It takes a character and a set of packages and returns a computed sheet. No input/output, no clock, no randomness, no network. Everything that talks to the world sits around it (Principle 2, Principle 3).
- **Content in, sheet out, always recomputable.** Stored computed sheets are a cache. The character document plus pinned package versions is the source of truth (Principle 9).
- **One engine, many hosts.** The same engine library runs in the web application, in the export service and in authoring tools, so the printed playbook, the on-screen sheet and the package validator can never disagree.
- **A bad package fails validation, never the sheet.** Content errors are reported at load or authoring time; at render time the sheet degrades with a warning, it does not crash (Principle 6 requires that homebrew can be wrong without breaking the game).
- **Offline-capable by design, not by promise.** Blocks are shaped so a device could run creation, sheet and play without a server; whether that is delivered is DEC-06.

## What needs to be done

1. Specify each block's responsibility, inputs, outputs and the data contract at its boundary (below).
2. Define the **package loader**: resolution of dependencies, version pinning, visibility filtering, validation before load.
3. Define the **rules engine** interface: `derive(character, packages) → computed sheet` with provenance and warnings; `validate(package) → report`.
4. Define the **play engine** interface: `apply(state, event, computed sheet) → (state, log entry, inverse)`.
5. Define the **sheet composer**: from a computed sheet and a sheet mode to a section tree, reused by the UI and the export service.
6. Define the **export service** contract: section tree in, playbook document out; portable data in and out.
7. Define the **assistant** contract: computed sheet + state + rules entities in, ranked suggestions with reasons out ([11](11-play-assistant.md)).
8. Define the **identity and sharing** block per [14](14-accounts-sharing-and-campaigns.md).
9. Define the **API surface** as the union of the contracts above, so that the web application is one client among possible others.
10. Set up the **testing strategy** and the first golden fixtures (one per SRD class) before writing the engine.
11. Define **error and observability** conventions for content problems.

## How

### Blocks and data flow

```
                     ┌──────────────────────────┐
                     │  Content store &          │  packages (base, official private, homebrew),
                     │  package loader           │  versions, visibility, validation reports
                     └────────────┬─────────────┘
                                  │ resolved package set
         ┌────────────────────────┼───────────────────────────┐
         │                        ▼                           │
┌────────┴────────┐   ┌──────────────────────┐    ┌───────────┴──────────┐
│ Character store │──▶│     Rules engine      │◀───│  Authoring tooling    │
│ choices, state, │   │ derive(), validate()  │    │ (reuses validate())  │
│ snapshots, log  │   │ pure, deterministic   │    └──────────────────────┘
└────────┬────────┘   └──────────┬───────────┘
         │                       │ computed sheet (values + provenance, actions,
         │                       │ resources, sections, warnings)
         │                       ▼
         │            ┌──────────────────────┐        ┌─────────────────────┐
         │            │    Sheet composer     │───────▶│   Export service     │──▶ playbook PDF,
         │            │ mode → section tree   │        │ print + data export  │    portable data
         │            └──────────┬───────────┘        └─────────────────────┘
         │                       │ section tree
         ▼                       ▼
┌─────────────────┐   ┌──────────────────────┐        ┌─────────────────────┐
│   Play engine    │◀──│   Web application     │◀──────▶│     Assistant        │
│ apply(event)     │──▶│ build / play / print  │        │ suggestions+reasons  │
│ log, undo        │   └──────────┬───────────┘        └─────────────────────┘
└─────────────────┘              │
                                 ▼
                      ┌──────────────────────┐
                      │  Identity & sharing   │  owners, guests, grants, campaigns,
                      │  + API surface        │  package visibility, audit
                      └──────────────────────┘
```

### Block contracts

| Block | Responsibility | Input | Output | Must not |
|---|---|---|---|---|
| Content store & package loader | Hold packages, resolve dependencies, pin versions, filter by visibility, validate before load | Package files, user context | A resolved, validated, ordered package set | Load an invalid package; expose a private package outside its policy |
| Rules engine | Derive the computed sheet with provenance; validate packages against the effect catalogue | Character choices (+ state for conditional effects), package set | Computed sheet, warnings; validation report | Perform I/O; depend on time or randomness; special-case a class or book in code |
| Character store | Persist characters, snapshots, play logs, pinned package versions | Character documents, events | Same, versioned | Store derived values as truth |
| Sheet composer | Turn a computed sheet into a section tree for a sheet mode | Computed sheet, mode, help level, language | Section tree (ordered, conditional sections resolved) | Compute anything the engine did not |
| Play engine | Apply in-play events to state, keep a log with inverses | State, event, computed sheet | New state, log entry, inverse | Change choices; bypass resource rules declared by content |
| Export service | Render section trees to the playbook document; export and import portable data | Section tree, character document | Document file; portable data file | Hold its own copy of rules |
| Assistant | Rank what the character can do now and why; link rules text | Computed sheet, state, rule entities, help level | Suggestions with reasons and links | Change state; hide its reasoning |
| Identity & sharing | Owners, guests, grants, campaigns, package visibility, audit | Users, grants, memberships | Access decisions | Leak private packages through shares |
| API surface | Expose the contracts above to clients | Requests from the web app or other clients | Same contracts | Contain logic that belongs to a block |

### Required properties

- **Determinism**: `derive` with the same character and the same package versions returns the same computed sheet, byte for byte after canonical ordering. This is a tested invariant, not a hope.
- **Purity of the engine**: the engine is a library with no side effects. Random rolls happen in the play engine or the client, never in derivation.
- **Version pinning**: a character records the exact version of every package it uses. Updating a package creates a proposal to migrate the character ([10](10-progression.md)); it never changes an existing sheet silently.
- **Portability**: the character document plus the identifiers and versions of its packages is enough to rebuild the sheet on any deployment that has those packages ([12](12-print-and-export.md)).
- **Caching is optional**: a stored computed sheet may be kept for speed and must be invalidated when the character, a package version or the engine version changes. Any disagreement between cache and recomputation is a bug in the cache.
- **Offline-capable shape** (Deferred, DEC-06): engine, composer and play engine can run on the client; the content store can serve a package bundle; the character store can be local-first with later sync. Nothing in the contracts assumes a live server.
- **Graceful degradation**: an entity referenced by a character but missing from the loaded packages produces a warning and a placeholder, never a failed render.

### Why the engine is a shared library

The on-screen sheet, the printed playbook, the assistant and the package validator all need the same answers. If any of them reimplemented a rule, they would drift. Making the engine a library that the web application, the export service and the authoring tools import means:

- the PDF is generated from the same computed sheet the player sees ([12](12-print-and-export.md));
- a homebrew author validating a package sees the same errors the loader would raise ([06](06-homebrew-and-extensibility.md));
- future tools (a command-line character builder, a DM screen, a bot) get correctness for free.

For the same reason, authoring tooling does not have its own validator: it calls `validate()` from the engine, plus content-quality checks (missing texts, missing translations) layered on top.

### Testing strategy

| Kind | What it checks | First cases |
|---|---|---|
| Golden fixtures | A known character produces a known computed sheet, value by value with provenance | One character per SRD class at levels 1, 5, 11 and 20; a Way of Shadow Monk from a private package; a character with a homebrew species |
| Content validation | Every package in the repository passes `validate()`; every effect kind used exists; every reference resolves | Base package, the sample homebrew package, every private package present locally |
| Property tests | `derive` is deterministic; `apply` followed by its inverse restores state; a long rest restores every long-rest resource declared by content and nothing else | Random characters built from the base package |
| Print snapshots | The playbook for a fixture renders to a stable section tree and document layout | The playbook of each fixture; the Monk fixture checked against the information checklist derived from the original playbook |
| Contract tests | Each block's boundary accepts and produces the agreed shapes; the API surface matches the contracts | All blocks |

Golden fixtures are written before the engine, from the rulebook, and act as the acceptance test for both the engine and the base package.

### Content errors and observability

- Package validation returns a structured report: location (entity, feature, effect), severity (error blocks load, warning allows load), message, suggestion.
- At derivation, warnings are part of the computed sheet and are shown in *build* mode next to the affected value, hidden in *play* mode behind an indicator, listed in *print* mode in an appendix.
- Every warning names the package and version that caused it, so a homebrew author can be told exactly what to fix.
- Errors are never swallowed: the engine returns them; the host decides how to show them.

## Why

- A pure, deterministic engine is the only architecture that makes "every number knows where it comes from" (Principle 3) testable and makes offline and export trivial rather than special.
- Treating computed sheets as a cache removes the whole class of "my sheet is stale" bugs and keeps errata and package upgrades safe.
- Contracts between blocks let the technology decision (DEC-01) be made per block if needed, and let the roadmap ([16](16-roadmap.md)) deliver blocks in order: Phase 0 builds the content store and engine with fixtures; Phase 1 adds composer, web application and export; Phase 2 adds the play engine; Phase 5 adds the assistant; Phase 6 completes identity and campaigns.
- Golden fixtures written from the playbook character give the engine a concrete definition of "done" that a newcomer's actual sheet can verify.

## Deferred decisions

- DEC-01 Technology stack (per block if useful; the engine's language choice constrains where it can run) — Phase 0.
- DEC-03 Serialisation format for packages and character documents — Phase 0.
- DEC-04 Hosting and deployment model — Phase 1.
- DEC-13 PDF generation approach for the export service — Phase 1.
- DEC-06 Offline support — Phase 2.

## Depends on / feeds into

Depends on [01](01-vision.md), [04](04-domain-model.md), [05](05-content-model-and-sources.md), [06](06-homebrew-and-extensibility.md), [14](14-accounts-sharing-and-campaigns.md). Feeds into [08](08-dynamic-sheet.md), [09](09-play-mode.md), [11](11-play-assistant.md), [12](12-print-and-export.md), [16](16-roadmap.md), [17](17-open-decisions.md), [18](18-risks.md).
