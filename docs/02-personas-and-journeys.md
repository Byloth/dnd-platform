# 02 — Personas and journeys

## Purpose

This document describes who uses the platform and what a complete path through it looks like for each of them. Every journey is written as a sequence of touchpoints; for each step it names the *confusion moment* a newcomer hits with today's tools and how the platform removes it. Later documents ([07](07-character-creation.md), [08](08-dynamic-sheet.md), [09](09-play-mode.md), [10](10-progression.md), [12](12-print-and-export.md)) must satisfy every touchpoint listed here.

## Principles

- **Design for the newcomer, do not punish the expert.** Every journey is written from the newcomer's point of view; the expert gets the same path with less explanation (help level *expert*, Principle 4).
- **A journey ends at the table.** Creation, progression and printing exist to make the session better; if a step does not improve play, it is not a step.
- **No journey requires reading a rulebook.** Any rule needed to complete a step is explained at that step (Principle 1).
- **The same character serves every journey.** There is one character document; build, play, print and DM views are views of it ([04](04-domain-model.md)).

## What needs to be done

1. Validate the four personas with at least one real person each (the newcomer who received the original playbook is the first candidate).
2. Turn every touchpoint below into an acceptance scenario in the corresponding feature document.
3. Keep a "confusion log": every question a newcomer asks during test sessions is added to the relevant journey until the platform answers it in place.
4. Define the help-level defaults per persona (newcomer → *newcomer*, others → *regular*).
5. Re-run journey (a) with a stopwatch at the end of Phase 1 MVP: the 15-minute target from [01](01-vision.md) is a release criterion.

## How

### Personas

**Newcomer player (primary).** Invited by a friend to a campaign. Has watched a show or played a video game with D&D flavour, has never read the rules. Goals: be useful at the table, not slow the group down, understand what their character can do. Frustrations: too many terms at once, not knowing which numbers matter, being told "just roll a d20 and add your modifier" without knowing which one. Needs: guidance with reasons, one place with everything, the "why" one tap away, a printed copy they can hold.

**Experienced player.** Has several characters behind them, knows the rules, wants speed and correctness. Goals: build an exact character fast, use every optional rule the DM allows, never recompute by hand. Frustrations: tutorials in the way, homebrew that cannot express their build, sheets that are wrong after a level up. Needs: expert mode, full option visibility, provenance to check numbers, reliable export.

**Dungeon Master.** Runs the group, often the one who invites the newcomer. Goals: see every player's sheet, control which books and homebrew are allowed, help newcomers without doing their sheet for them. Frustrations: players with out-of-date or wrong sheets, content from books the group does not use, spending session time explaining the same rule. Needs: read access to sheets, per-campaign allowed packages, confidence that the platform explains rules the same way they would. Delivered in Phase 6 DM & campaigns, modelled from Phase 0 ([14](14-accounts-sharing-and-campaigns.md)).

**Homebrew author.** Writes custom species, subclasses, spells, items, sometimes transcribes an official book for private use ([05](05-content-model-and-sources.md)). Goals: material that works exactly like official material everywhere; easy sharing with their group or the public. Frustrations: tools where homebrew is a text box, no way to test the material on a character, no versioning. Needs: a full content format ([06](06-homebrew-and-extensibility.md)), validation, live preview, visibility control.

### Journey (a): first character in 15 minutes

Persona: newcomer. Target: under 15 minutes without asking anyone what a word means.

