# Phase 1 — 12 Usage statistics (DEC-22)

## Purpose

The owner wants to know how the published site is used (2026-09-25): which pages, how far players get in the wizard, which features they reach for. This document is how it is done without breaking the promise that a player's characters and packages stay on their device. The decision is DEC-22 ([../17-open-decisions.md](../17-open-decisions.md)). It amends the privacy principle of [02-content-and-character-stores.md](02-content-and-character-stores.md).

## Decisions

- **Umami Cloud**, script `https://cloud.umami.is/script.js`, website id in `runtimeConfig.public.analytics` (`nuxt.config.ts`). An empty id turns the statistics off.
- **Opt-in consent, as the GDPR and the ePrivacy rules require:**
  - A banner asks once, "Accept" or "Decline", with the same look and weight, blocking nothing and taking no focus.
  - Nothing is loaded and nothing is sent before "Accept".
  - The answer is kept in the browser (`localStorage`, key `consent`), which is strictly necessary storage and not a cookie. It can be changed at any time, in the settings panel and on the privacy page.
  - Withdrawing consent sets Umami's own switch (`umami.disabled`), which stops page views and events at once. A reload no longer loads the script.
- **Reported only from the published domain** (`data-domains="byloth.github.io"`), honouring Do Not Track.
- **In development nothing is loaded, whatever the answer** (owner, 2026-09-25). The banner is still shown there, so it can be seen and tested.
- **What is never sent:** characters (names, choices, anything about them), anything the player types, the name, id or contents of a package loaded from a file. Events carry only public facts: a step, an id of a package the site publishes (anything else becomes `other`), a count, a yes or no.
- **A privacy page** (`/privacy`, linked from the banner, the footer and the settings) says what is collected, by whom, why, on which legal basis, and how to change the choice.

## Design

- `stores/consent.ts`: `analytics: "unset" | "granted" | "denied"`, with `grant`, `deny` and `reset`, stored apart from the preferences.
- `plugins/analytics.client.ts`: watches the consent. It adds the script (`injectUmami`) once, when consent is granted outside development, and keeps `umami.disabled` in step with the answer.
- `composables/analytics.ts`:
  - `useAnalytics().track(name, data)` sends nothing without consent or without the script, and never throws;
  - `publicId(id)` keeps an id only when its package is one the site publishes;
  - `injectUmami(config)` builds the script tag.
- `components/globals/ConsentBanner.vue` (in the default layout) and `pages/privacy.vue`.
- Page views are Umami's own automatic tracking, which follows the single-page application's history.

### Events

| Event | Data | Sent from |
|---|---|---|
| `wizard-start` | `mode`: new or edit; `expert`: yes or no | the wizard, once ready |
| `wizard-step` | `step`: the step moved to | Back, Next, the dots, the list, the review's "Go to" |
| `wizard-archetype` | `archetype`: a published id, `other` or `none` | step 1 |
| `wizard-class` | `class`: a published id or `other` | step 3 |
| `wizard-save` | `mode`; `open`: how many things were still open | the review |
| `sheet-explain` | `value`: the value's path (`ac`, `ability.str`) | a number's explanation opened |
| `sheet-edit`, `sheet-delete` | none | the sheet's buttons |
| `sheet-change` | `section`: the section's id | a section's "Change" link |
| `package-load` | `result`: loaded or refused; `private`: yes or no | the packages page |
| `package-remove` | `private`: yes or no | the packages page |
| `preference` | `name`, `value` (language, help level, theme, contrast) | any change of a setting |
| `support-click` | `from`: credits or footer | a click on "Buy me a beer" |

## Tests

`packages/web/tests/analytics.test.ts` covers:

- the answer remembered, withdrawn and forgotten;
- no script in development even with consent;
- the script's attributes;
- no event without consent;
- a failing Umami that breaks nothing;
- `publicId` turning a private id into `other`;
- the banner's equal answers and the privacy page's choice;
- a wizard run whose events hold the class and the step but not the name typed.

The accessibility tests cover the banner and the privacy page in both languages. Lighthouse runs without consent, so the statistics never weigh on it.

## Open points

- Umami Cloud as a processor: the owner is to check its data-processing terms and the region where it stores data, and say so on the privacy page if it is outside the EU.
- When the settings page of [09-interface-revisions.md](09-interface-revisions.md) arrives, the statistics switch moves there, in a "Privacy" section.
- Units and further preferences join the `preference` event as they are added.
