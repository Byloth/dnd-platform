# Phase 1 — 10 Wizard integrity (owner's review, 2026-09-25)

## Purpose

Two faults the owner found while using the wizard (points 9 and 10 of the review), and the fixes planned for them. Both come from one gap: the wizard never compares what the character records with what is loaded. The first is the package versions: a character keeps warning about a version it was made with long ago. The second is the chosen entities: a package removed from under a choice leaves the choice looking valid.

The milestone is M1.4r in [08-workplan.md](08-workplan.md). The interface revisions of the same review are in [09-interface-revisions.md](09-interface-revisions.md).

## The version mismatch that never goes away (point 9)

### What happens

The owner created a character with srd51 0.2.0 and finished it with 0.6.0. Every time the owner reopened it, the review listed "Some content this character uses is not loaded here", with a "fix" to step 0.

- **The warning.** `loadPackages` (`packages/loader/src/load/index.ts`) emits `W_VERSION_MISMATCH` ("character pins srd51 at 0.2.0, loaded 0.6.0") when a pin differs from the loaded version. The engine copies it into `sheet.warnings`.
- **The pins.** They are the character's `packages[].version`, read in `composables/engine.ts` (`_pins`) and in the wizard's `packageSet`.
- **What is loaded.** `stores/content.ts` `sources(ids)` loads by id only. A site package is always its latest release (DEC-21), a stored package its one stored version.
- **The recorded versions never move:**
  - `emptyCharacter` records the base's version at the start;
  - `choosePackages` rebuilds `packages` from the old `current.ruleset` object, so the base's entry keeps its first version;
  - `edit` opens the document as it is;
  - `finish` changes the name, the hit points and (when creating) the snapshot, never a version.
- **The review.** `StepReview.vue` turns every warning that carries a `package`, or is `W_MISSING_ENTITY`, into the generic "content not loaded" issue. So the mismatch reads as missing content.

### Decision (owner, 2026-09-25)

**Every correct save records the versions in use, overwriting the previous ones.** A warning about versions appears only while something really does not hold, meaning the content it names cannot be loaded or does not resolve. It may appear the first time a character meets a new version, but once the character has been saved again it must not come back.

This agrees with DEC-21 ([../17-open-decisions.md](../17-open-decisions.md), [../10-progression.md](../10-progression.md)): "the character records the version it was last seen with … the recorded version then moves to the new one". The "what changed" alert of DEC-21 is still to come (M1.5).

### Design

1. **`recordVersions(character, sources)`** in `stores/wizard.ts` returns the character with:
   - `ruleset: { id, version }` of the loaded base;
   - every `packages[]` entry rewritten to the loaded source's version;
   - entries of packages that are not loaded left untouched.
2. **When it runs:**
   - in `finish`, in both branches, so every save records;
   - in `edit` and in `resume`, once the sources are loaded, so the draft's pins match what the player sees and the review does not warn about a version the save is about to fix;
   - in `choosePackages`, which rebuilds the base's entry from the loaded base instead of reusing `current.ruleset`.
