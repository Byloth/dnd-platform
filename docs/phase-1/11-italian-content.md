# Phase 1 — 11 Italian content (owner's review, 2026-09-25)

## Purpose

The Italian interface is complete, but every piece of content it shows is in English: species, classes, spells, items, the wizard's languages, alignments, archetypes and the background's suggestions (point 5 of the review). This document starts the translation now, ahead of M1.7, and re-plans it for the source actually available. It amends [06-localisation.md](06-localisation.md), whose design (a translation package, the glossary, agent drafting under DEC-19, full coverage) stands except where noted.

The milestone is M1.4r in [08-workplan.md](08-workplan.md) for parts A and B. Parts C and D stay in M1.7, behind its confirmation point.

## State found (2026-09-25)

- **No Italian in the content.** `packages/content/srd51` holds 5 802 English strings and no `it` key, and its manifest declares `languages: [en]`. The Italian interface falls back to English for every entity (`localize` in `packages/composer/src/index.ts`: the requested language, then English, then any).
- **The skeleton exists but is empty and out of date.** `tools/import/work/translations/it/` (git-ignored, generated 2026-09-19 by `tools/import/src/translation-skeleton.ts`) has 1 106 files and 5 527 paths, all blank. It predates srd51 0.2.0–0.6.0: it lacks the 12 archetypes, 7 items and the acolyte's ideals.
- **Two gaps in the loader keep content English even with a translation:**
  - **Inline features.** Class, subclass, species, background and feat features are indexed as entities of their own before translations are applied (`loadPackages` in `packages/loader/src/load/index.ts`: entities, patches, inline indexing, then translations). The engine reads the indexed copy (`resolveFeature` in `packages/engine/src/derive/features.ts`). A translation of `levels.1.features.0.name` changes the class, not the feature the sheet shows.
  - **Ruleset and manifest.** The ruleset (ability, skill and language names, alignments) and the manifest cannot be translated at all. `loadPackages` returns the base's ruleset untouched, and the skeleton skips both files.
- **No Italian source text.** The official Italian SRD 5.1 PDF that 06-localisation relied on is not available to the owner.

## Decisions

Taken by the owner on 2026-09-25:

- **Translate from scratch, from the English text**, with agents under the DEC-19 recipe. There is no official Italian text to align with.
- **Terms come from the glossary** ([../03-glossary.md](../03-glossary.md)) and from online references for the correct Italian D&D terminology. Every term taken from a reference is recorded with its source, and the glossary grows with the terms the translation settles.
- **Start now** with what the wizard and the sheet show most (part B). The bulk (spells, items, rules) waits for the confirmation point of the workplan, with the packet count and the brief shown first.

Kept from 06-localisation:

- the translation package `packages/content/srd51-it` (`kind: translation`, only `translations/it/<entity-id>.yaml`), loaded with the Italian interface and never pinned by characters;
- names and texts only, never mechanics;
- `dnd validate --references` as the gate, a review log, and full coverage to close M1.7.

Changed:

- There is no OCR step and no alignment with an official text. The agents' brief and the review carry that weight instead.
- Italian texts write distances in metres, as the Italian manuals do (5 ft = 1,5 m), consistent with the units setting of [09-interface-revisions.md](09-interface-revisions.md). Numbers in effects stay in feet: they are mechanics.

## Plan

### A. Make translation reach everything (engine and loader)

1. **Translate inline features.** Apply translations before inline features are indexed, or re-index after applying them. Either way, a translation keyed by the owner's path reaches the feature the sheet shows. Test: a translated class feature name appears on the Italian sheet.
2. **Translate the ruleset and the manifest.** A translation file of the base may target `ruleset.<path>` (abilities, skills, `languages[i].name`, `alignments[i].name` and `text`) and `manifest.name`. `loadPackages` applies them to a copy of the ruleset. Tests: an Italian language name and an Italian alignment appear in the wizard.
3. **Regenerate the skeleton** against srd51 0.6.0, extended to the ruleset and the manifest, into `packages/content/srd51-it` with its `package.yaml` (`dependencies: srd51`). Only filled strings are written, so an untranslated path simply falls back to English.
4. **Load it with the Italian interface.**
   - The site publishes `content/srd51-it@<version>.json` next to srd51 (`dnd release`, `web:prepare-content`).
   - The content store adds it to the sources whenever the interface language is Italian.
   - Characters never list it.
   - The size budget gets its own line; the English visitor never downloads it.
5. **The version rule.** 06-localisation made the translation depend on "srd51 at the exact version", which breaks with every srd51 release under DEC-21. Replace it: the translation depends on srd51 by id, and a coverage check in CI reports paths that no longer exist or are new. A stale translation shows English for the new strings, never an error.

### B. The first packet: what the wizard shows

About 120 entities, drafted by one agent (or by hand) and reviewed by the owner, in this order:

