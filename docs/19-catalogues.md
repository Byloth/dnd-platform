# 19 Catalogues of items and creatures

## Purpose

This document records a feature the owner proposed on 2026-09-25: two searchable catalogues drawn from every loaded package. One is for **items**, for players and game masters; the other is for **creatures**, for game masters. It fixes what they are for, where their content comes from, the rule that separates them from character creation, and the phases they belong to. It is a proposal to design in detail when its phase opens, not yet a plan.

## What they are for

**The item catalogue.**
- A player adds items to the inventory during a campaign: loot, purchases, gifts.
- A game master searches quickly for an item, reads its effects, and decides what to put in the players' loot.
- It lists every item of the loaded packages: mundane gear, weapons, armour, tools, and magic items with rarity and attunement, from rule books and adventures alike.

**The creature catalogue.**
- A game master always has a quick search at hand to find a monster, its stat block and everything it can do.
- Its actions are explained in the wording of "explain this number" ([08](08-dynamic-sheet.md)) and can be rolled with the dice of play mode ([09](09-play-mode.md)).

Both catalogues work the same way:
- search by name as the player types;
- filters: items by type, rarity, attunement and source; creatures by type, challenge, size, environment and source;
- a detail view with the full text and the source cited;
- the private flag of [../05-content-model-and-sources.md](05-content-model-and-sources.md) wherever a private package's entry appears.

## The rule about creation (owner, 2026-09-25)

**The creation wizard offers only starting equipment**, always and only the base items:
- the class's and the background's grants;
- the shop of mundane items that step 7 already has.

The full item catalogue opens after creation. From the sheet (the inventory) a player can add any item from the complete list: nothing stops a character, once created, from carrying a magic item the campaign gave them.

## Content

- **SRD first, public.** srd51 already holds 493 items, 236 of them magic (with a rarity). The SRD's monsters are in the 5e-database data of the import pipeline and were left out of the import so far (`tools/import/sources.lock.yaml`). Importing them needs the `creature` entity type of DEC-24.
- **Official books, private.** The Dungeon Master's Guide (magic items), the Monster Manual and the other bestiaries (creatures), and the player books' items, as private packages loaded by their owners ([05](05-content-model-and-sources.md), "Official source packages"). How the three core books are packaged is DEC-23.
- **Adventure books, private** (owner's point 2.1). The starter sets, Curse of Strahd, Journeys through the Radiant Citadel and the other campaign books bring their own magic items and creatures, and sometimes player options. One private package per adventure, with the same rules as a rule book.
- **Homebrew.** Homebrew packages add items and creatures in the same format, and appear in the catalogues like any other content.

## Phases

- **Item catalogue for players: Phase 2** (play mode). Editing the inventory during play is play-mode state ([09](09-play-mode.md)); the catalogue is the "add item" of that inventory. The step 7 shop already has search, and its component can grow into the catalogue.
- **Item and creature catalogues for game masters: Phase 6** (DM and campaigns). The roadmap keeps "further DM tools" out of scope until Phase 6 is evaluated ([16](16-roadmap.md)). These two are named as its first candidates, since the owner asked for them explicitly.
- **Creature entity type: DEC-24.** It is needed before the creature catalogue. It could come earlier, when the sheet shows companions, familiars or wild shapes.

## Open points

- Whether a game master's catalogue needs the campaign (Phase 6) or can exist before it, for a game master using the site alone. Leaning: a stand-alone catalogue page could come as soon as creatures exist, since it needs no account.
- How much of a stat block is modelled as effects (rollable, explainable) and how much stays text; to settle with DEC-24.
- Loot tables of the DMG (random treasure by challenge) as a later extension of the item catalogue.