1. **Arrive.** Opens the link the DM or a friend sent; no account required to start (Deferred: DEC-12). *Confusion today:* sign-up walls and product tours before anything useful. *Platform:* starts the wizard immediately; the character is saved to an account later.
2. **Choose the allowed content.** If the link came from a campaign, packages are preselected; otherwise the base package is on and the user is told, in one sentence, that more content can be added later. *Confusion today:* options from books the group does not own. *Platform:* content-driven option lists ([07](07-character-creation.md)).
3. **Say what you want to be.** Picks an archetype in plain words ("a sneaky fighter", "a healer who talks their way out") or skips to a full list. *Confusion today:* being asked for a class before knowing what a class is. *Platform:* archetypes map to recommended species, class and background with a one-line reason each.
4. **Species, class, background.** Each screen shows a short description, the recommended option highlighted, and the consequences ("you will get Darkvision: you see in the dark"). *Confusion today:* walls of traits with no hierarchy. *Platform:* progressive disclosure, full text one tap away.
5. **Ability scores.** The recommended method (Deferred: DEC-15) is preselected and explained in two lines; the wizard suggests where to put the high scores for the chosen class and says why. *Confusion today:* "point buy" with no context. *Platform:* recommendation plus explanation, other methods behind an expert toggle.
6. **Choices opened by content.** Skills, languages, spells, a fighting style. Each choice shows a recommendation and what the option does in play. *Confusion today:* choosing spells from a 300-entry list. *Platform:* filtered lists, recommended set, a "pick for me" button that fills the choice with the recommendation.
7. **Equipment.** Starting equipment packs are the default; the sheet already shows the attacks they produce. *Confusion today:* buying gear with gold before knowing what a weapon does. *Platform:* packs first, shopping later.
8. **Personality.** Name, traits, ideals, bonds, flaws with suggestions from the background; optional and skippable. *Confusion today:* blank boxes. *Platform:* suggestions, skip allowed.
9. **Review.** The computed sheet appears with a "what you can do" summary: attacks, features, resources. Every number can be tapped for its provenance ([08](08-dynamic-sheet.md)). *Confusion today:* a finished sheet that means nothing. *Platform:* the sheet explains itself.
10. **Save and share.** Save to an account, share a read-only link with the DM, or print ([12](12-print-and-export.md)).

### Journey (b): a session at the table, phone in hand

Persona: newcomer, help level *newcomer*. Reference: [09](09-play-mode.md), [11](11-play-assistant.md).

1. **Open play mode.** One tap from the character list; the screen shows HP, AC, resources and the actions available now. *Confusion today:* the build screen used as a play screen. *Platform:* a dedicated mode designed for one thumb.
2. **Roll initiative.** One button; the roll and the modifier breakdown are shown. *Confusion today:* "which number do I add?" *Platform:* modifiers are already applied and explained.
3. **My turn: what can I do?** The assistant lists the actions the character can take now, grouped by action, bonus action, reaction, with costs. *Confusion today:* nothing; the player freezes. *Platform:* the "what can I do now?" panel, derived from content and current resources.
4. **Attack.** Tap the weapon; the platform rolls to hit and shows the result, then rolls damage, applying critical rules. *Confusion today:* two rolls, three modifiers, one forgotten. *Platform:* one action, full breakdown, undo.
5. **Use a feature or cast a spell.** Tap it; the cost is spent (Ki, a slot), concentration is set if needed, the effect text is shown. *Confusion today:* forgetting to mark a slot. *Platform:* resources update themselves.
6. **Take damage, get a condition.** Enter the number; the sheet shows the new HP and, if relevant, death saves. Apply a condition from the list, with its effects listed. *Confusion today:* in the original playbook, a temporary debuff was written in the free equipment lines because the sheet had no place for it. *Platform:* a conditions section that exists on every sheet ([08](08-dynamic-sheet.md)).
7. **Rest.** Tap short or long rest; every resource recharges according to its own rule; Hit Dice can be spent with a roll. *Confusion today:* remembering what comes back when. *Platform:* automatic recovery ([04](04-domain-model.md)).
8. **Fix a mistake.** Undo the last event from the log. *Confusion today:* erasing on paper. *Platform:* every event has an inverse.
9. **End of session.** Notes, XP or milestone, session log kept.

### Journey (c): level up

Persona: newcomer. Reference: [10](10-progression.md).

1. **Trigger.** The DM says "you are level 4"; the player taps "level up". *Confusion today:* not knowing what changes. *Platform:* a guided flow that lists what is about to change.
2. **New features.** Each new feature is shown with its text and what it adds to the sheet (a new action, a bigger resource, a table step). *Confusion today:* copying text from a book. *Platform:* content does it.
3. **Choices opened.** Subclass at the right level, Ability Score Improvement or feat, new spells. Recommendations with reasons, as in creation. *Confusion today:* "feat or ASI?" with no guidance. *Platform:* explanation of the trade-off in two lines.
4. **Hit points.** Roll or take the average, as the campaign allows; the platform adds the Constitution modifier. *Confusion today:* forgetting the modifier. *Platform:* automatic.
5. **Review "what changed".** A diff of the computed sheet before and after, from the snapshot. *Confusion today:* not trusting the new numbers. *Platform:* provenance and diff.
6. **Preview of the next level.** As in the playbook's "next milestones" panel: what the next levels bring, so the player has something to look forward to.

