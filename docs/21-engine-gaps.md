# 21 Engine gaps

## Purpose

What the content format or the engine cannot express yet, found while checking packages/content/srd51 and srd51-creatures against the official SRD 5.1 (2026-09-26, the first step of [20](20-official-book-packages.md)). Each rule listed here is in the package as text, and where useful as an add-text reminder; the line says what would be needed to model it. Nothing here is planned yet: the list is for deciding, with the owner, which gaps to close and when. The official books of [20](20-official-book-packages.md) will add to it.

Each line: the entity, then what the format or the engine would need.

## Species

- srd51.feature.dragonborn.breath-weapon: the action dedup in engine/src/derive/index.ts should stay silent when both copies of the same action id are unavailable (answer-gated variants). It warns W_DUPLICATE_ACTION today. As an alternative, rolls could carry a 'when', or damageType/save ability could come from a choice answer. Either change would let the ten per-ancestry variants (save ability, damage type) be declared without warnings on the sheet.
- srd51.feature.dwarf.stonecunning (and srd51.feature.rock-gnome.artificers-lore): the engine needs a check modifier scoped to a topic or situation, such as double proficiency on History checks about stonework or about magic items, alchemical objects and technological devices. Today there is only add-text.
- srd51.feature.half-orc.savage-attacks: modify-attacks.set needs a field for extra weapon damage dice that apply only on a critical hit, for example critExtraDice: 1 with a melee filter. The same field would also serve Brutal Critical.
- srd51.feature.high-elf.cantrip: an open-choice of: spell needs to carry a spellcasting ability ('ability' and 'as'), or grant-spells needs to take its spells from a choice answer, so the wizard cantrip can use Intelligence.
- srd51.feature.dwarf.speed: the engine needs to apply the 10-foot speed penalty when armorStrengthUnmet is true, and the dwarf needs an effect that waives it (for example an ignoreHeavyArmorSpeedPenalty flag or a modify on a speed.heavyArmorPenalty target).

## Barbarian, bard, cleric, druid

- srd51.class.cleric: startingEquipment options need a per-option requirement (e.g. options[].requires: {proficient: ...}) for 'warhammer (if proficient)' and 'chain mail (if proficient)'
- srd51.feature.barbarian.rage: modify-attacks.filter needs an ability filter (filter.ability: str) so the damage bonus skips Dex melee attacks; Reckless Attack's roll-advantage.on needs a melee/weapon filter
- srd51.feature.barbarian.reckless-attack: needs advantage on attacks made against you (e.g. a target: attacks-against-you)
- srd51.feature.barbarian.brutal-critical: modify-attacks.set needs extra dice on a critical hit (critDice) with a melee filter
- srd51.feature.barbarian.relentless-rage: needs an 'on dropping to 0 hit points' hook with a Con save at DC 10 + 5 x prior uses and a set-to-1-HP outcome
- srd51.feature.barbarian.persistent-rage: needs a way to change a toggle's end conditions
- srd51.feature.barbarian.indomitable-might: needs a minimum on the Strength check total (use the Strength score)
- srd51.feature.path-of-the-berserker.frenzy: needs a toggle-end hook that applies exhaustion; mindless-rage needs a way to suspend charmed/frightened conditions already applied
- srd51.feature.bard.superior-inspiration: needs an on-initiative hook that restores 1 bardic-inspiration when the pool is empty
- srd51.feature.bard.expertise: the grant-proficiency choice needs a filter limiting it to skills the character is already proficient in
- srd51.feature.cleric.destroy-undead: needs a rider on turn-undead that destroys undead with CR at or below table(cleric.destroy-undead-cr) on a failed save
- srd51.feature.cleric.divine-intervention: needs a 7-day recharge and a percentile (d100 <= cleric level) roll type, plus automatic success at 20th level
- srd51.feature.life-domain.disciple-of-life (also blessed-healer, supreme-healing): needs a hook on casting healing spells (add 2 + spell level; heal self; maximise healing dice)
- srd51.feature.druid.wild-shape: needs an alternate-form capability (beast stat block, keep mental scores and proficiencies, CR/fly/swim limits, duration half druid level in hours, damage carry-over, no spellcasting)
- srd51.feature.druid.archdruid (and beast-spells): needs spell-component modelling
- srd51.feature.circle-of-the-land.natures-ward: needs a condition immunity scoped by source creature type (elementals or fey)
- srd51.feature.circle-of-the-land.natures-sanctuary: forcing a new target or an automatic miss, and the 24-hour immunity, cannot be expressed (the save is modelled now)
- srd51.feature.bard.song-of-rest: onRest has no short-rest filter and no 'only creatures spending Hit Dice' condition; both stay in the note

