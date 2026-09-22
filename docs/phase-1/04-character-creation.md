# Phase 1 — 04 Guided character creation

## Purpose

This document fixes the creation wizard of [../07-character-creation.md](../07-character-creation.md) as screens over the character document: what each step reads from the loaded packages, what it writes into `character.choices`, how recommendations come from archetype content, how validation shows without blocking, and how the expert form and post-creation editing reuse the same steps.

## Decisions

- **The wizard edits a character document and derives after every change.** There is no wizard state apart from the current step: every input writes `character.choices`, the engine derives, the sheet's `choices` and `warnings` drive what the step shows next. The review step is the build-mode sheet of [03-sheet-composer.md](03-sheet-composer.md).
- **Archetypes are content.** `packages/content/srd51/archetypes/<name>.yaml` (schema `archetype.schema.json`, already in the format): `id`, `name`, `pitch`, `recommends: { species, class, subclass?, background, abilityPriority, answers }`, `why` with one sentence per recommendation. Phase 1 authors at least one archetype per SRD class, in English with Italian in the translation package; a private or homebrew package may add its own.
- **Recommendations are marks, never constraints.** A recommended option is listed first with its reason; every other option stays selectable. Step 1 may be skipped: without an archetype nothing is marked.
- **Standard array by default (DEC-15)**; point buy and rolling are the other two tabs of step 5; rolling enters the numbers by hand (dice are the player's).
- **Warn, never block.** Every warning of the sheet (`W_UNANSWERED_CHOICE`, unmet prerequisite, missing package) is shown next to the field or step that can fix it, in plain language with the fix stated, and in the review; "save" and "next" are always available.
- **Expert mode is the same steps on one page**, with dense lists, no recommendations highlighted, no explanatory copy, direct score entry; it is the help level *expert* of the preferences, not a different wizard.
- **Editing after creation reopens the wizard at the step**, from the sheet, with the same components.

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
| 7 | Equipment | class and background starting equipment, `item` entities | `choices.equipment` | packs as presented by content, shop for expert; equipped toggles |
| 8 | Personality | background suggestions | `name`, `alignment`, `personality`, `appearance`, `notes` | free text with suggestions |
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

- A level 1 character of every SRD class can be created through the wizard with the SRD alone, with zero warnings at the review, in a component test that drives the steps (the twelve characters become fixtures compared with `dnd derive --json`).
- The reference Monk can be created with `phb14` loaded (private test): Way of Shadow selectable at step 3 when the level allows (it does not at level 1; the fixture is checked at level 3 through the edit flow).
- The 15-minute target is measured with real newcomers at M1.8 ([07-testing-accessibility-performance.md](07-testing-accessibility-performance.md)).

## Tasks

1. Author the archetypes for the twelve SRD classes (English), with `why` sentences, and the class `primaryAbilities` where missing in the base package — M1.4 (content).
2. The wizard route and stepper, steps 0–4 with cards and marks — M1.4.
3. Step 5 with the three methods, standard array default, point-buy rules read from the ruleset (a `pointBuy` table in `ruleset.yaml`, additive v0 field, if the SRD ruleset lacks one) — M1.4.
4. Steps 6–8 and the review; the "as created" snapshot; storing the character — M1.4 (store in M1.5).
5. Expert mode as the single-page rendering of the same steps; editing from the sheet — M1.4.
6. The twelve-classes component test and the private Monk test — M1.4.

## Open points

- Point buy needs costs and a budget: the SRD text has them as prose; an additive ruleset field (`abilityScores: { standardArray, pointBuy: { budget, costs } }`) keeps them out of code, recorded like the M0.7 additions. Confirm when M1.4 starts.
- Whether the archetype should also prefill equipment (the original playbook did); the schema has no field for it; propose it for v1 if the newcomer test asks for it.
- Starting equipment as "packs" is prose in the SRD classes; Phase 1 may present the pack text and let the player pick items from the shop list, with the recommended pack pre-ticked where the content declares it. Decide at M1.4 against the content.
