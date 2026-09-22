# Phase 0 — 04 Testing strategy

## Purpose

This document defines how the engine, the content format and every package are tested, so that the project owner's requirement holds from the first commit: **every "configuration → output" case is a test**, the output is deterministic, and a bug is fixed only after a failing test reproduces it. It names the fixture files, the test levels, the coverage targets and the CI behaviour that the `engine`, `schema`, `content` and `cli` packages ([01-monorepo.md](01-monorepo.md)) must satisfy.

## Decisions

- **Failing test first.** A bug report becomes a fixture or a unit test that fails on the current code; the fix is merged only with that test green, and the test stays forever.
- **Determinism is asserted, not assumed.** Property tests check that `derive` is idempotent and order-independent on every run of the suite, not once at design time.
- **Golden files are reviewed like code.** `snapshot.json` files change only through `pnpm fixtures --update`, and the resulting diff is read line by line in the pull request; a snapshot change without a matching `expected.yaml` or content change is a review blocker.
- **Expected values are hand-computed.** `expected.yaml` holds numbers a human worked out from the rules, with the provenance labels they expect to see. Snapshots catch regressions; expectations catch wrong implementations.
- **Private content never breaks CI.** Fixtures that depend on `content-private/` are skipped and reported as skipped when the directory is absent ([06-private-packages.md](06-private-packages.md)); they never fail for that reason.
- **Vitest** is the single runner for every level below, in every package; fixtures are discovered from the filesystem by a shared helper in `engine`'s test utilities.

## Design

### Test levels

| Level | What | Where | Gate |
|---|---|---|---|
| 1 Content validation | `validate` passes on every package present locally; broken packages yield the expected diagnostic code | `packages/content/**`, `content-private/**`, `fixtures/packages/**` | CI (public), local (private) |
| 2 Golden fixtures | `derive` of a known character matches `expected.yaml` and `snapshot.json` | `fixtures/characters/<name>/` | CI |
| 3 Catalogue unit tests | every effect kind, `modify` op, condition key, formula case, table lookup | `packages/engine/test/catalogue/` | CI |
| 4 Property tests | idempotence, order independence, round trips, `undo(apply())` identity | `packages/engine/test/properties/` | CI |
| 5 Session fixtures | `apply` over an event list matches the expected state after each step | `fixtures/sessions/<name>/` | CI |
| 6 Performance | `derive` of a level 20 multiclass caster within budget | `packages/engine/test/perf/` | soft/hard gate |

### Level 1 — content validation

- A test enumerates every package directory under the public content root and, when present, under `content-private/`, runs `loadPackages` then `validate`, and asserts `diagnostics.ok === true`. Warnings are printed, errors fail.
- A negative suite lives under `fixtures/packages/invalid/<case>/`: each is a minimal package built to trigger exactly one rule of [03-engine-contract.md](03-engine-contract.md) (unknown effect kind, unknown `modify` target, dangling reference, resource without `recharge`, `redistributable: false` with public visibility, extension with two bases, patch to a missing path, missing default-language string). The case directory holds `expected-diagnostics.yaml` with the diagnostic `code` list; the test asserts the codes match exactly, so a validator that silently accepts bad content fails.
- Every example in [02-content-format.md](02-content-format.md) is copied into `fixtures/packages/srd51-excerpt`, `fixtures/packages/homebrew-feline` and `fixtures/packages/phb14-stub` and validated here; a schema change that invalidates a documented example fails the suite, which keeps the document honest.

### Level 2 — golden fixtures

Layout of one fixture:

```
fixtures/characters/<name>/
  character.yaml       # a Character document (02-content-format.md)
  packages.yaml        # list of package directories to load, relative to the repository root
  expected.yaml        # hand-computed expectations, partial
  snapshot.json        # full canonical derive output, generated
```

The runner loads the packages, runs `derive` with `language: en`, then:
1. for every entry in `expected.yaml`, compares the value and, when given, the ordered provenance labels of `values[path]`, the presence of resources, actions, spells and sections, and the absence of listed sections;
2. compares the canonical JSON of the whole `ComputedSheet` with `snapshot.json`, byte for byte.

`expected.yaml` is deliberately partial: it names what a human verified. `snapshot.json` is complete: it freezes everything else.

