# 20 Official books as packages

## Purpose

This document records a to-do list the owner and the assistant drew up on 2026-09-25: every official book the owner owns becomes a private package, one per book and per language, and the packages are then gathered into a few collections. It fixes the order of the work, what each package holds, how agents do the transcription, and the questions still open. It is a plan to confirm, not yet started. It extends DEC-23 and DEC-24 of [17](17-open-decisions.md).

## The books

All of them are in `content-private/sources`, with their text extracted (see that folder's README).

| Book | Id | Italian edition | Notes |
|---|---|---|---|
| Player's Handbook (2014) | phb14 | yes | already a package, with `phb14-it` |
| Dungeon Master's Guide (2014) | dmg14 | yes | |
| Monster Manual (2014) | mm14 | yes | |
| Xanathar's Guide to Everything | xge | yes | |
| Tasha's Cauldron of Everything | tce | yes | |
| Mordenkainen Presents: Monsters of the Multiverse | mpmm | yes | supersedes Volo's species and monsters |
| Volo's Guide to Monsters | vgm | no | |
| Sword Coast Adventurer's Guide | scag | yes | |
| Elemental Evil Player's Companion | eepc | yes | native text, not OCR |
| Eberron: Rising from the Last War | erlw | yes | |
| Van Richten's Guide to Ravenloft | vrgr | yes | |
| Explorer's Guide to Wildemount | egw | no | |
| Guildmasters' Guide to Ravnica | ggr | no | |
| Mythic Odysseys of Theros | mot | no | |
| Fizban's Treasury of Dragons | ftd | yes | |
| Bigby Presents: Glory of the Giants | bgg | yes | |
| Curse of Strahd | cos | yes | adventure |
| Tomb of Annihilation | toa | no | adventure |

## Decisions taken (owner, 2026-09-25)

- **First, one package per book and per language**: `<id>` in English and `<id>-it` as its translation, as `phb14` and `phb14-it` are today. These base packages always stay, and they are the source of truth.
- **Then collections** of several books, built by a script from a declarative definition, so they can be rebuilt in one go whenever a base package changes.
- **Collections follow the community's groupings**, never slices of several books by topic ("the spells of Xanathar, Tasha and Volo" confuses). A collection mixing books must be logically homogeneous and carry a recognisable name.
- **The goal**: a few collections, not dozens of packages.
- **Scope of the first pass**: the seven entity kinds, group 1 below, and **the creatures**.
- **Everything follows the browser's language**, as for phb14: the translation of a book, or of a collection, is never a choice.

## What each package holds

Types of content in the books, adventures aside:

1. **Entities already in the format.** Species, classes, subclasses, backgrounds, feats, spells, items.
2. **Group 1: character options that are not entities of their own.**
   - Catalogues of choices inside the classes: Eldritch Invocations, Metamagic, Fighting Styles, Battle Master maneuvers, Artificer infusions, Rune Knight runes, optional class features (Tasha), dunamancy spells (Wildemount).
   - Creation rules of a setting: dragonmarks (Eberron), custom origins (Tasha), lineages such as Dhampir, Hexblood and Reborn (Ravenloft), Dark Gifts (Ravenloft), supernatural gifts and piety (Theros), group patrons (Eberron), guilds (Ravnica), heroic chronicle (Wildemount).
   - Others: magic tattoos (items), "This Is Your Life" and the name tables (Xanathar), deities and pantheons (for the cleric's choice), sidekicks (Tasha), tool uses (Xanathar).
   - Much of it fits as features, choices, feats and items. What needs a new kind of entity or new effects is flagged, not forced.
3. **Creatures.** They also matter to the character: wild shape, familiars, a paladin's steed, a ranger's companion, the summoning spells of Tasha whose stat blocks scale with the level.

Not in the first pass:
- **Group 2, the game master's material**, catalogued later with the catalogues of [19](19-catalogues.md): optional and variant rules, downtime and crafting, spellcasting services, traps, poisons, diseases, epic boons and charms, treasure, encounter and trinket tables, vehicles, encounter building, NPCs and settlement generators, puzzles, factions and renown.
- **Group 3, setting and narrative text** (planes, geography, history, organisations): never transcribed.
- **Adventures**: only what serves characters and catalogues (items, creatures, backgrounds such as the Haunted One), never the plot.

## Steps

1. **The creature schema (closes DEC-24).**
   - Structured fields for the mechanics: size, type and alignment; armour class, hit points and hit dice; speeds; abilities, saving throws and skills; resistances and immunities; senses and languages; challenge rating.
   - Traits, actions, reactions, legendary and lair actions, with attacks and damage structured and text for the rest.
   - Variants, and stat blocks that depend on the caster's level (Tasha's summons).
   - At first the engine computes nothing: the schema validates and the composer shows.
   - Tests and docs (05, 06, content-authoring).
2. **The SRD's creatures** (about 320) into `srd51`, and in Italian into `srd51-it` from the official Italian SRD, then released. Public and CC BY: the proof of the schema before any private book.
3. **The pilot: Fizban's Treasury of Dragons**, in English and Italian, with everything in scope. It has player options (Drakewarden, Way of the Ascendant Dragon, feats, spells, items), many stat blocks with lair actions, and an Italian edition. The pilot fixes the recipe and gives the real cost.
4. **Every other book**, in parallel, with the recipe of the pilot.
5. **Duplicates and supersessions** analysed across the base packages (see below).
6. **The collections** defined, and the script that builds them.

## How the agents work (a workflow per book)

One agent for a whole book does not fit in one context: the Player's Handbook already needed packets. For each book:

1. **Inventory**: one agent lists the entities and their pages and cuts them into packets of about 40.
2. **English**: per packet, one agent transcribes and one reviews adversarially; for stat blocks, the review checks every number against the book.
3. **Italian**, after the English, since the translation is keyed by the English package's paths: per packet, one agent translates from the Italian edition (the Italian text first, memory only where something does not add up, as for phb14-it) and one reviews.
4. **An engine-gap log**: what the format or the engine cannot express yet is written as an add-text reminder and listed, for the owner to review.

As pipeline stages of a workflow, not agents spawning agents, so each stage is visible and resumable. Everything stays in `content-private/`: book text is never written outside it.

Rough cost: 300–450 Opus agents for all the books with creatures. The pilot gives the real number.

## Duplicates and supersessions

- The same thing appears in several books: species of Volo's revised by Monsters of the Multiverse, Monster Manual creatures reprinted, options revised by Tasha.
- The base packages keep everything, faithful to each book.
- A collection decides which version wins (the newest, for example) and marks the other as legacy.

## Collections

**A collection is a container, not a merge** (proposed, to confirm).
- Its manifest lists the base packages it includes, and its archive holds them; it copies no entity.
- Characters keep pinning the base packages (DEC-21), so rebuilding the collections never breaks a character.
- Translations stay per book: the Italian interface adds the `-it` of every base package in the collection.
- Provenance and credits stay per book.
- The script reads the definition and packs the archives.

A first idea, to refine once the base packages exist:

| Collection | Books |
|---|---|
| Core rulebooks | phb14, dmg14, mm14 |
| Player expansions | xge, tce (and maybe eepc, scag) |
| Monsters of the Multiverse | mpmm, with vgm as legacy |
| Settings | erlw, vrgr (+ cos), egw, ggr, mot: one collection each, or one "Settings" |
| Giants and dragons | bgg, ftd |
| Adventures | cos, toa (catalogue content only) |

## Open questions

1. **Books owned only in English** (vgm, egw, ggr, mot, toa): an Italian package translated literally with the term list, or English only?
2. **Settings**: one collection per setting, or a single "Settings" collection?
3. **The collection as a container** rather than a merge: confirmed?
4. **Engine gaps**: which of the group 1 items that need new entity kinds or effects (Dark Gifts, piety, group patrons, …) get them in this work, and which stay as reminders?
5. **The names** of the collections, in English and Italian.

## Depends on / feeds into

- DEC-21 (content releases and pinning), DEC-23 (books as packages), DEC-24 (creatures) in [17](17-open-decisions.md).
- [05](05-content-model-and-sources.md) (private official packages), [19](19-catalogues.md) (catalogues), [phase-1/11-italian-content.md](phase-1/11-italian-content.md) (the translation recipe).
