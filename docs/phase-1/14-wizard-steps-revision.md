# Phase 1 — 14 Wizard steps revision (owner's review, 2026-11-06)

## Purpose

The owner went through the ten steps of the creation wizard ([04-character-creation.md](04-character-creation.md)) and found that, in several places, they read like a configurator: walls of options that do not say what they change, choices gathered in an "Other choices" step far from where they come from, a first step that confuses a newcomer, a "Deal as recommended" button that does not always work. The revision of 2026-09-25 ([09-interface-revisions.md](09-interface-revisions.md)) touched only the wizard's frame (its bar, transitions and focus); this one is about what each step shows.

The guiding principle is the owner's: **the interface of a video game for D&D played at the table, not a configurator.** A choice is a selection, as on a role-playing game's creation screen; what an option gives is shown as statistics; the chosen option stays in view as "equipped" and the screen moves on to what comes next.

It is done **before the newcomer sessions (M1.8c)**, so the test measures the new wizard. The milestone is M1.W in [08-workplan.md](08-workplan.md).

The owner's points are numbered by step, 0 to 9. Steps 7 (equipment) and 9 (review) stay as they are.

## Decisions

Taken by the owner on 2026-11-06:

- **Step 0, content, is shown only when there is something to choose** (0). A newcomer who sees only "SRD 5.1", and cannot even turn it off, is lost before starting; a player who loaded packages knows what they are.
- **Step 1 asks one question first** (1): "Start from scratch, choosing every aspect yourself, or from a character already sketched, to make your own?" Only the second answer shows the ideas. Today's list of twelve ideas is too much even for someone who knows the game.
- **Famous characters as ideas, in an extension** (1; DEC-27, which takes up the point set aside on 2026-09-25):
  - A package of fan-made famous characters from popular culture (Geralt of Rivia, Goku, Thanos, Captain America, Link, Super Mario…), so that a person who never played sees at once what they have in hand.
  - It lives in the repository and is **on by default**. When on, its ideas **replace** the SRD's twelve; when off, the SRD's come back.
  - It is not shown in step 0 and is not part of a character's packages: an idea only prefills, as today.
  - On the packages page it is not listed as a package. It sits in a small new section, **"Extensions"**, between "Installed packages" and "Space on this device": a card a quarter of the page wide with a tick, a title and a short description, like the cards of the settings page.
  - An extension changes how the interface behaves more deeply than a rule does. For now there is this one only, and **no general infrastructure** for extensions.
  - Only the names are borrowed: the builds, the pitches and the reasons are ours, with no images and no copied text, and a notice. The trademark exposure is accepted by the owner ([../18-risks.md](../18-risks.md), R-01).
