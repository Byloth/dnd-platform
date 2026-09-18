# 11 — Play assistant

## Purpose

This document specifies the guidance layer that sits on top of the computed sheet during play: what the character can do right now, how a turn works, which combinations of actions are worth knowing, what to do in common situations, and which rules apply at the moment they apply. It is the platform's answer to the playbook's "Tactical guide" and "Your turn in 5 steps" pages, made dynamic and correct for every character. It is aimed first at the newcomer persona ([02](02-personas-and-journeys.md)).

## Principles

- **The assistant proposes, the player decides** (Principle 8). It never spends a resource, never rolls, never chooses. Every suggestion is a button the player may press, with a reason next to it.
- **Everything the assistant says is derived from the computed sheet and content** ([04](04-domain-model.md)). It has no private knowledge of classes. If a homebrew subclass declares its actions and tags correctly, the assistant advises on it exactly as it does on an official one (Principle 6).
- **Explain, do not hide** (Principle 1, Principle 4). Options that are unavailable are shown greyed out with the reason ("not available: you already used your bonus action"), never removed.
- **Rule-based first** (Decided). The first assistant is deterministic: prerequisites, costs, tags and templates. Language-model assistance is a later, optional layer (Deferred, DEC-07).
- **Advice is content.** Guiding questions, situational advice and reminders are localisable strings in content packages, so they exist in Italian on day one and can be extended by homebrew authors.
- **Switchable.** The whole layer can be reduced or turned off per user via the help level; the sheet must be complete without it.

## Help levels

A per-user setting ([03](03-glossary.md)) read by every screen, not only by the assistant.

| Help level | What is shown | Who it is for |
|---|---|---|
| **Newcomer** (default for new accounts) | "What can I do now?" panel open by default in play mode; turn guide with guiding questions; combos; situational advice; reminders as prominent banners; every game term is a link to its glossary entry; every number opens its provenance on first tap. | First campaign. |
| **Regular** | "What can I do now?" collapsed but one tap away; reminders as small toasts; combos and situations on demand; glossary links only on hover/long-press. | Knows the basics, wants speed. |
| **Expert** | Assistant hidden; reminders limited to state-changing ones (concentration check, death saves); no guiding text anywhere. | Experienced players, DMs reading sheets. |

The level can be changed at any time from play mode without leaving the sheet. Downgrading from expert to newcomer must not require any data.

## "What can I do now?"

The core feature. Input: the computed sheet (actions, resources, spellcasting), the play-engine state (current resources, active conditions, concentration, turn tracker from [09](09-play-mode.md)). Output: a list of actionable options, grouped by activation type.

Groups, in this order: **Action**, **Bonus action**, **Reaction**, **Free** (free interaction and no-cost abilities), **Movement**.

For each option:
- name and icon of the activation type (icon set shared with [13](13-ux-and-accessibility.md));
- cost, if any, in the resource's own unit ("1 Ki", "1 level-2 slot", "1 use");
- a one-line effect derived from the action's declaration (rolls, damage dice with modifiers already computed, save DC, range, duration/concentration);
- a tap target that opens the full text, the provenance of its numbers and, when relevant, the linked `Rule` entity;
- availability state:
  - *available*;
  - *unavailable because* the activation type was already used this turn, the resource is empty, a prerequisite is unmet ("after the Attack action"), a condition forbids it (Incapacitated, Grappled for movement), or concentration would be broken (shown as a warning, not a block, because the player may want to drop concentration).

Rules for the list:
1. Options come only from actions declared by features, spells, equipped items and the generic combat actions in the base package's `Rule` entities (Attack, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object, Cast a Spell). Generic actions are content too.
2. Sorting inside a group: available first; then by frequency of past use by this character (local statistic, optional); then by name.
3. The list is recomputed after every play-engine event, so spending Ki or taking damage updates availability immediately.
4. Pressing an option hands over to play mode ([09](09-play-mode.md)), which performs the rolls and state changes. The assistant itself does nothing.
5. When the turn tracker is not in use (out of combat), activation-type exhaustion is ignored and the same list serves as "what my character can do", including exploration and social options tagged as such.

## Turn guide

