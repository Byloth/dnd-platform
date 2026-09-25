# 09 — Play mode

## Purpose

This document specifies the at-the-table experience: a phone in one hand, dice on the screen, every action the character can take one or two taps away, and every consequence (damage, slots, resources, rests, conditions) applied automatically and reversibly. It covers rolling, the attack and spell flows, the turn tracker, the play events of [04](04-domain-model.md), the log with undo, and what play mode deliberately leaves out.

## Principles

- **One thumb.** Everything needed in a typical turn is reachable without scrolling on a phone held in one hand. Two taps from opening the app to a roll result.
- **The system computes, the player decides** (Principles 2 and 8). Bonuses are pre-applied and broken down; the player only chooses what to do and reads results aloud.
- **Every roll is explained** (Principle 3). A result is always total + breakdown, never a bare number.
- **Everything is reversible.** Every play event has an inverse; undo is always available and safe.
- **Rests are data-driven.** Recovery comes from resource recharge rules and content, not from class-specific code.
- **Play mode is for the character, not the table.** No enemies, no initiative order for the group, no map (Principle: not a virtual tabletop, [01](01-vision.md)).

## What needs to be done

1. Specify the play-mode layout: pinned vital block, turn tracker, primary action list, collapsed sections, quick-note.
2. Specify the roll engine: dice expressions, advantage/disadvantage, breakdown record with provenance, critical detection, result presentation.
3. Specify the attack flow, the spell flow and the feature-use flow as event sequences.
4. Specify each play event from [04](04-domain-model.md) with its parameters, validation, resulting state, log entry and inverse.
5. Specify the turn tracker state machine (available / used per activity type, reset on end of turn, persistence within a session).
6. Specify short rest and long rest as derived procedures over resources and Hit Dice, including the partial-recovery rules content can declare.
7. Specify the concentration tracker and the damage-triggered check reminder.
8. Specify conditions and custom temporary effects: apply, expiry (end of next turn, minutes, rest, manual), effect badges on rolls.
9. Specify the action log format, retention per session, and undo/redo semantics.
10. Specify quick-edit tap targets and their safeguards (confirm on large deltas, no confirm on pips).
11. Produce the reference Monk session fixture: a scripted sequence of a full combat and a short rest, with the expected state after each event, for the play engine test suite ([15](15-logical-architecture.md)).

## How

### Layout

Top (always visible): current HP / temp HP / max as a large tap target, AC, speed, inspiration toggle, and the turn tracker strip.
Middle: the Actions section grouped Action / Bonus action / Reaction / Other; each entry is a button with its cost, greyed out when the resource is empty or the activity type has been used this turn.
Below: Resources (pips), Spells (cast buttons), Skills and Saves (roll buttons), then everything else collapsed.
A persistent "Assistant" tab opens the tactical layer ([11](11-play-assistant.md)); a persistent "Log" tab opens the history with undo.

### Dice rolling

- Any button that rolls produces: the raw dice, the total, and a breakdown listing each contribution with its source, in the same wording as "explain this number" ([08](08-dynamic-sheet.md)).
  Example: `Stealth 17 = d20 (12) + 3 Dexterity + 2 proficiency (Criminal)`.
- Advantage and disadvantage: a three-state toggle before rolling (normal / advantage / disadvantage); active conditions or features that impose one pre-set it and show why ("Advantage: Cat's Talent"). Both d20 are shown, the kept one highlighted. Multiple sources never stack, as per the rules.
- Situational modifiers: a small +/- input for what the DM grants on the spot; recorded in the breakdown as "situational".
- Natural 20 and 1 are highlighted; on an attack, a natural 20 marks a critical hit and doubles the damage dice automatically.
- Manual mode: a player who prefers physical dice enters the d20 result and the app applies the rest. The breakdown is identical.
- Fairness, seeding and verifiability of the digital dice are deferred (DEC-05), and so is the owner's choice of a rolling logic (plain or "karmic" dice, a user setting).

