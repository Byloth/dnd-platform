# Authoring mechanics in the overlay

This guide is for whoever (human or agent) writes the mechanical effects of
SRD 5.1 content. The generated base package (`packages/content/srd51`) has
every entity's text and structure; the overlay adds what the engine needs.

## Where things go

One file per entity: `tools/import/overlay/<entity-id>.yaml`. It contains
only the keys to merge onto the generated entity (objects merge, arrays
replace, `null` deletes). Never edit `packages/content/srd51/**` by hand:
run `node tools/import/src/map.ts` to regenerate it with the overlay applied.

Allowed keys per entity type:

| entity | keys |
|---|---|
| feature (`srd51.feature.*`, including features inline in classes, subclasses, species, backgrounds) | `effects`, `choices`, `toggle`, `onRest`, `onTurnStart` |
| spell | `effects` (applied to the target while active), `onCast` (play effects at casting) |
| item (magic) | `features` (each with `effects`), `charges`, `attunement`, weapon/armour properties the item overrides, `onUse` |
| condition | `effects`, `levels`, `cumulative` |
| feat | `prerequisites`, `effects` on its inline feature |
| class | `primaryAbilities` (from the multiclassing prerequisites; Open5e leaves them empty) |

Packs are not authored here: the map stage writes their `contents` from the 5e-database, and emits the items a
pack holds that no dataset sells on their own (a censer, a small knife). Items also carry, as tags, the 5e-database
equipment categories a starting-equipment filter names (holy symbols, arcane and druidic foci, musical
instruments, melee weapons), so a grant's `filter: { category }` finds them; engine's `matchesItemFilter` is the rule.

## The vocabulary

The catalogue (effects, play effects, toggles, condition language, formula
grammar, `modify` targets) is `docs/phase-0/02-content-format.md`; the JSON
Schemas in `packages/schema/schemas/` are the letter of the law. The
classification produced from the SRD inventory
(`docs/phase-0/inventory/classification*.yaml`) says, for every record,
which kinds it needs; treat it as the guide, and the text as the truth when
they disagree.

## Rules

1. **Only what the text says.** No rules from other editions, errata or memory.
2. **Structure over prose.** If a kind expresses it, use the kind; if none does, write `add-text` with the relevant sentence and a `note` saying what is missing. A feature classified `text-only` gets no effects at all (leave it out of the overlay).
3. **Play effects for what happens in play.** Healing on use, extra damage on hit, restoring a resource, imposing a condition: `onUse`/`onHit` play effects, not sheet modifiers. Anything the play engine cannot yet execute is a `note` play effect with the sentence.
4. **Formulas follow the grammar.** Variables: `level`, `proficiencyBonus`, `hitDie`, `classLevel` (bare, in class tables and features), `score`; functions: `mod(dex)`, `score(str)`, `classLevel(monk)`, `table(monk.martial-arts)`, `max`, `min`, `floor`, `ceil`, `average`, `sum`. Class tables are addressed as `table(<class>.<table>)`; global tables by id, `table(srd51.table.proficiency-bonus)`.
5. **Resources** are declared once (`declare-resource`) by the feature that introduces them; the actions that spend them use `cost: [{ resource, amount }]`. Recharge is a list: `[{ on: short-rest, amount: full }]`.
6. **Toggles** for "while raging", "while transformed", "until the start of your next turn": `toggle: { state: <id>, expires: {...} }` on the action or feature, and `when: { toggled: <id> }` on the gated effects.
7. **Choices**: options a player picks (Fighting Style, Metamagic, Hunter's Prey, invocations) are `open-choice` with inline `options`, each option carrying its own `effects`.
8. **Ids** are stable and lowercase-kebab; actions are named after the feature (`flurry-of-blows`), resources after the pool (`ki`, `rage`, `sorcery-points`, `channel-divinity`).
9. **Check before you finish**: `node tools/import/src/check-overlay.ts <id>...` must print `OK`. It merges your overlay onto the generated entity and validates the result against the schemas.

## Example

`tools/import/overlay/srd51.feature.monk.ki.yaml`:

```yaml
effects:
  - kind: declare-resource
    resource: ki
    name: { en: Ki points }
    max: table(monk.ki-points)
    recharge: [{ on: short-rest, amount: full }]
    display: pips
  - kind: add-action
    action: flurry-of-blows
    name: { en: Flurry of Blows }
    activation: bonus-action
    cost: [{ resource: ki, amount: 1 }]
    requires: { afterAction: attack }
    text: { en: Immediately after you take the Attack action on your turn, make two unarmed strikes as a bonus action. }
```
