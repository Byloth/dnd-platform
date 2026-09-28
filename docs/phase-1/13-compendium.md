# Phase 1 — 13 The compendium (DEC-25)

## Purpose

The owner asked on 2026-09-27 for a place where anyone can list, read and search what the packages hold: spells, magic items, creatures, conditions and the rest. A newcomer's most frequent question at the table is "what does this do?", and today the answer is only on the sheet of a character who has it. This document is the plan for that feature, the **compendium** ("Compendio" in Italian). It is milestone M1.C of [08-workplan.md](08-workplan.md), between M1.4r and M1.5.

The catalogues of [../19-catalogues.md](../19-catalogues.md) were planned for Phase 2 (items, to add to the inventory) and Phase 6 (items and creatures for the game master). The compendium brings their read-only half forward, since it needs no play state and no account. What needs play mode or a campaign stays where it was (see "What stays later").

## Decisions

Taken by the owner on 2026-09-27:
- **One section, "Compendium"** ("Compendio"), in the navigation bar. The bestiary ("Bestiario") and, later, the glossary ("Glossario") are sections of it, not features of their own.
- **Its plan comes after M1.4r, and its work before M1.5.**

Proposed here, to confirm with the plan:
- **The compendium shows what the device has**: the site's public packages, the packages the player loaded from files, and the translation of the interface's language, as the sheet sees them. Nothing is fetched from anywhere else, and nothing a player loaded ever leaves the browser.
- **Everything loaded, not a character's selection.** Every stored package is included, patches applied, so an entry reads as it would on a sheet that uses all of them. An entry from a private package carries the private flag of [../05-content-model-and-sources.md](../05-content-model-and-sources.md), and its source is cited.
- **Creatures are downloaded only by the bestiary.** `srd51-creatures` (and `-it`) is a catalogue package: the sheet and the wizard never fetch it (owner, 2026-09-26). The compendium fetches it when the bestiary opens, or when a search first needs it.
- **First version: spells, items, creatures, conditions**, the four a player looks up while playing. **Second round**: species and subspecies, classes and subclasses, backgrounds, feats, and the rules as the glossary.
- **The composer writes the entries, the web shows them** (the rule of [00-README.md](00-README.md): nothing in `packages/web` computes a rule). The stat block already has `composeCreature`. Spells, items and conditions get the same kind of function, and `dnd show` prints all of them, so the CLI and the goldens check the wording in both languages.
- **The search is local and forgiving.** It is built in the browser over the entries of the device. It ignores case and accents, and in Italian it also matches the English name, since many players know "Fireball" better than "Palla di fuoco". No new dependency: a scored match over about 1,200 names is enough.
- **Addresses keep the state.** The kind, the search and the filters sit in the address (`/compendium/spells?q=fuoco&level=3`), so Back restores a list and a link opens the same list. A link to a private entry opens only on a device that has its package, with the "missing package" message otherwise.

## Design

### Routes and screens

| Route | Screen |
|---|---|
| `/compendium` | A search field over everything, then one card per section with its count and a line saying what it holds. Results are grouped by section as the player types. |
| `/compendium/<kind>` | The list of a section: the search field, the filters, the count ("42 spells"), the entries by name with a one-line summary and their marks (level, rarity, challenge). `<kind>` is `spells`, `items`, `creatures`, `conditions`. |
| `/compendium/<kind>/<id>` | The entry: its heading, the line under it, the full text, the source cited, the private flag, and Back to the list it came from. |

Filters, as disclosures on a phone and as a side column on a desktop:
- **Spells**: level (cantrip, 1–9), school, class (from the spell lists), ritual, concentration, source package.
- **Items**: type (weapon, armour, gear, tool, pack, magic item), rarity, attunement, source package.
- **Creatures**: challenge (from–to), type, size, source package. The format has `environments` (DEC-24), but srd51-creatures fills it for none, so there is no environment filter yet.
- **Conditions**: none, fifteen entries.

Sorting: spells by level then name; creatures by challenge then name; everything else by name. A list shows the first 60 entries and a "Show more" button, so a cheap phone never renders 500 cards at once.

### The entries

- **Creature**: `composeCreature` rendered by a new `components/compendium/StatBlock.vue`: the heading, the size, type and alignment line, the table of the six abilities, the lines, then traits, actions, reactions and legendary actions. The manuals' look, in our tokens.
- **Spell**: "3rd-level evocation" / "Invocazione di 3° livello" under the name; casting time, range, components, duration; the classes that have it; the text; "At higher levels".
- **Item**: the type line ("Armour (medium), rare, requires attunement"); cost and weight; damage, properties, armour class, strength and stealth where they apply; the text; a pack's contents.
- **Condition**: the text and, for exhaustion, its levels.