Adapted from the playbook's five steps and shown as a horizontal stepper in play mode at the newcomer level (collapsible at regular level).

| Step | Guiding questions (content strings, localisable) | What the platform adds |
|---|---|---|
| 1 Assess | Where am I? How many enemies? Is there cover? What is my goal? What is my best option? | Nothing to compute; shows the current conditions and concentration to remind the player of their own state. |
| 2 Move | Position yourself. Use cover. Think about next turn. Use the terrain. | Current speed with its provenance; movement-affecting conditions; Disengage/Dash reminders. |
| 3 Action | Attack, use a feature, cast a spell, help an ally. | The **Action** group of "What can I do now?". |
| 4 Bonus action | One bonus action per turn; only if something grants one. | The **Bonus action** group, with the "one per turn" reminder and combos. |
| 5 Reaction | Happens on someone else's turn, once per round. | The **Reaction** group, with each reaction's trigger stated. |

The "if you are stuck" list of the playbook (move, attack, dodge, help, disengage, ready, use an object, ask the DM) is the fallback shown when the Action group is empty or the player long-presses the step.

## Combos

Combos are not authored per class; they are derived from action declarations:

- An action that declares a prerequisite of the form "after the *X* action" (Flurry of Blows after Attack, Martial Arts bonus unarmed strike after Attack) produces the combo "*X* + *this*", with the combined effect computed: number of attacks, total cost.
- An action that declares "as a bonus action, take the *Y* action" (Step of the Wind → Dash or Disengage, Cunning Action) produces "*Y* as a bonus action + your Action free".
- A resource-gated action produces the cost total ("Attack + Flurry of Blows: 1 Ki, 3 attacks at level 3").
- Content may also declare explicit combos (a tagged pairing of two action identifiers with a text) for cases the derivation cannot infer; homebrew uses the same field.

Combos are listed on the tactical page of the print output ([12](12-print-and-export.md)) using the same derivation, so screen and paper agree.

## Situational advice

The playbook's "common encounters — what to do" table becomes a content-driven mapping:

- The base package defines a small enumerable set of **situations**: `many-enemies`, `strong-enemy`, `ranged-enemies`, `ally-in-trouble`, `exploration`, `social`, `stealth`, `low-hp`. Packages may add situations.
- Actions, features and spells carry **situation tags** in content (e.g. Patient Defense → `strong-enemy`, `low-hp`; Deflect Missiles → `ranged-enemies`; Pass Without Trace → `exploration`, `stealth`; Minor Illusion → `social`, `exploration`).
- The assistant renders, per situation, the character's own tagged options with their cost and availability, plus a short generic sentence from the base package ("Several enemies: move, strike, reposition").
- Because the mapping is data, a homebrew author tags their features and they appear in the right situation without any platform change.

## Inline rule explanations

- Every action, condition, resource and derived value can link to one or more `Rule` entities ([04](04-domain-model.md)). The assistant renders the rule text in a drawer, in the user's language, with the source attribution ([05](05-content-model-and-sources.md)).
- The text shown is the content's own text; the assistant never paraphrases rules from an internal store. If a rule is not in any loaded package, the link is not shown.
- At newcomer level, the first time a mechanic is used in a session (first attack roll, first save, first concentration check) a one-time explanation is offered; dismissed explanations are remembered per user.

## Reminders

Event-driven, produced by the play engine's log ([09](09-play-mode.md)) and rendered by the assistant according to help level:

| Trigger | Reminder |
|---|---|
| Damage taken while concentrating | "Concentration check: CON save, DC = max(10, half damage) = N" with the save button. |
| Second bonus action attempted in a turn | "One bonus action per turn" and the option already used. |
| Start of the character's turn | Reaction is available again; conditions with expiry are listed. |
| Resource reaches zero | Which actions are now unavailable and when the resource recharges. |
| HP at or below a threshold, or 0 | Death save flow, stabilisation options among the character's own actions/items. |
| Short/long rest available (out of combat) | What each rest would restore, computed from resource recharge rules. |
| Level-up threshold reached (XP mode) | Link to progression ([10](10-progression.md)). |

