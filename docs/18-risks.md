# 18 — Risks

## Purpose

This document lists what could make the project fail, stall, or harm its users, with a mitigation for each and the document that carries that mitigation. Likelihood and impact are rated low / medium / high. The owner phase is where the mitigation must be in place. The list is reviewed at every milestone boundary and at the close of every phase ([16](16-roadmap.md), [phase-0/08-workplan.md](phase-0/08-workplan.md)); the review log at the end of this document records what was seen and whether a risk is kept, promoted to the next phase or closed.

## Register

| Id | Risk | Likelihood | Impact | Mitigation (summary) | Owner phase |
|---|---|---|---|---|---|
| R-01 | Legal and intellectual-property exposure from official content | Medium | High | Ship only the SRD; official books as private, never-redistributed packages; honour SRD licence attribution; avoid trademark use in the product name | Phase 0 |
| R-02 | The effect catalogue is never "complete"; the engine grows code special cases | High | High | Closed effect vocabulary validated against the whole SRD before Phase 1; every gap becomes a new effect kind, never a code path | Phase 0 |
| R-03 | Content authoring volume (SRD, then books, then translations) | High | Medium | Text/mechanics separation, translation packages, authoring tooling with the shared validator, community contribution | Phase 0–4 |
| R-04 | Newcomers still overwhelmed despite the intent | Medium | High | Help levels, progressive disclosure, guided creation with recommended choices, usability tests with real newcomers | Phase 1 |
| R-05 | Scope creep toward a virtual tabletop | Medium | Medium | Explicit non-goals; DM tools limited to reading sheets and managing packages | Every phase |
| R-06 | Pressure to reach feature parity with D&D Beyond | Medium | Medium | Compete on the newcomer experience and on homebrew, not on breadth; roadmap gates | Phase 1 |
| R-07 | Data loss or wrong numbers during a session destroy trust | Medium | High | Deterministic engine, golden fixtures, undo log, guest export, autosave | Phase 2 |
| R-08 | Publisher licensing changes (as in the 2023 OGL episode) | Low | High | Depend only on the irrevocable Creative Commons SRD; keep official content out of the repository | Phase 0 |
| R-09 | Single-maintainer dependency | High | High | Documentation-first project, pure engine, content as data, contribution guide, open licence | Phase 0 |
| R-10 | Homebrew quality and abuse once packages are public | Medium | Medium | Validation before listing, visibility levels, reporting, moderation policy | Phase 4 |
| R-11 | Accessibility regressions as the interface grows | Medium | Medium | Accessibility requirements as acceptance criteria, automated checks, keyboard and screen-reader test passes | Phase 1 |
| R-12 | Poor performance on cheap phones at the table | Medium | High | Client-side engine kept small, computed-sheet cache, minimal payloads, testing on low-end devices | Phase 2 |

## R-01 Legal and intellectual-property exposure

- **Detail.** Official 5e books are copyrighted; only the SRD is under a free licence, and that licence requires attribution. Names such as "Dungeons & Dragons" and "D&D" are trademarks. A platform that ships book content, or whose name or branding suggests an official product, is exposed.
- **Mitigation.** The repository contains only the SRD as the base package and the format for everything else ([05](05-content-model-and-sources.md)). Official books are private packages under a deployment policy, never listed or exported ([14](14-accounts-sharing-and-campaigns.md)). SRD attribution is displayed in the credits of every playbook ([12](12-print-and-export.md)). The project name and branding avoid publisher trademarks (part of DEC-08 in [17](17-open-decisions.md)).
- **Signal to watch.** Any request to add a "shared library" of official packages to a public instance.

## R-02 Effect catalogue completeness and engine special cases

- **Detail.** 5e mechanics are numerous and irregular. The temptation is to code the odd ones. Each coded exception is a mechanic homebrew cannot reproduce (Principle 6) and a place where the engine and the content disagree.
- **Mitigation.** Phase 0 does not end until every SRD class, subclass, species, background, feat and item is expressed with effects only ([04](04-domain-model.md)). Golden fixtures per class prove it ([15](15-logical-architecture.md)). Adding an effect kind is the sanctioned response to a gap ([06](06-homebrew-and-extensibility.md)).
- **Signal to watch.** A pull request that mentions a class name inside the engine.

