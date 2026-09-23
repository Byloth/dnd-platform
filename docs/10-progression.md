# 10 — Progression

## Purpose

This document specifies how a character evolves: guided level up, multiclassing, feats and ability score improvements, retraining, XP and milestone advancement, per-level snapshots with a readable diff, rollback, and how content package updates (errata, fixes) reach existing characters safely. It also specifies the "next milestones" preview that the playbook offered as "Prossimi traguardi".

## Principles

- **Level up is a guided walk through the class table** (Principle 1). The content says what a level grants; the platform turns it into steps with explanations, never a form to fill blind.
- **Nothing is computed by hand** (Principle 2): HP gains, new slot counts, new proficiency bonus, new resource maxima all come from derivation.
- **Every level is a snapshot.** Progression is a history, not an overwrite; any level can be reviewed, compared or restored.
- **Characters pin their content versions.** A package update never changes a character silently (Principle 9, data belongs to the player).
- **Show what changed, in newcomer words.** After every level up or content update, the diff is presented as "you gained…", "this number went from… to… because…".

## What needs to be done

1. Specify the level-up wizard: steps generated from the class table entry for the new level (features, choices, ASI/feat, spells, HP), their order, validation and summary.
2. Specify HP gain: average (fixed value from content) or roll, recorded in choices with the method used; CON modifier applied from derivation; retroactive CON changes recomputed automatically.
3. Specify multiclass rules as data: prerequisites (ability score minimums per class), proficiencies gained when multiclassing (the reduced list), Hit Dice per class, the multiclass spell slot table and which classes count fully, half or a third, pact slots kept separate.
4. Specify ASI/feat: the choice opened by the class table at given levels, feat prerequisites checked against the computed sheet, half-feats raising a score.
5. Specify the retraining policy: what can be changed outside a level up (prepared spells daily, known spells one per level for some classes as content declares, everything else only by DM-approved respec).
6. Specify XP and milestone modes: XP thresholds from the base package, XP entry with the log, "level available" banner; milestone mode with DM-granted or self-granted levels.
7. Specify snapshots: automatic on level up, manual on demand, immutable, named; and the diff view between any two snapshots.
8. Specify rollback: restore choices from a snapshot into a new snapshot (history is never rewritten), with state reconciliation (current HP clamped to new max, resources clamped, unknown resources dropped with a note).
9. Specify package pinning and the upgrade flow (below).
10. Specify the "next milestones" preview from the class table and subclass table.
11. Produce fixtures: the reference Monk from level 3 to 6 (Way of Shadow gains Shadow Step at 6), a multiclass caster slot table case, and an errata upgrade case.

## How

### Guided level up

Trigger: XP reaches the next threshold, or a milestone is granted, or the player starts it manually (allowed in milestone mode, or always for expert help level).

Steps, each generated only if the new level grants it:
1. **Class choice** (multiclass only): "Continue as Monk" is the default; other classes appear with their prerequisites evaluated and, for newcomers, a warning that multiclassing is an advanced option.
2. **Hit points**: show the Hit Die, the average value and the roll option; show the CON modifier that will be added; record the method. Default per help level is average (Decided): rolling is offered but a newcomer sees why average is safe.
3. **New features**: one card per feature from the class table and, if applicable, the subclass table for this level, with text and a plain-words summary of its effects ("you get a new resource: 2 uses per short rest").
4. **Choices opened at this level**: subclass at the class's unlock level, fighting style, expertise, metamagic, invocations… each with the same guided picker as creation ([07](07-character-creation.md)), including recommended options for newcomers.
5. **ASI or feat**, when the class table opens it: two clear paths, feat prerequisites checked, effect preview ("Dexterity 17 → 19: Stealth +5 → +6, AC 15 → 16").
6. **Spells**: new cantrips or spells known per the class's spellcasting definition; prepared casters see the new preparation limit; spells granted by a subclass appear automatically.
7. **Summary**: the full diff (below) and a confirm button that creates the snapshot.

The wizard can be left and resumed; nothing is applied until confirmed.

### Multiclassing

- Prerequisites, proficiency subsets, and slot progression are content in the base package, evaluated by the engine.
- Hit Dice are tracked per class die (e.g. 3d8 + 2d10), and spent per die type on a short rest ([09](09-play-mode.md)).
- Spell slots for multiclass casters: the engine sums caster levels with the weights each class declares (full, half, third) and reads the multiclass slot table; spells known/prepared stay per class; pact magic slots are a separate resource that does not merge.
- Proficiency bonus is by total character level; class features by class level; the diff makes this explicit for newcomers.
- Help level *newcomer* hides multiclassing behind an "advanced" toggle with an explanation of what it costs (delayed features, no extra ASIs).

### Feats and ASIs

- The class table opens an "ASI or feat" choice at the levels it declares; some subclasses or species may open extra ones (content-driven).
- ASI: +2 to one score or +1 to two, capped at 20, with the immediate preview of every derived value that changes.
- Feat: prerequisites evaluated against the computed sheet; a feat with a score increase applies it within the same step; feat features are added like any others and show up in the diff.

