# Phase 1 — 05 Print and export

## Purpose

This document fixes the Phase 1 slice of [../12-print-and-export.md](../12-print-and-export.md) under DEC-13 (amended 2026-09-29) and DEC-26: the character's sheet as a PDF drawn by the page itself from a sheet template, with Part 2 (the character sheet), Part 3 (feature and spell cards) and the credits page; and the portable character document with its export and import.

## Decisions

- **The page draws the PDF** (DEC-13 as amended): a sheet template of `packages/sheets` turns the section tree the sheet already composed, and the character's state, into a PDF with pdf-lib, in the browser; the file is downloaded, or offered to the share sheet on a phone. No print route, no print stylesheet, no print dialog. The PDF code and fonts load with the first PDF asked for.
- **Two page sizes, chosen once**: A4 and Letter from the page-size preference, one layout for both (regions are functions of the page's size); margins of 24 pt; black text on white, colour only as an accent that survives greyscale.
- **Parts printed in Phase 1**: Part 2 on one page (two when the character has spells), Part 3 as cards (features by origin, then spells by level, cantrips first), the credits page last. Parts 1, 4 and 5 and the compact variant are not printed (Phase 2, 3, 5).
- **Fillable twice over**: every value is a PDF form field, filled from the character where it has a value and left empty otherwise, still editable in a PDF viewer; boxes, pips and ruled lines are drawn under them for a pen. The same template without a character is the blank sheet.
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

### As built (M1.5a, 2026-09-28)

- **The schema** is `export.schema.json` (additive v0). The application's version is `git describe --tags --always` at build time (`runtimeConfig.public.appVersion`).
- **`composables/character-files.ts`**:
  - `exportDocument(character, { embed })`: `redistributable` is true for a published package or a stored non-private one, and false for anything unknown. `embed` adds the stored, redistributable, unpublished packages the character uses, never a private one;
  - `download`: `<name>.dnd.json`, the name kept readable;
  - `read`, with typed refusals: unreadable, not a character, made by a newer version, invalid with its problems;
  - `plan`: each package is on the site, already here, in the file or missing, with both versions; the plan also says whether the id is taken;
  - `importCharacter`: the embedded bundles go through `usePackageLoader().load` first, then the character; on a taken id, "keep both" gives a new id and " (2)".
- **Pages**:
  - "Export" on every sheet but the wizard's review, and an icon button beside each stored character on the characters page, both opening `components/characters/ExportDialog.vue` (the homebrew checkbox only when there is something to embed, off by default);
  - the delete confirmation offers "Download a copy first", with the homebrew inside;
  - the characters page imports through `components/ui/FilePicker.vue`, extracted from the packages page, by choosing or dropping a file; `ImportDialog.vue` lists the packages and asks "Keep both" or "Replace it" on a taken id.
  - The file code and the dialogs load on first use; the characters page's first load is unchanged (208 KB of 300).
- **Found on the way**, in `ConfirmDialog`: its title had a fixed id, which two dialogs on one page would share, and a dialog mounted already open never opened. Both are fixed.
- **The round trip**: every public fixture character (the SRD, its excerpt, the homebrew) is exported with its homebrew, read, imported and derived. Each result equals the original byte for byte (`tests/character-files.test.ts`). The reference Monk's private round trip is still to add, with the private tests.
- **Versions**: the import lists a version difference; saying what it changes in numbers is M1.5b.

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

### As built (M1.6a, 2026-09-29): the classic sheet, page 1

- **`packages/sheets`** (`@byloth/dnd-platform-sheets`, pure, lint-enforced: pdf-lib, its font kit, the composer and the engine's types):
  - `sheetValues({ language, tree?, character? })`: the rows (abilities, skills, attacks) and the named values of the fields, read from the section tree and from `character.state` (current and temporary hit points, hit dice spent, death saves, inspiration, coins). Without a character: the blank sheet's rows (the SRD's eighteen skills, in the language's order). Golden as `sheet-values.json` beside `section-tree.json` in the fixtures that keep one, checked and refreshed by `dnd fixtures`.
  - `renderSheet(input, { fonts, hand, pageSize, link? })` → the PDF bytes and every field's box. The caller brings the font files (WOFF: the font kit fails to subset some WOFF2).
  - `src/pen.ts` draws from the top-left corner in points: paths, text with tracking, fields that shrink their value until it fits (a header field may wrap onto two lines), check boxes drawn as rings or diamonds; `src/art.ts` the emblem (a d20 in a ring, drawn in code), frames with their title set in the border, dividers; `src/classic/page-one.ts` the page.
- **Layout of page 1**: emblem, name plate and the six details (class and level, background, player, species, alignment, experience); the abilities in a strip with their saves and skills beside them, inspiration, proficiency bonus, passive Perception, other proficiencies and languages; the combat plate (armour class shield, initiative, speed with the other speeds under it, hit points with the temporary ones beside them, hit dice, death saves), attacks and spellcasting (four rows, the rest and each caster's DC and attack under them), equipment with the five coins; personality traits, ideals, bonds, flaws, features and traits by origin; the foot with the compatibility line and the SRD's attribution. Player name and experience are left to the pen: the character document has neither.
- **Fonts**: Cinzel 700 for titles, Atkinson Hyperlegible 400 and 700 for labels, and the hand for values: Patrick Hand by default (Kalam and Caveat were compared; a print hand is Atkinson). The hand is subset with every Latin-1 letter so that a field edited later finds its letters; no ligatures (a viewer that redraws a field would not find them). pdf-lib embeds a whole WOFF unconverted, which a PDF cannot use, so every font is a subset.
- **In the site**: "PDF" beside "Export" on a sheet (`components/sheet/SheetView.vue`, `pages/characters/[id]/index.vue`); `composables/sheet-pdf.ts` loads with the click; `composables/save-file.ts` downloads, or on a touch device that can share files opens the share sheet. The service worker precaches the four WOFF files so that the PDF can be made offline. Event `character-pdf` with the page size.
- **Measured**: about 0.65 s to draw in Node, about 1 s from the click to the file in Chromium (library included); the PDF is about 170 KB; the library's chunk is about 510 KB compressed, outside the first load (209 KB of 300).
- **Preview loop**: `node packages/sheets/scripts/preview.ts <dir> [hands…]` draws the fixtures and the blank sheet and turns them into PNG through pdf.js in a headless Chromium (`CHROME_PATH`, or Playwright's).

### As built (M1.6b, 2026-09-30): pages 2 and 3, the blank sheet, the preferences

- **Pages**: `renderSheet` draws page 1, page 2 and, when the character has a spellcasting class or a spell (a ki spell counts) or the sheet is blank, page 3. What they share (margins, the header with emblem, name plate and detail lines, the writing lines, the foot) is `classic/common.ts`; the name is repeated on each page (`name`, `name-2`, `name-3`).
- **Page 2** (`classic/page-two.ts`): age, height, weight, eyes, skin and hair for the pen (the character document has none of them); appearance (from the character's appearance), allies and organisations with a box for their symbol; the backstory (from the character's notes); six rows of resources, each with its name, when it comes back in words, and pips to tick when spent (up to ten; beyond that, or when the resource is not counted in pips, "left / max"); conditions (the active ones written), treasure, additional features and traits (for the pen until the cards of M1.6c).
- **Page 3** (`classic/page-three.ts`): one header row per spellcasting class (class, ability, save DC, attack bonus; up to three); the cantrips and the nine levels in the official sheet's three columns with its line counts (8; 12, 13, 13, 13, 9, 9, 9, 7, 7), one line height for the page; each level shows its slots (shared slots of a multiclass caster once, Pact Magic's added as "N pact") and a box for the expended ones; a spell prepared or always prepared has its box ticked; spells beyond the lines leave the last line saying how many more.
- **Values**: `sheetValues` also reads the appearance, the notes, the resources, the conditions, the casters, the slots by level and the spells by level. The composer's `CasterItem` gained `dc` and `attackBonus` and `SlotItem` gained `level` and `pact` (additive; the section-tree goldens refreshed).
- **Hands**: `handwriting` (Patrick Hand) and `print` (Atkinson Hyperlegible); Kalam and Caveat dropped.
- **In the site**: the preferences gained `hand`; the settings menu shows "PDF paper" (A4, Letter) and "PDF writing" (by hand, in print); "Blank sheet (PDF)" on the characters page draws the three pages empty in the interface's language (event `blank-sheet-pdf`); the sheet's PDF uses the paper and the hand of the preferences.

### As built (M1.6b-bis, 2026-09-30): lines that follow the text, allies, formulas

- **Writing lines** belong to their field (`lines: true` in `Pen.field`): drawn under each baseline pdf-lib uses at the size the value is set at (the first one line height under the top, less a point of padding; line height 1.2 × the font's height). A shrunk value brings its lines closer. A viewer that redraws an edited field uses its own spacing.
- **Initiative** has one field; **speed** has its value, a hairline and a small field for the other movements.
- **Allies and organisations**: the symbol on the left, four lines of "title: description" beside it for the pen (rank, headquarters, task…), the free text under them.
- **Formulas** (`src/calculations.ts`): JavaScript calculate actions on the modifiers (from the scores), saves, skills (twice the proficiency bonus with expertise), passive Perception, initiative, and each spellcasting class's DC and attack bonus; the document's calculation order (`/CO`) is the drawing order, which puts every formula after the fields it reads. Each formula adds a constant: the engine's value less the plain formula's, measured when the PDF is drawn, so that bonuses from features and items survive a change; the blank sheet's constants are 0 and an empty input leaves the result empty. They run in Acrobat and Reader, Firefox, Chrome and Edge on a computer; elsewhere the site's values stay as written. The hand font always carries "−" (U+2212), which the formulas write.
- **Tests**: `test/calculations.test.ts` runs the formulas from the PDF, in its order, in `node:vm` against a stand-in viewer: the three fixtures give back their own numbers; a score, the proficiency bonus and a box change what follows; the blank sheet fills as it is filled.
- **Development**: the manifest link is written in production only (the PWA module is off in `nuxt dev`, where the address answered with the application's page).