- **Game details on the species, class and background cards** (2, 3, 4): a few key labels always in view (ability increases, darkvision, speed; hit die, saves; skills, languages), and a "Details" disclosure with every trait and its text.
- **A chosen option collapses** (2, 3): once chosen, the list folds to the chosen card with a "Change" button, and the attention moves to what follows (the subspecies, the class's choices, the subclass).
- **A custom background, by the SRD's rule** (4): "Customizing a Background" (SRD 5.1, p. 60; Italian "Personalizzare un background", p. 65), already in the content as the rule `srd51.rule.backgrounds.customizing-a-background`. The SRD has a single background, the Acolyte, so this is where variety comes from.
- **"Deal as recommended" works with every method** (5): with point buy it gives a recommended spread within the budget; with rolls it is disabled until the six rolls are valid, with the reason beside it.
- **Choices move to the step that makes them** (6): the Acolyte's two languages go to the background step, the skills and the fighting style to the class step, a species' choices to the species step. **Spells and cantrips go to a new "Spells" step**, shown only when the character has some, whatever gives them. "Other choices" stays only for what has no step of its own, and is hidden when empty.
- **The personality suggestions fold** (8): each one behind a closed accordion, open on demand.

## Design

### Steps

| # | Step | Offered when |
|---|---|---|
| 0 | Content | the player stored packages of their own (not translations), or the character being edited uses more than the base |
| 1 | Idea | creating (not editing), as today |
| 2 | Species | always |
| 3 | Class | always |
| 4 | Background | always |
| 5 | Ability scores | always |
| 6 | Spells (new) | the sheet asks a spell or cantrip choice |
| 7 | Other choices | the sheet asks a choice that no other step takes |
| 8 | Equipment | always |
| 9 | Personality | always |
| 10 | Review | always |

- `wizard.steps` (`stores/wizard.ts`) becomes a computed of these conditions, read by the stepper, the step list, Back and Next, "Step n of N" and the expert's single page, which already follow it.
- `start()` and `discard()` open the first step offered instead of `"content"`; a resumed draft or an address naming a step no longer offered falls back to the nearest one before it.
- The condition of step 0 is the one `StepContent.vue` already uses for its choosable cards (`content.stored` without translations), moved where the store can read it.

### Step 1: the question, then the ideas

- Two large cards: **"From scratch"** ("You choose species, class and everything else, step by step") and **"A sketched character"** ("Pick a character to start from; everything stays changeable").
- "From scratch" is today's "I'll choose myself": nothing is prefilled.
- "A sketched character" opens the gallery of ideas below, and `chooseArchetype` prefills as today.
- In the gallery each idea is a card with its name, its pitch and its build as labels (class, species), in the style of the cards of step 2.

### The famous characters' package

- Proposed name: **`fan-heroes`**, "Famous heroes" / "Eroi famosi" (the owner decides), in `packages/content/fan-heroes` and `fan-heroes-it`.
- It holds only `archetype` entities (`archetype.schema.json`, unchanged) that point at `srd51` ids, so each idea works with the SRD alone. It is released and published by the site like the other public packages (`dnd release`, the index).
- The manifest and the credits page carry the notice: an unofficial fan work, not affiliated with or endorsed by the owners of the characters, the names belonging to their owners; no image and no text taken from the works.
- The extension is a preference (`stores/preferences.ts`, on by default). When on, step 1 lists the package's ideas only; when off, the SRD's. If the package cannot be fetched, the SRD's ideas are shown.

The list, chosen with the owner on 2026-11-06, by these rules:

- **One character per saga.**
- **What makes the character unique must live in the rules, not only in their manner.** A character whose essence is outside D&D (Goku's teleport and energy waves, Thanos's cosmic power, Super Mario's power-ups) is left out.
- **The species adds fidelity**: where the character's story already has another species, the build uses it.
- **It works with the SRD alone**: one subspecies per species (hill dwarf, high elf, lightfoot halfling, rock gnome) and one subclass per class.

| Class | Character (saga) | Species | Why it is them, in the rules |
|---|---|---|---|
| Barbarian (Berserker) | Shrek | Half-orc | big, green, scares the villagers (the half-orc's Intimidation); gets back up at 1 hit point; rage, and no armour in his swamp |
| Bard (Lore) | Lupin III | Human | the disguise (*disguise self*) and the charm (*charm person*) are bard spells; Deception and thieves' tools |
| Cleric (Life) | Shadowheart (Baldur's Gate 3) | Half-elf | a cleric with armour and faith, from a game that is D&D itself |
| Druid (Land) | Merlin (The Sword in the Stone) | Human | the duel with Madam Mim is all shapes of animals: the druid's Wild Shape (level 2) |
| Fighter (Champion) | Link (The Legend of Zelda) | High elf | pointed ears, every weapon, shield and bow; the high elf's cantrip for his bit of magic |
| Monk (Open Hand) | Kenshiro (Fist of the North Star) | Human | pressure points are Stunning Strike (level 5); "you are already dead" is the Open Hand's Quivering Palm (level 17) |
| Paladin (Devotion) | Captain America (Marvel) | Human | the oath is his code; the Protection fighting style (level 2) is the shield raised for a friend |
| Ranger (Hunter) | Geralt of Rivia (The Witcher) | Human | favoured enemy (monsters), tracking, fighting with two weapons; the signs as ranger spells |
| Rogue (Thief) | Ezio Auditore (Assassin's Creed) | Human | sneak attack, the hidden blade, climbing (Second-Story Work, level 3) |
| Sorcerer (Draconic, white) | Elsa (Frozen) | Human | a sorcerer is born with magic and struggles to master it, which is her story; the cold from a white dragon ancestor |
| Warlock (Fiend) | Ghost Rider (Marvel's second, see below) | Tiefling | a pact with a devil; hellfire: the tiefling resists fire and casts *hellish rebuke* |
| Wizard (Evocation) | Gyro Gearloose (Disney comics) | Rock gnome | the rock gnome builds clockwork devices, an inventor by nature; Little Helper is his familiar (*find familiar*, a level 1 wizard spell) |

Seven humans and five other species. Notes:

- **Shadowheart** is a Trickery cleric in Baldur's Gate 3; Trickery is not in the SRD, so the build takes Life. With the owner's Player's Handbook loaded the player can switch.
- **Captain America and Ghost Rider are both Marvel**, against the first rule; to settle (the owner's). The alternatives for the warlock: Faust, Constantine; for the paladin: Uther the Lightbringer (Warcraft).
- Left for swaps: Gimli (dwarf fighter, the dwarf's training with axes), Bilbo Baggins (lightfoot halfling rogue), the Dragonborn of Skyrim (dragonborn sorcerer, the breath weapon as the Shout), Hermione Granger (wizard), Spock (half-elf).
- **The path:** at level 1 almost nobody is "them" yet (Wild Shape at 2, most subclasses at 3, the signature features much later). Proposed: an optional, additive field of the archetype listing the levels that make the character (for example "level 17, Quivering Palm: 'you are already dead'"), shown on the idea's card.
- **The background:** with the Acolyte alone, Geralt, Ezio and Lupin would all be acolytes. They become faithful with the custom background (task 5: "Witcher" with Survival and an herbalism kit, "Gentleman thief" with Deception and thieves' tools); proposed: the archetype may recommend a custom background, and task 5 comes before task 2.

### The packages page: "Extensions"

- A section between "Installed packages" and "Space on this device", titled "Extensions", with one sentence: "They change how the application behaves; you can turn them off."
- Each extension is a small card like those of `pages/settings`: a checkbox, the title, a short description ("Famous characters from films, comics and games as ideas to start from, in place of the SRD's").
- The package never appears among the installed packages nor in step 0.

### Option cards: details as statistics

- **The composer** learns species, subspecies, class and background in `composeEntry` (`packages/composer/src/entry.ts`, on the shared base of `display.ts`, units included):
  - `lines` are the key labels:
    - species: ability increases and darkvision (read from the features' `effects`), size, speed, languages;
    - class: hit die, saving throws, armour and weapons, the number of skills, "casts spells";
    - background: skills, tools, languages, the feature's name.
  - `sections` are the traits or features with their text.
  - The labels are in the sheet catalogue (`sheet.entry.*`, English and Italian), with goldens in `fixtures/entries` and `dnd show` for the new kinds.
- **The card** (`components/wizard/ChoiceCard.vue`) shows the labels as chips, like a game's stats, and a "Details" disclosure outside the `<label>`, where the "Why?" already sits, with the sections in a compact version of the compendium's entry.
- **Descriptions:** most classes and some species have no text, so their card has no summary. One line of our own per class and species is written in English and Italian (srd51 and srd51-it, a minor version), in the same voice as the archetypes' pitches.
- **Proposed, for the owner to approve:** a "Your character so far" panel beside the steps on desktop (folded on a phone), with portrait-free statistics that update at every choice (species, class, hit points, armour class, the six scores), as a game's creation screen does.

### Collapsing a chosen option

- After a choice in a list that has something after it, the list folds to the chosen card, marked as chosen, with a "Change" button; the next group (subspecies, the class's choices, the subclass, the background's choices) comes into view and its heading takes the focus.
- "Change" opens the list again; a change that drops answers still asks first (`useResetConfirmation`).
- Coming back to a step with a choice made shows it folded.
- The expert's single page does not fold.

### Choices where they are made

- An open choice belongs to the step of its root entity, found by walking `inline.owner` as `rank()` in `StepChoices.vue` and `owner()` in `composables/choice-options.ts` already do:
  - species and subspecies → Species;
  - class, subclass and class features → Class;
  - background → Background.
- Exception: every spell or cantrip choice, whatever its root (the high elf's cantrip too), goes to Spells.
- What has no root among these stays in Other choices.
- A shared helper (`choicesOfStep`, in `composables/wizard.ts`) is used by the steps, `stepDone`, the review's "Change" targets and the sheet's links. It replaces the hard-coded `"choices"` targets of `StepReview.vue` and `SheetView.vue` and the class step's filter on `key.startsWith(classId#)`, which misses choices owned by a feature (the rogue's expertise).
- In each step the choices come after the folded card, in `ChoiceGroup` as today.

### Spells

- A new step, `StepSpells.vue`, between ability scores and equipment: it comes after the scores, which set how many spells a prepared caster has.
- The cantrips first, then the spells by level, in `ChoiceGroup` as it is (search, groups by level, links to the compendium).
- Its copy says what a cantrip and a spell are, at the newcomer level.

### Custom background

- A "Custom" card at the end of step 4. Chosen, it opens:
  - a name for the background;
  - two skills of any;
  - two among tools and languages, taken from the sample backgrounds;
  - a feature from a loaded background;
  - the equipment of a loaded background, or coins;
  - the personality of step 8, which then has no background suggestions.
- **The character document** gains an additive field (format v0) in its choices, for example `customBackground: { name, skills, tools, languages, feature, equipment }`, instead of `background`.
- **The engine** derives it as a background: the proficiencies, the languages, the feature's effects, the equipment.
- Validation, export and import, the sheet and the PDF follow, showing the chosen name.

### Ability scores: the recommended deal

- **Point buy:** a spread within `ruleset.abilityScores.pointBuy`. If the standard array costs exactly the budget (in the SRD, 15, 14, 13, 12, 10, 8 cost 27), it is dealt in the recommended order. Otherwise points are spent greedily along the recommended order up to the highest allowed score.
  - The function sits in `composables/ability-scores.ts`, beside the costs.
- **Roll:** the button is disabled until the six rolls are valid, with the reason beside it ("Enter or roll all six scores first"). Once they are valid it places them as today.

### Personality

- The suggestions under each trait already sit in a `<details>` (`StepPersonality.vue`), open for every help level but expert. They become closed for every level, in the style of an accordion: a full-width summary with a chevron.

## Tasks

1. **Step 0, the recommended deal, the personality accordions** (M1.Wa): the conditional steps' mechanism, its fallback, and the three fixes; tests.
2. **Step 1 and the extension** (M1.Wb): the question, the gallery, the `fan-heroes` packages in both languages, the preference, the "Extensions" section, the credits; tests.
3. **Option cards** (M1.Wc): the composer's new kinds with goldens and `dnd show`, the descriptions in srd51 and srd51-it, the chips and "Details", the folding and its focus; tests.
4. **Choices where they are made and Spells** (M1.Wd): `choicesOfStep`, the steps' groups, `StepSpells.vue`, Other choices only when needed, `stepDone`, the review and the sheet's links; the twelve-class flow answering in every step; tests.
5. **Custom background** (M1.We): the schema field, the engine, validation, export and import, the wizard, the sheet and the PDF; fixtures equal between the CLI and the browser.

Each part updates the roadmap page and its "As built" note here.

## Tests

- Step 0 offered and not offered; a resumed draft on a step no longer offered.
- Point buy's recommended deal within the budget for every archetype order; the roll button's disabled state.
- Step 1's two paths; the extension on (only its ideas), off (the SRD's), unreachable (the SRD's).
- The composer's goldens for a species, a subspecies, a class and the background, in English and Italian, metric and imperial.
- Folding and focus in steps 2 and 3, "Change" with and without dropped answers.
- The twelve `created-*` characters through the new steps, with every choice answered where it now sits and nothing open at the review; the private Monk at step 3.
- A custom background derived equal by the CLI and the browser, exported and imported.
- The accessibility tests over every new step and state, in both languages.

## Open points

- The package's name; Captain America or Ghost Rider (both Marvel); the archetype's path field; task 5 before task 2 (the owner's).
- The "Your character so far" panel (the owner's).
- Whether the extension is offered to an existing player as a one-time notice, or only found on the packages page.
