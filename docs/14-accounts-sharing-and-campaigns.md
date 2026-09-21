# 14 — Accounts, sharing and campaigns

## Purpose

This document defines who owns a character, how a character can be seen by others, what a campaign is, how content packages become visible to people, and what the platform must do to respect the privacy of its users. It settles the parts that must be true from Phase 1 regardless of the authentication method chosen later, and it models campaigns early so that Phase 6 (DM & campaigns) adds features, not migrations.

## Principles

- **A character has exactly one owner.** Every other form of access is a grant from the owner (or from the campaign the owner joined). There is no co-ownership; transfer of ownership is an explicit action.
- **Trying comes before signing up.** A newcomer must be able to build a character and print it without creating an account (Principle 4 applied to onboarding: no barrier before the value is visible).
- **Access follows the character, not the file.** Sharing exposes a computed sheet in a chosen mode, never the raw editing rights, unless explicitly granted.
- **Private content stays private.** A private package is never listed, never copied between users, never included in an export that leaves the deployment (Principle 6 does not mean "share everything", it means "same mechanism").
- **Collect nothing you do not need.** Identity data is limited to what login requires; play data is the user's, exportable and deletable at any time (Principle 9).

## What needs to be done

1. Define the **ownership model**: owner, guest ownership (local-only), transfer, deletion cascade.
2. Define the **guest mode**: what works without an account, what persists, how a guest character is converted into an owned character on signup.
3. Define **sharing grants**: read-only link, named share with a user, share into a campaign; each grant carries a sheet mode and an optional expiry.
4. Define the **campaign entity** (present in the model from Phase 1, exposed in the UI in Phase 6): DM, members, allowed packages with pinned versions, house-rules package, per-campaign settings (rules edition, ability score method, help level defaults).
5. Define **package visibility and resolution**: how `private`, `campaign` and `public` packages are discovered by a given user in a given context.
6. Define the **private official package policy** per deployment mode, with an audit trail.
7. Define the **privacy baseline**: data inventory, retention, export, deletion, consent for anything beyond the minimum, no third-party tracking by default.
8. Write the **DM view** requirements for Phase 6: read all member sheets, approve or reject package requests, apply house rules, see resource state during a session.

## How

### Ownership

- Every character records an `owner` (a user identifier) or a `guest` marker.
- A guest character exists only on the device that created it and in the export file the guest downloads. Decided: **guest mode is allowed, with export as the only persistence**. The interface says so plainly and offers the export before anything is lost (closing the browser, clearing data).
- Signing up while holding guest characters imports them and assigns ownership; importing an export file into an account does the same.
- Deleting a character deletes its snapshots, log and shares. Deleting an account deletes all its characters and revokes all its grants; content packages it authored are handled per the policy in [06](06-homebrew-and-extensibility.md) (public packages may be kept anonymised so dependent characters do not break).

### Sharing

Three grant types, all read-only unless stated:

| Grant | Who can see | What they see | Typical use |
|---|---|---|---|
| Link share | Anyone with the link | The computed sheet in *play* or *print* mode, live or frozen at a snapshot | Show the table, send to a friend |
| Named share | A specific user | Same as link, optionally with **edit** rights | A parent helping a child, a co-player |
| Campaign share | The campaign's DM (and optionally members) | Live sheet, state, log | The normal case once campaigns exist |

- Grants are revocable; a link share can be regenerated (old link dies).
- A share never exposes the private packages themselves: the viewer sees the computed sheet (names, texts of the features the character has), which is the same thing a printed playbook exposes. Bulk browsing of a private package through shares is not possible by design.
- Edit rights through a named share are logged like any play event ([09](09-play-mode.md)), attributed to the editing user.

### Campaigns

Modelled from Phase 1, delivered in Phase 6:

- `Campaign`: name, DM (a user), members (users), characters (each linked to a member), status (recruiting, active, ended).
- **Content selection** (DEC-20): the packages a character in this campaign may use, each pinned to a version, their order, and *exclusions* (a whole package, an entity type within a package, a tag, or single entity ids). The engine prunes what the exclusions make unreachable and shows the DM the cascade ("excluding elves also disables: Elven Accuracy, …"). A setting package may propose a preset selection that the DM starts from. Characters in a campaign are validated against the selection; a character built elsewhere, or one using content excluded later, keeps computing and shows warnings until the DM widens the selection or the player removes the choices. No package is ever incompatible with another; only the base package (edition) is exclusive, through dependencies.
- **House rules** are a package with visibility `campaign`, authored by the DM, that patches or extends the allowed packages ([06](06-homebrew-and-extensibility.md)). Nothing about house rules is special-cased.
- **Campaign settings** seed character defaults: rules edition (DEC-02), ability score method (DEC-15), XP vs milestone ([10](10-progression.md)), help level suggestion ([11](11-play-assistant.md)).
- **Membership grants access**: joining a campaign creates a campaign share of the member's chosen character to the DM, and gives the member read access to the campaign's `campaign`-visibility packages. Leaving revokes both.
- Later DM tools (Phase 6): a table view of all sheets, resource state and conditions live during a session; a "grant inspiration" and "award XP / milestone" action that appears in each character's log.