### Journey (d): print the playbook before the session

Persona: any player. Reference: [12](12-print-and-export.md).

1. **Choose the format.** Compact (sheet only) or full playbook (cover, sheet, features and spells, tactical guide, rules cheat sheet). *Confusion today:* generic PDFs with empty boxes. *Platform:* sections in print match the sections on screen; nothing empty, nothing missing.
2. **Choose the language.** Content text in the player's language where a translation package exists ([05](05-content-model-and-sources.md)).
3. **Generate.** The PDF has fillable fields for HP, resources, conditions and notes, so it can be used for a whole session without the phone.
4. **After the session.** The player re-enters HP and resource changes on the platform, or discards the paper if the session was played digitally.

### Journey (e): the DM reads a sheet and restricts content

Persona: Dungeon Master. Phase 6 DM & campaigns. Reference: [14](14-accounts-sharing-and-campaigns.md).

1. **Create a campaign** and pick the allowed packages (base plus the books the group owns plus approved homebrew). *Confusion today:* players show up with content the DM does not know. *Platform:* option lists in creation and level up only contain allowed packages.
2. **Invite players** with a link; their characters join the campaign.
3. **Read a sheet** in the same play view the player sees, read-only, with provenance, so the DM can verify a number in seconds. *Confusion today:* "how do you have +7?" *Platform:* tap the number.
4. **Approve homebrew** submitted by a player for this campaign (visibility *campaign*).
5. **Between sessions**: see who levelled, who has not updated their HP, notes shared with the DM.

### Journey (f): an author publishes a subclass

Persona: homebrew author. Phase 4 Homebrew authoring & sharing. Reference: [06](06-homebrew-and-extensibility.md).

1. **Create a package** with a name, a version, dependencies (the base package; a class from an official package if the subclass extends it).
2. **Add the subclass** as an extension of an existing class: features per level, effects from the effect catalogue, choices, resources, actions.
3. **Validate**: schema, references, effect conformance, coherence rules; errors point at the field.
4. **Preview** on a test character of the right class at several levels; see the sheet, the play-mode actions and the printed output change live.
5. **Publish** with visibility *private*, *campaign* or *public*; public listing subject to moderation (Deferred: DEC-14).
6. **Update**: release a new version; characters pinned to the old one are prompted to upgrade with a diff.

## Why

- Writing journeys as touchpoints with a named confusion moment makes the newcomer requirement testable: each moment is either removed or it is a bug.
- The original playbook is the evidence for several steps: the free-text debuff (b.6) justifies a mandatory conditions section; the "next milestones" panel (c.6) justifies the level preview; the tactical guide justifies (b.3); the printed cheat sheet justifies (d.1).
- Putting the DM and author journeys here, even though delivered late, keeps [04](04-domain-model.md) and [14](14-accounts-sharing-and-campaigns.md) honest about what the model must support from the start (campaign-scoped packages, read-only sharing, package versions on characters).

## Deferred decisions

- DEC-12 Authentication and account model (whether creation can start without an account) — Phase 1 MVP.
- DEC-15 Default ability score method — Phase 1 MVP.
- DEC-14 Homebrew moderation policy — Phase 4 Homebrew authoring & sharing.
- DEC-06 Offline support (journey b without connectivity) — Phase 2 Play mode.

## Depends on / feeds into

Depends on [01](01-vision.md), [03](03-glossary.md). Feeds into [07](07-character-creation.md), [08](08-dynamic-sheet.md), [09](09-play-mode.md), [10](10-progression.md), [11](11-play-assistant.md), [12](12-print-and-export.md), [13](13-ux-and-accessibility.md), [14](14-accounts-sharing-and-campaigns.md), [16](16-roadmap.md).