## R-03 Content authoring volume

- **Detail.** The SRD alone is hundreds of entities; official books multiply it; every language doubles the text. Hand-authoring without tooling stalls the project.
- **Mitigation.** Mechanics are authored once, text per language ([05](05-content-model-and-sources.md)); translation packages let others contribute without touching mechanics; the authoring tooling reuses the engine validator so contributors get immediate feedback ([06](06-homebrew-and-extensibility.md), [15](15-logical-architecture.md)); the roadmap staggers coverage by phase ([16](16-roadmap.md)).
- **Signal to watch.** Base package coverage below 100% of the SRD when Phase 1 starts.

## R-04 Newcomer overload

- **Detail.** The project exists for newcomers, yet every added feature adds surface. The original playbook shows the failure mode: everything useful, nothing prioritised.
- **Mitigation.** Help levels and progressive disclosure are design constraints, not options ([13](13-ux-and-accessibility.md)); creation offers recommended choices and archetypes ([07](07-character-creation.md)); the play sheet shows only what the character can do now ([08](08-dynamic-sheet.md), [09](09-play-mode.md)); the assistant explains rather than adds ([11](11-play-assistant.md)). Phase 1 acceptance includes a test with people who have never played ([02](02-personas-and-journeys.md)).
- **Signal to watch.** A newcomer asking "what does this mean?" about anything on the default sheet.

## R-05 Scope creep toward a virtual tabletop

- **Detail.** Once a DM can see sheets, requests for initiative tracking, maps, monsters and encounters follow. Each pulls effort away from the character experience.
- **Mitigation.** Non-goals are stated in [01](01-vision.md) and repeated in [16](16-roadmap.md); Phase 6 scope is limited to reading sheets, allowed packages, house rules and a few DM actions ([14](14-accounts-sharing-and-campaigns.md)). New requests are logged as decisions, not built ([17](17-open-decisions.md)).
- **Signal to watch.** Any feature that needs a map.

## R-06 Feature-parity pressure

- **Detail.** Experienced users compare with D&D Beyond and ask for its breadth: every book, every optional rule, marketplace, forums.
- **Mitigation.** The differentiators are named in [01](01-vision.md): explainability, dynamic sheet, play mode, printable playbook, first-class homebrew. Roadmap gates require these to be excellent before breadth is considered ([16](16-roadmap.md)).
- **Signal to watch.** Roadmap items justified only by "the other platform has it".

## R-07 Data loss and wrong numbers at the table

- **Detail.** A play tool that loses a session's state, or shows a wrong attack bonus, is abandoned immediately, and newcomers cannot tell the number is wrong.
- **Mitigation.** Deterministic derivation with golden fixtures catches wrong numbers before release ([15](15-logical-architecture.md)); every play event is logged with an inverse and undo ([09](09-play-mode.md)); guests are prompted to export ([14](14-accounts-sharing-and-campaigns.md)); autosave and a recoverable log are Phase 2 acceptance criteria ([16](16-roadmap.md)).
- **Signal to watch.** Any discrepancy between a printed playbook and the on-screen sheet.

## R-08 Publisher licensing changes

- **Detail.** In 2023 the publisher attempted to revoke and replace the Open Game License, then released the SRD under Creative Commons after public reaction. Licensing terms for official content can change again.
- **Mitigation.** The base package relies on the Creative Commons release of the SRD, which is irrevocable ([05](05-content-model-and-sources.md)); no official book content is in the repository; the format is edition-agnostic so a different base package can be substituted (DEC-02 in [17](17-open-decisions.md)).
- **Signal to watch.** Publisher announcements about the SRD or fan-content policies.

## R-09 Single-maintainer dependency