## Fighter, monk, paladin, ranger

- srd51.class.fighter: the multiclass prerequisite 'Strength 13 or Dexterity 13' cannot be expressed. multiclass.prerequisites is an AND-ed ability map and needs an any/condition form
- srd51.feature.fighter.fighting-style (and Champion/Paladin/Ranger) great-weapon-fighting and two-weapon-fighting: need a per-die damage reroll setting in modify-attacks and an off-hand attack row
- srd51.feature.champion.survivor: needs a current-HP condition (at most half HP, above 0) to gate the onTurnStart heal
- srd51.feature.paladin.divine-smite / srd51.feature.ranger.primeval-awareness: need a slot-level variable in resourceCost/formulas and a target creature-type condition
- srd51.feature.paladin.lay-on-hands: needs a variable resource cost tied to the heal amount
- srd51.feature.monk.deflect-missiles / slow-fall: need a reduce-damage play effect and an optional secondary cost/attack inside a reaction
- srd51.feature.monk.evasion / srd51.feature.hunter.superior-hunters-defense (evasion): need a save-outcome modifier effect
- srd51.feature.monk.tongue-of-the-sun-and-moon: grant-proficiency needs an 'understand all spoken languages' item
- srd51.feature.monk.perfect-self: needs an initiative trigger with restoreResource and a resource 'equals 0' condition
- srd51.feature.paladin.aura-of-protection / aura-of-courage / srd51.feature.oath-of-devotion.aura-of-devotion: need an ally aura effect with a level-scaled range and a consciousness condition
- srd51.feature.oath-of-devotion.purity-of-spirit / srd51.feature.way-of-the-open-hand.tranquility: need an apply-spell-effect kind (permanent or on a rest trigger, with a DC override)
- srd51.feature.oath-of-devotion.channel-divinity (sacred-weapon): needs an instance-scoped weapon target chosen at activation
- srd51.feature.oath-of-devotion.holy-nimbus: needs an aura/area damage effect on others' turn start
- srd51.feature.hunter.defensive-tactics: needs incoming-roll disadvantage and a per-attacker temporary AC modifier
- srd51.feature.ranger.feral-senses / lands-stride: need a roll rule that cancels a situational disadvantage and a movement-cost kind
- roll schema: a save roll followed by a damage roll that applies only on a successful save (Quivering Palm) needs an onSuccess 'full' / onFailure outcome

## Rogue, sorcerer, warlock, wizard

- srd51.feature.school-of-evocation.empowered-evocation (also Elemental Affinity, Agonizing Blast, Eldritch Spear): modify needs a spell filter (school, class, spell id, damage type)
- srd51.class.warlock Thirsting Blade / Lifedrinker / Pact of the Blade: needs a pact-weapon item marker or a modify-attacks filter on a designated item
- srd51.class.warlock at-will invocations (Armor of Shadows, Ascendant Step, Beast Speech, Chains of Carceri, Eldritch Sight, Fiendish Vigor, Mask of Many Faces, Master of Myriad Forms, Misty Visions, Otherworldly Leap, Visions of Distant Realms, Whispers of the Grave): grant-spells needs at-will/no-slot, self-only and no-material flags
- srd51.class.warlock Pact of the Chain / Book of Ancient Secrets / Pact of the Tome: grant-spells needs a ritual field, and open-choice answers need to be able to become granted spells
- srd51.feature.warlock.eldritch-invocations / srd51.feature.sorcerer.metamagic: the open-choice count needs to be table- or formula-driven, plus replace-on-level-up
- srd51.feature.warlock.eldritch-invocations Devil's Sight: needs a dedicated sense that sees through magical and nonmagical darkness (not darkvision)
- srd51.feature.rogue.expertise: needs a choice pool mixing skills and tools, filtered by current proficiencies
- srd51.class.rogue Evasion, Reliable Talent, Elusive / thief Supreme Sneak, Thief's Reflexes: need a d20 floor on proficient checks, a save-outcome rule, a 'no advantage against you' rule, a half-speed-movement condition, and two turns in the first round
- srd51.feature.sorcerer.font-of-magic / Twinned Spell: need costs and restoreResource that depend on the slot or spell level chosen at use, plus temporary created slots
- srd51.subclass.warlock.the-fiend Fiendish Resilience: needs a choice that can be re-answered on a rest, and a qualified resistance (nonmagical, non-silvered)
- srd51.class.wizard Spellcasting / Spell Mastery / Signature Spells: grant-spellcasting needs spellbook-size and prepared-count fields, choices limited to spellbook spells, and always-prepared or slot-free grants
- srd51.feature.draconic-bloodline.dragon-ancestor: needs a damage-type value on a choice option that later effects can read, and a check modifier scoped to a creature type (Charisma checks with dragons)

