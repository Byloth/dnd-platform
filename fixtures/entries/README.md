# Compendium entries

The goldens of `dnd show` for the compendium's entries (docs/phase-1/13-compendium.md), checked by
`packages/cli/test/show.test.ts`. Each is written by the CLI after a deliberate change of wording:

```sh
node packages/cli/dist/index.js show srd51.spell.fireball > fixtures/entries/fireball.en.txt
node packages/cli/dist/index.js show srd51.spell.fireball --language it --units metric > fixtures/entries/fireball.it.txt
```