The composer's new function `composeEntry(set, id, options)` returns, for a spell, an item or a condition, the same shape as the stat block: a heading, a subtitle, labelled lines and text sections. `RichText` shows the texts as it does on the sheet.

### Content and the index

- `useEngine().compendiumSet(withCreatures)`: the package set of every site package and every stored package, memoised like the sheets' sets, with the interface's translation.
- `composables/compendium.ts`, pure and unit-tested:
  - `entriesOf(set, kind, language)`: every entry of a kind, with its name in the language and in English, its summary, and the values its filters read;
  - `search(entries, query)`: normalised text (NFD, marks removed, lower case), scored: the whole name, then the start of the name, then the start of a word, then anywhere in the name; the text is not searched in the first version;
  - `filter(entries, filters)` and the parsing of filters from the address and back.
- The index is rebuilt when the language or the packages change, never while the player types.

### As built in M1.Cb (2026-09-27)

- `useContentStore().compendiumSources({ creatures })`: the published packages that are neither translations nor catalogues, the catalogues only when `creatures` is true, every stored package; then `sources()` adds the translations of the interface's language.
- `useCompendium().set({ creatures })` in `composables/compendium.ts` returns `{ packages, skipped }`. When everything does not load together (a second base package, which the loader reports without naming a package), the site's packages come first and each stored package is kept only if the set still loads cleanly with it. The others are `skipped`, for the page to explain.
- The index is in the same file, as pure functions:
  - `entriesOf(set, kind, language)`: the entries with the composer's subtitle and first sentence, the private flag and the facets; memoised per set, kind and language.
  - `normalize` and `search`: whole name, start, word start, anywhere, every word; the English name half a point behind.
  - `filter` over `FILTERS` per kind.
  - `fromQuery` and `toQuery` for the address; `filterOptions` for the values present.
- The spell's classes by id come from the composer's `spellClassIds`, which `composeEntry` also uses.

### As built in M1.Cc (2026-09-27)

- **Pages**:
  - `pages/compendium/index.vue`: the sections as cards with their counts; the bestiary's count only once the creatures are loaded. A search (`?q=`) loads the creatures and shows up to five results per section, with "See all".
  - `[kind]/index.vue`: search and filters in the address (`fromQuery`, `toQuery`, `router.replace`); a notice names the stored packages left out.
  - `[kind]/[id].vue`: the entry in the interface's language, with the units by language (`defaultUnits`: metric in Italian until the units setting of doc 09). Back returns to the list with its query when that is where the player came from. An entry of another section, or not on this device, says so.
- **Components** in `components/compendium/`:
  - `CompendiumSearch`, debounced by 250 ms;
  - `CompendiumFilters`: menus with only the values present, checkboxes, a disclosure closed on a phone;
  - `CompendiumList`: 60 entries at a time, the count announced;
  - `EntryCard`, `StatBlock`, `EntrySource`.
