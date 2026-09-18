# Phase 0 — 05 SRD import pipeline

## Purpose

> Update 2026-09-18: the `fetch` stage and a read-only inventory pass were pulled forward into M0.2 (part A) so the effect catalogue is closed against the complete SRD before the schemas are written. See [08-workplan.md](08-workplan.md) and [inventory/README.md](inventory/README.md).

The base package `srd51` must contain the whole System Reference Document 5.1 in the format of [02-content-format.md](02-content-format.md). Hundreds of entities exist in open, machine-readable form already; none of them carries the mechanical effects the engine needs. This document fixes where content is taken from, under which licences, through which scripted stages, and what remains to be authored. It also frames DEC-19, the open decision on how the authored part is produced.

## Decisions

- **Import prose, lists, tables and statistics; author mechanics.** No open dataset expresses class, species, feat or background features as effects. That layer is written in our format, on top of the imported entities, and kept in a separate overlay so re-imports never destroy it.
- **Open5e v2 is the primary source**, because its data is licensed per document under CC-BY-4.0 for both `srd-2014` and `srd-2024`, and it already normalises per-level class tables and spell metadata.
- **5e-database is a cross-check and enrichment source**, not a primary one: its content is declared under OGL 1.0a, so text is never copied from it; only structure (option sets, counters, damage per slot) is used to enrich entities whose text comes from CC-BY sources.
- **The official CC-BY PDFs are canonical.** Every disagreement between datasets is settled against the WotC SRD 5.1 text (or the `your5e` "untouched" Markdown of it).
- **Foundry VTT data is a reference model only.** It shows how mechanics can be structured; nothing from its schema or its YAML is imported.
- **Every stage is a script with pinned inputs.** Re-running the pipeline from the lock file reproduces the same output byte for byte.
- **Nothing enters `srd51` unvalidated.** `validate` from the engine and the golden fixtures of [04-testing-strategy.md](04-testing-strategy.md) are the gate, whatever produced the content.

## Design

### Sources

| Source | URL | Licence | SRD | Format | Structured | Missing | Role |
|---|---|---|---|---|---|---|---|
| Open5e v2 | github.com/open5e/open5e-api (`data/v2/wizards-of-the-coast/{srd-2014,srd-2024}`) | Code: modified MIT (excludes content); data: CC-BY-4.0 per document (`srd-2014` also OGL 1.0a) | 5.1 and 5.2 complete | Django fixture JSON | Class features with per-level `ClassFeatureItem` rows (slots, dice, counters); spells with numeric range, shape, save ability, damage per slot level; weapons and armour; species and traits; backgrounds; feats; conditions; `Rule`/`RuleSet` entries | Feature mechanics (prose only); magic item effects; choice metadata | **Primary**: text, level tables, spell metadata, equipment, rules |
| 5e-database | github.com/5e-bits/5e-database (`src/2014/en`, `src/2024/en`) | Code: MIT; data: stated OGL 1.0a | 5.1 complete; 5.2 partial | JSON per collection | `Levels.json` (proficiency, slots, `class_specific` counters); spell `damage_at_slot_level`, `dc`, `area_of_effect`; feature `feature_specific` option sets (fighting styles, expertise picks); equipment | Text usable only under OGL; no effect model | **Cross-check and enrichment**: structure only, never text |
| Official WotC SRD | dndbeyond.com/srd (SRD 5.1 CC-BY PDF; SRD 5.2.1 CC-BY PDF; EN, IT and other languages) | CC-BY-4.0 | 5.1, 5.2.1 | PDF | Tables as layout | Everything else | **Canonical text** for verification; source of the Italian translation |
| your5e/5e-srd-markdown | github.com/your5e/5e-srd-markdown | CC-BY-4.0 | 5.1 and 5.2.1 | Markdown ("untouched", cleaned, sectioned) | Headings and tables | No structure beyond Markdown | Diffable canonical text; feeds `review` |
| Foundry VTT dnd5e | github.com/foundryvtt/dnd5e (`packs/_source`) | Code: MIT; content: CC-BY-4.0 | 5.1 and 5.2 | YAML | Class `advancement` (HitPoints, ItemGrant, ScaleValue, Trait, Subclass, ItemChoice), spell `activities` (attack/save, damage with scaling), Active Effects | Foundry-specific schema and UUIDs | **Reference model** for the effect catalogue; not imported |

Not used: community Italian translations (licence unclear, publisher terminology), dead forks of 5e-database, code-based rule engines.

### Stages

