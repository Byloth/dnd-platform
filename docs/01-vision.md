# 01 — Vision

## Purpose

This document states why the platform exists, who it is for, and the principles every other document must respect. When two documents disagree, the principles here win.

## The problem

- **Character sheets are static.** Paper sheets, and most digital ones, are a fixed grid where every player fills the same boxes regardless of what their character can actually do. A Monk sees spell slot boxes; a Wizard sees a Ki counter. Newcomers cannot tell which parts matter.
- **Numbers are opaque.** A newcomer copies "+5" next to Stealth without knowing it comes from Dexterity and proficiency. When something changes, they do not know which numbers to update.
- **Existing tools assume you already know the game.** D&D Beyond and similar products are built for people who have read the rules. They expose everything at once, hide the "why", and treat the sheet as a database view rather than a play aid.
- **Homebrew is a second-class citizen.** Custom content is bolted on with limited mechanics, cannot express what official content expresses, and is hard to share.
- **The "playbook" experiment showed the need.** The ChatGPT-generated playbook that inspired this project (a friend's Monk playbook, analysed but not part of the repository) is cluttered, static and not editable, yet it is genuinely useful to a newcomer because it puts *everything the character can do*, with explanations and tactical hints, in one place. The platform must keep that value and remove the friction.

## Vision

A web platform where a player who knows nothing about Dungeons & Dragons can build a character in minutes, understand every number on their sheet, play a whole session from their phone, level up without a rulebook, and print a clean, complete playbook for the table.

Everything the platform knows about the game comes from **content packages** in a single open format. The free base rules ship with the platform; official books and community homebrew are packages in the same format. Extending the platform means adding content, not writing code.

## Target users

Primary: **newcomers** — people playing their first campaign, often invited by a friend, who want to participate without studying 300 pages first.

Secondary: **experienced players** who want a fast, correct, printable sheet; **Dungeon Masters** who want to see their players' sheets and control which content is allowed; **homebrew authors** who want their material to work exactly like official material.

Player-first is a scope decision (Decided): the DM and campaign side is modelled from the start but delivered later (see [16-roadmap.md](16-roadmap.md), Phase 6).

## Guiding principles

1. **Explain while you play.** Every rule the player needs is one tap away from where they need it, in plain language, at the moment they need it. The sheet teaches the game.
2. **Never compute by hand what the system can compute.** Modifiers, attack bonuses, spell save DC, hit points, resource maxima, rest recovery: the platform computes them, always.
3. **Every number knows where it comes from.** Any derived value can show its provenance: base, contributions, source of each contribution. This is the foundation of trust for a newcomer and of debuggability for everyone else.
4. **Progressive disclosure.** Show what matters now. Details, edge cases and expert options are available but not in the way. The newcomer sees a play aid; the expert can open the full machinery.
5. **The sheet is dynamic.** Sections exist only if the character has something to put in them. A resource, a spell list, a rage counter appear because a feature declares them, not because a template has a box.
6. **Homebrew is a first-class citizen.** If official content can be expressed, homebrew can be expressed the same way, with the same mechanics, the same UI and the same print output. There is one content format.
7. **Always printable.** Whatever is on screen can become a clean PDF, with fillable fields for what changes during play. Digital and paper are two views of the same character.
8. **The assistant proposes, the player decides.** Tactical hints and "what can I do now?" prompts are suggestions with reasons, never automation of choices.
9. **Data belongs to the player.** A character can be exported in full, re-imported and moved. No lock-in.
10. **Defer what does not need deciding now.** Technology, hosting, and similar choices are recorded as open decisions and taken at the phase that needs them ([17-open-decisions.md](17-open-decisions.md)).

## What this platform is not

- Not a virtual tabletop: no maps, tokens, or initiative tracking for the whole table (a DM may read sheets; running combat is out of scope).
- Not a replacement for the DM: it never adjudicates, only informs.
- Not a rules encyclopedia: rules appear in context, attached to what the character can do.
- Not a content marketplace in its first phases: sharing exists, selling does not (see DEC-10 in [17-open-decisions.md](17-open-decisions.md)).

## Where we do better than D&D Beyond

| Topic | Typical experience today | This platform |
|---|---|---|
| First character | Long forms, every option visible, no guidance on what is good | Guided creation with recommended choices, archetypes, and explanations at each step ([07](07-character-creation.md)) |
| Understanding the sheet | Numbers without explanation | Tap any number to see how it is computed ([04](04-domain-model.md), [08](08-dynamic-sheet.md)) |
| At the table | Sheet designed for desktop, play features scattered | A dedicated play mode designed for one thumb on a phone ([09](09-play-mode.md)) |
| What to do on my turn | Nothing | Contextual "what can I do now?", turn guide, combos ([11](11-play-assistant.md)) |
| Rests, slots, resources | Partly manual | Fully automatic, with undo ([09](09-play-mode.md)) |
| Homebrew | Limited, cannot express many official mechanics | Same format as official content, full expressiveness ([05](05-content-model-and-sources.md), [06](06-homebrew-and-extensibility.md)) |
| Print | Generic PDF of the sheet | A complete playbook: sheet, features, tactical guide, rules cheat sheet, fillable fields ([12](12-print-and-export.md)) |
| Data | Locked in | Full export and import ([12](12-print-and-export.md)) |

## Success criteria

- A person who has never played can build a level 1 character in under 15 minutes without asking anyone what a term means.
- During a session, every action the character can take (attack, cast, use a feature, rest) is one or two taps away and updates the sheet correctly.
- The reference Monk fixture (a level 3 Way of Shadow Monk built from the base package, a private Player's Handbook package and a homebrew feline species) can be fully represented from content packages, and its generated PDF contains every kind of information found in the original playbook, without its redundancies.
- A homebrew subclass added as a package works everywhere an official subclass works: creation, sheet, play mode, print, assistant.

## Deferred decisions

- DEC-01 Technology stack — Decided (TypeScript, Vue ecosystem, monorepo; the application shell chosen at the opening of Phase 1).
- DEC-08 Project licence — Decided: AGPL-3.0, public repository.
- DEC-10 Monetisation and hosting costs — Phase 4 at the latest.

## Depends on / feeds into

Feeds into every other document. The principles here are referenced by number ("Principle 3") elsewhere.