Complete `expected.yaml` of the reference Monk (`fixtures/characters/reference-monk/`, private-dependent):

```yaml
requires: [phb14]                        # package ids; skipped with reason when any is absent
level: 3
values:
  ability.str: { value: 11 }
  ability.dex: { value: 17 }
  ability.con: { value: 14 }
  ability.int: { value: 8 }
  ability.wis: { value: 15 }
  ability.cha: { value: 8 }
  proficiencyBonus: { value: 2 }
  ac:
    value: 15
    provenance: ["Base", "Unarmored Defense (Monk)", "Dexterity modifier", "Wisdom modifier"]
  hp.max:
    value: 24
    provenance: ["Monk level 1: hit die 8 + Constitution modifier 2", "Monk levels 2–3: 2 × (5 + 2)"]
  speed.walk:
    value: 40
    provenance: ["Feline: base speed 30", "Unarmored Movement (Monk): +10"]
  speed.climb: { value: 20, provenance: ["Feline: climb speed 20"] }
  sense.darkvision: { value: 60, provenance: ["Darkvision (Feline)"] }
  skill.stealth:
    value: 5
    provenance: ["Dexterity modifier +3", "Proficiency (Monk skills) +2"]
  passive.perception: { value: 12, provenance: ["Base 10", "Wisdom modifier +2"] }
  save.dex: { value: 5 }
  save.str: { value: 2 }
  jump.long: { value: 22, provenance: ["Pounce (Puma): 2 × Strength score"] }
tables:
  monk.martial-arts: "1d4"
resources:
  ki: { max: 3, recharge: short-rest, display: pips }
actions:
  flurry-of-blows: { activation: bonus-action, cost: { ki: 1 }, requires: { afterAction: attack } }
  patient-defense: { activation: bonus-action, cost: { ki: 1 } }
  step-of-the-wind: { activation: bonus-action, cost: { ki: 1 } }
  deflect-missiles: { activation: reaction }
  claws: { activation: action, rolls: [{ type: attack, bonus: 2 }, { type: damage, dice: "1d4", bonus: 0, damageType: slashing }] }
spells:
  srd51.spell.darkness: { paidWith: { ki: 2 }, ability: wis }
  srd51.spell.darkvision: { paidWith: { ki: 2 } }
  srd51.spell.pass-without-trace: { paidWith: { ki: 2 } }
  srd51.spell.silence: { paidWith: { ki: 2 } }
  srd51.spell.minor-illusion: { paidWith: null }
rollModifiers:
  - { kind: advantage, on: { type: check, skill: stealth }, source: "Cat's Grace (Feline)" }
  - { kind: disadvantage, on: { type: save, ability: con }, source: "Bruised lung" }
sections:
  active: [resources, actions, spells, conditions, senses]
  inactive: [spell-slots, spellcasting]
warnings: []
```

Ability scores are set directly (`method: manual`: 11, 17, 14, 8, 15, 8), because the homebrew feline species grants no ability bonus; the derived numbers are the ones above. The bruised-lung condition is applied in `state.conditions` of the fixture so the condition path is covered at level 2 as well as level 5. Implemented in M0.6 as `content-private/fixtures/reference-monk/` (private, skipped when absent); its `expected.yaml` uses the flat format of `fixtures/characters/README.md`.

Reference fixture set (all public unless stated):

| Group | Fixtures | Purpose |
|---|---|---|
| One per SRD 5.1 class × levels 1, 5, 11, 20 | 48, named `<class>-l<level>` (`monk-l5`, `wizard-l20`) | every class table, every subclass of the base package, slot progressions, ASI points |
| `multiclass-caster` | Wizard 5 / Cleric 3 | multiclass slot table, caster weights, spellcasting from two lists |
| `plain-fighter-l1` | Fighter 1, no subclass, no resources beyond Second Wind, no spells | the simplest sheet: proves sections stay off |
| `reference-monk` | Monk 3, Way of Shadow (`phb14`), feline species, bruised lung | base + private + homebrew in one sheet; skipped without `content-private/` |
| `mini-ruleset-b` | a level 5 character on the `mini-ruleset-b` base package | ruleset switching: same class content, different proficiency table and rest rules ([07-ruleset-switching.md](07-ruleset-switching.md)) |
| `excerpt-monk-l3` | Monk 3 on `srd51-excerpt` only | the M0.3 milestone fixture, runnable before the base package exists |

