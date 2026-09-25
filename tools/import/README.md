# SRD import pipeline

Tooling that turns the openly licensed SRD datasets into the platform's
content format. Design: `docs/phase-0/05-srd-import-pipeline.md`.

Scripts run on Node 24 directly (native TypeScript type stripping), with the
`yaml` package from the repository root as the only dependency.

| Script | What it does |
|---|---|
| `node tools/import/src/fetch.ts [--force]` | Downloads the files pinned in `sources.lock.yaml` into `cache/` (git-ignored) and records their sha256 in the lock. A second run downloads nothing. |
| `node tools/import/src/inventory.ts` | Generates `docs/phase-0/inventory/` (human-readable inventory of the SRD 5.1) and the classification skeletons and work partitions under `work/` (git-ignored). |
| `node tools/import/src/merge-classification.ts` | Merges the classified partitions from `work/classification/*.classified.yaml` into `docs/phase-0/inventory/classification*.yaml` and writes the summary `classification.md`. |

## Sources

Pinned by commit in `sources.lock.yaml`:

- **Open5e v2** (`open5e/open5e-api`, `data/v2/wizards-of-the-coast/srd-2014/`): primary source. Data of the `srd-2014` document is CC-BY-4.0. Creature files are excluded: the creatures come from the 5e-database.
- **5e-database** (`5e-bits/5e-database`, `src/2014/en/`): cross-check, structured level tables (`Levels.json`) and the creatures (`Monsters.json`). Code MIT; data stated OGL 1.0a upstream, while the SRD 5.1 itself is also published under CC-BY-4.0, which is the licence this project relies on.

No upstream code is copied. Content that reaches `packages/content/srd51`
carries the SRD 5.1 attribution (see `NOTICE`).

## Map stage

`node tools/import/src/map.ts` regenerates `packages/content/srd51/` (every
entity directory; `package.yaml`, `ruleset.yaml` and `README.md` are kept):
classes with level tables and structured proficiencies and equipment,
subclasses, species with subspecies, backgrounds, feats, spells with spell
lists, items (mundane and the 239 base magic items), conditions, rules,
tables. Generated files carry a header comment and must not be edited by
hand. The SRD's creatures (`src/creatures.ts`, DEC-24) go to their own
package, `packages/content/srd51-creatures/`, so the character sheet does not
download them; a shapechanger the dataset splits by form is one creature with
its `forms`.

What neither dataset has (rule sections Open5e left empty, the mounts) is
written by hand in `tools/import/authored/<directory>/<name>.yaml`, from the
SRD 5.1 text, and emitted like a generated entity (`authored/creatures/` goes
to srd51-creatures). The English SRD 5.1 text used to check the package is in
`content-private/sources/text/srd51.md` (downloaded from Wizards, CC BY 4.0).

`IMPORT_OUT=<dir> node tools/import/src/map.ts` builds a preview instead, in
`<dir>/srd51` and `<dir>/srd51-creatures`, leaving the packages untouched: then
`dnd validate --references <dir>/srd51 <dir>/srd51-creatures`. Several
previews can be built at once, which is how the audit of 2026-09-26 fixed 332
findings in parallel ([docs/21-engine-gaps.md](../../docs/21-engine-gaps.md)
lists what the engine cannot express yet).

Mechanics live in `tools/import/overlay/<entity-id>.yaml` and are merged onto
the generated entities (objects merge, arrays replace, `null` deletes).
`node tools/import/src/seed-overlay.ts` seeds the overlay from the mechanics
authored in `fixtures/packages/srd51-excerpt`.

Generated on their own, without an overlay: species ability score increases
and Darkvision, the subclass choice, ASI/feat choices at the class' ASI
levels, spellcasting grants (ability, list, preparation, slot progression,
cantrips/spells known tables) for the eight SRD caster classes.
