# Changelog — srd51

Every released version of this package is published on the site as
`content/srd51@<version>.json` and never changes (DEC-21). A fix or an
improvement of the content is a new version: bump `version` in
`package.yaml`, describe it here, run `pnpm release:content` and commit the
release file. Characters follow new versions automatically; the application
tells the player what changed on their sheet.

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