- **Detail.** The project starts with one person. If they stop, an undocumented design and code with implicit rules die with them.
- **Mitigation.** These documents precede the code ([00](00-README.md)); the engine is a pure library with fixtures that define correctness ([15](15-logical-architecture.md)); content is data anyone can author ([06](06-homebrew-and-extensibility.md)); an open project licence and a contribution guide are Phase 0 deliverables (DEC-08 in [17](17-open-decisions.md), [16](16-roadmap.md)).
- **Signal to watch.** Knowledge that exists only in one head.

## R-10 Homebrew quality and abuse

- **Detail.** Public packages can be broken, unbalanced, offensive, or copies of copyrighted material relabelled as homebrew.
- **Mitigation.** Validation before listing ([06](06-homebrew-and-extensibility.md)); visibility levels so most content never needs to be public ([14](14-accounts-sharing-and-campaigns.md)); reporting and takedown; a moderation policy decided before public sharing opens (DEC-14 in [17](17-open-decisions.md)).
- **Signal to watch.** A public package whose source field cites an official book.

## R-11 Accessibility regressions

- **Detail.** A sheet used at a dim table by people with varied eyesight and motor control must stay readable and operable. Each new component can break that.
- **Mitigation.** Accessibility requirements are acceptance criteria for every interface feature ([13](13-ux-and-accessibility.md)); automated checks and manual passes with keyboard and screen reader are part of the definition of done from Phase 1 ([16](16-roadmap.md)).
- **Signal to watch.** A component without keyboard operation or with contrast below the stated minimum.

## R-12 Performance on cheap phones

- **Detail.** Play mode runs on whatever phone the player brings, often on poor connectivity. A slow sheet is a paper sheet by the second session.
- **Mitigation.** The engine is small and pure and can run on the client; computed sheets can be cached; payloads are the character and the needed packages only ([15](15-logical-architecture.md)); play mode is designed for one thumb and minimal rendering ([09](09-play-mode.md), [13](13-ux-and-accessibility.md)); low-end device testing is part of every phase's done criteria from Phase 1 ([16](16-roadmap.md); the reference device is named in the Phase 1 plan). Offline support, if chosen, removes the connectivity dependency (DEC-06).
- **Signal to watch.** Any interaction in play mode that takes longer than a dice roll at the table.

## Review log

### Phase 0 close (2026-09-22)

| Id | Signal observed | Outcome |
|---|---|---|
| R-01 | The repository holds only the SRD; the private root, its guards (`E_PRIVATE_OUTSIDE_ROOT`, `E_PRIVATE_TRACKED`, the pre-commit hook) and now the bundle rule of `dnd build` keep book content out; SRD attribution is in `NOTICE`, in every package manifest and in the credits of the readable sheet. No request for a shared library of official packages. | Kept; owner Phase 1 for the credits of the printed playbook. |
| R-02 | The catalogue closed at M0.4 and held through the whole SRD, the Player's Handbook and the play engine without an entity-specific code path; the gaps found are format candidates for v1 (`inventory/authoring-review.md`), not code. | Kept at low likelihood; re-read when the first 2024 content is authored. |
| R-03 | The SRD took one milestone with agent drafting under a fixed vocabulary; the Player's Handbook one sitting. Coverage is 100 % of the SRD at Phase 0 close (signal not triggered). | Kept; owner Phase 1–4 (translations start in Phase 1). |
| R-05 | Nothing outside the sheet, the play engine and the CLI was built; the DM side stays a data structure. | Kept. |
| R-08 | Only the CC-BY-4.0 SRD 5.1 is redistributed; the import lock file records the licence hash. | Kept. |
| R-09 | Documentation-first held (every milestone updated its documents); the engine is pure, content is data; `CONTRIBUTING.md` written at Phase 0 close (the monorepo plan had deferred it to Phase 4, the register named it a Phase 0 deliverable: the register wins). | Kept at high likelihood by nature; promoted to Phase 1 for the first external contributor path. |