### Retraining and respec

- Daily preparation (clerics, druids, wizards…) is a play-mode action tied to a long rest, not progression.
- Swap-one-known-spell-on-level-up is offered only when the class's spellcasting definition declares it.
- Any other change to past choices is a **respec**: it creates a new snapshot from an edited copy of the current one, is flagged as respec in the history, and in a campaign is visible to the DM ([14](14-accounts-sharing-and-campaigns.md)). Nothing is forbidden; everything is recorded.

### XP and milestones

- Advancement mode is a character setting: XP or milestone. The play log accepts "XP gained" entries; the threshold table comes from the base package.
- When a threshold is crossed, a non-blocking "Level 4 available" banner appears; the level up is never applied automatically.
- In milestone mode the DM (or the player, outside a campaign) grants the level.

### Snapshots and diff

- A snapshot stores the complete choices, the pinned package versions, and the computed sheet at that time (so a diff never needs old packages to render).
- Diff view between two snapshots, sections in this order: new features, new actions and spells, changed derived values with old → new and the responsible contribution, changed resources, new proficiencies and choices, removed items.
- Wording by help level. Newcomer: "Your Ki went from 3 to 4 because Ki equals your Monk level." Expert: `ki.max 3 → 4 (formula: monk.level)`.

### Rollback

Restoring a snapshot copies its choices into a new snapshot ("restored from level 3"); the current state is reconciled: HP clamped to the new maximum, resources clamped, resources that no longer exist dropped with a log note, conditions kept. XP is untouched; the "level available" banner reappears if applicable.

### Package versions and rules updates (DEC-21)

- A character records the id of every package it uses and the version it was last seen with. The ids bind: a character built on `srd51` stays on SRD 5.1.
- **Updates propagate by themselves.** A newer version of a package (errata, a fix of our encoding, a better-modelled effect) applies to every character. When the character is opened with a newer version, the application fetches the version it was last seen with (the site publishes every release), derives the sheet with both, and compares.
- **The player is told only when their sheet changed**, with the same diff wording as a level up: "Because of a rules update, your hit points went from 38 to 41", "Darkness now costs 2 Ki (was 3)", with a link to the package's changelog. The recorded version then moves to the new one. Nothing is shown when nothing changed.
- **A new edition is a new package** (SRD 5.2, the 2024 rules, will be `srd52`, not a version of `srd51`). Moving a character to it is the player's choice, through the same dry run and diff as a level up, accepted or not.
- A package removed or unavailable leaves the character renderable from its last snapshot's computed sheet with a warning; nothing is lost.

### Next milestones preview

A panel on the sheet and in the printed playbook listing the next three levels of the current class (and subclass), from the class table: level, feature names, one-line summaries, and the derived values that will change (proficiency bonus, Martial Arts die, slots). Example for a Way of Shadow Monk at level 3: "Level 4: Ability Score Improvement or feat, Slow Fall. Level 5: Extra Attack, Stunning Strike, Martial Arts die d6, proficiency bonus +3. Level 6: Ki-Empowered Strikes, Shadow Step, Unarmored Movement +15 ft." Help level *newcomer* adds a sentence on why each matters.

## Why

- Generating the wizard from the class table means a homebrew class levels up with exactly the same guidance as an official one (Principle 6), and no per-class code exists to go stale.
- Snapshots make level up, respec and errata the same operation (produce a new snapshot with a diff), which keeps history honest and rollback trivial.
- Propagating fixes while telling each player what changed on their own sheet is what keeps numbers right without surprising anyone; binding the edition by package id is what keeps a campaign on the rules it chose ([05](05-content-model-and-sources.md), DEC-21).
- The diff in newcomer language is the moment the player learns what a level actually is; the playbook's "next milestones" panel did the same for motivation, and the preview keeps it.
- Recording HP method and respecs, rather than forbidding options, keeps the DM in control without making the platform a police officer.

## Deferred decisions

- DEC-02 Rules edition — Phase 0: 2024 rules change ASI/feat structure (backgrounds grant origin feats) and multiclass details; the level-up wizard consumes whatever the base package declares.
- DEC-15 Default ability score method — Phase 1: affects the creation flow more than progression, but the HP average-vs-roll default follows the same "safe default for newcomers" policy.
- DEC-16 HP gain method policy (average only, roll allowed, DM-locked per campaign) — Phase 3.
- DEC-17 Respec permissions in campaigns (free, DM approval, locked) — Phase 6.

## Depends on / feeds into

Depends on [04](04-domain-model.md), [05](05-content-model-and-sources.md), [07](07-character-creation.md), [08](08-dynamic-sheet.md), [09](09-play-mode.md). Feeds into [11](11-play-assistant.md) (next milestones, what changed), [12](12-print-and-export.md) (milestones panel, snapshot export), [14](14-accounts-sharing-and-campaigns.md) (DM visibility of respecs and version requirements), [15](15-logical-architecture.md), [16](16-roadmap.md) (Phase 3).
