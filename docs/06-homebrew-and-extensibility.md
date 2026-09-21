# 06 — Homebrew and extensibility

## Purpose

This document specifies the content package: its manifest, the operations a package can perform on other packages, versioning, validation, conflict resolution, visibility, authoring tools and how package updates reach existing characters. It is the contract that makes Principle 6 true: official books, translations and player homebrew are all the same thing.

## Principles

- **If the book can be expressed, the homebrew can be expressed.** The acceptance test of the format is transcribing official material; anything that needs code is a format gap to close, not a special case (Principle 6, [04](04-domain-model.md)).
- **Extend, do not fork.** A package adds to or patches existing entities instead of copying them, so a character built on the base package is unchanged when a book package is added ([05](05-content-model-and-sources.md)).
- **Characters pin package versions.** A package update never silently changes a sheet; the player is told what changed and chooses to upgrade ([10](10-progression.md)).
- **Validation is strict, rendering is tolerant.** A package with errors cannot be published, but a character referencing a broken entity still renders with a warning (Principle 2, [04](04-domain-model.md) step 7).
- **Text-based, diffable, human-editable.** Whatever serialisation is chosen (Deferred: DEC-03), a package must be readable and editable without the platform.

## What needs to be done

1. Specify the package manifest and its validation rules.
2. Specify the four extension operations (add, extend, patch, translate) and their scoping rules.
3. Define semantic versioning for packages and the breaking-change list.
4. Build the validator: schema, referential integrity, effect catalogue conformance, coherence rules.
5. Define conflict resolution and package load order.
6. Define visibility levels, sharing flows and the private-package deployment policy with [14](14-accounts-sharing-and-campaigns.md).
7. Build authoring: file-based first (Phase 0 Foundations), in-app editor with live preview later (Phase 4 Homebrew authoring & sharing).
8. Write and pass the acceptance test set: SRD as the base package, PHB Monk, Way of Shadow, a Tabaxi-like feline species, a custom "bruised lung" condition.
9. Define the upgrade flow for characters when a package they pin is updated or deprecated.
10. Write the authoring guide for transcribing an official book into a private package.

## How

### Manifest

Every package starts with a manifest. Fields (Decided as the minimum set):

| Field | Purpose |
|---|---|
| `id` | Stable, globally unique, namespaced identifier (author or organisation prefix). Never changes. |
| `name`, `description` | Localised display strings. |
| `version` | Semantic version, see below. |
| `dependencies` | List of `{id, version range}`. The base package is a mandatory transitive dependency. |
| `visibility` | `private`, `campaign` or `public`. |
| `redistributable` | Boolean. `false` for official books; a `false` package cannot be set to `public`. |
| `sources` | The sources ([05](05-content-model-and-sources.md)) this package cites: title, publisher, licence, attribution text. |
| `languages` | Languages in which the package supplies strings, with the default first. |
| `rules_edition` | The edition the package targets (Deferred: DEC-02); a package cannot depend on a package of another edition. |
| `authors`, `licence` | Attribution and licence for the package's own work. |
| `deprecated` | Optional: successor package id and message. |

### Extension operations

A package contains entities and operations on entities of its dependencies. Four operations:

