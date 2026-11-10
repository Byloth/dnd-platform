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

The list, chosen with the owner on 2026-11-06 and 2026-11-10, by these rules:

- **One character per saga** (Captain America and Ghost Rider, both Marvel, are the one exception the owner accepted).
- **What makes the character unique must live in the rules, not only in their manner.** A character whose essence is outside D&D (Goku's teleport and energy waves, Thanos's cosmic power, Super Mario's power-ups) is left out.
- **The species adds fidelity**: where the character's story already has another species, the build uses it.
- **It works with the SRD alone, and is truer with the right package**: the subclass and the background are a preference with a fallback (below). The SRD has one subspecies per species and one subclass per class.

| Class | Character, EN · IT (saga, EN · IT) | Species | Subclass: preferred → fallback | Background: preferred → fallback (custom names EN · IT) | Why it is them, in the rules |
|---|---|---|---|---|---|
| Barbarian | Kratos (God of War) | Human | Berserker | Soldier (a Spartan general) → custom "Ghost of Sparta" · "Fantasma di Sparta" | his Spartan Rage is the barbarian's Rage; the Berserker's Frenzy (level 3) is him not stopping; the Leviathan Axe is a thrown axe (a handaxe) |
| Bard | Lupin III (Lupin the Third) | Human | Lore | Charlatan (a false identity) → custom "Gentleman thief" · "Ladro gentiluomo" | the disguise (*disguise self*) and the charm (*charm person*) are bard spells; Deception, thieves' tools; his pistol is not in the rules (no firearms in the SRD) |
| Cleric | Shadowheart · Cuorescuro (Baldur's Gate 3) | Half-elf | Trickery → Life | Acolyte (as in the game) | a cleric of a dark goddess: the Trickery domain's disguises and duplicate; with the SRD alone, Life |
| Druid | Getafix · Panoramix (Asterix) | Human | Land (forest) | Sage → Acolyte | *the* druid; the golden sickle and the herbalism kit are a druid's own; the magic potion is *enhance ability* (Bull's Strength, from level 3), the berries *goodberry* |
| Fighter | Geralt of Rivia · Geralt di Rivia (The Witcher) | Half-elf | Eldritch Knight → Champion | Outlander → custom "Witcher" · "Witcher" | the half-elf's darkvision is his cat's eyes, its resistance to charm a witcher's; the signs are the Eldritch Knight's spells (Aard *thunderwave*, Igni *burning hands*, Quen *shield*, from level 3); as a Champion, no signs |
| Monk | Kenshiro (Fist of the North Star · Ken il guerriero) | Human | Open Hand | Folk Hero → custom "Successor of Hokuto" · "Successore di Hokuto" | pressure points are Stunning Strike (level 5); "you are already dead" is the Open Hand's Quivering Palm (level 17) |
| Paladin | Captain America · Capitan America (Marvel) | Human | Devotion | Soldier → custom "Super-soldier" · "Super-soldato" | the oath is his code; the Protection fighting style (level 2) is the shield raised for a friend; the thrown shield is an improvised weapon (low damage) |
| Ranger | Legolas (The Lord of the Rings · Il Signore degli Anelli) | High elf | Hunter | Noble (a prince of the woodland elves) → custom "Elven prince" · "Principe elfico" | the archer: the Archery fighting style (level 2); the elf's keen senses (Perception) |
| Rogue | Ezio Auditore (Assassin's Creed) | Human | Assassin → Thief | Criminal (the Brotherhood as contacts) → custom "Florentine assassin" · "Assassino fiorentino" | sneak attack, the hidden blade; Assassinate (level 3), or climbing as a Thief (Second-Story Work, level 3) |
| Sorcerer | Elsa (Frozen · Frozen - Il regno di ghiaccio) | Human | Draconic (white dragon, cold) | Noble (a queen) → custom "Queen of Arendelle" · "Regina di Arendelle" | a sorcerer is born with magic and struggles to master it, which is her story; at level 1 only *ray of frost*, the rest of the ice later (*wall of ice* is the wizard's only); the dragon's scales told as ice |
| Warlock | Ghost Rider (Marvel) | Tiefling | Fiend | Entertainer (the stunt rider) → custom "Stuntman" · "Stuntman" | a pact with a devil; hellfire: the tiefling resists fire and casts *hellish rebuke* (level 3); the chain as the Pact of the Blade's weapon (level 3); no motorbike in the rules |
| Wizard | Frieren (Frieren: Beyond Journey's End · Frieren - Oltre la fine del viaggio) | High elf | Evocation | Sage → custom "Collector of spells" · "Collezionista di incantesimi" | she spends centuries collecting spells, as a wizard copies every spell found into the spellbook; an elf lives for centuries; her Zoltraak, the killing magic, is an evocation |

Seven humans, two high elves (Legolas, Frieren), two half-elves (Shadowheart, Geralt) and a tiefling. Every name, saga and custom background is localized: English in `fan-heroes`, Italian in `fan-heroes-it` (the names above, and the official Italian names of subclasses and backgrounds from the Italian Player's Handbook). Notes:

- **Preference with a fallback** (owner, 2026-11-10): an archetype may name, in order, the subclasses and backgrounds it prefers; the first one loaded wins, so Shadowheart is a Trickery cleric with the owner's Player's Handbook and a Life cleric without it. The archetype schema widens `recommends.subclass` and `recommends.background` to accept an ordered list (additive, format v0); a custom background is a valid last entry (task 5). The idea's card says what changes when the package is loaded.
- Left for swaps: Shrek (half-orc barbarian, set aside by the owner: not convincing in a Rage), Grom Hellscream (half-orc barbarian), Aang (monk, Four Elements → Open Hand), Aragorn (human ranger, the owner's second choice), Link (high elf ranger or fighter), Mercy and Zelda (cleric), Gimli (dwarf fighter), Bilbo Baggins (lightfoot halfling rogue), the Dragonborn of Skyrim (dragonborn sorcerer), Hermione Granger and Gandalf (wizard), Beast Boy and Malfurion Stormrage (druid), Spock (half-elf). No well-known gnome was found.
- **The path:** at level 1 almost nobody is "them" yet (Wild Shape at 2, most subclasses at 3, the signature features much later). Proposed: an optional, additive field of the archetype listing the levels that make the character (for example "level 17, Quivering Palm: 'you are already dead'"), shown on the idea's card. The limits above (Captain America's thrown shield, Elsa's ice, Lupin's pistol) are told there too.
- **Order:** the fallback to a custom background needs task 5, so task 5 comes before task 2.

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
2. **Step 1 and the extension** (M1.Wb): the question, the gallery, the archetype's ordered preferences (subclass and background, additive), the `fan-heroes` packages in both languages, the preference, the "Extensions" section, the credits; tests.
3. **Option cards** (M1.Wc): the composer's new kinds with goldens and `dnd show`, the descriptions in srd51 and srd51-it, the chips and "Details", the folding and its focus; tests.
4. **Choices where they are made and Spells** (M1.Wd): `choicesOfStep`, the steps' groups, `StepSpells.vue`, Other choices only when needed, `stepDone`, the review and the sheet's links; the twelve-class flow answering in every step; tests.
5. **Custom background** (M1.We): the schema field, the engine, validation, export and import, the wizard, the sheet and the PDF; fixtures equal between the CLI and the browser.

Order (owner, 2026-11-10): 1, 3, 4, 5, then 2, since the famous characters fall back to custom backgrounds and prefer subclasses and backgrounds of other packages. Each part updates the roadmap page and its "As built" note here.

### As built (2026-11-10): step 0, the recommended deal, the personality accordions (task 1, M1.Wa)

- `useContentStore().choosable` (the stored packages that are not translations, now shared with `StepContent.vue`) and `offersChoice` (one of them, or a site package beside the base). `wizard.steps` offers `content` only with `offersChoice` or a character that already uses more than the base; with the SRD alone the wizard opens on the concept.
- `_offered(step)` in `stores/wizard.ts`: the step itself, else the nearest offered one before it, else the first. `start()`, `edit()`, `resume()` and `goTo()` go through it, and a watch moves the wizard when its step stops being offered. The address already followed `wizard.steps`.
- `recommendedPointBuy(order, pointBuy, standardArray)` in `composables/ability-scores.ts`; `dealRecommended()` uses it for point buy, and `chooseMethod("point-buy")` uses it when the current scores do not fit. With rolls the button is disabled until the six are valid, `aria-describedby` pointing at the reason.
- The personality suggestions are closed for every help level, in a bordered accordion with a chevron.
- Tests: `ability-scores.test.ts` (the spread, exact and greedy), `wizard-store.test.ts` (step 0 offered or not, the fallback), `wizard-page.test.ts` (the point-buy deal, the disabled button; the step numbers without step 0), `accessibility.test.ts` (eight sections on the expert's page).

### As built (2026-11-10): option cards and folding (task 3, M1.Wc)

- `composeEntry` (`packages/composer/src/entry.ts`) also takes species (and subspecies), classes and backgrounds: labelled `lines` (size, speed, senses, languages; hit die, primary abilities, saving throws, armour, weapons, tools, skills; the background's skills, tools, languages and equipment), the traits as `sections` (a class's level 1 features), and `facts` for the chips: ability increases and darkvision read from the features' effects, the walking speed; "Hit Die d10" and "Casts spells" (a `grant-spellcasting` at any level); the background's skills, its languages to choose and its feature's name. The labels are in `sheet.entry.labels` and `sheet.entry.option` (English and Italian). `dnd show` prints them; goldens `fixtures/entries/{dwarf,dwarf-hill-dwarf,wizard,acolyte}.{en,it}.txt`. A composed entry was preferred to a second function: one place for the words, and the compendium can list these kinds later.
- `ChoiceCard.vue` takes an `entry`: the facts as stats (accent chips) inside the label, and "Details" outside it (a `<details>` with the lines and the traits, `RichText`). `useWizardContext().entry(id)` composes it in the interface's language and units. The class card keeps its primary abilities and saves; the hit die is among the stats.
- `composables/fold.ts`, `useFold(chosen, hasNext, expert)`: the list shows only the chosen card while a choice exists and something follows (subspecies; the class's subclass, and the class's choices with task 4); "Change" opens it, "Keep this choice" folds it back; after a new choice the next heading (`tabindex="-1"`: the subspecies' legend, a `ChoiceGroup`'s title) takes the focus. The expert's dense page never folds.
- Content: `summary`, a new optional field of classes and species (format v0), one line of the platform's own in English (tools/import overlays) and Italian (srd51-it); `useEntities().summary` prefers it. srd51 0.10.0, srd51-it 0.6.0; every fixture pins srd51 0.10.0.
- The "Your character so far" panel is not built: it waits for the owner (open points).

### As built (2026-11-10): choices where they are made, and Spells (task 4, M1.Wd)

- `composables/choice-steps.ts` (pure): `choiceStep(choice, set)` gives every spell and cantrip to `spells`, the subclass and what a class or subclass gives to `class`, a species' to `species`, a background's to `background`, the rest to `choices`, and a later level's ability increase or feat to none; `rootOwner` walks the inline owners. `choicesOfStep(step)` in `composables/wizard.ts` reads the draft's sheet through it.
- `STEPS` gains `spells` between `abilities` and `choices`; `wizard.steps` offers `spells` and `choices` only when the sheet asks something there. With the SRD alone no archetype leaves anything for Other choices; it stays for a feat's own choices (the private variant human).
- `components/wizard/StepChoiceGroups.vue` renders a step's groups (cantrips first, then by origin), used by Species (after the subspecies), Class (after the subclass, which keeps its own block), Background, Spells (`steps/StepSpells.vue`, new) and Other choices. The folding now counts the step's choices as "something after", so a class always folds; the background folds only when there is more than one.
- `stepDone` asks each step's own choices; the review's issues and the sheet's "Change" links go to the choice's step (`skills` and `features` to Class, `spellcasting` and `spells` to Spells).
- Copy: the Spells step's purpose, consequence and recommendation, and Other choices' in English and Italian.
- Tests: the twelve-class flow answers every step's groups; `wizard-page.test.ts` (the Acolyte's languages in Background, the cantrips in Spells, the fighting style in Class, which steps are offered); `accessibility.test.ts` (the choices in Spells, Class and Background, both languages).

### As built (2026-11-10): the custom background (task 5, M1.We)

- The character document's `choices.customBackground` (additive, format v0): `name` (required), `skills`, `tools`, `languages`, `feature` (a background feature's id) and `equipment` (the background whose equipment package the character takes), in place of `choices.background`. `CUSTOM_BACKGROUND` (`custom-background`, in the schema package) is its owner id.
- The engine derives it as a background with nothing left open: the lists as proficiencies and languages, the feature with origin `background`. The composer names it by the character's words, on the identity line and wherever a contribution's source is shown.
- The wizard: a "Custom" card at the end of step 4 (`chooseCustomBackground`, which drops the background and its answers), and `components/wizard/CustomBackground.vue`: the name, then four choice groups like the sheet's (two skills of the ruleset's; two among the ruleset's languages and the tools the loaded backgrounds give; a feature of a loaded background; a background's equipment package). The step is done when all four are complete. The equipment step reads the named background's package; removing a package clears the feature or the equipment it gave.
- Not built: the SRD's other way to equip, spending coin instead of the package (open points).
- Fixture `fixtures/characters/custom-background-l1` (CLI); tests in `wizard-page.test.ts` (through the interface, then the sheet) and `accessibility.test.ts` (both languages).

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

- The package's name; the archetype's path field (the owner's).
- The "Your character so far" panel (the owner's).
- Whether the extension is offered to an existing player as a one-time notice, or only found on the packages page.
- The custom background's coins instead of an equipment package (the SRD allows either).