Reminders never block; they are dismissable and logged.

## Transparency rules

1. Every suggestion shows its reason in one line ("suggested because it costs nothing and you have not used your bonus action").
2. Every suggestion links to the provenance or rule that justifies it.
3. Unavailable options remain visible with their reason.
4. The assistant never modifies state, never rolls, never selects a default in a choice the player has not made.
5. The assistant can be disabled entirely; when disabled, play mode is complete and unchanged.
6. Advice texts identify their source package, like any content.

## Advice as content

- Guiding questions, generic situation sentences, reminder templates, "if stuck" lists and one-time explanations are `Rule`-like entries of kind `advice` in content packages, with localisable strings and optional tags (situation, help level, activation type).
- The base package ships them in English and Italian ([05](05-content-model-and-sources.md), [13](13-ux-and-accessibility.md)).
- Homebrew and official packages may add advice bound to their own features (a subclass package can ship "how to play this subclass" tips that appear in the situations panel and in the printed tactical guide).
- Templates use placeholders resolved against the computed sheet (`{monk_level}`, `{ki.current}`), never free formulas.

## What needs to be done

1. Define the help-level setting and its effect on every screen (a table maintained alongside [13](13-ux-and-accessibility.md)).
2. Specify the availability algorithm for "What can I do now?" from the computed sheet and play state, including the unavailability reasons.
3. Specify the combo derivation from action prerequisites and the explicit combo field in content.
4. Define the situation enumeration, the situation-tag field on actions/features/spells, and tag the base package.
5. Define the `advice` content kind, its placeholders and tags; author the base package advice in English and Italian.
6. Define the reminder triggers on top of the play-engine event log.
7. Define the first-time explanation flow and its per-user memory.
8. Write the assistant's test fixtures: the reference Monk at level 3 must yield the expected combos (Attack + Flurry = 3 attacks for 1 Ki; Attack + Patient Defense; Step of the Wind + Attack), the four bonus-action options, Deflect Missiles as the only reaction, and the six situations populated.
9. Reuse the same derivations in the print output ([12](12-print-and-export.md)) so that screen and paper cannot disagree.

## How

- The assistant is a pure function of (computed sheet, play state, help level, loaded advice content) → a view model; no state of its own except dismissed explanations and usage statistics ([15](15-logical-architecture.md)).
- It runs after every play-engine event, on the client where the sheet is displayed.
- It reads content through the same content store as the sheet, so package updates change advice without code changes.
- Phase 2 delivers "What can I do now?" and reminders (they are needed to make play mode usable by newcomers); Phase 5 delivers the turn guide, combos, situations and first-time explanations in full, and evaluates DEC-07.

## Why

- The playbook's most valuable pages for a newcomer were the tactical ones; they were also the most error-prone because they were written by hand for one character. Deriving them from declarations makes them correct for every character and every level.
- Showing unavailable options with reasons is how a newcomer learns the action economy; hiding them teaches nothing.
- Making advice content rather than code is the only way to keep Principle 6 (homebrew parity) and to ship Italian text without a translation layer in the code.
- Starting rule-based keeps the assistant trustworthy and free to run; a language model, if added, must be grounded on the same data and clearly labelled.

## Deferred decisions

- DEC-07 LLM-based assistance — Phase 5. Constraints already fixed: grounded only on the computed sheet, play state and loaded content text; no rule may be invented or paraphrased from outside the loaded packages; every generated sentence cites the entity it relies on; opt-in per user; clearly labelled as generated; cost and privacy of sending character data to a third party evaluated with DEC-10 and [14](14-accounts-sharing-and-campaigns.md).
- DEC-09 Supported languages for advice content — Phase 1.

## Depends on / feeds into

Depends on [04](04-domain-model.md) (actions, resources, provenance, `Rule`), [05](05-content-model-and-sources.md) (localisable content), [08](08-dynamic-sheet.md) (where the panel lives), [09](09-play-mode.md) (turn tracker, event log, state). Feeds into [12](12-print-and-export.md) (tactical guide pages), [13](13-ux-and-accessibility.md) (help level, icons), [16](16-roadmap.md) (Phase 2 and Phase 5 scope).
