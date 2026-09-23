# 03 — Glossary

## Purpose

Two vocabularies are used across these documents: the game's own terms (5e) and the platform's terms. Both are fixed here so every document means the same thing by the same word. Game terms use the official English name first and the official Italian name second, because the first users are Italian and printed material will be localised.

## Game terms (5e)

| English (official) | Italian (official) | Meaning in one line |
|---|---|---|
| Ability score | Punteggio di caratteristica | One of six numbers (STR, DEX, CON, INT, WIS, CHA) describing raw capability. |
| Ability modifier | Modificatore | Derived from the score: (score − 10) ÷ 2, rounded down. Added to most rolls. |
| Proficiency bonus | Bonus di competenza | A level-based bonus added to rolls the character is proficient in. |
| Proficiency | Competenza | Being trained in a skill, save, weapon, armour or tool. |
| Expertise | Maestria | Double proficiency bonus on a skill or tool. |
| Skill | Abilità | One of 18 named checks (Stealth, Perception…), each tied to an ability. |
| Saving throw | Tiro salvezza (TS) | A roll to resist an effect, tied to an ability. |
| Ability check | Prova di caratteristica | A d20 + modifier roll to attempt something uncertain. |
| Passive Perception | Percezione passiva | 10 + Perception modifier; used without rolling. |
| Armor Class (AC) | Classe Armatura (CA) | The number an attack roll must meet or beat to hit. |
| Hit points (HP) | Punti ferita (PF) | Health. Temporary hit points are a separate buffer. |
| Hit Dice (Hit Die) | Dadi vita (Dado vita) | A pool of dice, one per level, spent on a short rest to regain hit points. |
| Hit dice | Dadi vita | Dice spent on a short rest to heal; one per level. |
| Death saving throw | Tiro salvezza contro morte | Rolls made at 0 HP; three successes stabilise, three failures kill. |
| Initiative | Iniziativa | A roll that orders turns in combat. |
| Speed | Velocità | Distance the character can move on a turn. |
| Action / Bonus action / Reaction | Azione / Azione bonus / Reazione | The three kinds of activity in a turn; one of each per round, a bonus action only if something grants one. |
| Free interaction | Interazione gratuita | One small object interaction per turn (draw a weapon, open a door). |
| Attack roll | Tiro per colpire | d20 + modifiers vs AC. |
| Damage roll | Tiro per i danni | Dice + modifiers on a hit. |
| Critical hit | Colpo critico | A natural 20 on an attack; damage dice are doubled. |
| Advantage / Disadvantage | Vantaggio / Svantaggio | Roll two d20 and keep the higher / the lower. |
| Spell slot | Slot incantesimo | A resource spent to cast a spell of a given level. |
| Cantrip | Trucchetto | A spell cast without slots. |
| Spell save DC | CD del tiro salvezza | 8 + proficiency + spellcasting ability modifier. |
| Concentration | Concentrazione | Some spells last only while the caster concentrates; one at a time. |
| Ritual | Rituale | A spell cast slowly without a slot. |
| Short rest / Long rest | Riposo breve / Riposo lungo | One hour / eight hours of rest; each restores specific resources. |
| Condition | Condizione | A standard status (Blinded, Grappled, Prone…) with fixed effects. |
| Species (2024) / Race (2014) | Specie / Razza | The character's ancestry; grants traits. |
| Class / Subclass | Classe / Sottoclasse | The character's profession and its specialisation, source of most features. |
| Background | Background | Origin story; grants proficiencies and a feature. |
| Feat | Talento | An optional special ability, usually taken instead of an ability score increase. |
| Ability Score Improvement (ASI) | Aumento dei punteggi di caratteristica | A level milestone that raises scores or grants a feat. |
| Multiclassing | Multiclasse | Taking levels in more than one class. |
| Inspiration | Ispirazione | A DM-granted token giving advantage on one roll. |
| Experience points (XP) / Milestone | Punti esperienza / Traguardo | Two ways of gaining levels. |
| Alignment | Allineamento | A two-word moral descriptor (Lawful Neutral…). |
| SRD | SRD | System Reference Document: the subset of 5e rules published under a free licence. |
| PHB / DMG / MM | Manuale del Giocatore / Guida del DM / Manuale dei Mostri | The three core rulebooks. |

