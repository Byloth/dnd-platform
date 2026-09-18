# 13 — UX and accessibility

## Purpose

This document fixes the interaction rules every screen must follow so that a newcomer can use the platform at a dim table with one thumb, an expert is not slowed down, and people using assistive technology get the same sheet. It also separates interface translation from content localisation ([05](05-content-model-and-sources.md)).

## Principles

- **The table is the primary context.** A phone, one hand, poor light, thirty seconds between turns. Desktop is for building and authoring.
- **Progressive disclosure** (Principle 4): summary first, detail on tap, rule text on a second tap. Nothing is hidden, nothing is shown before it is needed.
- **Consistency over cleverness.** One icon per activation type, one colour role per resource kind, one word per game concept, everywhere: sheet, play mode, assistant, print.
- **Accessible by construction.** Contrast, semantics, keyboard and screen-reader support are acceptance criteria, not polish.
- **Language is part of the product.** Italian and English interface from the first release (Decided); adding a language must not require code changes.
- **Fast on cheap hardware.** The sheet must be usable on a low-end phone over a weak connection.

## Mobile-first at the table

- Play mode ([09](09-play-mode.md)) is designed for portrait phone first, then scaled up.
- The bottom third of the screen holds what is used every turn: HP controls, "What can I do now?", the dice, the rest buttons. The top holds identity and read-only values.
- Minimum tap target 44 × 44 points; destructive or irreversible-looking actions (long rest, spend the last resource) require a confirmation or offer immediate undo ([09](09-play-mode.md)).
- One-thumb reach: primary controls within the lower half; secondary in a sheet that slides up.
- Landscape and tablet layouts show two panes (sheet + assistant) but keep the same components.
- No hover-only interaction anywhere; anything shown on hover is also shown on tap or long-press.

## Progressive disclosure patterns

| Level | Example on a skill | Interaction |
|---|---|---|
| Summary | "Stealth +5" | Always visible. |
| Detail | "+3 DEX, +2 proficiency (Monk)" from provenance ([04](04-domain-model.md)) | One tap. |
| Rule text | The `Rule` entity for ability checks and the Stealth skill description | Second tap or "learn more". |

The same three levels apply to actions (one line → full card → rule), resources (pips → recharge rule → source feature) and conditions (badge → effects → rule). Help level ([11](11-play-assistant.md)) decides which level opens by default: newcomer opens Detail on first use, expert never auto-opens.

## Iconography and colour roles

- One fixed icon per activation type: action, bonus action, reaction, free, movement, passive. Same glyphs on screen and in print ([12](12-print-and-export.md)).
- One icon per resource display style declared by content (pips, counter, slot grid); packages may not supply arbitrary icons in the first phases, they pick from the set.
- Colour roles, not colours: `resource`, `damage`, `healing`, `warning`, `unavailable`. Themes map roles to colours; content never names a colour.
- Never information by colour alone: unavailable options are greyed *and* labelled; damage types carry a word; pips have a filled/empty shape difference.

## Low-light reading

- Dark theme and light theme, following the device setting by default, switchable in one tap from play mode.
- A high-contrast variant of each theme.
- Minimum body text size 16 px equivalent on phones; numbers used every turn (HP, AC, to-hit) larger.
- No text over imagery in play mode; portraits and decorative art live in the cover and profile only.

## Accessibility requirements

1. Text contrast at least 4.5:1, large text and icons at least 3:1, in every theme.
2. The sheet is a structured document to assistive technology: sections are landmarks, values are labelled ("Armor Class, 15"), pips expose "3 of 3 Ki points".
3. Every control is reachable and operable by keyboard; focus order follows the visual order; focus is visible.
4. Dice results and state changes are announced to screen readers ("Attack roll: 17, hit"); the log ([09](09-play-mode.md)) is readable as text.
5. Animations respect the reduced-motion preference; dice animation is optional and never delays the result.
6. No information conveyed by colour or icon alone; every icon has a text label or accessible name.
7. Zoom to 200 % must not break layouts or hide controls.
8. Forms in character creation ([07](07-character-creation.md)) show errors next to the field, in plain language, with the fix stated.
9. Print output is tagged for reading order and the fillable fields are labelled ([12](12-print-and-export.md)).

