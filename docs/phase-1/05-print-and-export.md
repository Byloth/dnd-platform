# Phase 1 — 05 Print and export

## Purpose

This document fixes the Phase 1 slice of [../12-print-and-export.md](../12-print-and-export.md) under DEC-13: the print mode of the sheet as a paginated stylesheet printed by the browser, with Part 2 (the character sheet), Part 3 (feature and spell cards) and the credits page; and the portable character document with its export and import.

## Decisions

- **Print is a route of the application** (`/characters/<id>/print`) that renders the same section tree as the build-mode sheet through print-specific components and a print stylesheet; the user prints with the browser (Ctrl+P, "save as PDF"). No PDF library in Phase 1.
- **Two page sizes, chosen once**: A4 and Letter through `@page { size }` selected by the preference; margins of 12 mm; black text on white, colour only as an accent that survives greyscale.
- **Parts printed in Phase 1**: Part 2 on one page (two when the character has spells), Part 3 as cards (features by origin, then spells by level, cantrips first), the credits page last. Parts 1, 4 and 5 and the compact variant are not printed (Phase 2, 3, 5).
- **Fillable means pen-fillable**: current HP, temporary HP, Hit Dice remaining, death saves, inspiration, resource pips, spell slot pips, prepared-spell boxes, condition boxes, equipment and notes lines are printed as empty boxes, pips and lines, prefilled from state only for values the character document already carries (Phase 1 has no play state). Digital form fields come in Phase 3.
- **Pages that would be empty are not printed**; a section absent from the tree produces nothing.
- **The export document is the character document plus its provenance of packages**, in JSON, versioned, human-readable; importing it on a store with the same package versions yields a byte-identical computed sheet, tested in CI.

## Design

### Part 2 — the character sheet

The order of [../12-print-and-export.md](../12-print-and-export.md): header (name, species, class levels, background, alignment, level); ability scores with modifier and save (proficiency mark); proficiency bonus, inspiration box, passive Perception; the five key values (AC, initiative, speeds, HP max with a box for current and temporary, Hit Dice with boxes, death save pips); skills with proficiency mark and bonus; attacks (name, to-hit, damage and type, notes); features by name with the card reference; resources as pips with the recharge in words; spellcasting summary (ability, DC, attack bonus, slots as pips, prepared boxes where the model is *prepared*); personality; proficiencies and languages; equipment lines; conditions box; notes lines.

Everything comes from the section tree; the print components are one per block kind, sized for the page. Provenance is not printed in Part 2.

### Part 3 — cards

One card per feature and per spell, grouped: species traits, class features by level, subclass features, background feature, feats, equipped item properties, then spells by level (cantrips first; by cost when the spell is paid with a resource). Card anatomy: activation icon, name, cost in the resource's unit, activation, range and duration, concentration flag, full text (Markdown-ish rendering as in [03-sheet-composer.md](03-sheet-composer.md)), source in small print. Cards flow in two columns, never split across pages when shorter than a column.

### Credits page

From the manifests' `sources` of every package the character depends on: title, publisher or author, licence and attribution text, one block per package; private packages included ("loaded locally by the owner of the book"), because attribution is not distribution.

### Acceptance of print

- The reference Monk's printed playbook checklist: every item catalogued in the analysis of the original playbook that belongs to Parts 2, 3 and credits appears exactly once (the checklist is written at M1.6 from the original's six pages and kept as a fixture); nothing the character does not have appears.
- Black-and-white test: the print stylesheet rendered with `forced-colors`/greyscale in the browser and inspected; contrast of every text at 4.5:1 on white.
- A4 and Letter: both rendered for the three reference characters, page count recorded in the fixture.
- The print route is tagged for reading order (headings per section, labelled boxes).

### The export document

```json
{
  "format": "dnd-platform-export/1",
  "exportedAt": "2026-…",
  "application": { "version": "…" },
  "character": { …the Character document, unchanged… },
  "packages": [{ "id": "srd51", "version": "0.1.0", "redistributable": true }, { "id": "phb14", "version": "0.1.0", "redistributable": false }],
  "embedded": [ …optional PackageSource bundles of redistributable packages the user chose to embed… ]
}
```

- Export is available from the sheet and from the characters list; it downloads `<character-name>.dnd.json` or, with a working directory connected, offers to save it under `exports/`.
- Import selects a file, validates it against an export schema (added to the schema package, additive), matches every package by id and version against the store, offers to load embedded bundles that are missing, and for a missing non-embedded package shows the missing-package state instead of substituting; a version present under another number is offered with the provenance differences shown after derivation, never applied silently.
- Round trip test in CI: export → import → derive equals the original derivation byte for byte for every public fixture character (`stableStringify`), and the reference Monk privately.

## Tasks

1. Print route with the page-size preference, the print stylesheet and the Part 2 components — M1.6.
2. Part 3 cards and the credits page — M1.6.
3. The printed playbook checklist of the reference Monk as a fixture, the black-and-white and page-size acceptance — M1.6.
4. Export document schema and download; import with matching and mismatch handling — M1.5.
5. Round trip test over every fixture character — M1.5.

## Open points

- Browser differences in `@page` support (margins, page size on Firefox and Safari): the layout must not depend on features Chromium alone supports; test on the three engines at M1.6.
- Whether the print route should also be reachable without the application chrome for people who print from a phone; likely yes, a full-screen variant with a single "print" button.
- Embedding homebrew bundles in the export doubles as a way to share homebrew between devices; the size of an export with bundles is unbounded, so the option stays off by default.