Naming: fixture directories are kebab-case; character names inside are descriptive ("Reference Monk"); no fixture is named after a person or a real campaign.

### Level 3 — catalogue unit tests

One test file per effect kind (`modify`, `grant-proficiency`, `declare-resource`, `add-action`, `grant-spellcasting`, `grant-spells`, `extend-spell-list`, `roll-advantage`, `roll-disadvantage`, `defense`, `add-text`, `add-section`, `open-choice`, `define-table`), each with the minimal package that exercises it and assertions on the resulting `ComputedSheet` and provenance. Specific tables of cases:

- `modify` precedence: `set-formula` → `mul` → `add` → `min`/`max`, ties by package order then entity id; one case per pair of ops, plus `applied: false` when `when` is false.
- Condition keys: one true case and one false case for each of `level`, `classLevel`, `hasFeature`, `armorCategory`, `shield`, `wielding`, `conditionActive`, `resourceAtLeast`, `ability`, `proficient`, `species`, `class`, and for `any`, `all`, `not`.
- Formula grammar: a table `[formula, facts, expected]` covering every function (`mod`, `score`, `classLevel`, `table`, `max`, `min`, `floor`, `ceil`, `average`, `sum`), operator precedence, dice literals, division rounding, and rejection of unknown identifiers.
- Tables as step functions: lookups below the first key (undefined → diagnostic), between keys, above the last key, and array rows for slot tables.
- Adding a kind to `effect.schema.json` without a test file fails a meta-test that lists the schema's `kind` enum against the test directory.

### Level 4 — property tests

Randomised inputs are generated from the fixture packages (shuffling package order, picking characters, generating event sequences), with a fixed seed printed on failure so a case can be replayed.

- `derive(c, s)` twice gives byte-equal canonical JSON.
- `derive` over any permutation of `PackageSource[]` with the same dependency graph gives byte-equal output.
- `build` (YAML → JSON) then back to YAML then to JSON gives the same JSON for every package file.
- For every `PlayEvent` type, `undo(apply(sheet, s, e).state, entry)` deep-equals `s`, including rejected events (warning, no change).
- `apply` never mutates its `state` argument (frozen input).

### Level 5 — session fixtures

```
fixtures/sessions/<name>/
  character.yaml
  packages.yaml
  session.yaml
```

`session.yaml` is a list of steps, each with an event and the expected state slice afterwards; dice results are part of the event (`short-rest` hit dice rolls, `death-save` roll, `rolled` totals), never generated. `expect` matches the state partially (an object by the keys it lists, an array as a whole) and may also carry `warnings` (codes that must be present), `rejected: true` (no change and a warning) and `values` (value paths checked on a re-derivation with the new state). Entries get the ids `step-<n>`; after the last step every entry is undone in reverse and the state must equal the initial one. `dnd fixtures` runs a directory as a session when it holds `session.yaml`:

```yaml
steps:
  - event: { type: use-action, action: flurry-of-blows }
    expect: { resources: { ki: 2 }, turn: { used: [action, bonus-action] } }
  - event: { type: damage, amount: 30 }
    expect: { hp: { current: 0, temporary: 0 }, deathSaves: { successes: 0, failures: 0 }, warnings: [I_DOWN] }
  - event: { type: death-save, roll: 1 }
    expect: { deathSaves: { failures: 2 } }
  - event: { type: spend-resource, resource: ki, amount: 9 }
    expect: { rejected: true, warnings: [W_INSUFFICIENT_RESOURCE] }
  - event: { type: short-rest, hitDice: [{ die: 8, rolls: [6] }] }
    expect: { hp: { current: 8 }, hitDice: { spent: 1 }, resources: { ki: 3 } }
  - event: { type: toggle, state: patient-defense, on: true }
    expect: { values: { ac: 17 } }
```