## Interface internationalisation

- Interface strings live in the platform, content strings live in packages ([05](05-content-model-and-sources.md)); the two never mix. A game term appearing in the interface ("Bonus action") is taken from the glossary vocabulary shared with content so that interface and content use the same word in the same language.
- Italian and English from the first release (Decided). More languages are Deferred, DEC-09.
- Numbers, dates, units (feet vs metres for speed and range) follow the user's locale; the conversion is display-only, content stores the rules edition's native unit.
- Pluralisation and gender are handled by the translation layer, never by string concatenation.
- Every string has a context note for translators; screenshots are part of the translation kit.
- The glossary in [03](03-glossary.md) is the source of truth for terminology; a term that is not in it is not used in the interface (Decided: the UI never invents a term).

## Print styles

Print mode on screen and the PDF share one stylesheet ([12](12-print-and-export.md)): same typography scale, same card anatomy, same icons in monochrome. What the player previews on screen is what prints.

## Performance budget

- Play mode interactive within two seconds on a low-end phone on a slow mobile connection; sheet recomputation after an event under one hundred milliseconds on the device.
- No blocking network call on any in-play action; state changes apply locally and synchronise afterwards.
- Assets (icons, fonts) small enough to be cached on first visit; portraits lazy-loaded and never required.
- Offline use of a loaded sheet is Deferred, DEC-06; the architecture must not preclude it ([15](15-logical-architecture.md)).

## Error and empty states

- Written for newcomers: what happened, what it means for them, what to do next, in one short sentence each. No error codes on screen (available in a details drawer).
- Empty states teach: an empty spells section for a caster explains how spells are chosen and links to creation; an empty conditions box says "nothing is affecting you".
- A sheet with validation warnings ([04](04-domain-model.md)) is always rendered, with the warnings listed at the top and each linking to the choice that resolves it.
- A missing package is explained as "this character uses content that is not installed here" with the package name and what to do, never as a crash.

## What needs to be done

1. Define the component set: value tile, action card, resource pips, condition badge, provenance drawer, rule drawer, stepper; each with its three disclosure levels, its accessible name pattern and its print rendering.
2. Define the icon set for activation types and resource styles and the colour-role palette with light, dark and high-contrast themes.
3. Write the play-mode layout specification for portrait phone, landscape and tablet.
4. Define the interface string catalogue format, the translator kit and the term-check against the glossary.
5. Write the accessibility acceptance checklist and run it on every screen before a phase closes.
6. Set and measure the performance budget on a reference low-end device.
7. Write the error and empty-state copy in English and Italian.
8. Align help-level behaviour with [11](11-play-assistant.md) in one shared table.

## How

- Design and accessibility reviews happen per phase on the screens that phase delivers: Phase 1 build mode and print preview, Phase 2 play mode, Phase 4 authoring screens.
- Themes and icons are platform assets; content refers to them by role and name only, which keeps homebrew consistent with official content (Principle 6).
- Locale conversions and translations are applied at render time only, so the computed sheet and the export stay locale-independent ([12](12-print-and-export.md)).

## Why

- The original playbook was praised for content and criticised for clutter and illegibility; the same content with disclosure, margins and consistent icons is the difference between a poster and a tool.
- Accessibility rules double as newcomer rules: labelled values, announced results and plain-language errors help everyone at the table.
- Separating interface translation from content localisation lets the community translate content packages without touching the platform, and lets the platform add a language without touching content.

## Deferred decisions

- DEC-06 Offline support — Phase 2.
- DEC-09 Supported languages beyond Italian and English — Phase 1.
- DEC-01 Technology stack (constrains the component implementation, not this specification) — Phase 0.

## Depends on / feeds into

Depends on [01](01-vision.md), [03](03-glossary.md), [05](05-content-model-and-sources.md), [11](11-play-assistant.md). Feeds into [07](07-character-creation.md), [08](08-dynamic-sheet.md), [09](09-play-mode.md), [12](12-print-and-export.md), [15](15-logical-architecture.md), [16](16-roadmap.md).