### Package visibility and resolution

| Visibility | Discoverable by | Installable by |
|---|---|---|
| `private` | The author only (plus deployment policy for official packages, below) | The author |
| `campaign` | Members of the campaigns it is attached to | Members, while in the campaign |
| `public` | Everyone on the deployment | Everyone |

- The set of packages a character can use = public packages + the user's private packages + campaign packages of campaigns the user is in + official private packages the deployment policy exposes to that user.
- A character keeps working if a package it uses later becomes invisible to the owner (e.g. leaving a campaign): the pinned versions stay loaded for that character, but the choices are flagged, and the owner cannot select new content from that package. This avoids silently breaking a sheet ([10](10-progression.md) covers the same rule for updates).

### Private official packages

Official books are private packages ([05](05-content-model-and-sources.md)). Their exposure is a **deployment setting**, Decided as follows:

- **Self-hosted, single group**: an administrator uploads the packages once and marks them "available to all users of this deployment". Everyone sees them; the deployment is not public.
- **Public instance**: private packages are visible only to the user who uploaded them (and, through campaign visibility, to members of a campaign whose DM uploaded them and attached them). They are never listed, searchable or copied.
- In both modes: the platform refuses to include a private package in any export or listing, refuses to change its visibility to `public`, and keeps an audit record (who uploaded which package, which version, when, to which campaigns it was attached).
- The repository ships no private package and no tooling that fetches one; it ships the format and the authoring tools ([05](05-content-model-and-sources.md), [06](06-homebrew-and-extensibility.md)).

### Privacy baseline

- Data inventory: identity (only what login needs), characters and their state and log, packages authored, campaign memberships, shares, preferences (language, help level). Nothing else is collected.
- No analytics, advertising or third-party tracking by default. If usage metrics are ever added, they are opt-in, aggregated and documented.
- Export: a user can download everything they own (characters with snapshots and logs, authored packages) in the portable format of [12](12-print-and-export.md).
- Deletion: full deletion on request, completed within a stated time; the cascade above applies.
- Retention: guest data lives only on the device; server-side logs of play events belong to the character and follow it.
- Legal basis and notices are written once the deployment model is chosen (DEC-04), because self-hosted and public instances have different obligations.

## Why

- One owner per character keeps the data model and the deletion cascade simple and makes "whose sheet is this" unambiguous at the table.
- Guest mode serves the primary target: a newcomer invited to a session tomorrow should not need an account to try the platform, and export-as-persistence is honest and cheap. Converting a guest to an owner later is a plain import.
- Sharing the computed sheet rather than raw content is what lets private official packages exist on a public instance without turning shares into a redistribution channel.
- Modelling campaigns early costs one entity and two relations, and it avoids retrofitting "allowed packages" and "house rules" onto characters later. Treating house rules as a package reuses the whole extension mechanism instead of inventing a second one.
- A minimal, opt-in privacy posture is the right default for a hobby-first platform and is also the cheapest to comply with.

## Deferred decisions

- DEC-12 Authentication and account model (email, passwordless, third-party identity, invitations) — Phase 1.
- DEC-04 Hosting and deployment model (self-hosted single group vs public instance, or both) — Phase 1. Decides which private-package policy applies and which privacy notices are needed.
- DEC-10 Monetisation and hosting costs — Phase 4.
- DEC-14 Homebrew moderation policy for `public` packages — Phase 4.

## Depends on / feeds into

Depends on [01](01-vision.md), [03](03-glossary.md), [05](05-content-model-and-sources.md), [06](06-homebrew-and-extensibility.md). Feeds into [09](09-play-mode.md) (attributed edits), [10](10-progression.md) (package pinning rules), [12](12-print-and-export.md) (export scope), [15](15-logical-architecture.md) (identity and sharing block), [16](16-roadmap.md) (Phase 1 model, Phase 6 delivery), [18](18-risks.md).