3. **The review:**
   - drops `W_VERSION_MISMATCH` from its issues: after (2) it cannot be true of a draft;
   - keeps "content not loaded" only for a package that cannot be loaded (`MissingPackageException` in `sources`, or the loader's `E_MISSING_DEPENDENCY`);
   - names the package in that case ("The package phb14 is not loaded here").
4. **The sheet page** of a stored character keeps deriving with the recorded pins. A mismatch there is legitimate: the character was last saved with another version. It is the place where M1.5's alert will say what changed, and it is not listed as a fault.
5. **Note for M1.5**, recorded in [02-content-and-character-stores.md](02-content-and-character-stores.md): DEC-21's alert compares the derivation at the recorded version with the one at the latest. It must run before (2) moves the draft's versions, that is, when the character is opened. Until then, moving the version on open skips the comparison, which is acceptable because no alert exists yet.

### Tests

- Store tests:
  - a character stored with srd51 at an older version, opened and saved, records the current version;
  - the draft of an edited character carries the current versions from the start;
  - `choosePackages` after a base update records the new base version.
- Page test: the review of that character lists nothing about versions.
- The fixtures keep their pins: they are CLI inputs, not drafts.

## A package deactivated under a choice (point 10)

### What happens

In a new character the owner chose "Human (Variant)" from the private phb14 package. Then they went back to step 0 (Content) and deactivated phb14. What followed:

- **Step 0.** `StepContent.vue` calls `wizard.choosePackages` at once. It only rewrites `packages`: species, subspecies, class, background and answers keep ids of phb14.
- **The marks.** `stepDone` (`composables/wizard.ts`) checks for species, class and background only that an id is set, never that it resolves. The class step, whose subclass choice the engine no longer offers, counts as done too.
- **The engine.** It skips an entity it cannot find, with `W_MISSING_ENTITY` ("species … is not loaded", no `package`). The feature and its choices disappear from the sheet, and the leftover answers are never read.
- **The review.** It shows that warning as the same vague "content not loaded" line, pointing to step 0. The species step keeps its tick.

### Decision (owner, 2026-09-25)

**Deactivating a package asks first, only when something would be lost.**

- If the character uses nothing from the package, the change happens at once, with no question.
- Otherwise an alert names what would be lost and asks for confirmation.
- On confirmation, **the affected choices are cleared**, so the steps show them as still to be chosen.

The same holds in creation and in editing. This differs from the reset confirmation of M1.4e1, which asks only while editing, because losing content silently is worse than changing one's mind about a class.

### Design

1. **What a package holds in the character**, `wizard.usesOf(packageId)`. It is computed on the current package set, before the change, because ownership walks entities that disappear with the package. It returns:
   - the choices whose entity belongs to the package (`entities.get(id).package === packageId`): species, subspecies, each class and subclass, background;
   - the answers owned by any of those (`answersOf`), and the answers whose values are entities of the package (a feat or a spell of phb14 picked from an srd51 choice);
   - equipment entries whose item belongs to the package;
   - nothing else: name, alignment, personality and coins do not depend on packages.
2. **Step 0**:
   - Deactivating a package with no uses calls `choosePackages` at once, as today.
   - With uses, it shows the reset notice (`components/wizard/ResetNotice.vue`), titled "Removing this package resets some choices", with the list named as step 6 names choices: "Species: Human (Variant)", "Human (Variant), Feat", "Class: …". The actions are "Remove it and reset them" and "Keep the package".
   - A package that others depend on cannot be deactivated alone: the notice says so and offers to remove both, which the loader's dependency list already tells.
3. **Clearing** (`wizard.dropPackage(packageId, uses)`):
   - `species`, `subspecies`, `background` are removed when affected;
   - an affected class entry is removed (or its subclass only, when only the subclass belongs to the package);
   - the affected answers are removed with `_withoutAnswersOf` and by key;
   - equipment: when the list is kept (editing), the affected entries are removed; when it is rebuilt, the class and background selections are reset, as a class change already does;
   - then `choosePackages`.
   All in one `_write`, so the draft saves once.
4. **`stepDone` checks that the chosen ids resolve**: species, subspecies, each class and subclass, and background must exist in `wizard.packageSet` with the right type. A step whose choice does not resolve is not done.
5. **The review names a missing choice.** A `W_MISSING_ENTITY` whose entity is a chosen species, subspecies, class, subclass or background becomes an issue on its step: "Species: the one chosen is not loaded; choose again". This covers characters opened after a package was removed from the packages page, where no confirmation ran.

### Tests

- Store tests:
  - `usesOf` for a character with a phb14 species, a phb14 feat answer and an srd51 class returns exactly those;
  - `dropPackage` clears them and leaves the rest;
  - a package with no uses deactivates with no notice.
- Page tests:
  - step 0 shows the notice with the names, and "Keep the package" leaves everything as it was;
  - the steps' ticks follow what resolves;
  - the review names a missing species by step.
- Private (skipped without the book): the variant-human flow extended with deactivation, the notice, the reset and the species step to choose again (`tests/flows/private-variant-human.test.ts`).
- A fixture package pair from `fixtures/packages` (srd51-excerpt and homebrew-feline) runs the same flow publicly, so CI covers it without the book.

## Tasks

Each is a commit.

1. `recordVersions` in `finish`, `edit`, `resume` and `choosePackages`; the review's version rule; tests.
2. `stepDone` resolving ids; the review naming a missing chosen entity; tests.
3. `usesOf` and `dropPackage` in the store; tests.
4. Step 0's notice (creation and editing), dependency handling; EN/IT strings with notes; page and flow tests, public and private.
5. Docs: 04-character-creation (step 0, steps' done rules), 02-content-and-character-stores (versions recorded on save, the M1.5 note); the workplan's M1.4r progress.

## Open points

- Removing a package from the packages page while a stored character uses it is refused today (the page lists the characters). If that ever becomes possible, the review's rule (5) already covers the characters it leaves behind.
- Whether the sheet page, for a stored character pinned at an older version, should say so quietly before M1.5 ("made with srd51 0.2.0; open and save to update"). Leaning: no; the M1.5 alert is the right place.