All scripts live in `tools/import/` (a workspace of the monorepo, TypeScript, run with the CLI's runtime). Each stage reads the previous stage's output from `tools/import/work/` and is idempotent.

1. **`fetch`** — Downloads the upstream repositories at the commits pinned in `tools/import/sources.lock.yaml` into `tools/import/cache/` (git-ignored). The lock file records source id, repository, commit hash, licence file hash and fetch date. Bumping a pin is a reviewed change.
2. **`normalise`** — One adapter per source turns upstream files into the *intermediate model*: a flat list of records `{ type, sourceId, upstreamId, fields }` with fields named after our entity schemas where the mapping is obvious, and `raw` for everything else. Adapters do not interpret rules.
3. **`merge`** — Joins records across sources by normalised name and type. Open5e values win; 5e-database supplies fields Open5e lacks (`damage_at_slot_level`, option sets, `class_specific`). Every disagreement on a shared field is written to `work/conflicts.yaml` and settled by hand against the canonical PDF; the settlement is stored in `tools/import/overrides/` and applied on every run.
4. **`map`** — Intermediate model → our YAML entities, one file per entity under a staging copy of `packages/content/srd51/`: `classes/` with `levels` and `tables`, `subclasses/<class>/`, `species/` with `subspecies`, `backgrounds/`, `feats/`, `spells/` with `level`, `school`, `castingTime`, `range`, `area`, `components`, `duration`, `ritual`, `rolls` and `scaling` where the metadata allows, `spell-lists/`, `items/`, `conditions/`, `rules/` with `category` and `summary`, `tables/` (proficiency bonus, slot progressions, multiclass). Prose goes to `text.en` as Markdown. Ids follow `srd51.<type>.<name>` with names slugified from the canonical title. Everything `map` cannot express is left as prose plus a `todo` marker, listed in `work/todo.yaml`.
5. **`author`** — The mechanical layer: `effects`, `choices`, `declare-resource`, `add-action`, `grant-spellcasting`, `grant-spells`, `open-choice`, `define-table`, `when` conditions. Written by hand or agent-assisted (DEC-19, below) into `tools/import/overlay/<entity-id>.yaml`, one overlay per entity, containing only the authored fields. `map` merges the overlay last, so re-running the earlier stages never touches authored work. The overlay directory is committed; the cache is not.
6. **`validate`** — Runs the engine's `validate` on the staged package and refuses to promote it to `packages/content/srd51/` on any error. Warnings are listed and must be acknowledged in `work/accepted-warnings.yaml`.
7. **`review`** — Produces a human-readable diff (`work/review.md`) of every entity that changed since the last promoted version: field by field, with the canonical PDF page reference from the lock file's page index where known. Promotion requires the diff to have been read; the CLI asks for the reviewer's initials, stored in `work/promotions.log`.
8. **`attribute`** — Writes the `sources` block of `package.yaml` and the repository `NOTICE` from the licence data of the lock file; verifies that every entity's `source` is `srd51` and that no text originates from an OGL-only source.

### Importable versus authored

| Entity type | Imported by `map` | Authored in `author` |
|---|---|---|
| Class | name, text, hit die, primary abilities, saving throws, proficiency lists, starting equipment text, `levels` (feature names per level), `tables` (dice and counters from per-level rows), `casterWeight`, multiclass prerequisites | `effects` of every feature, `choices` (skills, subclass, ASI), `declare-resource`, `add-action`, `grant-spellcasting` |
| Subclass | name, text, class reference, feature names per level | `effects`, `grant-spells`, resources |
| Species / subspecies | name, text, size, speed, languages, trait names and text | `effects` of traits |
| Background | name, text, proficiencies, languages, equipment text, personality suggestions | feature `effects`, `open-choice` |
| Feat | name, text, prerequisite text | `prerequisites`, `effects` |
| Spell | everything in the schema except effects; `rolls` and `scaling` for damage and save spells from metadata | `rolls` for non-damage effects, `tags` beyond the imported school and level |
| Spell list | class membership | nothing |
| Item | type, cost, weight, weapon damage and properties, armour AC and limits | magic item `features` and `effects` (most are text-only and need none) |
| Condition | name, text | `effects` |
| Rule | name, text, category | `summary` |
| Table | proficiency bonus, slot progressions, multiclass slots | nothing |
| Ruleset | skeleton generated from the tables above | rest formulas, base action references |

### DEC-19: how the authored layer is produced

Volume to author for SRD 5.1: 12 classes with roughly 15–25 features each, 12 subclasses, 9 species plus 4 subraces, 1 background, 1 feat, about 320 spells of which most need no engine effects beyond imported `rolls`, about 360 magic items mostly text-only, 15 conditions, the ruleset.

- **Option A — by hand.** Highest confidence per entity, slowest: every feature is read, modelled and tested by a person. Best for the entities that shape the format (spellcasting, resources, multiclass) because writing them reveals catalogue gaps.
- **Option B — agent swarm.** A set of agents reads the canonical SRD text entity by entity and emits overlay YAML under the strict schema. Every output is validated, every entity is reviewed by a person through `review`, nothing is committed directly. Fast for the long tail; risky for anything subtle, and the catalogue must already be complete. Launched only after the project owner's explicit confirmation, with the prompt, the schema version and the entity list recorded in `work/authoring-runs/`.
- **Option C — hybrid (recommended).** A person authors, in this order: the ruleset, one full class with its subclass (Monk, because it exercises resources, tables, actions and alternative spell costs), one full caster (Wizard: spellbook, slots, cantrips), one half caster (Paladin), one species with subspecies, the background, the feat, the conditions. That set fixes the catalogue (M0.4). Agents then draft the remaining classes, subclasses, species traits and non-damage spell effects against the finished catalogue; a person reviews every diff and owns the golden fixtures. Guardrails: schema validation on every file; one golden fixture per class at levels 1, 5, 11 and 20 that must pass before promotion; `review` diff read and signed; overlay files never edited by agents after human review (a reviewed file is marked `reviewed: true` and the pipeline rejects agent output for it); no direct commits to `packages/content/`.

Why C: A alone is weeks of transcription before a single complete class exists; B alone produces plausible but unverified mechanics against a catalogue that is not yet proven. C uses people where judgement shapes the format and agents where the format is settled and the check is mechanical.

### Licensing hygiene

- Attribution text for the SRD 5.1 CC-BY-4.0 edition appears in `package.yaml` (`sources[].attribution`), in the repository `NOTICE`, and is surfaced by the sheet and the print output ([../12-print-and-export.md](../12-print-and-export.md)).
- Only CC-BY editions of the SRD are used as text sources. The OGL-only text of 5e-database is not copied; its structure is.
- No upstream code is copied into the repository; adapters are written from scratch against the upstream file layout.
- The lock file keeps the licence file hash of every source so a licence change upstream is noticed at the next `fetch`.

### Italian

The Italian translation of the base package is a Phase 1 deliverable ([../05-content-model-and-sources.md](../05-content-model-and-sources.md)), sourced from the official Italian SRD 5.1 PDF (CC-BY-4.0). Phase 0 prepares the tooling: a `translation-skeleton` command that generates `translations/it/<entity-id>.yaml` files with every localisable field listed and empty, so translators fill values rather than invent structure. No machine-readable Italian SRD exists; community PDFs are not used.

## Tasks

1. Create `tools/import/` as a workspace with `sources.lock.yaml` pinning Open5e, 5e-database, your5e and the WotC PDF checksums, plus the `fetch` script and the git-ignored cache — M0.1.
2. Write the `normalise` adapters for Open5e and 5e-database, with one unit test per record type using a frozen upstream sample — M0.2.
3. Write `merge` with conflict reporting and the `overrides/` mechanism — M0.2.
4. Write `map` for tables, conditions, rules, items and spells first (no authored layer needed), and promote them into `packages/content/srd51/` after `validate` — M0.3.
5. Write `map` for classes, subclasses, species, backgrounds and feats, producing prose-only entities with `todo` markers — M0.4.
6. Hand-author the overlay for the ruleset, Monk and its SRD subclass, Wizard, Paladin, one species with subspecies, the background, the feat and the conditions; extend the effect catalogue wherever this fails — M0.4.
7. Obtain the owner's confirmation on DEC-19 and, if agent drafting is approved, run it per class with the recorded prompt and schema version — M0.5.
8. Review and promote every remaining entity; make the per-class golden fixtures pass — M0.5.
9. Write `attribute` and check `NOTICE` against the lock file in CI — M0.5.
10. Write `translation-skeleton` and generate the empty Italian files as a smoke test (not committed) — M0.8.

## Open points

- Whether `merge` should key records by upstream id mapping tables (maintained by hand) rather than by normalised names, which break on renamed entities. Start with names plus an explicit alias file; move to id tables if aliases grow.
- Which PDF page index to use for `review` references: the your5e Markdown headings are stable and diffable; the PDF page numbers are what a reviewer with the book uses. Store both if cheap.
- How much of the spell `rolls` block Open5e metadata can fill reliably (save ability and damage per slot are present; area shapes for some spells are inconsistent). Measure on the first run and decide whether spells go through `author` in bulk.
- Whether magic items enter `srd51` in Phase 0 at all, given that the sheet needs only equipment stats until items with effects are authored; they are cheap to import as text, so include them, marked text-only.
