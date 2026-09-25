# Phase 1 — 04 Guided character creation

## Purpose

This document fixes the creation wizard of [../07-character-creation.md](../07-character-creation.md) as screens over the character document: what each step reads from the loaded packages, what it writes into `character.choices`, how recommendations come from archetype content, how validation shows without blocking, and how the expert form and post-creation editing reuse the same steps.

## Decisions

- **The wizard edits a character document and derives after every change.** There is no wizard state apart from the current step: every input writes `character.choices`, the engine derives, the sheet's `choices` and `warnings` drive what the step shows next. The review step is the build-mode sheet of [03-sheet-composer.md](03-sheet-composer.md).
- **Archetypes are content.** `packages/content/srd51/archetypes/<name>.yaml` (schema `archetype.schema.json`, already in the format): `id`, `name`, `pitch`, `recommends: { species, class, subclass?, background, abilityPriority, answers }`, `why` with one sentence per recommendation. Phase 1 authors at least one archetype per SRD class, in English with Italian in the translation package; a private or homebrew package may add its own.
- **Recommendations are marks, never constraints.** A recommended option is listed first with its reason; every other option stays selectable. Step 1 may be skipped: without an archetype nothing is marked.
- **Standard array by default (DEC-15)**; point buy and rolling are the other two tabs of step 5; rolling enters the numbers by hand (dice are the player's). The array and the point-buy budget and costs are content, `ruleset.abilityScores` (additive v0, M1.4a). SRD 5.1 has neither, so srd51 0.2.0 carries SRD 5.2's numbers (CC-BY-4.0, credited). Decided by the owner on 2026-09-24.
- **The player may adjust each ability score by hand** (owner, 2026-09-24): a free number added to the score, stored in `choices.abilityScores.bonuses` and shown in the explanation as the player's own adjustment. It is offered in step 5 and on the sheet. Adjusting other values (armour class, hit points, speed) is a later candidate, not Phase 1.
- **Starting equipment is content, and so is the money** (owner, 2026-09-24):
  - Classes and backgrounds already declare structured grants: fixed items, option groups, filters such as "any martial weapon", `gold`.
  - Packs list their items (`item.contents`, additive v0), so a pack is shown with what it holds, and a campaign package can define its own packs for its players.
  - The coins go in `state.currency: { copper, silver, electrum, gold, platinum }` (additive v0), with the names spelled out.
  - Step 7 suggests a starting purse and the player can type any amount. The suggestion is the grants' `gold`, plus the cost of every default item the player removes, minus the cost of every item they add.
- **Warn, never block.** Every warning of the sheet (`W_UNANSWERED_CHOICE`, unmet prerequisite, missing package) is shown next to the field or step that can fix it, in plain language with the fix stated, and in the review; "save" and "next" are always available.
- **Expert mode is the same steps on one page**, with dense lists, no recommendations highlighted, no explanatory copy, direct score entry; it is the help level *expert* of the preferences, not a different wizard.
- **Editing after creation reopens the wizard at the step**, from the sheet, with the same components.
- **Choosing an archetype prefills** (owner, 2026-09-24): species, subspecies, class and subclass, background, its answers and the standard array in its ability order are written at once, stay marked "recommended" with their reason, and can all be changed; a newcomer can reach the end with "Next" alone. "I'll choose myself" skips the archetypes and leaves every step empty.
- **The stepper is a row of numbered dots on every width**, with the step names beside the wizard on desktop (owner, 2026-09-24).
- **The draft saves itself in the browser** (owner, 2026-09-24): the `meta` store, key `wizard-draft`, shortly after every change; opening the wizard with a stored draft asks "resume or start again".
- **The name is the one thing the wizard asks before saving** (owner, 2026-09-25), the single exception to "warn, never block": the review's save button is disabled without it, with the reason beside it. Everything else open is listed and can be saved as it is.
- **Alignments are content** (owner, 2026-09-25): `ruleset.alignments` (additive v0, srd51 0.6.0), offered as a menu; `choices.alignment` holds the id, or the player's own words when the ruleset lists none.

## Design

### Steps and the document

| # | Step | Reads | Writes | Screen |
|---|---|---|---|---|
| 0 | Content | the content store (loaded packages, base first) | `packages` (ids and pinned versions), `ruleset` | package cards with private flag and attribution; the SRD is always on |
| 1 | Concept | `archetype` entities of the selected packages | nothing; the chosen archetype is kept in the wizard route only | pitch cards; "skip" |
| 2 | Species | `species`, subspecies, species choices (languages) | `choices.species`, `choices.subspecies`, answers | cards collapsed (newcomer) or list (expert); the recommended one first |
| 3 | Class | `class` at level 1, subclass when unlocked at 1 | `choices.classes[0]`, class choices (skills…) | cards; primary abilities shown |
| 4 | Background | `background` | `choices.background`, its choices | cards |
| 5 | Ability scores | class primary abilities, species bonuses from the derived sheet | `choices.abilityScores` (method, base, assignment) | three tabs: standard array (drag or pick per ability, recommended assignment prefilled from `abilityPriority`), point buy (budget and costs from the ruleset), roll (six inputs) |
| 6 | Remaining choices | the sheet's `choices` with `answered: false` | `choices.answers[key]` | one card per open choice, options from `ChoiceView.options`, spells filtered by list and level |
| 7 | Equipment | class `startingEquipment` and background `equipment` grants, `item` entities with their `contents` | `choices.equipment`, `state.currency` | one group per option of the class grant (a filter becomes a picker of matching items; a pack shows its contents); the background's fixed items; items added or removed; the suggested purse beside an editable one; equipped toggles |
| 8 | Personality | background suggestions, `ruleset.alignments` | `name`, `alignment`, `personality`, `appearance`, `notes` | free text with suggestions; the alignment as a menu |
| 9 | Review | the derived sheet | a snapshot "as created"; the character is stored | the build-mode sheet with the warnings on top, "print" and "export" |

Steps can be revisited in any order from a stepper; a change in step 0 re-validates everything after it (the derivation does that by itself; the wizard only re-reads the sheet).

### Recommendations

- From the archetype: species, class, subclass, background and `abilityPriority` mark the matching cards and prefill the standard-array assignment; `answers` prefill choices (skills, cantrips) as suggestions the player confirms.
- Without an archetype, per-class rules from content: the class's `primaryAbilities` (a class field) mark the abilities to place the high scores in; nothing else is marked.
- Every mark carries the `why` sentence; help level *newcomer* shows it inline, *regular* on hover or tap, *expert* not at all.

### Validation and copy

- The sheet's warnings are mapped to steps by the entity they name (a class choice → step 6, a species language → step 2 or 6, a missing package → step 0).
- Each step has three catalogue strings for the newcomer level: purpose, consequence, recommendation ("Your class is the biggest decision: it sets what you can do in a fight and what you are good at." … ), written in English and Italian ([06-localisation.md](06-localisation.md)).
- Error copy follows [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md): no codes on screen, the fix stated, next to the field.

### Acceptance

- A level 1 character of every SRD class can be created through the wizard with the SRD alone, with zero warnings at the review, in a component test that drives the steps (the twelve characters become fixtures compared with `dnd derive --json`). Met at M1.4e3.
- The reference Monk can be created with `phb14` loaded (private test): Way of Shadow selectable at step 3 when the level allows (it does not at level 1; the fixture is checked at level 3 through the edit flow). Met at M1.4e1.
- The 15-minute target is measured with real newcomers at M1.8 ([07-testing-accessibility-performance.md](07-testing-accessibility-performance.md)).

## Tasks

1. Author the archetypes for the twelve SRD classes (English), with `why` sentences, and the class `primaryAbilities` where missing in the base package — M1.4 (content; done in M1.4a with srd51 0.2.0: the archetypes, `primaryAbilities` from the multiclassing prerequisites, the ability-score methods, the pack contents).
2. The wizard route and stepper, steps 0–4 with cards and marks — M1.4 (done in M1.4b). As built:
   - `pages/characters/new.vue`, with the step in the address (`?step=class`).
   - `stores/wizard.ts`: the draft; the choices, where changing one drops the answers of what it replaces; the self-saving draft.
   - `composables/entities.ts`: the entity lists, named with the composer's `localize`.
   - `components/wizard/`: `WizardStepper` (the dots), `WizardStepList` (the names), `WizardStep` (heading, copy by help level, Back and Next), `ChoiceCard` (a native radio or checkbox in a card, with the recommendation and its reason by help level), and `steps/` for steps 0–4 plus the pending panel of 5–9.
3. Step 5 with the three methods, standard array default, point-buy rules read from the ruleset (a `pointBuy` table in `ruleset.yaml`, additive v0 field, if the SRD ruleset lacks one) — M1.4 (done in M1.4c). As built, by the owner's decisions of 2026-09-24:
   - The array and the rolls are assigned with one menu per ability, and picking a value another ability holds swaps the two.
   - Rolls are six totals typed in any order, kept in the wizard's draft (never in the character) and placed highest first once all are valid.
   - Point buy has minus and plus per ability within the costs and budget.
   - The recommended order is the archetype's `abilityPriority`, else the class's `primaryAbilities`.
   - The manual adjustments sit in a closed section, open for an expert.
   - The arithmetic is in `composables/ability-scores.ts`, the step in `components/wizard/steps/StepAbilities.vue`.
4. Steps 6–8 and the review; the "as created" snapshot; storing the character — M1.4 (store in M1.5). Step 6 done in M1.4d1:
   - One group per choice the sheet asks, answered or not: languages from the ruleset, tools, skills and expertise, inline feature options, cantrips and spells by list and level, and a subclass not set by an archetype.
   - The count is respected by disabling the rest once it is reached.
   - Long lists are searchable.
   - The files are `composables/choice-options.ts`, `components/wizard/ChoiceGroup.vue` and `components/wizard/steps/StepChoices.vue`.
   Step 7 done in M1.4d2 (owner, 2026-09-24):
   - The wizard's draft keeps the player's selections: an option per group, an item per filter, removed slots, added items, equipped overrides. `choices.equipment` is rebuilt from them after every change, with packs unpacked, so a different option or pack swaps its items with nothing left behind.
   - The coins are five fields beside the suggested purse: the grants' gold, plus what removed items are worth, minus what was bought.
   - The files are `composables/equipment.ts` and `components/wizard/steps/StepEquipment.vue`.
   Steps 8–9 and storing done in M1.4d3 (owner, 2026-09-25):
   - Step 8: the name, marked as needed to save; the alignment menu with the chosen one's sentence; traits, ideals, bonds and flaws as free text, the background's suggestions below each as buttons that fill the field or add a line; appearance and notes. The player's texts keep the language they were first written in. `components/wizard/steps/StepPersonality.vue`.
   - Step 9: the build-mode sheet (`SheetView` with `embedded`: the name as a second-level heading, no technical warning list) under what is still open, each in plain words with a button to its step: a step not done, a choice not answered ("Cleric, Skills: 2 more to choose"), content not loaded, the name. The engine's message shows to an expert only. `components/wizard/steps/StepReview.vue`.
   - Saving (`wizard.finish()`): the document goes to the `characters` store at full hit points, with a snapshot `{ at, level, label: "as created", choices }`; the draft is forgotten and the sheet opens. The characters page lists the stored characters above the demo ones. Print and export arrive with M1.6 and M1.5.
5. Expert mode as the single-page rendering of the same steps; editing from the sheet — M1.4. M1.4e is split by the owner (2026-09-25) into e1 editing, e2 expert mode, e3 the tests and the close. Editing done in M1.4e1:
   - `/characters/<id>/edit?step=…` renders the same wizard (`components/wizard/WizardView.vue`, shared with `/characters/new`) on the stored character, with its own draft (`meta` key `wizard-edit`) and no concept step. Saving replaces the stored document: the state goes on with no more hit points than the new maximum, no snapshot is added.
   - The sheet of a stored character has "Edit" (to the review) and a "Change" link on the sections a step sets (abilities; skills, features and spells → step 6; equipment; personality and notes). Demo characters have neither.
   - Step 3 offers the subclass once the class's level unlocks it (moved from step 6), so the level 3 reference Monk is offered Way of Shadow there when reopened (owner: checked on the fixture, no level control in Phase 1). Changing the class keeps its levels.
   - Step 5 shows typed scores (`manual`) as six fields; step 7 edits an edited character's own list, with "Choose the starting equipment again" (owner).
   - While editing, replacing species, subspecies, class or background names the answers it would forget and waits for "Change and reset them" or "Keep what I have" (`composables/reset-confirmation.ts`, `components/wizard/ResetNotice.vue`).
   Expert mode done in M1.4e2:
   - At the help level *expert*, `WizardView` renders every step but the concept as one page: a section per step (`#step-<id>`) under the page's heading, no dots, no Back and Next, no copy or reasons, the step names beside it as in-page links; the address's step, and the review's "Go to…", scroll to their section.
   - Dense option cards (the name and the facts, no summary); typed scores always offered (the default stays the standard array, DEC-15).
   - Left as they are, without asking: the concept step (an expert chooses directly) and the starting equipment options (content), with the shop below, rather than "shop instead of packs".
   - Coins the player has not typed follow the suggested purse as it changes (on the single page the equipment is on screen before the class and background); typing a coin stops it, "Use the suggestion" resumes it.
6. The twelve-classes component test and the private Monk test — M1.4 (done in M1.4e1 and M1.4e3):
   - `packages/web/tests/flows/twelve-classes.test.ts` drives the page for each srd51 archetype with "Next", the first options of every open choice and a name; the review shows nothing open, and the stored character equals `fixtures/characters/created-<class>/character.yaml`, whose `snapshot.json` (the CLI's derivation) equals the browser's sheet, without a warning. `UPDATE_FLOW_FIXTURES=1` rewrites the fixtures, then `pnpm fixtures --update` their snapshots.
   - `packages/web/tests/flows/private-monk.test.ts` reopens the level 3 reference Monk and finds Way of Shadow at step 3 (skipped without the book).

## Open points

- ~~Point buy needs costs and a budget~~. Decided at M1.4a: `ruleset.abilityScores`, with SRD 5.2's numbers in srd51 0.2.0. The SRD 5.1 text had neither the array nor point buy.
- Whether the archetype should also prefill equipment (the original playbook did); the schema has no field for it; propose it for v1 if the newcomer test asks for it.
- ~~Starting equipment as "packs" is prose in the SRD classes~~. It was not: the class and background grants are structured, and only the pack contents were prose. Since M1.4a packs list their items (`item.contents`) and the coins have their place (`state.currency`); see the decisions.
- ~~Where the language choices take their options~~. Decided by the owner on 2026-09-24: the ruleset's `languages` list (additive v0, srd51 0.3.0).
- Manual adjustment of values other than the ability scores (armour class, hit points, speed, skills), with an override or a bonus as D&D Beyond offers. It is a later candidate, noted by the owner on 2026-09-24.
