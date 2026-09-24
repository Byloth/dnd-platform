# Changelog — srd51

Every released version of this package is published on the site as
`content/srd51@<version>.json` and never changes (DEC-21). A fix or an
improvement of the content is a new version: bump `version` in
`package.yaml`, describe it here, run `pnpm release:content` and commit the
release file. Characters follow new versions automatically; the application
tells the player what changed on their sheet.

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
