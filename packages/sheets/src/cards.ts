/**
 * Part 3 of the playbook (docs/12-print-and-export.md): a card for every feature and every spell, with the whole
 * text the first page names only. Features come in the tree's order (species, subspecies, class by level, subclass,
 * background, feats, conditions), each with its activation and cost when an action of the sheet comes from it and
 * that action's numbers for this character; spells by level, cantrips first, with what the compendium knows of them
 * (casting time, range, components, duration, text) when the package set is at hand.
 */

import { composeEntry } from "@byloth/dnd-platform-composer";
import type {
    ActionsBlock, Block, FeaturesBlock, SectionTree, SpellsBlock, StatBlockLine
} from "@byloth/dnd-platform-composer";
import type { PackageSet } from "@byloth/dnd-platform-loader";

export type Activation = "action" | "bonus-action" | "reaction" | "free" | "special" | "passive";

export interface Card
{
    readonly kind: "feature" | "spell";
    readonly id: string;
    readonly name: string;
    /** The group it belongs to: "Class — Monk", "2nd level". */
    readonly group: string;
    readonly activation: Activation;
    /** "1 ki", "2 ki"; empty when free of cost. */
    readonly cost: string;
    /** A spell's level (0 for a cantrip); a feature's class level when it has one. */
    readonly level?: number;
    readonly concentration: boolean;
    /** "3rd-level evocation". */
    readonly subtitle?: string;
    /** Labelled facts: casting time, range, components, duration. */
    readonly facts: readonly StatBlockLine[];
    /** Markdown. */
    readonly text: string;
    /** "At Higher Levels" and the like. */
    readonly sections: readonly { readonly title: string, readonly text: string }[];
    /** This character's numbers, one line per action of the feature ("Flurry of Blows · attack +5 · …"). */
    readonly forYou: readonly string[];
    /** The package it comes from, by name. */
    readonly source: string;
}

export interface CardsInput
{
    readonly language: string;
    readonly tree?: SectionTree;
    readonly packages?: PackageSet;
}

type BlockOf<K extends Block["kind"]> = Extract<Block, { kind: K }>;

function block<K extends Block["kind"]>(tree: SectionTree, section: string, kind: K): BlockOf<K> | undefined
{
    return tree.sections.find((s) => s.id === section)?.blocks.find((b) => b.kind === kind) as BlockOf<K> | undefined;
}

interface Use
{
    readonly activation: Activation;
    readonly name: string;
    readonly cost: string;
    readonly details: readonly string[];
}

/** The name of the package an entity comes from, in the language asked for. */
function sourceOf(id: string, packages: PackageSet | undefined, language: string): string
{
    const packageId = packages?.entities.get(id)?.package ?? "";
    const manifest = packages?.order.find((m) => m.id === packageId);
    const name = manifest?.name as Readonly<Record<string, string>> | undefined;

    return name?.[language] ?? name?.["en"] ?? (typeof manifest?.name === "string" ? manifest.name : packageId);
}

export function sheetCards(input: CardsInput): Card[]
{
    const tree = input.tree;
    if (!tree) { return []; }
    const cards: Card[] = [];

    // The actions of the sheet, by the feature they come from.
    const actions = (block(tree, "actions", "actions") as ActionsBlock | undefined)?.groups ?? [];
    const byFeature = new Map<string, Use[]>();
    for (const group of actions)
    {
        for (const item of group.items)
        {
            const feature = item.action.source.feature;
            if (!feature) { continue; }
            const list = byFeature.get(feature) ?? [];
            list.push({
                activation: group.activation as Activation, name: item.name, cost: item.cost, details: item.details
            });
            byFeature.set(feature, list);
        }
    }

    const groups = (block(tree, "features", "features") as FeaturesBlock | undefined)?.groups ?? [];
    for (const group of groups)
    {
        for (const item of group.items)
        {
            const uses = byFeature.get(item.id) ?? [];
            const activations = [...new Set(uses.map((u) => u.activation))];
            const costs = [...new Set(uses.map((u) => u.cost).filter((c) => c !== ""))];
            cards.push({
                kind: "feature",
                id: item.id,
                name: item.name,
                group: group.label,
                activation: activations.length === 1 ? activations[0]! : activations.length > 1 ? "special" : "passive",
                cost: costs.length === 1 ? costs[0]! : "",
                ...(item.level !== undefined ? { level: item.level } : {}),
                concentration: false,
                facts: [],
                text: item.text,
                sections: [],
                forYou: uses.map((u) => [u.name, u.cost, ...u.details].filter((p) => p !== "").join(" · ")),
                source: sourceOf(item.id, input.packages, input.language)
            });
        }
    }

    const levels = (block(tree, "spells", "spells") as SpellsBlock | undefined)?.levels ?? [];
    for (const level of levels)
    {
        for (const item of level.items)
        {
            const entry = input.packages ?
                composeEntry(item.id, { packages: input.packages,
                    language: input.language,
                    units: input.language === "it" ? "metric" : "imperial" }) :
                undefined;
            // The label is the name with its marks: the cost, when paid with a resource, is its last parenthesis.
            const cost = /\(([^()]+)\)\s*$/.exec(item.label.slice(item.name.length))?.[1] ?? "";
            cards.push({
                kind: "spell",
                id: item.id,
                name: item.name,
                group: level.label,
                activation: "special",
                cost: cost,
                level: level.level,
                concentration: item.spell.duration.concentration === true,
                ...(entry ? { subtitle: entry.subtitle } : {}),
                // Casting time, range, components, duration: the compendium's first four lines (not the classes).
                facts: entry ? entry.lines.slice(0, 4) : [],
                text: entry?.text ?? item.summary ?? "",
                sections: entry?.sections ?? [],
                forYou: [],
                source: sourceOf(item.id, input.packages, input.language)
            });
        }
    }

    return cards;
}