Sessions at M0.7 (`fixtures/sessions/`): `monk-combat-round` (action, bonus action, reaction, prerequisites, the turn tracker and a toggle expiring at the start of the next turn), `cleric-concentration` (slots, concentration check DC, resistance, replacement, cantrips, a reported play effect, long rest), `condition-expiry` (turn counters relative to whose turn it is, exhaustion levels, a custom effect re-derived), `temp-hp-absorption`, `dying-and-stabilising`, `rests`, `rejected-events` (one rejection per validation, plus `force`), `minib-scout-long-rest` (the same engine on the other ruleset); `content-private/fixtures/sessions/reference-monk` casts Darkness with 2 ki. The free and special activations are covered by the unit tests on a mini package (`packages/engine/test/play.test.ts`).

### Level 6 — performance

`derive` of `multiclass-caster` extended to level 20 (Wizard 12 / Cleric 8, full base package) is timed over 20 runs on CI: median above 100 ms prints a warning, above 500 ms fails. The budget comes from [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md).

### Coverage targets

- 100% of effect kinds, `modify` ops, `modify` targets, condition keys, formula functions and `PlayEvent` types exercised, enforced by meta-tests that diff the schema enumerations (and `PLAY_EVENT_TYPES` of the engine) against what the fixtures and unit tests touched.
- Every entity of the base package is loaded by at least one golden fixture: a coverage script (`pnpm fixtures --coverage`) records which entity ids `derive` resolved and reports the unreferenced ones; the list must be empty at M0.5. Spells count as covered when at least one fixture knows or is granted them, so spell coverage is achieved by the level 20 casters plus deliberate list fixtures.

### Workflow and CI

- `pnpm test` runs levels 1–5; `pnpm fixtures` runs level 2 and 5 only, with `--update` to regenerate snapshots and `--coverage` for the entity report; `pnpm test:perf` runs level 6.
- CI runs `lint`, `typecheck`, `test`, `test:perf` and `validate:content` on every pull request with no `content-private/`; private-dependent fixtures show as skipped in the report.
- Locally, with `content-private/` present, the same commands also validate private packages and run the private-dependent fixtures; a pre-push hook runs `pnpm test`.
- A new bug: reproduce it as a fixture (or unit test), commit it failing on a branch, fix, commit the fix; both commits reference the issue. Snapshot updates in that pull request must be explained by the fix.

## Tasks

1. Write the fixture discovery helper and the `expected.yaml` / `session.yaml` schemas in `schema`; wire Vitest in every package with a root `pnpm test` — M0.1.
2. Copy the examples of [02-content-format.md](02-content-format.md) into `fixtures/packages/srd51-excerpt`, `homebrew-feline`, `phb14-stub`; write the first invalid-package cases and their expected diagnostic codes — M0.2.
3. Write `excerpt-monk-l3` with hand-computed `expected.yaml`; implement the golden runner and the canonical snapshot comparison — M0.3.
4. Write the catalogue unit tests for `modify`, conditions, formulas and tables, plus the meta-test on the `kind` enum — M0.3.
5. Add unit tests for every remaining effect kind as the catalogue grows; add the invalid cases for each validation rule — M0.4.
6. Write the 48 class fixtures, `multiclass-caster` and `plain-fighter-l1`; run `--coverage` until no base-package entity is unreferenced; add the performance test — M0.5.
7. Write `reference-monk` (private-dependent, skipped when absent) and the `mini-ruleset-b` package and fixture — M0.6.
8. Write the property tests for `apply`/`undo` and the required session fixtures — M0.7.
9. Expose `fixtures`, `fixtures --update`, `fixtures --coverage` through the CLI and document the review rule in the repository's contributing guide — M0.8.

## Open points

- Whether provenance in `expected.yaml` is matched by exact label strings or by `source` ids; labels are what a newcomer reads, ids are stabler. Leaning: ids required, labels optional.
- Whether the 48 class fixtures share ability scores (standard array, primary ability first) to keep hand-computation cheap; leaning yes, with a documented convention.
- Where the level 20 multiclass performance character lives: as a separate fixture or as a level override on `multiclass-caster`. Leaning separate fixture `perf-caster-l20`.
- Whether `snapshot.json` should exclude resolved text (`includeText: false`) to keep diffs small when only prose changes; leaning yes, with a second text-only snapshot for the base package.
