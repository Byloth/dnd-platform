# 17 — Open decisions

## Purpose

This is the register of every choice that has been deliberately postponed. Each entry says what must be decided, the options known today, what the decision unblocks, the phase at which it must be taken, and its status. Documents refer to entries by id (`DEC-nn`). Nothing outside this register may name a specific technology, vendor or product as a choice.

When a decision is taken, its status becomes **Decided**, the chosen option and the reasons are recorded here, and the documents that referenced it are updated. Entries are never deleted.

## Register

| Id | Decision | Phase | Status |
|---|---|---|---|
| DEC-01 | Technology stack | 0 / 1 | Partially decided (2026-09-18) |
| DEC-02 | Rules edition: 2014 (SRD 5.1) or 2024 (SRD 5.2) for the base package | 0 | Decided (2026-09-18) |
| DEC-03 | Serialisation format of packages and characters | 0 | Decided (2026-09-18) |
| DEC-04 | Hosting and deployment model | 1 | Open |
| DEC-05 | Dice random number generation and roll verifiability | 2 | Open |
| DEC-06 | Offline support | 2 | Open |
| DEC-07 | Language-model-based assistance | 5 | Open |
| DEC-08 | Project licence and openness | 0 | Decided (2026-09-18) |
| DEC-09 | Supported languages for interface and content | 1 | Open |
| DEC-10 | Monetisation and hosting costs | 4 | Open |
| DEC-11 | Import from other platforms | 4 | Open |
| DEC-12 | Authentication and account model | 1 | Open |
| DEC-13 | PDF generation approach | 1 | Open |
| DEC-14 | Homebrew moderation policy for public packages | 4 | Open |
| DEC-15 | Default ability score generation method | 1 | Open |
| DEC-16 | Hit point gain method policy at level up | 3 | Open |
| DEC-17 | Respec permissions in campaigns | 6 | Open |
| DEC-18 | Ruleset selection granularity (per character, per campaign, both) | 3 | Open |
| DEC-19 | Strategy for authoring mechanical effects of SRD content (by hand, agent-assisted, hybrid) | 0 | Open |

## Entries

### DEC-01 — Technology stack
- **What:** languages, frameworks, storage, build and test tooling for the rules engine, the web application and the export service.
- **Decided (2026-09-18, Phase 0 part):** TypeScript everywhere, so one rules engine runs in the browser, on a server and in command-line tools. Vue ecosystem for the web application, starting from the author's own templates (a Vite + Vue single-page template and a Nuxt 4 template). Monorepo with workspace packages under the temporary scope `@byloth/dnd-platform`: engine (pure, no I/O), schema, content (base package), cli; the web application is added in Phase 1. Unit and golden-fixture tests with the test runner already used by those templates. Determinism and testability are non-negotiable: every "configuration → expected output" case is a test.
- **Open (Phase 1 part):** single-page application vs Nuxt application shell; leaning Nuxt because accounts, sharing and PDF export will likely want a server side. Decided together with DEC-04 and DEC-12.
- **Options known (originally):** to be surveyed at Phase 0 start. Constraints already fixed by the design: the rules engine must be a pure, shareable library usable by the web application, the export service and authoring tools ([15](15-logical-architecture.md)); the content format must be text-based and diffable (DEC-03); the interface must be usable on cheap phones ([13](13-ux-and-accessibility.md)).
- **Unblocks:** all implementation.
- **Referenced by:** [01](01-vision.md), [15](15-logical-architecture.md).

### DEC-02 — Rules edition for the base package
- **What:** whether the first base package encodes the 2014 rules (SRD 5.1, matches the playbook and most Italian printed material) or the 2024 rules (SRD 5.2, current, more permissive licence, "species" terminology).
- **Decided (2026-09-18):** SRD 5.1 (2014) first, because it is still the most played ruleset and matches the group that will use the platform first. The switch to SRD 5.2 (2024) is planned, not optional: the design must make it easy, and eventually the ruleset must be *selectable*. Consequences: the base package is a dependency like any other, a character declares which base package (ruleset) it is built on, the effect catalogue and the engine are edition-neutral (no 2014 assumption in code), and edition-specific behaviour lives in content. Granularity of the selection is DEC-18.
- **Options known (originally):** 2014 first; 2024 first; both from the start as two base packages. Differences affect entity naming, some effect kinds (e.g. weapon mastery in 2024), backgrounds granting feats, and rest rules.
- **Unblocks:** authoring the base package ([05](05-content-model-and-sources.md)).
- **Referenced by:** [04](04-domain-model.md), [05](05-content-model-and-sources.md), [16](16-roadmap.md).

### DEC-03 — Serialisation format
- **What:** the concrete file format for packages and character documents.
- **Decided (2026-09-18):** YAML for authoring (comments, multi-line Markdown strings for descriptions), validated by JSON Schema; JSON as the canonical machine form for exchange, export and caching. Every YAML file converts to JSON without loss and back.
- **Requirements fixed:** human-readable and editable, diffable in version control, schema-validatable, supports localised strings and references between entities, round-trips without loss ([12](12-print-and-export.md)).
- **Unblocks:** the base package, the validator, export/import.
- **Referenced by:** [04](04-domain-model.md), [05](05-content-model-and-sources.md), [06](06-homebrew-and-extensibility.md), [12](12-print-and-export.md), [15](15-logical-architecture.md).

