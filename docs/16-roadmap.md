# 16 — Roadmap

## Purpose

This document sequences the work into phases. Each phase has a goal, a scope, explicit "done" criteria, and the list of open decisions that **must** be taken at its start (and not before). Phases are ordered by dependency, not by priority: nothing in a later phase is less important, it simply needs an earlier phase to exist.

## Principles

- **Content format and engine first.** Every feature is a view over the computed sheet; until the sheet is right, nothing else can be.
- **Reference fixtures are the yardstick.** Each phase ends when the reference fixtures pass through the new capability correctly: one character per SRD class at fixed levels, a level 3 Way of Shadow Monk from a private Player's Handbook package, and a character with a homebrew feline species. They exercise the base, private and homebrew paths.
- **Decide late, decide once.** A decision appears in exactly one phase's "decisions to take" list and is recorded in [17](17-open-decisions.md).
- **Every phase ships something a player can use.** Even Phase 0 produces a usable artefact: a validated content package and a computed sheet, if only as a document.
- **The DM side is modelled from Phase 1, delivered in Phase 6.** Data structures for campaigns and package visibility exist early so that nothing needs to be retrofitted ([14](14-accounts-sharing-and-campaigns.md)).

## Phases

### Phase 0 — Foundations

Goal: a content format that can express the SRD, and a rules engine that turns a character into a computed sheet with provenance.