## Platform terms

| Term | Definition |
|---|---|
| **Content** | Everything the platform knows about the game: species, classes, spells, items, conditions, rules text. Content is data, never code. |
| **Content package** | A versioned, self-describing bundle of content with a manifest, dependencies and a visibility level. The unit of extension. The base rules, an official book and a user's homebrew are all packages. See [05](05-content-model-and-sources.md). |
| **Base package** | The package shipped with the platform: the free SRD content. Every other package depends on it directly or indirectly. |
| **Source** | The book or author a piece of content comes from. Every content entry carries a source for attribution and filtering. |
| **Private package** | A package whose content is not freely redistributable (an official book). Stored and served under access control, never published. |
| **Entity** | A typed content record: `Species`, `Class`, `Subclass`, `Background`, `Feat`, `Spell`, `Item`, `Condition`, `Rule`, `Feature`. |
| **Feature** | Something a character *has*: a trait, a class ability, a feat's benefit. A feature carries text and zero or more effects. |
| **Effect** | A declarative statement of what a feature does to the character: modify a value, grant a proficiency, add an action, declare a resource, add a sheet section, enable spellcasting. Effects are data the rules engine interprets; they are the whole mechanical vocabulary of the content format. |
| **Choice** | A decision a player makes that content asks for: pick a subclass, a skill, a spell, a fighting style. Choices have options, prerequisites and a level at which they open. |
| **Resource** | A pool with a current value, a maximum (often computed) and a recharge rule (short rest, long rest, dawn, manual). Ki points, spell slots, Rage uses, Hit Dice are resources. |
| **Action (platform)** | Something the character can *do* in play: attack with a weapon, cast a spell, use a feature. An action has an activation type (action, bonus action, reaction, free, other), an optional resource cost, and an effect on the game (rolls, damage, conditions). |
| **Derived value** | Any number computed from choices and content: modifiers, AC, HP maximum, attack bonus, save DC, speed. |
| **Provenance** | The list of contributions that produced a derived value, each with its source (entity, feature, choice). Powers "explain this number". |
| **Character** | Choices + state, resolved against a set of packages into a computed sheet. |
| **Character state** | The mutable, in-play part: current HP, temporary HP, resource current values, active conditions, death saves, inspiration, notes, equipment worn. |
| **Snapshot** | An immutable copy of a character at a point in time (typically each level). |
| **Computed sheet** | The full output of resolving a character: every derived value with provenance, every action, every resource, every feature text, the list of active sections. |
| **Section** | A block of the sheet (Skills, Spellcasting, Ki…). Sections are activated by content, not by template. |
| **Sheet mode** | One of *build* (creation and editing), *play* (at the table) or *print* (PDF). Same data, different layout and interaction. |
| **Play engine** | The part of the platform that applies in-play events (take damage, spend a slot, rest) to character state, with a log and undo. |
| **Help level** | A per-user setting (*newcomer*, *regular*, *expert*) that controls how much explanation and guidance the interface shows. |
| **Assistant** | The feature set that suggests what a character can do now, how a turn works, and why; never acts on its own. |
| **Playbook** | The printed/exported document: sheet plus features, spells, tactical guide and rules cheat sheet. Named after the PDF that inspired this project. |
| **Campaign** | A group of characters under one DM, with an allowed set of packages. Modelled early, delivered late. |
| **Phase** | A stage of the roadmap ([16](16-roadmap.md)). Decisions are attached to the phase that needs them. |
| **DEC-nn** | An identifier of an open decision recorded in [17](17-open-decisions.md). |

## Conventions used in all documents

- **Decided** marks a choice that is settled and should not be reopened without updating [17](17-open-decisions.md).
- **Deferred** marks a choice explicitly postponed; it always points to a DEC-nn entry.
- Principles are referenced as "Principle n" from [01-vision.md](01-vision.md).
- Game terms use the English official name; the Italian name is given in parentheses at first use where it helps.