| Group | Entities | Notes |
|---|---|---|
| Ruleset | abilities, skills, 16 languages, 9 alignments | the glossary has most names |
| Species | 9 species and their subspecies, with traits and features | |
| Classes | 12 classes, level 1 features, `primaryAbilities` wording | feature names at level 1 first |
| Subclasses | the 12 SRD subclasses: names and summaries | full texts in part C |
| Background | acolyte, with its feature and personality suggestions | the 26 suggestions |
| Archetypes | 12 archetypes: `name`, `pitch`, `why` | M1.7's task, done here |
| Conditions | 15 conditions | used by play mode and the sheet |

The brief for this packet:

- the glossary as a fixed vocabulary;
- one sentence of style (the register of the Italian manuals: second person, present tense);
- metres for distances;
- no invented terms: an unknown term is flagged, not coined;
- every online reference recorded in `tools/import/work/translations/it/SOURCES.md`, which is committed once it holds no copyrighted text, only titles and links.

The owner reviews the packet in the wizard and on the sheet before part C starts.

### C. The bulk (M1.7, after confirmation)

Spells (319), items (486), rules (227), tables (16), the remaining features and subclass texts. They are cut into packets of about 40 entities (a partition script like `tools/import/src/phb-scope.ts`), so roughly 25 packets. **The confirmation point of the workplan applies**: the packet count, the brief and the reviewing plan are shown to the owner, and agents start only after the owner's yes.

### D. Coverage and goldens (M1.7)

- A coverage script counts blank or missing paths; M1.7 closes at 100 %.
- `dnd derive --language it` goldens (`sheet.it.txt`) for the three reference characters.
- A glossary check on the translation: every glossary term used in a text appears in its Italian form.
- An Italian derive-all probe over the fixtures, with no English fallback left in names.

## As built (2026-09-25)

The owner asked the same day to translate everything at once, srd51 and phb14, and changed two premises of this plan:
- **Sources found.** The official Italian SRD 5.1 is published by Wizards of the Coast under CC BY 4.0 (`https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1_IT.pdf`). The owner provided the Italian Manuale del Giocatore, OCR'd with Tesseract `ita` (`content-private/sources`). So the texts follow the official Italian wording, verbatim for the SRD and OCR-corrected for the PHB. Memory of the book is used only where something does not add up, and each such case is noted. Literal translation with the terms is used only for strings neither book has (this project's reminders, archetypes, notes).
- **One package per language and per book, never chosen** (owner):
  - `packages/content/srd51-it` is public, CC BY 4.0, released as 0.1.0 and published by the site.
  - `content-private/phb14-it` is private and loaded like phb14.
  - The interface's language brings them. `useContentStore().sources` adds the translations of that language whose packages are all present, and the loader keeps a translation of the selected packages. They are never offered at step 0. The packages page shows a translation inside the card of the package it translates, and the credits page lists the Italian attribution when the interface speaks Italian.
  - The interface language itself defaults to the browser's (`navigator.languages`) until the player chooses.

The work, part A as planned:
- The loader applies translations before indexing inline features, translates a patch before applying it, and translates the ruleset.
- `translation-skeleton.ts` refreshes the skeleton of any package, and `translation-check.ts` is the gate.
- The CLI adds the translations of `--language`.

Parts B–D done together by a workflow:
- One agent built the term list (`content-private/translation-work/TERMS.yaml`, private since it quotes the PHB): about 2 260 lines, 71 names unresolved and translated literally, 10 conflicts with docs/03-glossary.md for the owner.
- 41 packets (29 srd, 12 phb) were each translated by one Opus agent and reviewed by another. The notes are in `tools/import/work/translations/it/notes/` (srd) and `content-private/translation-work/notes/` (phb).
- Result:
  - srd51-it: 1 126 files and 5 656 strings;
  - phb14-it: 138 files and 2 304 strings;
  - `dnd validate` is clean;
  - the checker reports only choices of the official wording ("due dadi a venti facce" for "two d20s") and a typo of the English source.
- Still English on the Italian sheet: some labels the engine and composer write themselves ("Dexterity modifier", "Level 1 (Cleric)"), and the "ft" of the units until the setting of 09-interface-revisions.

## Tasks

A and B, in M1.4r. Each is a commit.

1. Loader: translations reach inline features; tests.
2. Loader and engine: ruleset and manifest translatable; tests.
3. Skeleton regenerated into `packages/content/srd51-it`, with the new version rule and the coverage check.
4. Site bundle, loading with the Italian interface, budget line; tests that the Italian wizard shows Italian names from the package.
5. Part B's packet drafted, reviewed by the owner, released as srd51-it 0.1.0.
6. Docs: 06-localisation amended (source, units, version rule), 05-content-model if the translation format grows (ruleset paths); the workplan's M1.4r and M1.7.

## Open points

- A text picked in the wizard (a personality suggestion) is copied into the character in the language it was picked in. Switching language later does not translate it. Leaning: keep it, since the player's text is theirs; say so in the help.
- Spell names in Italian with the English name in small print for a newcomer (06's open point) is still open, for part C.
- Which online references are reliable enough for terms is decided during part B and recorded in `SOURCES.md`. Where two sources disagree, the glossary decides, and the owner decides the glossary.
