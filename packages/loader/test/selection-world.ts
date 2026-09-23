/**
 * The mini world of the DEC-20 selection tests: a base package with species, subspecies, inline
 * features, feats, spells, items and a subclass, and a loader shortcut. Shared by the loader's
 * selection tests and the engine's (a character computing with excluded content).
 */

import { resolve } from "node:path";

import { loadPackages } from "../src/index.js";
import type { PackageSource, Selection } from "../src/index.js";
import { MINI, cls, feature, item, miniPackage, spell } from "./helpers.js";

export const ROOT = resolve(import.meta.dirname, "..", "..", "..");
export const FIXTURES = resolve(ROOT, "fixtures", "packages");

export const FIGHTER = `${MINI}.class.fighter`;
export const WIZARD = `${MINI}.class.wizard`;
export const ELF = `${MINI}.species.elf`;
export const HIGH_ELF = `${MINI}.species.elf.high-elf`;
export const KEEN = `${MINI}.feature.elf.keen-senses`;
export const CANTRIP = `${MINI}.feature.elf.high-elf.cantrip`;
export const ELF_FEAT = `${MINI}.feat.elven-accuracy`;
export const LUCKY = `${MINI}.feat.lucky`;
export const LIST = `${MINI}.spell-list.wizard`;
export const SHIELD = `${MINI}.spell.shield`;
export const SLEEP = `${MINI}.spell.sleep`;
export const SWORD = `${MINI}.item.longsword`;
export const FLAME = `${MINI}.item.flame-tongue`;
export const SLAYER = `${MINI}.subclass.fighter.giant-slayer`;

export function world(): PackageSource
{
    const keen = feature(KEEN, [{ kind: "roll-advantage", on: { type: "check", skill: "perception" } }]);
    const cantrip = feature(CANTRIP, [{ kind: "grant-spells", spells: [SLEEP, SHIELD], as: "known" }]);
    const elf = {
        type: "species" as const,
        data: {
            id: ELF,
            name: { en: "Elf" },
            size: "medium",
            speed: { walk: 30 },
            features: [keen],
            subspecies: [{ id: HIGH_ELF, name: { en: "High elf" }, features: [cantrip] }]
        }
    };
    const feats = [
        {
            type: "feat" as const,
            data: { id: ELF_FEAT, name: { en: "Elven accuracy" }, prerequisites: { species: ELF } }
        },
        {
            type: "feat" as const,
            data: { id: LUCKY, name: { en: "Lucky" }, prerequisites: { any: [{ species: ELF }, { class: FIGHTER }] } }
        }
    ];
    const subclass = {
        type: "subclass" as const,
        data: { id: SLAYER, name: { en: "Giant slayer" }, class: FIGHTER, levels: { 3: { features: [] } } }
    };
    const list = { type: "spell-list" as const, data: { id: LIST, name: { en: "Wizard" }, spells: [SHIELD, SLEEP] } };
    const items = [
        item(SWORD, { category: "weapon" }),
        item(FLAME, { category: "weapon", baseItem: SWORD })
    ];

    return miniPackage({
        entities: [
            cls(FIGHTER, { 1: { features: [] } }),
            cls(WIZARD, { 1: { features: [feature(`${MINI}.feature.wizard.spellcasting`, [
                {
                    kind: "grant-spellcasting",
                    ability: "int",
                    list: LIST,
                    slots: { progression: "full" },
                    preparation: "prepared"
                }
            ])] } }),
            elf,
            ...feats,
            subclass,
            list,
            spell(SHIELD, 1),
            spell(SLEEP, 1),
            ...items
        ]
    });
}

export function load(
    selection: Selection, sources: readonly PackageSource[] = [world()]
): ReturnType<typeof loadPackages>
{
    return loadPackages(sources, { selection: selection });
}
export const inactiveIds = (set: ReturnType<typeof loadPackages>): string[] => set.cascade.inactive.map((e) => e.id);
export const codes = (set: ReturnType<typeof loadPackages>): string[] => set.diagnostics.entries.map((d) => d.code);