### DEC-04 — Hosting and deployment model
- **What:** self-hosted per group, a single public instance, or both; and the consequences for private official packages ([14](14-accounts-sharing-and-campaigns.md)).
- **Options known:** self-hosted only (simplest legally: one group, their books); public instance with per-user uploads; both.
- **Unblocks:** the account model (DEC-12), the private-package policy, cost planning (DEC-10).
- **Referenced by:** [14](14-accounts-sharing-and-campaigns.md), [15](15-logical-architecture.md).

### DEC-05 — Dice RNG and roll verifiability
- **What:** where dice are rolled (device or server), whether rolls are verifiable by the DM, and whether physical dice can be entered instead.
- **Options known:** local rolls with a log; server rolls with a shared log; entering physical results. Manual entry must exist in any case, because many tables prefer real dice.
- **Unblocks:** play mode roll flows ([09](09-play-mode.md)).
- **Referenced by:** [09](09-play-mode.md).

### DEC-06 — Offline support
- **What:** whether the sheet and play mode work without connectivity, and how state is reconciled.
- **Options known:** none (online only); read-only offline; full offline with later sync. The architecture keeps the engine pure and the character portable so that any option remains possible ([15](15-logical-architecture.md)).
- **Unblocks:** play mode storage design.
- **Referenced by:** [09](09-play-mode.md), [13](13-ux-and-accessibility.md), [15](15-logical-architecture.md).

### DEC-07 — Language-model-based assistance
- **What:** whether to add generative assistance on top of the rule-based assistant, and under which constraints.
- **Constraints fixed:** opt-in; grounded only on the computed sheet and the content text; never invents rules; always labelled; cost borne knowingly ([11](11-play-assistant.md)).
- **Unblocks:** nothing essential; the rule-based assistant is the deliverable of Phase 5.
- **Referenced by:** [11](11-play-assistant.md).

### DEC-08 — Project licence and openness
- **What:** the licence of the platform code and of the format specification; whether the project is developed in the open.
- **Decided (2026-09-18):** AGPL-3.0 for the platform code. Public repository from the first commit. Copyrighted official content is integrated from day one but lives only in a git-ignored local directory in the same package format; everything must work with it present and with it absent ([phase-0/06-private-packages.md](phase-0/06-private-packages.md)).
- **Constraints fixed:** the base package is SRD content and carries its own licence and attribution; official packages are never part of the repository ([05](05-content-model-and-sources.md)).
- **Unblocks:** publishing the repository.
- **Referenced by:** [01](01-vision.md), [18](18-risks.md).

### DEC-09 — Supported languages
- **What:** which languages the interface and the base content support, and in which order.
- **Decided part:** Italian and English interface from Phase 1; Italian translation package of the base package in Phase 1 ([13](13-ux-and-accessibility.md), [05](05-content-model-and-sources.md)).
- **Open part:** further languages, and whether community translation packages are accepted before Phase 4.
- **Referenced by:** [05](05-content-model-and-sources.md), [13](13-ux-and-accessibility.md).

### DEC-10 — Monetisation and hosting costs
- **What:** whether the platform is free, donation-based, or paid; who pays for hosting a public instance.
- **Constraint fixed:** no selling of content; official content is never distributed ([01](01-vision.md)).
- **Unblocks:** the choice between self-hosted and public instance at scale.
- **Referenced by:** [01](01-vision.md), [14](14-accounts-sharing-and-campaigns.md).

### DEC-11 — Import from other platforms
- **What:** whether to read export formats of other character tools, and how to map them onto packages.
- **Options known:** no import; import of choices only (state discarded); full import where a mapping exists.
- **Unblocks:** onboarding of existing players.
- **Referenced by:** [05](05-content-model-and-sources.md), [07](07-character-creation.md), [12](12-print-and-export.md).

### DEC-12 — Authentication and account model
- **What:** how users sign in, whether guest use is kept permanently, how sharing links are secured.
- **Decided part:** trying without an account is allowed, with export as the only persistence ([14](14-accounts-sharing-and-campaigns.md)).
- **Unblocks:** persistence of characters, sharing, campaigns.
- **Referenced by:** [14](14-accounts-sharing-and-campaigns.md).

### DEC-13 — PDF generation approach
- **What:** whether the printed playbook is produced from the same layout as the screen (print stylesheet) or from a dedicated print layout engine; how fillable fields are produced.
- **Requirements fixed:** the structure and content in [12](12-print-and-export.md); fillable fields; A4 and Letter; black-and-white legibility.
- **Unblocks:** Phase 1 print deliverable.
- **Referenced by:** [12](12-print-and-export.md), [15](15-logical-architecture.md).

### DEC-14 — Homebrew moderation policy
- **What:** how public packages are reviewed, reported and removed; who is responsible.
- **Options known:** no public listing at first; community reporting; pre-publication review.
- **Unblocks:** public visibility level ([06](06-homebrew-and-extensibility.md)).
- **Referenced by:** [06](06-homebrew-and-extensibility.md), [14](14-accounts-sharing-and-campaigns.md), [18](18-risks.md).