Scope:
- Entity catalogue, effect catalogue, condition language, package manifest ([04](04-domain-model.md), [06](06-homebrew-and-extensibility.md)).
- The base package: the full SRD authored in the format ([05](05-content-model-and-sources.md)).
- A sample homebrew package (feline species, custom condition).
- The private-package path working from day one: a git-ignored local directory holding the first official package (Player's Handbook), loaded and validated by the same tooling, never committed.
- Rules engine as a standalone library with the derivation steps of [04](04-domain-model.md); package validator; golden fixture tests ([15](15-logical-architecture.md)).
- No user interface beyond what is needed to inspect a computed sheet.

Done when:
- Every SRD class, subclass, species, background, feat, spell, item and condition is in the base package and passes validation.
- The reference Monk's computed sheet matches hand-computed values (AC, HP, Ki, attacks, saves, skills) with correct provenance for each, including contributions from the private package.
- A second character of every SRD class computes without warnings.
- Adding the homebrew species and the private Player's Handbook package required no engine change.

Decisions taken at the start (2026-09-18, recorded in [17](17-open-decisions.md)): DEC-01 Technology stack (partially: TypeScript, Vue ecosystem, monorepo; app shell deferred to Phase 1), DEC-02 Rules edition (SRD 5.1 first, ruleset selectable by design), DEC-03 Serialisation format (YAML + JSON Schema), DEC-08 Project licence (AGPL-3.0, public repository). Taken during Phase 0 (2026-09-21): DEC-20 Package compatibility and content selection. Execution plan: [phase-0/](phase-0/00-README.md).

### Phase 1 — MVP: create, view, print

Goal: a newcomer builds a character in the browser, sees a dynamic sheet with explanations, and prints the playbook.

Scope:
- Guided character creation, newcomer help level, expert mode as a plain form ([07](07-character-creation.md)).
- Dynamic sheet in build mode with "explain this number" ([08](08-dynamic-sheet.md)).
- Print/export: the character sheet, the feature and spell cards and the credits page of the playbook, pen-fillable fields, character data export/import ([12](12-print-and-export.md)); the tactical guide, the rules cheat sheet and the compact variant follow with the phases that produce their content.
- No accounts: everything runs in the browser; characters persist in the device's storage and in export files, optionally mirrored to a working directory on disk ([14](14-accounts-sharing-and-campaigns.md)).
- Campaign and package-visibility data structures present but without UI.
- Italian and English interface; Italian translation package for the base package ([13](13-ux-and-accessibility.md), [05](05-content-model-and-sources.md)).
- Private packages loaded by the user from the interface (never uploaded anywhere), selectable in creation and visible on the sheet, with attribution.

Done when:
- A tester who has never played builds a level 1 character in under 15 minutes and can say what each number on the sheet means.
- The reference Monk's printed playbook contains every kind of panel found in the original playbook except the tactical guide (Phase 5) and the rules cheat sheet (Phase 2), with no redundant explanation and no mention of abilities the character does not have.
- A character exported and re-imported produces a byte-identical computed sheet.
- The sheet is usable on a phone in portrait orientation.

Decisions taken at the start (2026-09-22, recorded in [17](17-open-decisions.md)): DEC-01 (Phase 1 part: the application shell), DEC-04 Hosting and deployment model, DEC-09 Supported languages, DEC-12 Authentication and account model (no accounts until a back end exists), DEC-13 PDF generation approach, DEC-15 Default ability score method. Execution plan: [phase-1/](phase-1/00-README.md).

### Phase 2 — Play mode

Goal: a whole session can be played from the phone.

Scope:
- Play engine with events, log and undo ([09](09-play-mode.md)).
- Dice rolling with breakdown, attack and spell flows, resource and slot spending, concentration, conditions with expiry, short and long rests with automatic recovery.
- Turn tracker with the action economy made explicit.
- Play layout of the dynamic sheet ([08](08-dynamic-sheet.md)).

Done when:
- The reference Monk can attack, use Flurry of Blows, cast Darkness with 2 Ki, take damage, fall to 0 HP, roll death saves, be healed, short rest and recover Ki, long rest and recover HP and Hit Dice, all with one or two taps each and with undo.
- Every roll shows its breakdown with sources.
- A session log can be exported with the character.

Decisions to take at the start: DEC-05 Dice RNG and roll verifiability, DEC-06 Offline support.

### Phase 3 — Progression

Goal: characters grow without a rulebook.

Scope:
- Guided level up, ASI/feat, multiclass, spell learning, HP by average or roll ([10](10-progression.md)).
- Snapshots per level, "what changed" diff, rollback.
- Package version pinning and the errata upgrade flow.
- "Next milestones" preview.

Done when:
- The reference Monk goes from level 3 to level 6 (gaining Extra Attack, Stunning Strike, Shadow Step) through the guided flow and every new action and resource appears on the sheet, in play mode and in print.
- A multiclass character (e.g. Monk 3 / Rogue 2) computes the correct proficiency, hit dice and features.
- Updating the base package with a text errata changes nothing on pinned characters until the player accepts the upgrade.

Decisions to take at the start: DEC-16 Hit point gain method policy; review DEC-02 if the second edition is to be added.

### Phase 4 — Homebrew authoring and sharing

Goal: anyone can extend the platform with their own content, and groups can load their private official packages.

Scope:
- In-app package editor with live preview on a test character, file-based authoring path with the same validator ([06](06-homebrew-and-extensibility.md)).
- Visibility levels, sharing, public listing, installation into a character or campaign.
- Upload of private packages and the per-deployment policy for them ([14](14-accounts-sharing-and-campaigns.md)).
- Translation packages authored by the community.
- Import from other platforms if decided.

Done when:
- A tester with no coding ability publishes a subclass that appears in creation, on the sheet, in play mode, in print and in the assistant, indistinguishable from an SRD subclass.
- A group uploads their Player's Handbook package and sees it only within their instance or accounts.
- A package with an invalid effect is rejected with a message pointing at the field.

Decisions to take at the start: DEC-10 Monetisation and hosting costs, DEC-11 Import from other platforms, DEC-14 Homebrew moderation policy.

### Phase 5 — Assistant

Goal: the platform helps a newcomer decide what to do, with reasons.

Scope:
- "What can I do now?", turn guide, combos, situational advice, reminders, inline rule explanations, all rule-based and content-driven ([11](11-play-assistant.md)).
- Advice text as localisable content.
- Optional language-model assistance if decided, strictly grounded on the computed sheet.

Done when:
- In the reference Monk's play mode, after taking the Attack action, the assistant lists exactly the bonus actions available with costs and explains why Flurry of Blows and Patient Defense cannot both be used.
- A homebrew action tagged for a situation appears in the situational advice without code changes.
- The assistant can be switched off and the play mode is unaffected.

Decisions to take at the start: DEC-07 LLM-based assistance.

### Phase 6 — DM and campaigns

Goal: a DM sees their players' sheets and controls the allowed content.

Scope:
- Campaign creation, invitations, membership ([14](14-accounts-sharing-and-campaigns.md)).
- Allowed package set and versions per campaign; house rules as a campaign-level package.
- DM read view of every member's sheet, including state during play.
- Further DM tools are out of scope until this phase is done and evaluated.

Done when:
- A DM restricts a campaign to the base package plus one homebrew package, and a member's creation flow shows only that content.
- The DM opens a member's sheet on a phone during a session and sees current HP, conditions and resources.

Decisions to take at the start: DEC-17 Respec permissions in campaigns; further candidates (real-time synchronisation, DM-side tooling scope) are listed when Phase 5 closes.

## Cross-phase work

- Accessibility and performance requirements of [13](13-ux-and-accessibility.md) apply to every phase from Phase 1: the accessibility checklist and a test on a reference low-end phone are part of every phase's done criteria.
- Every phase adds golden fixtures and content validation tests ([15](15-logical-architecture.md)).
- The risk register [18](18-risks.md) is reviewed at each phase boundary.
- The glossary [03](03-glossary.md) and the open-decisions register [17](17-open-decisions.md) are updated whenever a term or a decision changes.

## Why this order

- Content and engine before UI: the UI is cheap to change, the format is not; a format change after content is authored costs a rewrite of the content.
- Print in the MVP, not later: it is the feature the original playbook proved valuable, it forces the sheet composer to be complete, and it gives non-digital tables a reason to use the platform on day one.
- Play mode before progression: sessions happen every week, level-ups every few sessions.
- Homebrew tooling after play mode: the format exists from Phase 0 and is exercised by the team in every phase, so authoring tools arrive when the format has stabilised through real use.
- Assistant after homebrew: advice is content-driven, so it needs the content tagging conventions that Phase 4 settles.
- DM last: it is the largest scope expansion and the least valuable to a newcomer player, who is the primary user.

## Deferred decisions

All decisions are listed per phase above and detailed in [17](17-open-decisions.md).

## Depends on / feeds into

Depends on every functional document. Feeds into [17](17-open-decisions.md) (phase of each decision) and [18](18-risks.md) (owner phase of each risk).
