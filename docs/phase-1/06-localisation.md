# Phase 1 — 06 Localisation

## Purpose

This document fixes how the application speaks Italian and English (DEC-09): the interface catalogues, the glossary check, the newcomer wording of provenance, and the Italian translation package of the SRD base package, produced from the official Italian SRD 5.1 (CC-BY-4.0) with the same agent-assisted recipe that authored the SRD mechanics and the private Player's Handbook.

## Decisions

- **Interface strings live in catalogues, content strings in packages; the two never mix.** Catalogues are `packages/web/i18n/locales/en.json` and `it.json`, loaded by `@nuxtjs/i18n`; every key has both languages, a missing key fails a test. Content is localised by the engine's `language` option and the package fallback (requested language → package default → any).
- **The glossary is the source of terms.** Game terms in the interface ("Bonus action", "Hit Dice") are keys of a `terms` namespace whose values come from [../03-glossary.md](../03-glossary.md); a test extracts the glossary's table and fails when a catalogue term differs from it or when a catalogue string uses a game term outside the namespace.
- **The Italian translation of the SRD is a translation package**, `packages/content/srd51-it` (`@byloth/dnd-platform-content-srd51-it`, `kind: translation`, depends on `srd51` at the exact version), containing only `translations/it/<entity-id>.yaml`, generated from the skeleton of `tools/import/src/translation-skeleton.ts` extended to `package.yaml` and `ruleset.yaml` strings. It ships with the site as a second static bundle and is loaded automatically when the language is Italian.
- **Source text: the official Italian SRD 5.1 PDF** (Wizards of the Coast, CC-BY-4.0), OCR'd with the recipes of `content-private/README.md` into `content-private/sources/text/srd51-it.md` (the PDF is free to redistribute, but the working text stays out of the repository like every other extracted text); mechanics are never translated, only names and texts; the glossary's Italian terminology wins over the PDF's wording where they differ (recorded per term).
- **Agent-assisted drafting under the recipe of DEC-19**, after the owner's confirmation: packets of ~40 entities per agent, the skeleton as the fixed structure, the glossary as the vocabulary, `dnd validate --references` as the gate, a review log like `content-private/phb14/REVIEW.md`, and the derive-all probe in Italian as the automated review.
- **Locale conversions are display-only**: speeds and ranges stay in feet in content and in the computed sheet; the Italian interface shows metres beside feet (1,5 m per 5 ft) in the sheet and in print, never in exports.

## Design

### Catalogues

```
i18n/locales/en.json
  { "nav": { "characters": "Characters", … },
    "sheet": { "armorClass": "Armor Class", "explain": { "base": "Everyone starts from {value}.", "abilityAdd": "Your {ability} ({score}) gives {value}.", … } },
    "wizard": { "step3": { "purpose": "…", "consequence": "…", "recommendation": "…" } },
    "terms": { "bonusAction": "Bonus action", "hitDice": "Hit Dice", … },
    "errors": { "missingPackage": "This character uses content that is not installed here: {package}.", … } }
```

- Keys are namespaced by screen; the newcomer provenance wording of [03-sheet-composer.md](03-sheet-composer.md) lives under `sheet.explain`, keyed by contribution kind and label pattern, and the composer receives a `translate(key, params)` function so it stays framework-free.
- Pluralisation and gender through the library's rules, never by concatenation; every string carries a translator note in a sibling `en.notes.json`.
- The language preference sets the interface locale, the engine's `language`, and which translation packages are auto-selected.

### The translation package

- Skeleton: one file per entity with every localised path and an empty string; extended to `package.yaml` (`name`, sources' titles are not translated) and `ruleset.yaml` (skill names are ids, nothing to translate; the file is listed for completeness).
- Coverage target: every `name` of every entity (1106) and every `text` of classes, subclasses, species, backgrounds, feats, conditions, rules and spells; item descriptions and magic item texts included; a coverage script reports the empty strings and the milestone closes at 100 % of names and texts.
- Loading: the site ships `content/srd51-it.json`; the content store treats it as a package; a character does not pin it (translations are not part of the character's identity), the language preference does.
- Verification: `dnd derive --language it` of the three reference characters and their `sheet.txt` in Italian as goldens (`sheet.it.txt`); the glossary check on the translation (feature and spell names against the glossary's Italian column where it lists them).

### Interface acceptance

- Every screen in both languages with no untranslated key (test).
- Layout survives the longer Italian strings on a portrait phone (component tests at 360 px width with the Italian catalogue).
- Numbers and units follow the locale in display; the export is identical in both languages (test).

## Tasks

1. `@nuxtjs/i18n` setup, the two catalogues, the missing-key test, the glossary term test — M1.1 (setup), M1.3 (sheet strings), M1.4 (wizard copy).
2. The newcomer provenance wording catalogue in English and Italian, consumed by the composer — M1.3.
3. Extend `translation-skeleton` to manifest and ruleset strings and to emit a package directory with its manifest — M1.7.
4. OCR the Italian SRD PDF into the private text area; write the packet partition script (reuse `tools/import/src/phb-scope.ts`'s pattern) — M1.7.
5. **Confirmation point.** Present the packet count and the brief to the owner; launch the agents only after confirmation; review; coverage report at 100 % — M1.7.
6. `sheet.it.txt` goldens and the Italian derive-all probe — M1.7.
7. Metres beside feet in the Italian display of the sheet and print — M1.7.

## Open points

- Whether the Italian translation package should be pinned by characters after all, so that an export carries the language of the names as printed; leaning no, the export carries ids and the receiving side localises.
- Spell names: the Italian SRD translates most, the community uses English names at many tables; the sheet shows the Italian name with the English one in small print when the help level is *newcomer*. Confirm with the newcomer test.
- The glossary lists terms, not every feature name; where the PDF and the glossary disagree on a feature name, the PDF wins and the glossary gains the term.