1. **Add** a new entity (a species, a spell, a condition). Its id is namespaced by the package; it may reference entities from dependencies (a subclass references its class).
2. **Extend** an existing entity: add a subclass to a class, spells to a class spell list, sub-species to a species, features to an item, options to a choice. Extensions are additive and never remove.
3. **Patch** an existing entity: field-level override (replace a feature's text, correct an effect, change a table row). Patches are explicit, list the target field, and are the only way to remove or change. Used by errata packages and by a DM's house rules.
4. **Translate**: supply localised strings for entities of a dependency, with no mechanical content. A translation package is a package whose only operation is translate ([05](05-content-model-and-sources.md)).

Rules: a package may only add, extend, patch or translate entities of packages it declares as dependencies; the target must exist at the required version; an operation records its origin so provenance can show "AC formula from the base package, patched by house-rules package".

### Versioning

Semantic versioning, applied to the *effect on characters*:

- **Patch** (x.y.Z): text, typo, translation, flavour. Characters upgrade automatically.
- **Minor** (x.Y.z): new entities, new options, new extensions. Existing characters are unaffected; upgrade is offered.
- **Major** (X.y.z): anything that can change a derived value or remove a choice on an existing character: changed effect, removed option, renamed id, changed table. Upgrade requires the player's confirmation with a diff ([10](10-progression.md)).

A character stores `{package id, version}` for every package it used. The rules engine loads exactly those versions.

### Validation

Run on every save in the editor and on every publish. Four layers, each with error messages that name the entity and field:

1. **Schema**: fields, types, required values, id format.
2. **Referential integrity**: every reference (class of a subclass, spells in a list, dependency ids, translation targets) resolves within the declared dependencies at compatible versions.
3. **Effect catalogue conformance**: every effect is a known kind with valid parameters; formulas reference known derived values; conditions use the enumerated condition language of [04](04-domain-model.md). Unknown effect kinds are errors, not warnings.
4. **Coherence rules**: every resource has a recharge rule and a maximum; every action has an activation type; a spellcasting grant has an ability and a slot model; a choice has at least one option or a filter that yields options; a subclass declares the level at which its features appear; localised strings exist in the default language; a `redistributable: false` package is not `public`.

Warnings (non-blocking): missing translations, a feature with text but no effect (allowed, flagged), duplicate names across packages.

### Conflict resolution

- Load order is the dependency topological order; among siblings, the order the user or campaign lists them.
- Two packages adding entities with the same id is impossible (namespaced ids).
- Two packages patching the same field: the later in load order wins, and the platform shows a conflict warning on the sheet's provenance for that value. A campaign can pin the order.
- Extensions never conflict (they are additive); duplicates are merged with a warning.
- **No package declares incompatibility with another (DEC-20).** A campaign or character carries a *content selection*: packages, order and exclusions (a package, an entity type within it, a tag, or single ids). The engine prunes what the exclusions make unreachable (an entity referencing or requiring an excluded one becomes inactive, transitively) and returns a cascade report listing what each exclusion also disabled. A setting package may ship a *preset selection* instead of a conflicts list.

### Visibility and sharing

| Level | Who sees it | Typical use |
|---|---|---|
| `private` | The author, and campaigns the author explicitly attaches it to | Transcribed official books, drafts |
| `campaign` | Members of the campaigns it is attached to | Table homebrew, house rules |
| `public` | Everyone on the instance; listed and searchable | Community content |

Rules: `redistributable: false` caps visibility at `campaign`; publishing to `public` is subject to a moderation policy (Deferred: DEC-14); private official packages follow the deployment policy in [14](14-accounts-sharing-and-campaigns.md).

### Authoring

- **Phase 0 Foundations**: file-based. The base package and the first homebrew package are written as files; a command-line validator and a "render this test character" tool are the only tools. This proves the format before any editor exists.
- **Phase 4 Homebrew authoring & sharing**: in-app editor with forms for each entity type, an effect builder that only offers valid effect kinds and parameters, inline validation, and **live preview**: the author picks or creates a test character (for a subclass: a character of that class at levels 1, 3, 5, 11, 17) and sees the build view, the play-mode actions and the print output update as they edit.
- Both paths produce identical packages; the editor can export to files and import from them.

### Acceptance test of the format

The format is complete for Phase 0 when all of the following are expressed as packages with no engine code specific to them:

1. The whole SRD as the base package ([05](05-content-model-and-sources.md)).
2. The Player's Handbook Monk as a *private* package that extends the base Monk (additional subclasses) without duplicating it.
3. Way of Shadow: spells granted with an alternative cost in Ki, a cantrip at no cost, a later teleport action, features at levels 3, 6, 11, 17.
4. A Tabaxi-like feline species with a sub-species: claws as an unarmed attack action with its own damage, climbing speed, advantage on stealth-related checks, a jump formula, Darkvision.
5. A custom "bruised lung" condition: disadvantage on Constitution saving throws and on specific checks, with free text.
6. A translation package that supplies Italian strings for the base package.
7. An errata package that patches one effect of the base package and shows up in provenance.

The test is passed when the reference Monk renders correctly from packages 1, 2, 3, 4, 5 ([04](04-domain-model.md) worked example).

### Errata and upgrades

1. A package releases a new version.
2. Characters pinning an older version show a notice: version, change level, summary.
3. For patch versions the upgrade is automatic. For minor and major, the player opens the upgrade flow: the engine computes the sheet with the new version, shows a diff of derived values, actions, resources and unanswered choices, and the player accepts or stays.
4. Staying is always allowed; a campaign may require a minimum version, in which case the DM sees who is behind ([14](14-accounts-sharing-and-campaigns.md)).
5. Deprecation: a package can name a successor; characters are prompted to migrate; a deprecated package stays loadable so old characters never break.

## Why

- A single manifest with `redistributable` and `visibility` is what lets one mechanism serve public homebrew and private book transcriptions without a legal or technical fork ([05](05-content-model-and-sources.md), [18](18-risks.md)).
- Extend-and-patch instead of copy keeps entity ids stable, which keeps characters portable and errata cheap.
- Strict validation at publish time is cheaper than tolerant engines: every accepted package renders everywhere without per-package fixes.
- Version pinning on characters is the only way to honour "never compute by hand" (Principle 2) and "every number knows where it comes from" (Principle 3) across content updates.
- File-based authoring first forces the format to be self-sufficient and gives contributors a path that does not depend on the platform's UI.

## Deferred decisions

- DEC-03 Serialisation format — Phase 0 Foundations.
- DEC-02 Rules edition (value of `rules_edition`, whether two editions can coexist on one instance) — Phase 0 Foundations.
- DEC-14 Homebrew moderation policy for `public` packages — Phase 4 Homebrew authoring & sharing.
- DEC-08 Project licence (default licence offered to homebrew authors) — Phase 0 Foundations.
- DEC-11 Import from other platforms' homebrew formats — Phase 4 Homebrew authoring & sharing.

## Depends on / feeds into

Depends on [04](04-domain-model.md), [05](05-content-model-and-sources.md). Feeds into [07](07-character-creation.md), [10](10-progression.md), [14](14-accounts-sharing-and-campaigns.md), [15](15-logical-architecture.md), [16](16-roadmap.md), [18](18-risks.md).