- **Navigation**: "Compendium" between Characters and Packages. On a phone every link is its icon over a short label, so three links and the settings fit in 360 px (the direction of doc 09's bar).
- **Found on the way**: in the tests' document (happy-dom), DOMPurify lost the first element of a text, a leading `<ul>` or `<p>`. `RichText` now sanitises a wrapped text, and its test checks the list and the paragraph.
- **Checks**: page tests in both languages (`compendium-pages.test.ts`); axe and the keyboard over the front page with and without a search, three lists and four entries. The site generates, and the first load is 208 KB of 300.

### As built in M1.Cd (2026-09-28)

- **Links**: `components/compendium/CompendiumLink.vue`, which opens in place on the sheet and in a new tab inside the wizard (`COMPENDIUM_LINK_FROM`, provided by `WizardView`, so the review's sheet opens new tabs too). The new tab is said aloud and marked with an icon.
  - The sheet: spell names (`SpellList`) and equipment names (`SheetBlock`).
  - The wizard: "Read in the compendium" beside every spell and cantrip card, outside its label, not for an expert; the shop's and the carried items' names in step 7.
  - Conditions are not linked: the section tree gives them without ids (open points).
- **Statistics** ([12-analytics.md](12-analytics.md)): `compendium-view`, `compendium-search`, `compendium-filter`, `compendium-link`. `publicId` now also reads the site's index, so the creatures count as published.
- **Lighthouse** watches `/compendium/spells?level=3`, with the sheet's guards. It is not run locally (no Chrome here); CI runs it.
- **Found on the way**: four heavy tests (two of the CLI over every package, two of accessibility) timed out under the hooks' load. They get 30 s and 20 s.

### Links from the rest of the application

- **From the sheet**: a spell, an item of the equipment and a condition link to their entry ("Read in the compendium" in the drawer or the card that shows them).
- **From the wizard**: the spell choices of step 6 and the shop of step 7 offer the same link, opening in the same tab with the draft saved as always.

### Look, accessibility, performance

- BEM blocks `compendium-search`, `compendium-list`, `compendium-entry`, `stat-block`; tokens only; the four looks; Cinzel for headings.
- The search field has a visible label. The count is announced politely once the typing pauses. Filters are fieldsets with legends. The stat block's ability table has headers, its lines are a description list.
- axe, keyboard and label-in-name tests over the three screens in both languages; Lighthouse accessibility at 100 on `/compendium/spells`.
- Budgets: the compendium's JavaScript is its own route chunk, not in the first load. The creatures' bundle (1.2 MB in English, 0.6 MB in Italian) is measured apart and never counted in the sheet's budget.

### Privacy and statistics

The usage statistics of [12-analytics.md](12-analytics.md) get two events: `compendium-view` with the kind and a public id (`publicId`, anything private becomes `other`), and `compendium-search` with the kind and the count of results. The search text is never sent.

### What stays later

- **Adding an item to the inventory** from the compendium: Phase 2, with play mode's inventory ([../19-catalogues.md](../19-catalogues.md)).
- **Rolling a creature's attacks and damage**: Phase 2, with the dice.
- **The game master's tools** (encounters, loot tables, lists kept for a session): Phase 6.
- **Searching inside the texts**, not only the names: after the first version, if the players ask.

## Tasks

M1.C is split into four parts, each a series of commits with tests and lint through the hooks.

1. **M1.Ca, the entries in the composer** (≈ 1 session; done 2026-09-27):
   - `composeEntry` for spells, items and conditions, with the EN and IT catalogue keys it needs;
   - `dnd show` for every kind; goldens for a cantrip, a 3rd-level spell with a higher-level text, a weapon, an armour, a magic item with attunement, a pack, exhaustion, in both languages.
2. **M1.Cb, the index and the bestiary's loading** (≈ 1 session; done 2026-09-27):
   - `compendiumSet`, with creatures fetched only on request;
   - `composables/compendium.ts` and its unit tests: accents, the English name in Italian, the order of the scores, every filter, the address round trip.
3. **M1.Cc, the screens** (≈ 1–2 sessions; done 2026-09-27):
   - the three routes, `StatBlock`, the entry components, the filters, "Show more";
   - the "Compendium" link in the navigation bar; the catalogue keys with translator notes; the glossary words for the section names (docs/03);
   - component tests in both languages, the private flag, the missing-package message.
4. **M1.Cd, links, checks and the close** (≈ 1 session; done 2026-09-28):
   - the links from the sheet and the wizard;
   - accessibility, budgets, Lighthouse; the statistics events;
   - docs: 01-web-application (routes and navigation), 03-sheet-composer (`composeEntry`), [../19-catalogues.md](../19-catalogues.md) and [../16-roadmap.md](../16-roadmap.md) (what moved to Phase 1), the roadmap page, the workplan's progress.

The second round (species, classes and subclasses, backgrounds, feats, the rules as the glossary) is planned when the first is done. By then the owner will have used the first version.

## Open points

- **Linking conditions from the sheet**: the composer's `ConditionsBlock` has names, not ids. Adding ids changes the section-tree goldens; worth it with play mode (Phase 2), when conditions appear during a session.

- **A tag of its own.** As planned, M1.C ships with `v0.3.5` at the close of M1.5, like M1.4r. If the owner wants to publish it sooner, it can be tagged `v0.3.5` itself and every later tag moves by one.
- **The glossary in the second round**: the rule entities of srd51 (276, by category) as its content, the terms of [../03-glossary.md](../03-glossary.md) as its index, or both.
- **Environment** for creatures: the format has `environments`, srd51-creatures fills it for none; filling it is content work.
- **Package sets are remembered by id and version** (`useEngine`): a package loaded again with the same version but different contents keeps its old set until the page is reloaded. The tests clear the cache; the application could clear it after a load or a removal.
- **Searching in the text** (e.g. "which spells deal fire damage"): not in the first version.