### DEC-15 — Default ability score method
- **What:** which method the newcomer wizard proposes by default (standard array, point buy, rolling) and which are allowed.
- **Constraint fixed:** all three must be supported; the default must be the one that needs the least explanation ([07](07-character-creation.md)).
- **Unblocks:** the wizard's ability score step.
- **Referenced by:** [07](07-character-creation.md).

### DEC-16 — Hit point gain method policy at level up
- **What:** whether hit points at level up are always the average, may be rolled, or are locked per campaign by the DM.
- **Decided part:** the guided level-up proposes the average by default and offers rolling as an option ([10](10-progression.md)).
- **Open part:** whether a campaign can restrict the method, and whether rolled results below average can be re-rolled or replaced by the average.
- **Unblocks:** campaign-level house rules on progression ([14](14-accounts-sharing-and-campaigns.md)).
- **Referenced by:** [10](10-progression.md).

### DEC-17 — Respec permissions in campaigns
- **What:** whether a player can freely retrain or rebuild a character, needs DM approval, or is locked once the campaign starts.
- **Options known:** free (default outside campaigns); DM approval per request; locked with snapshots as the only way back.
- **Constraint fixed:** every respec is recorded as a snapshot so the DM can always see what changed ([10](10-progression.md)).
- **Unblocks:** campaign rules in Phase 6 ([14](14-accounts-sharing-and-campaigns.md)).
- **Referenced by:** [10](10-progression.md).

### DEC-18 — Ruleset selection granularity
- **What:** whether the ruleset (base package: SRD 5.1 or 5.2) is chosen per character, per campaign, or both with campaign taking precedence.
- **Constraint fixed:** a character always records the base package it depends on (DEC-02); the engine never assumes an edition.
- **Unblocks:** adding the second base package; campaign rules in Phase 6.
- **Referenced by:** [05](05-content-model-and-sources.md), [14](14-accounts-sharing-and-campaigns.md).

### DEC-19 — Strategy for authoring mechanical effects of SRD content
- **What:** open datasets provide prose, lists and level tables, but no dataset provides the mechanical effects the engine needs for class, species, feat and background features. They must be authored: by hand, with a swarm of agents reading the SRD text and producing effect declarations under a strict schema (subject to explicit confirmation by the project owner before launch), or a hybrid where agents draft and humans review.
- **Constraint fixed:** whatever produces the effects, the validator and the golden fixtures are the acceptance gate; nothing enters the base package unvalidated.
- **Unblocks:** completion of the base package ([phase-0/05-srd-import-pipeline.md](phase-0/05-srd-import-pipeline.md)).
- **Referenced by:** [05](05-content-model-and-sources.md).

### DEC-20 — Package compatibility and content selection
- **What:** whether packages can be incompatible with each other (a setting that removes a class while another package extends it; a homebrew package that patches a field another one patches), and whether incompatibilities are declared by authors or computed by the engine.
- **Decided (2026-09-21):** **no package is ever incompatible with another; everything is selection plus pruning.** A campaign (or, without a campaign, a character) carries a *content selection*: the packages, their order, and *exclusions* expressed as filters (a whole package, an entity type within a package, a tag, or single entity ids). After loading, the engine *prunes*: an entity that references or requires something excluded becomes **inactive**, transitively and deterministically (an elf-only feat in a world without elves, a subclass of a removed class). The engine returns the **cascade report** (what each exclusion also disabled) so the person choosing sees the consequence. Overlapping patches keep the existing rule: the later package in the selection order wins, with a provenance warning. Two consequences: (a) the loader has two modes: validating a package alone, an unresolved reference is an error; validating a selection, a reference to an excluded entity is an inactivation with a diagnostic; (b) a setting package ships a *preset selection* (for example "SRD plus Historia, PHB without species"), not a conflicts list. A character already using content later excluded keeps computing, flagged as "uses content excluded from the campaign"; the selection binds new choices. Official Wizards of the Coast packages are additive to each other by construction; the reference suite loads them all together and asserts an empty cascade report, so any conflict is a content bug caught in CI. The only hard incompatibility that remains is the base package (edition), already enforced by dependencies.
- **Options known (originally):** hard `conflicts` declared in the manifest; conflicts computed at load and blocking; the chosen model (soft, computed, with declared presets).
- **Unblocks:** private packages that are settings (Historia) and partial adoption of a book; the campaign allowed-package model of Phase 6 ([14](14-accounts-sharing-and-campaigns.md)).
- **Referenced by:** [06](06-homebrew-and-extensibility.md), [14](14-accounts-sharing-and-campaigns.md), [phase-0/06-private-packages.md](phase-0/06-private-packages.md).

## How to add a decision

1. Take the next free id.
2. Fill in what, options known, constraints already fixed by the design, what it unblocks, the phase, and the documents that reference it.
3. Add the id to the phase's "decisions to take at the start" list in [16](16-roadmap.md).
4. In the referencing document, mark the choice as Deferred with the id.
