# Changelog — srd51

Every released version of this package is published on the site as
`content/srd51@<version>.json` and never changes (DEC-21). A fix or an
improvement of the content is a new version: bump `version` in
`package.yaml`, describe it here, run `pnpm release:content` and commit the
release file. Characters follow new versions automatically; the application
tells the player what changed on their sheet.

## 0.7.1 — 2026-09-26

- The darkvision rule is called Darkvision, not Blindsight.

## 0.7.0 — 2026-09-26

The whole package was checked against the official SRD 5.1, chapter by
chapter, and corrected where it differed.

- **Rules that were missing**: resting (short and long rest), saving
  throws, dropping to 0 hit points and death saving throws, healing and
  temporary hit points, cover, movement and position, creature size and
  space, the order of combat and surprise, underwater combat, time, the
  introductions of every chapter (conditions, languages with their tables,
  multiclassing, alignment, backgrounds, feats, equipment, poisons with
  their table, traps, diseases, madness, objects, magic items), selling
  treasure, the wizard's spellbook and the paladin's broken oath.
- **Mounts and tack**: camel, donkey or mule, elephant, draft and riding
  horse, mastiff, pony, warhorse, saddles, saddlebags, bit and bridle, feed;
  and the shield +1, +2 or +3.
- **Classes**: the bard is proficient with hand crossbows; the druid takes
  challenge 1 beast shapes from 8th level, not 7th; the warlock's invocations
  and the sorcerer's metamagic come at the SRD's levels; the monk no longer
  chooses a disguise or forgery kit; the ranger gets a quiver, the rogue's
  shortbow comes with its quiver; each subclass has its introduction; Turn
  Undead, Intimidating Presence, Open Hand Technique and others show the
  saving throw they call for.
- **Species**: the dragonborn's breath weapon grows with your level (2d6,
  3d6 at 6th, 4d6 at 11th, 5d6 at 16th) and says it recharges after a rest.
- **Spell lists**: Blindness/Deafness, Enlarge/Reduce, Antipathy/Sympathy,
  Faerie Fire, Divination and Meld into Stone are on the lists the SRD puts
  them on; spells that are not on a list are gone from it.
- **Spells**: about a hundred corrections of saving throws, damage rolls,
  areas, material costs and what a spell does at higher levels (Magic
  Missile, Cure Wounds, Hold Person, Sacred Flame, Vicious Mockery, Flame
  Strike, Ice Storm, Meteor Swarm among them), and texts copied word for
  word where they were shortened or garbled.
- **Items**: weapon damage types and weights (the shortsword pierces),
  ammunition priced per piece, magic item weights and rarities, and the full
  texts of the Deck of Many Things, the Belt of Dwarvenkind and others.

## 0.6.0 — 2026-09-25

- **The nine alignments**, from lawful good to chaotic evil, each with its
  short form and a sentence on what it means, so the creation can offer
  them by name.
- **The acolyte's ideals** (Tradition, Charity, Change, Power, Faith,
  Aspiration) are listed with the traits, bonds and flaws, as suggestions
  for your character's personality.

## 0.5.0 — 2026-09-24

- **Half-elves get their two +1**: "two other ability scores of your
  choice increase by 1" is now a choice the sheet asks and applies, instead
  of numbers to add by hand. A half-elf character made before this version
  asks for the two scores; its totals do not change once they are chosen
  (take them out of any manual adjustment).

## 0.4.0 — 2026-09-24

- **Starting equipment finds its items**: holy symbols, arcane and druidic
  foci, musical instruments and melee weapons are now marked as such, so
  "a holy symbol" or "any simple melee weapon" in a class or background
  offers the right items to choose from.

## 0.3.0 — 2026-09-24

- **The languages a character can learn**, eight standard and eight exotic
  (Common, Dwarvish, Elvish… Abyssal, Celestial, Draconic…), so the creation
  can offer them by name instead of asking you to type them.

## 0.2.0 — 2026-09-24

For the guided character creation:
- **Twelve archetypes**, one per class: a ready-made idea of a character
  (species, class, ability order and skills, each with the reason it is
  recommended) that a newcomer can start from.
- **The primary abilities of every class**, as the multiclassing
  prerequisites name them, so the creation can point at the scores that
  matter.
- **The standard array (15, 14, 13, 12, 10, 8) and point buy (27 points,
  scores 8 to 15)** in the ruleset. They are not in the SRD 5.1: the numbers
  are those of the SRD 5.2 (CC-BY-4.0), now credited among the sources.
- **Packs list their contents** as items (a Priest's Pack holds a backpack,
  a blanket, ten candles…), and the seven items packs hold that were missing
  (string, alms box, block of incense, censer, vestments, little bag of sand,
  small knife) are now part of the package.

## 0.1.0 — 2026-09-23

First release: the SRD 5.1 content of Phase 0 (every class, subclass,
species, background, feat, spell, item, condition and rule of the SRD 5.1,
with their mechanical effects), as validated by M0.8.
