# 07 — Character creation

## Purpose

This document specifies the guided creation flow: the order of steps, what each step explains, how recommendations work, how ability scores are set, how validation behaves, and how an expert bypasses the guidance. It implements journey (a) of [02](02-personas-and-journeys.md) on top of the model in [04](04-domain-model.md).

## Principles

- **Concept before mechanics.** The first question is "what do you want to be", in plain words; species and class follow from the answer (Principle 4).
- **Every option comes from content.** The wizard never hard-codes a species, class or spell list: it asks the loaded packages (base, plus what the user or campaign allows) what exists ([05](05-content-model-and-sources.md)). A homebrew subclass appears exactly like an official one (Principle 6).
- **Recommend, explain, never force.** Each step highlights a recommended option and says why in one or two lines; every other option remains available (Principle 8).
- **Warn, do not block.** An incomplete or unusual character can be saved at any point; the sheet shows what is missing (Principle 2, [04](04-domain-model.md) step 7).
- **The sheet is visible while you build.** The computed sheet updates at every step, so the player sees the consequence of each choice as it is made (Principle 3).

## What needs to be done

1. Define the step sequence and the data each step reads from content and writes to the character's choices.
2. Define the archetype catalogue as content (a package entity, not code), mapping plain-language concepts to recommended species, class, background and score priorities.
3. Define the recommendation rules: per class, which abilities matter; per choice, which options are recommended and the reason text.
4. Specify the ability score step for the three methods and the campaign override.
5. Specify the validation messages (missing required choice, prerequisite not met, over-budget equipment) and where they appear.
6. Specify the review screen and the "what you can do" summary.
7. Specify expert mode and post-creation editing.
8. Write the newcomer copy for every step: one sentence of purpose, one of consequence, one of recommendation.
9. Measure the 15-minute target with real newcomers at the end of Phase 1 MVP.

## How

### Step order

| # | Step | Reads from content | Writes to choices | Why here |
|---|---|---|---|---|
| 0 | Content scope | Packages allowed by the campaign, or the user's enabled packages | Package pins | Every later list depends on it |
| 1 | Concept / archetype | Archetype entities | Nothing yet; sets recommendations for steps 2–4 and 5 | Newcomers think in concepts, not classes |
| 2 | Species | `Species`, sub-species | Species, sub-species, species-level choices (languages) | Fewest consequences, gentle start |
| 3 | Class | `Class` (level 1), subclass only if unlocked at level 1 | Class level 1, class-level choices (skills, saves are automatic) | Biggest decision; recommended by the archetype |
| 4 | Background | `Background` | Background, its choices | Adds skills and tools; explains the character's past |
| 5 | Ability scores | Class primary abilities, species bonuses (edition-dependent, DEC-02) | Method, scores, assignment | Needs the class to recommend where high scores go |
| 6 | Remaining choices | Every `Open a choice` effect not yet answered | Skills, languages, spells known/prepared, fighting style, expertise… | All prerequisites are now known |
| 7 | Equipment | Class and background starting equipment, `Item` | Equipment owned and equipped | Attacks on the sheet come from what is equipped |
| 8 | Personality | Background suggestions | Name, alignment, traits, ideals, bonds, flaws, appearance | Optional, last so it never blocks |
| 9 | Review | Computed sheet | Nothing; confirms and saves a snapshot | The player sees the whole result and its provenance |

Steps can be revisited in any order; step 0 changes re-validate everything after it.

### Step 1: concept and archetypes

- Archetypes are content entities: a name in plain language ("Sneaky fighter", "Healer who talks their way out", "Shadow warrior"), a two-line description, recommended species (list), class and subclass, background, ability priority (e.g. DEX > WIS > CON), recommended skills and spells, and a reason for each recommendation.
- The base package ships a starter set covering every SRD class at least once; homebrew packages can add archetypes for their content.
- Choosing an archetype preselects the recommended option in each later step; the player can change any of them. Skipping the step shows every option without a highlight.
- Example for the concept "a silent hunter who strikes from the shadows": feline species, Monk, Way of Shadow at level 3, Criminal background, DEX > WIS > CON; reason texts explain Unarmored Defense and why Wisdom matters.

### Steps 2–4: species, class, background

Each option card shows: name, one-line summary, the three consequences that matter most in play (derived from effects: "Darkvision", "+2 Dexterity", "extra skill"), a "recommended for your concept" badge with the reason, and a "full details" expansion with every feature text. Help level *newcomer* shows the cards collapsed; *expert* shows a dense list.

### Step 5: ability scores

