import type { SheetMessages } from "./en.js";

/**
 * The sheet's interface strings in Italian. Game terms follow docs/03-glossary.md (Classe Armatura, Tiro
 * salvezza, Azione bonus, Slot incantesimo, Riposo breve / lungo…). Content (names, texts) stays in the
 * language of its package until the Italian translation package (M1.7).
 */
export const it: SheetMessages = {
    sections: {
        core: "Valori principali",
        abilities: "Caratteristiche",
        skills: "Abilità",
        senses: "Sensi",
        combat: "Combattimento",
        attacks: "Attacchi",
        actions: "Azioni",
        resources: "Risorse",
        spellcasting: "Incantesimi: capacità",
        spells: "Incantesimi",
        features: "Privilegi e tratti",
        equipment: "Equipaggiamento",
        personality: "Personalità",
        conditions: "Condizioni ed effetti",
        notes: "Note",
        credits: "Crediti"
    },
    abilities: {
        str: "Forza",
        dex: "Destrezza",
        con: "Costituzione",
        int: "Intelligenza",
        wis: "Saggezza",
        cha: "Carisma"
    },
    skills: {
        "acrobatics": "Acrobazia",
        "animal-handling": "Addestrare animali",
        "arcana": "Arcano",
        "athletics": "Atletica",
        "deception": "Inganno",
        "history": "Storia",
        "insight": "Intuizione",
        "intimidation": "Intimidire",
        "investigation": "Indagare",
        "medicine": "Medicina",
        "nature": "Natura",
        "perception": "Percezione",
        "performance": "Intrattenere",
        "persuasion": "Persuasione",
        "religion": "Religione",
        "sleight-of-hand": "Rapidità di mano",
        "stealth": "Furtività",
        "survival": "Sopravvivenza"
    },
    activations: {
        "action": "Azioni",
        "bonus-action": "Azioni bonus",
        "reaction": "Reazioni",
        "free": "Gratuite",
        "special": "Speciali"
    },
    origins: {
        species: "Specie",
        subspecies: "Sottospecie",
        class: "Classe",
        subclass: "Sottoclasse",
        background: "Background",
        feat: "Talenti",
        item: "Oggetti",
        condition: "Condizioni",
        option: "Opzioni",
        spell: "Incantesimi attivi",
        custom: "Effetti personalizzati"
    },
    spellLevels: {
        0: "Trucchetti",
        1: "1° livello",
        2: "2° livello",
        3: "3° livello",
        4: "4° livello",
        5: "5° livello",
        6: "6° livello",
        7: "7° livello",
        8: "8° livello",
        9: "9° livello"
    },
    slotLevels: {
        1: "1°",
        2: "2°",
        3: "3°",
        4: "4°",
        5: "5°",
        6: "6°",
        7: "7°",
        8: "8°",
        9: "9°"
    },
    units: {
        feet: "{value} ft",
        pounds: "{value} lb"
    },
    core: {
        ac: "Classe Armatura",
        initiative: "Iniziativa",
        speed: "Velocità",
        speedOther: "{type} {value} ft",
        hp: "Punti ferita",
        temporary: "+{value} temporanei",
        hitDice: "Dadi vita",
        spent: "{count} spesi",
        proficiency: "Bonus di competenza",
        passivePerception: "Percezione passiva",
        inspiration: "Ispirazione",
        yes: "sì"
    },
    proficiencies: {
        armor: "Armature",
        weapon: "Armi",
        tool: "Strumenti",
        language: "Lingue"
    },
    senses: {
        sense: "{name} {value} ft",
        passive: "{skill} passiva {value}"
    },
    combat: {
        attacksPerAction: "Attacchi per azione",
        carrying: "Capacità di carico",
        on: "su {target}",
        against: "contro {list}",
        defenses: {
            "resistance": "Resistenza",
            "immunity": "Immunità",
            "vulnerability": "Vulnerabilità",
            "condition-immunity": "Immunità alle condizioni"
        },
        modifiers: {
            advantage: "Vantaggio",
            disadvantage: "Svantaggio"
        }
    },
    attacks: {
        ranged: "a distanza",
        melee: "in mischia",
        magical: "magico",
        crit: "critico {range}–20"
    },
    actions: {
        resourceCost: "{amount} {resource}",
        slotCost: "slot di {level}° livello",
        after: "dopo {action}",
        dc: "CD {value}",
        attack: "attacco {value}",
        die: "dado {name}",
        saveDc: "CD tiro salvezza {value}",
        toggles: "attiva {state}"
    },
    resources: {
        all: "tutti",
        shortRest: "riposo breve",
        longRest: "riposo lungo",
        on: "{amount} con un {rest}",
        regains: "recupera {list}"
    },
    spellcasting: {
        saveDc: "CD tiro salvezza {value}",
        spellAttack: "attacco con incantesimo {value}",
        preparation: "incantesimi: {type}",
        ritual: "incantesimi rituali",
        cantrips: "{count} trucchetti",
        known: "{count} incantesimi conosciuti",
        pact: "patto ({level}° livello)"
    },
    spells: {
        atWill: "a volontà",
        uses: "{uses}/{recharge}",
        longRest: "riposo lungo"
    },
    equipment: {
        equipped: "equipaggiato",
        attuned: "in sintonia"
    },
    personality: {
        traits: "Tratti",
        ideals: "Ideali",
        bonds: "Legami",
        flaws: "Difetti",
        appearance: "Aspetto"
    },
    conditions: {
        level: "livello {level}",
        untilRemoved: "finché non viene rimossa",
        on: "attivo",
        concentrating: "in concentrazione"
    },
    notes: {
        progress: "{answered} di {count}"
    }
};
