# Phase 1 — 03 Sheet composer and the build-mode sheet

## Purpose

This document fixes the *sheet composer* of [../08-dynamic-sheet.md](../08-dynamic-sheet.md) and [../15-logical-architecture.md](../15-logical-architecture.md): a pure function from a computed sheet to a section tree for a mode, a help level and a language, shared by the web sheet, the print mode and the CLI text renderer. It then fixes the build-mode screen that renders the tree, with its "explain this number" views.

## Decisions

- **A fifth workspace package, `packages/composer` (`@byloth/dnd-platform-composer`), pure like the engine:** no I/O, no framework, depends on `engine` and `schema` types only. Input: the computed sheet, the character document, the package set (for names and texts), options `{ language }` in M1.1, `mode: "build" | "play" | "print"` and `helpLevel: "newcomer" | "regular" | "expert"` from M1.3. Output: a `SectionTree`, plain data with canonical ordering, serialisable and golden-testable. Implemented in M1.1: `compose(sheet, { character, packages, language })` and `explain(sheet, path, options)`.
- **The CLI text renderer becomes a consumer of the composer.** `packages/cli/src/render/text.ts` keeps only the typography (columns, rules, colour) and reads the tree; its four golden `sheet.txt` files must not change in the migration, which is the acceptance test of the extraction.
- **Section order is the engine's `sheet.sections`;** the composer never re-sorts. The per-user overrides of [../08-dynamic-sheet.md](../08-dynamic-sheet.md) (pin, collapse, reorder within the middle band) are a preference applied by the renderer, not by the composer, and are not exported.
- **The composer computes nothing the engine did not.** It groups, labels, localises, summarises and attaches provenance; every number in the tree is a `DerivedValue` copied from the sheet or a count of things in the sheet.
- **Explain views are three renderings of the same provenance.** *Newcomer*: one sentence per applied contribution in the wording catalogue of [06-localisation.md](06-localisation.md), followed by the "would apply if…" of inactive contributions; *regular*: value, label, source, as the CLI prints today; *expert*: the raw `Contribution` list and the formula.
- **Warnings never block.** They are attached to the value or the section they concern and listed once more in a final block; in print they go to the appendix.

## Design

### The section tree

```ts
interface SectionTree { readonly sections: readonly Section[]; readonly warnings: readonly Warning[] }
interface Section
{
    readonly id: string;                      // identity, core, abilities, … or a package-declared id
    readonly title: string;                   // localised
    readonly blocks: readonly Block[];
}
type Block =
    | { kind: "identity"; name; species; classes; background; alignment; packages }
    | { kind: "values"; items: ValueItem[] }                  // core: AC, initiative, speeds, HP, hit dice, proficiency, passive perception
    | { kind: "abilities"; rows: AbilityRow[] }
    | { kind: "skills"; rows: SkillRow[]; proficiencies: ProficiencyGroup[] }
    | { kind: "text"; items: string[] }                        // senses, combat notes
    | { kind: "attacks"; rows: AttackRow[] }
    | { kind: "actions"; groups: { activation; items: ActionItem[] }[]; base: string[] }
    | { kind: "resources"; items: ResourceItem[] }
    | { kind: "spellcasting"; casters: CasterItem[] }
    | { kind: "spells"; levels: { level; items: SpellItem[] }[] }
    | { kind: "features"; groups: { origin; owner; items: FeatureItem[] }[] }
    | { kind: "equipment"; items: EquipmentItem[] }
    | { kind: "personality"; fields: { label; text }[] }
    | { kind: "conditions"; items: string[] }
    | { kind: "choices"; open: ChoiceItem[] }                  // notes: choices still open
    | { kind: "credits"; packages: CreditItem[] };
interface ValueItem { readonly label: string; readonly shown: string; readonly value?: DerivedValue; readonly explain?: Explanation }
interface Explanation { readonly newcomer: readonly string[]; readonly regular: readonly RegularLine[]; readonly expert: Provenance; readonly notes: readonly string[] }
```

Every `Item` carries `summary` (one line, help level *newcomer*), `detail` (the expanded view of [../08-dynamic-sheet.md](../08-dynamic-sheet.md)'s detail layer: full text, cost, activation, prerequisites, rolls) and `source` (package, entity). The tree of the CLI's four golden characters is stored as `section-tree.json` next to their `sheet.txt`; `dnd fixtures` compares it like a snapshot.

### Modes and help levels

- *build*: every section, every item with summary and detail available; values carry `explain`.
- *play*: reserved for Phase 2; the composer returns the build tree until then.
- *print*: the same tree; the print renderer decides pagination ([05-print-and-export.md](05-print-and-export.md)).
- Help level changes what the tree carries as `summary`: *newcomer* fills it for every item and adds the newcomer explanation sentences; *regular* leaves summaries empty; *expert* adds raw values to labels (the CLI text renderer is the regular level).

### The newcomer wording of provenance

A catalogue keyed by contribution kind and by common labels, in [06-localisation.md](06-localisation.md): `base` → "Everyone starts from {value}."; `add` with an ability label → "Your {ability} ({score}) gives {value}."; `set-formula` with a feature → "{feature}: {text of the feature's first sentence} → {value}."; `mul`, `min`, `max` likewise; an inactive contribution → "{feature} would apply if {condition in words}." The condition-to-words function lives in the composer and covers every key of the condition language (a test enumerates them, as the vocabulary coverage test does for the engine).

### The build-mode screen (M1.3)

- Portrait phone first: one column, sections as collapsible blocks in tree order, the vital block and the warnings pinned at the top; tapping a value opens the explanation as a bottom drawer; tapping an item opens its detail. Desktop: two columns (core and abilities on the left, the rest on the right), everything expanded, explanations on hover and on click.
- Components (one file each, with the accessible name pattern of [../13-ux-and-accessibility.md](../13-ux-and-accessibility.md)): `ValueTile`, `ProvenanceDrawer`, `AbilityTable`, `SkillList`, `AttackTable`, `ActionCard`, `ResourcePips`, `SpellList`, `FeatureCard`, `SectionBlock`, `WarningList`.
- Every number is tappable; every icon has a label; pips expose "n of m"; sections are landmarks; focus order follows the visual order; 200 % zoom keeps one column readable.
- The three help levels are a switch in the header; the setting persists with the preferences.
- The screen is a view over the tree: it holds no state except collapse and the open drawer.

## Tasks

1. Create `packages/composer` with the tree types, the composer over the sections the CLI renders today, and the newcomer wording catalogue in English — M1.1.
2. Rewire the CLI text renderer on the tree; `sheet.txt` goldens unchanged; store `section-tree.json` goldens for the four characters — M1.1.
3. Explain views: the three renderings and the condition-to-words function with its coverage test — M1.3.
4. The build-mode screen and its components, phone first — M1.3.
5. Package-declared sections (`add-section` effects) placed in the middle band, with their localised titles — M1.3.
6. Per-user pin/collapse preferences in the renderer — M1.3.

## Open points

- Whether `detail` texts should be rendered as Markdown (content texts are multi-line Markdown-ish strings); a minimal renderer (paragraphs, bold, lists) is enough and avoids a dependency. Decide at M1.3.
- The condition-to-words function will meet conditions no sentence fits (`wieldingOnly`); a generic fallback ("while {condition}") is acceptable, listed as a known limitation.
- Whether the play-mode tree should already differ (pinning) so that Phase 2 changes only the renderer; leaning no, the composer grows with the play engine's needs then.