- Methods (all Decided as supported): **standard array** (assign fixed values), **point buy** (budget with costs), **roll** (the platform rolls with the standard method and shows the dice; the campaign can require rolling at the table, in which case values are typed in). Default method: Deferred DEC-15. A campaign can restrict methods ([14](14-accounts-sharing-and-campaigns.md)).
- The wizard proposes an assignment from the archetype or class priority and explains each placement ("Dexterity highest: your attacks and Armor Class use it").
- Species and background bonuses, if the edition has them (DEC-02), are applied and shown as provenance on the resulting score.
- The modifier is displayed next to each score with the explanation "score 17 → modifier +3" on tap.

### Step 6: remaining choices

- The engine lists every unanswered `Open a choice` effect from all selected entities at level 1 ([04](04-domain-model.md)). Each is a card with the options filtered by the choice's rules (a class skill choice only offers class skills).
- Recommended options are marked with a reason; a "pick recommended" button fills the choice.
- Spell selection: filtered to the class list and level, grouped by role (damage, control, healing, utility), with a recommended set per archetype; the full list is one tap away.
- Choices with prerequisites the character does not meet are shown disabled with the prerequisite named.

### Step 7: equipment

- Default: the starting equipment pack of the class and background, with sub-choices (weapon A or B) presented as cards showing the attack each produces.
- Alternative: starting gold and a shop, behind an expert toggle or a campaign setting.
- Equipping marks items as worn or wielded; the sheet's attacks and AC update immediately with provenance.

### Step 8: personality

Suggestion tables from the background; free text; skippable. Name generator as a later addition.

### Continuous validation

- The engine's validation warnings ([04](04-domain-model.md) step 7) are displayed as a persistent badge with a count and a list: "2 choices to make: skills, cantrips". Tapping jumps to the step.
- Nothing blocks saving or moving on; a character with warnings shows them in build mode and hides them in play mode unless they affect play (an unchosen subclass at level 3 does).
- Hard errors (a referenced entity missing because a package was removed) are shown with the fix ("re-enable package X or replace the species").

### Step 9: review

- The full computed sheet in build mode ([08](08-dynamic-sheet.md)), plus a "what you can do" summary: attacks with bonuses, features with their activation, resources with maxima, spells, and a three-line "your turn usually looks like" hint from the assistant ([11](11-play-assistant.md)).
- Every derived value is tappable for provenance.
- Confirm saves a level-1 snapshot ([10](10-progression.md)); the character can still be edited afterwards, creating a new snapshot.

### Expert mode

Help level *expert* turns the wizard into a single scrolling form: all steps visible at once, no recommendations highlighted, no explanatory copy, dense option lists, direct score entry, shop instead of packs by default. Same data, same validation.

### Editing after creation

Any choice can be reopened from the sheet in build mode; the wizard opens at that step with the rest filled in. Changes that invalidate later choices (changing class) list what will be reset before confirming.

### Mapping to the domain model

Every step writes only to the character's choices as defined in [04](04-domain-model.md): species and sub-species, class levels, subclass, background, ability method and scores, answers to content-opened choices, equipment, personality. No step writes derived values. The review is the rules engine's output. Import of characters from other formats maps to the same choices (Deferred: DEC-11).

## Why

- Concept first is what makes the 15-minute target reachable: the newcomer answers one question they can answer, and the rest becomes confirmation instead of research.
- Content-driven options are the only way to satisfy Principle 6 and journey (e): the DM's allowed packages define what the wizard offers, with no special code for homebrew.
- Recommendations as content (archetypes, per-option reasons) let authors of homebrew make their material newcomer-friendly too, and keep the wizard code free of game knowledge.
- Warn-not-block matches how people actually build characters: in pieces, sometimes at the table.
- Showing the sheet during creation, with provenance, teaches the game while the character is built (Principle 1).

## Deferred decisions

- DEC-15 Default ability score method — Phase 1 MVP.
- DEC-02 Rules edition (where ability bonuses come from; race vs species terminology) — Phase 0 Foundations.
- DEC-12 Authentication and account model (creation before sign-in) — Phase 1 MVP.
- DEC-11 Import from other platforms — Phase 4 Homebrew authoring & sharing.
- DEC-09 Supported languages for the wizard copy and content — Phase 1 MVP.

## Depends on / feeds into

Depends on [02](02-personas-and-journeys.md), [04](04-domain-model.md), [05](05-content-model-and-sources.md), [06](06-homebrew-and-extensibility.md). Feeds into [08](08-dynamic-sheet.md), [10](10-progression.md), [11](11-play-assistant.md), [13](13-ux-and-accessibility.md), [14](14-accounts-sharing-and-campaigns.md).
