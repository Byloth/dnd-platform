# Classification vocabulary

How every SRD 5.1 feature, spell and magic item is classified against the effect catalogue v0 of [02-content-format.md](../02-content-format.md). The classification is the evidence for closing (or changing) the catalogue before the schemas are written. It is a *classification*, not authoring: it says which effect kinds a feature would need, not the full effect declarations.

## Rules

1. Classify only from the text. Do not use knowledge of other editions, errata or house rules.
2. One record in, one record out: same `id`, `mechanics` filled, nothing skipped.
3. A feature may need several kinds; list all of them, most important first.
4. When the catalogue cannot express something the engine would need, use `needs-new-kind` and say what the kind should do, citing the feature. Prefer a generic kind (useful to at least two features) over a special case.
5. When the `when` condition language lacks a key the feature needs, add `condition-key-needed: <key>`.
6. `confidence` is `high` when the text maps cleanly, `medium` when a modelling choice was made, `low` when the mapping is doubtful and a human must look.
7. `note` is one sentence, only when useful: the modelling choice, the doubt, or the `needs-new-kind` rationale.

## Vocabulary for features, traits and benefits (`features.yaml`)

Effect kinds of catalogue v0:

| kind | use when the feature… |
|---|---|
| `modify` | changes a derived value: AC, HP, speed, senses, skills, saves, ability scores, attack/damage bonus, jump, carrying capacity. Give `targets`. |
| `grant-proficiency` | grants proficiency or expertise in skills, saves, armour, weapons, tools, languages, possibly as a choice. |
| `declare-resource` | creates a pool with a maximum and a recharge: Ki, Rage uses, Bardic Inspiration, Channel Divinity, Sorcery Points, Wild Shape uses, spell-like uses per rest. Give `resource`. |
| `add-action` | gives the character something to do with an activation type (action, bonus action, reaction, free, special) and optional cost. Give `activation`. |
| `grant-spellcasting` | enables slot-based casting from a class list. |
| `grant-spells` | grants specific spells (known, prepared, always prepared), possibly with an alternative cost or limited uses. |
| `extend-spell-list` | adds spells to a list. |
| `roll-advantage` / `roll-disadvantage` | conditional advantage or disadvantage on a class of rolls. |
| `defense` | resistance, immunity, vulnerability, condition immunity. |
| `add-text` | narrative or situational text with no engine mechanics, placed in a section. |
| `add-section` | needs a sheet section of its own (rare). |
| `open-choice` | asks the player to choose: subclass, skill, spell, feat, ASI-or-feat, fighting style, language, tool, an option among the feature's own options. |
| `define-table` | a value that scales by level and is looked up by other effects: Martial Arts die, Sneak Attack dice, Rage damage, Unarmored Movement. |

Additional classification values (not effect kinds):

| value | meaning |
|---|---|
| `text-only` | the feature has no mechanics the engine should compute or track; it is rules text the player reads. Equivalent to `add-text` alone; use `text-only` when *nothing else* applies. |
| `play-mode` | the mechanics live in play events, not in the sheet derivation: healing on use (Second Wind), reroll a die (Lucky), damage on hit (Sneak Attack, Divine Smite), temporary hit points, imposing a condition on a target. Usually paired with `add-action` and/or `declare-resource`. |
| `needs-new-kind: <proposed-name>` | the catalogue cannot express it; describe the kind in `note`. |
| `condition-key-needed: <key>` | the `when` language lacks a key (see the condition language table in 02). |

Record shape after classification:

```yaml
- id: srd51.feature.monk.ki
  mechanics: [declare-resource, add-action, define-table]
  resource: ki
  activation: bonus-action
  targets: []            # only for modify: ac, hp.max, speed.walk, sense.darkvision, skill.stealth, save.con, ability.str, ...
  confidence: high
  note: "Three actions (Flurry of Blows, Patient Defense, Step of the Wind) each cost 1 ki; Ki save DC is a derived value."
```

Keep `id`, `owner`, `ownerType`, `level`, `name`, `table`, `text` exactly as given.

## Vocabulary for spells (`spells-classification.yaml`)

Spells are content the engine mostly stores and play mode executes. Classify what the engine must *know* to support casting and play:

| value | meaning |
|---|---|
| `damage` | deals damage (dice, type, scaling). |
| `attack` | requires a spell attack roll. |
| `save` | requires a saving throw (which ability, half on success or negates). |
| `healing` | restores hit points or grants temporary hit points. |
| `buff-modify` | changes a derived value of the target while active (AC, speed, ability score, advantage): would need `modify`/`roll-advantage` effects applied by an active spell. |
| `condition` | imposes or removes a standard condition. |
| `summon` | creates creatures or objects with stat blocks. |
| `utility-text` | effect is narrative or DM-adjudicated; no engine mechanics beyond the card. |
| `scaling` | changes with slot level or character level (`higher_level` text or cantrip scaling). |
| `concentration` / `ritual` | already structured; do not restate. |

Record shape: `id`, `mechanics: [values]`, `confidence`, `note`. Add `needs-new-kind` only if a spell needs an engine capability outside the list above and outside catalogue v0 (e.g. a spell that must add an action to the caster's sheet while active).

## Vocabulary for magic items (`magic-items-classification.yaml`)

| value | meaning |
|---|---|
| `text-only` | the card is enough. |
| `modify` | changes a derived value while equipped/attuned (+1 weapon, Bracers of Defense, Gauntlets of Ogre Power). Give `targets`. |
| `add-action` | grants an activated ability. |
| `grant-spells` | lets the user cast specific spells. |
| `defense` | resistance/immunity. |
| `roll-advantage` / `roll-disadvantage` | conditional advantage. |
| `charges` | has charges that recharge: a `declare-resource` on the item. |
| `attunement` | requires attunement (already structured upstream; state it so attunement slots can be modelled). |
| `play-mode` | mechanics live in play events (potions, one-shot effects). |
| `needs-new-kind: <name>` | as above. |

Record shape: `id`, `mechanics: [values]`, `targets` (for modify), `confidence`, `note`.