## Equipment, backgrounds, feats

- srd51.class.fighter multiclass.prerequisites: 'Strength 13 or Dexterity 13' needs an anyOf/OR form; class.schema.json multiclass.prerequisites is only an AND map from ability to minimum
- srd51.rule.multiclassing.channel-divinity: cleric and paladin both declare-resource channel-divinity; the last 'set' wins instead of the highest, and the resource is listed twice. Extra Attack not stacking and Unarmored Defense once-only exist only as rule text
- Antitoxin: play effects have no timed roll-advantage (advantage on saves against poison for 1 hour)
- Light sources (candle, torch, lamp, bullseye and hooded lanterns): no item field or effect for emitted light radius/cone or fuel duration
- Beyond 1st Level: no schema field for the XP threshold per character level
- Languages: ruleset.schema.json language items have only id, name and exotic; no script, typical speakers or dialects
- srd51.item.blowgun: the item damage field (dice NdM) can't hold a flat damage value such as 1
- Mounts: no item field for a mount's speed or carrying capacity (authored mount items carry them only as text)
- srd51.item.ram-portable: modify has no situational qualifier ('against'), so a +4 limited to breaking doors can't be expressed

## Rules

- srd51.condition.paralyzed/stunned/unconscious/petrified/blinded/restrained/prone/invisible: advantage or disadvantage on attack rolls made against the creature, and the rule that a hit from within 5 ft is a critical hit, need an incoming-roll side on roll-advantage/roll-disadvantage (e.g. on.side: against-you, with a range condition for prone) and a crit-on-hit-within-range modifier
- srd51.condition.paralyzed/stunned/unconscious/petrified/blinded/deafened: automatically failing Str/Dex saves and sight or hearing checks needs a roll-auto-fail outcome effect
- srd51.condition.paralyzed/stunned/unconscious/petrified: one condition implying another (incapacitated, and prone for unconscious) needs an 'implies' field on conditions or an apply-condition effect
- srd51.condition.exhaustion: level 6 Death needs a death outcome effect. The long-rest reduction by 1 needs a condition on the rest-recovery rule (the creature must also have eaten and drunk)
- srd51.condition.charmed/frightened/grappled: these need targeting and movement-restriction effects, effects that apply to another creature (the charmer's social advantage), a 'when' for frightened's line of sight, and end triggers for grappled

## Spells A–F

- srd51.spell.alter-self (also Bestow Curse, Blindness/Deafness, Contagion, Enhance Ability, Enlarge/Reduce, Fire Shield, Eyebite): needs a choice made each time the spell is cast, with effects for each option, plus a walking-speed formula variable
- srd51.spell.blur (also Faerie Fire, Foresight, Dispel Evil and Good, Beacon of Hope, Chill Touch, Fire Shield, Cure Wounds, Faithful Hound, Arcane Hand): needs advantage or disadvantage on attacks made against the character, a healing modifier (maximised healing, can't regain hit points), a trigger that deals damage back to a melee attacker, and a spellcasting-ability-modifier formula variable
- srd51.spell.aid (also False Life, Color Spray, Flame Blade): needs a flat or formula scaling.add (+5 hit points per slot level), or slotLevel inside effect formulas; Flame Blade's +1d6 per two slot levels fits no scaling shape
- Area schema: needs square, wall and circle shapes (Entangle, Black Tentacles, Blade Barrier, Earthquake), and a damage roll needs a damage-type choice (Forbiddance radiant or necrotic)
- Modify effect / formula engine: needs a dice penalty (negated dice in formulas or a subtract op) to express Bane's -1d4
- srd51.spell.eldritch-blast: needs a level-stepped count scaling (a table of beam counts, separate from damage tables)

## Spells G–Z

- srd51.spell.plant-growth: castingTime has no way to express alternatives ('1 action or 8 hours')
- srd51.spell.glyph-of-warding / symbol: duration has no 'until dispelled or triggered'; prestidigitation and thaumaturgy need an 'up to' duration without concentration
- srd51.spell.heal: scaling.add has no flat amount (+10 per slot); spiritual-weapon needs a step size and magic-weapon a stepped bonus; duration, the globe's blocked level, the private-sanctum cube and the modify-memory window can't change with slot level
- srd51.spell.healing-word (and mass-healing-word, mass-cure-wounds, prayer-of-healing, cure-wounds, spiritual-weapon, heroism, shillelagh): no formula token for the spellcasting ability modifier, and heroism needs an onTurnStart hook
- srd51.spell.guiding-bolt (holy-aura, protection-from-evil-and-good, irresistible-dance, magic-circle): no advantage/disadvantage on attacks made AGAINST the bearer, optionally keyed on creature type
- srd51.spell.giant-insect (phantom-steed, polymorph, true-polymorph, shapechange, magic-jar, simulacrum): no summon/assume-form effect pointing at creature ids
- srd51.spell.glibness: modify can't set a d20 minimum or replacement; spider-climb needs a speed variable in formulas
- srd51.spell.spirit-guardians: damage type depends on the caster's alignment; needs an open-choice of damage type or an alignment condition
- srd51.spell.sleep: no roll type for a hit-point pool (5d8 +2d8 per slot)
- srd51.spell.prismatic-spray: no random per-target pick among options (d8 ray)
- srd51.spell.protection-from-energy / glyph-of-warding / symbol: spells can't carry a per-cast open-choice with options that hold rolls or saves
- srd51.spell.wall-of-ice / ice-storm: scaling can't name the roll it applies to. Wall of ice needs different dice on two rolls; ice storm's +1d8 applies only to the bludgeoning roll, not to the 4d6 cold
- srd51.spell.tiny-hut: area shape has no hemisphere

## Traps, poisons, magic items A–M

- ioun-stone (and any 'increases by 2, to a maximum of 20' score bonus, including belt-of-dwarvenkind): needs an 'at most' clamp op on modify, or a clamp of ability.X to ability.X.max
- cloak-of-arachnida: climbing speed equal to walking speed needs a speed variable (e.g. value('speed.walk')) in formulas
- gloves-of-swimming-and-climbing: +5 Athletics only for climbing or swimming needs a situational qualifier on modify
- dragon-slayer, giant-slayer, holy-avenger, mace-of-disruption, mace-of-smiting, dwarven-thrower: extra damage by target creature type needs a target creature-type condition on modify-attacks/extraDamage; Mace of Smiting's nat-20 damage needs a crit/natural-roll gate
- circlet-of-blasting, eyes-of-charming, medallion-of-thoughts, helm-of-telepathy, cloak-of-arachnida, crystal-ball, helm-of-brilliance: grant-spells needs dc and attackBonus fields
- adamantine-armor, cloak-of-displacement, arrow-catching-shield, boots-of-speed, cloak-of-elvenkind: need a defense-side effect (modifiers on incoming attacks or checks, crit negation) or a conditional AC modify (vs ranged)
- manual-of-bodily-health / manual-of-gainful-exercise / manual-of-quickness-of-action: need a permanent adjustment of ability.X and ability.X.max as a play effect
- ammunition: modify-attacks filter needs an ammunition-item selector, plus consumption tracking ('no longer magical once it hits')

## Magic items N–Z

- srd51.item.staff-of-the-magi: Spell Absorption needs a formula variable for the absorbed spell's level, so restoreResource can add that many charges
- srd51.item.potion-of-* / oil-of-*: onUse needs a play-effect that applies effect-language effects (modify, resistance, advantage, speeds, spell effects) for a duration (climbing, flying, giant strength, growth, diminution, resistance, speed, gaseous form, water breathing, mind reading, clairvoyance, animal friendship, etherealness, sharpness, slipperiness, heroism's bless)
- srd51.item.potion-of-poison: needs a self-damage play-effect, and a recurring start-of-turn damage that drops by 1d6 on each successful save
- srd51.item.tome-of-clear-thought / tome-of-leadership-and-influence / tome-of-understanding: onUse needs a play-effect that permanently raises an ability score and its maximum
- srd51.item.slippers-of-spider-climbing / winged-boots / potion-of-flying / ring-of-elemental-command: the formula language needs a walking-speed variable for climb, fly and swim speeds equal to your walking speed
- srd51.item.ring-of-regeneration / periapt-of-wound-closure: needs periodic healing, a Hit Die healing multiplier and an auto-stabilize effect
- srd51.item.ring-of-feather-falling / ring-of-water-walking / robe-of-eyes: needs falling and liquid-walking movement traits, and a sense that sees invisible creatures and into the Ethereal Plane
- srd51.item.robe-of-stars / winged-boots / wings-of-flying / well-of-many-worlds / rod-of-security / ring-of-djinni-summoning: needs dusk and elapsed-time recharge triggers
- srd51.item.talisman-of-the-sphere: needs a way to multiply the proficiency bonus for one check
- srd51.item.rod-of-lordly-might: an item's attack needs to switch between forms
- srd51.item.ring-of-spell-storing / rod-of-absorption: needs a mechanism to store spells and energy

## Monster rules and appendices

- srd51.condition.paralyzed/petrified/stunned/unconscious (and blinded/deafened for checks): 'automatically fails' STR/DEX saves, or checks that need sight or hearing, needs an auto-fail roll effect such as {kind: roll-auto-fail, on: {type: save, ability: str|dex}}, with a sense qualifier for checks
- srd51.condition.incapacitated/paralyzed/petrified/stunned/unconscious: needs a condition-implies-condition effect (incapacitated, prone, drops held items) and an effect that locks actions and reactions
- srd51.condition.blinded/invisible/paralyzed/petrified/prone/restrained/stunned/unconscious/charmed: needs an incoming side on roll-advantage/roll-disadvantage for attacks against the creature, a within-distance (5 ft.) condition, an auto-critical effect, and advantage for the charmer on social checks
- srd51.condition.exhaustion: level 6 death needs a death/outcome effect, and the long-rest reduction needs a rest-triggered level change for leveled conditions
- srd51.rule.monsters.prof-bonus-by-cr / experience-points-by-cr / hit-dice-by-size: tableBy has no challenge or size key, so these tables exist only as markdown; the engine needs 'by: challenge|size', or xp and proficiencyBonus derived from challenge

## Creatures A–G

- grimlock: senses need a note or conditional radius for 'blindsight 30 ft. or 10 ft. while deafened'
- metallic dragons (ancient/adult brass, bronze, copper, gold, silver; brass/bronze/copper/gold/silver wyrmlings; young ones), androsphinx Roar, bulette Deadly Leap: an action needs alternative sub-options each with its own save/damage, or a save where the target picks the ability
- centaur, chimera, chuul, glabrezu, barbed-devil, erinyes, dragon-turtle, drider, efreeti, bandit-captain, gladiator: multiattack needs option sets (alternatives and replace-one rules)
- deva Healing Touch: an action needs a healing dice field for 'regains 20 (4d8 + 2) hit points'
- Rider-save actions: a damage entry needs an on-hit vs rider-on-failed-save marker so onSuccess half applies only to the rider damage
- Repeated per-turn damage (fire-elemental ignite, gelatinous-cube Engulf, giant-frog/giant-toad Swallow, behir Swallow): damage entries need a timing marker
- Self-inflicted damage (Incorporeal Movement 1d10 force on ghost, specter and the rest): no field for damage the creature takes itself

## Creatures H–O

- Attack riders with a save (imp Sting 3d6 poison DC 11 Con half; homunculus Bite; horned devil Tail; kraken Bite swallow and Fling; lich Paralyzing Touch; mummy and mummy lord Rotting Fist; otyugh Bite; mastiff Bite): the schema would need a per-hit rider (onHit: {save, damage, condition}) separate from the hit damage. The same gap makes the save on minotaur Charge (push/prone) sit next to its extra 2d8 without saying the save doesn't affect that damage.
- Multiattack with alternatives (horned devil, iron golem, kraken, lamia, lizardfolk, manticore, medusa, merrow, oni) and hydra's 'one bite per head': multiattack would need choice groups and a count tied to a variable
- Passive trait rules exist only as text (hydra Multiple/Reactive Heads, oni Regeneration, iron golem Fire Absorption, marilith Reactive, Magic Resistance, Pack Tactics, Keen senses, lich and mummy lord Rejuvenation): the schema would need per-trait standing effects (advantage on saves against magic, regeneration, extra reactions)

## Creatures P–Z

- young brass/bronze/copper/gold/silver dragons and the silver dragon wyrmling: Breath Weapons needs a sub-options list of {name, area, save, damage}
- sahuagin, tribal-warrior, werewolf and salamander Spear, veteran and wight Longsword (versatile), and all swarms (bloodied damage): damage needs an alternative-dice entry with a condition
- wight, scout, sahuagin, weretiger, wererat, wereboar, vampire, vampire-spawn, werebear, werewolf: multiattack needs alternative sets, 'at most one of' limits, or a set per form
- violet-fungus: the multiattack count needs to accept dice (1d4 Rotting Touch)
- wererat, lycanthropes, vampire: forms need their own senses and languages, and actions and traits need a forms list ('Form Only')
- shadow: skills need a conditional bonus (Stealth +6 in dim light or darkness)
- action save: a single save field cannot say which part of the damage it applies to (hit damage or rider damage)