**The dice overlay** (owner, 2026-09-25, after D&D Beyond's):
- Every roll throws dice of the right kind over the page (1d20, 2d4, 8d6…), animated.
- The result, with its breakdown, lands in a tray in a corner of the page, which keeps the list of the latest rolls and their results.
- Later: the dice's look can be customised (colours, materials, sets).
- Under `prefers-reduced-motion` no dice are thrown; the result appears in the tray at once.
- The overlay never covers the controls that act on the result (hit, miss, apply damage).

**Rolling from the sheet** (owner, 2026-09-25): initiative, attacks (to-hit and damage), saves, checks and spells roll from the values of the sheet itself, with the hover, click and tap rules of [08](08-dynamic-sheet.md) ("Hover, click and roll"). Clicking initiative rolls d20 + the initiative bonus and shows it in the tray.

### Attack flow

1. Tap an attack (weapon, unarmed strike, Claws). Choose advantage state if not pre-set.
2. Roll to hit: `d20 + ability + proficiency (+ magic + situational)`. The player reads the total to the DM; the app does not know the target's AC.
3. Tap "Hit" or "Miss" (or "Crit" auto-selected on natural 20). On a hit, damage is rolled: dice + modifier, doubled dice on a crit, damage type shown.
4. If the attack had a resource cost or consumed a per-turn activity, both are applied now and logged as one event with the roll.
5. Follow-ups appear contextually: after the Attack action, a Monk sees "Martial Arts unarmed strike (bonus action, 0 Ki)" and "Flurry of Blows (bonus action, 1 Ki)" highlighted; Extra Attack shows "Attack 2 of 2".

### Spell flow

1. Tap a spell. If it needs a slot, choose the level: the lowest available is pre-selected; higher levels show the upcast effect from the spell's scaling data. If it has an alternative cost (Ki), that is shown instead. Cantrips and rituals show "no cost" / "ritual: +10 minutes, no slot".
2. Components reminder (V, S, M with the material and whether it is consumed) shown for newcomers, hidden for experts.
3. Concentration warning: if the spell requires concentration and the character is already concentrating, the app says which spell will end. Confirm to proceed.
4. The spell's rolls are offered: spell attack (`d20 + spellcasting ability + proficiency`), or the save DC to read aloud, then damage or healing dice with upcast scaling applied.
5. Cast: slot or resource spent, concentration set, duration timer started if the spell has one, single log entry.

### Feature-use flow

Tap the feature action, confirm the cost if any, apply: resource spent, activity type marked used, any self-applied condition or temporary effect added (Patient Defense marks "Dodging until your next turn" as a temporary effect; Rage adds the raging effect with its badges on rolls).

### Turn tracker

- Five slots: Movement (remaining distance), Action, Bonus action, Reaction, Free interaction; each available or used.
- Using an action-typed button marks its slot. The **single bonus action rule** is explicit, as in the playbook: once a bonus action is used, all other bonus-action buttons grey out with the label "bonus action already used this turn".
- The Reaction slot is marked when a reaction is used and resets at the start of the character's next turn, not at end of turn; the tracker explains this on first use.
- "End turn" resets Movement, Action, Bonus action, Free interaction, and expires effects declared "until the end of your turn". "Start turn" (optional, same button when used twice) resets Reaction and expires "until the start of your next turn" effects.
- "Combat over" clears the tracker and per-combat effects; the character's persistent state is untouched.

### Play events

| Event | Parameters | Applies | Inverse |
|---|---|---|---|
| Damage | amount, type, source note | temp HP absorbs first, then HP; resistance/vulnerability/immunity from the computed sheet halve/double/negate with a note; at 0 HP switches the vital block to death saves; concentration check reminder | restore previous HP and temp HP |
| Heal | amount | HP up to max; at 0 HP clears death saves | restore |
| Temporary HP | amount | replaces if higher (rules), never stacks; the app says which is kept | restore |
| Spend / restore resource | resource, amount | bounded by 0 and maximum | opposite |
| Cast spell | spell, slot level or alternative cost, concentration | as in the spell flow | restore slot/resource, clear concentration |
| Apply / remove condition | condition, expiry | adds effects to rolls, badges | remove / re-add |
| Custom temporary effect | name, text, roll badges, expiry | as a user-defined condition ("Bruised lung: disadvantage on CON saves and exhaustion checks") | remove |
| Death save | result | successes/failures 0–3; natural 20 regains 1 HP; natural 1 counts two failures; three of either ends the sequence with a clear message | decrement |
| Inspiration | gain / spend | toggle; spending pre-sets advantage on the next roll | toggle |
| Short rest | Hit Dice to spend | each resource with `short rest` recharge is restored per its rule (full, or a formula such as "regain up to half"); Hit Dice rolled with CON modifier, one at a time, each undoable; a feature declaring extra short-rest recovery (e.g. Arcane Recovery) is offered | restore state before the rest |
| Long rest | — | HP to max; resources with `long rest` recharge restored; half of total Hit Dice (minimum 1) regained; concentration and "until rest" effects cleared; exhaustion reduced by one if present | restore state before the rest |
| Note | text | appended to the log | remove |

Rests never contain class names: a homebrew resource that recharges on a short rest is restored by the same procedure that restores Ki.

### Concentration

The vital block shows the concentrated spell with its remaining duration. On any damage event the app shows "Concentration check: DC 10 or half the damage (DC N)" with a "Roll Constitution save" button; the outcome ends concentration or dismisses the reminder. Falling to 0 HP ends concentration automatically.

### Conditions and temporary effects

Standard conditions come from content with their effects (Prone: disadvantage on attacks, etc.) and appear as badges on the rolls they affect. Custom effects are created inline with name, optional text, optional roll badges (advantage/disadvantage on a roll type, flat modifier) and an expiry. Expiry options: end of turn, start of next turn, N rounds, N minutes, short rest, long rest, manual. Expired effects are removed automatically and logged.

### Log and undo

- Every event writes one entry: timestamp, event, parameters, resulting deltas, roll details if any.
- Undo reverts the latest event using its inverse; redo re-applies. Undo across a rest is allowed and reverts the whole rest as one entry.
- The log is grouped per session; sessions are opened and closed by the player, and old sessions are kept read-only.
- The log is the source for the assistant's "what happened this turn" and for "what changed" summaries.

### Quick edits

- HP: tap opens a numeric pad with Damage / Heal / Temp buttons; ±1 and ±5 shortcuts; a delta larger than max HP asks to confirm.
- Resource pips and slots: single tap spends, long-press restores, no confirmation; undo covers mistakes.
- Conditions: swipe to remove; the removal is logged and undoable.

### Intentionally not in play mode

- Initiative order for the whole table and enemy tracking (the DM's job, out of scope per [01](01-vision.md)).
- Automatic targeting or applying damage to others.
- Editing choices (level, feats, spells known): that is build mode, guarded so a mid-session slip cannot alter the character silently.

## Why

- A newcomer's biggest fear at the table is being slow and wrong; pre-computed, explained rolls remove both, and the breakdown teaches the rule every time (Principle 1).
- The playbook repeated the single-bonus-action rule five times because it is the rule newcomers break most; the turn tracker enforces it visually instead of repeating it.
- Reversibility makes automation safe: the player can tap freely because nothing is destructive, which is what makes one-thumb interaction acceptable.
- Rests derived from recharge rules are what let homebrew resources recover exactly like Ki with no extra code (Principle 6).
- Leaving initiative and enemies out keeps the play surface small enough for a phone and keeps the DM in control.

## Deferred decisions

- DEC-05 Dice RNG and roll verifiability (seeded, shareable proofs, DM-visible rolls) — Phase 2.
- DEC-06 Offline support: play mode is the feature that most needs it (tables without connectivity) — Phase 2.
- DEC-01 Technology stack — Phase 0, relevant for interaction latency requirements.

## Depends on / feeds into

Depends on [01](01-vision.md), [03](03-glossary.md), [04](04-domain-model.md), [08](08-dynamic-sheet.md). Feeds into [10](10-progression.md) (session log and snapshots), [11](11-play-assistant.md), [12](12-print-and-export.md) (which state is fillable), [13](13-ux-and-accessibility.md), [15](15-logical-architecture.md).
