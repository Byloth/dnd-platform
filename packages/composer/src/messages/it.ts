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
    },
    explain: {
        base: "Tutti partono da {value}.",
        baseFrom: "{label} fissa il valore di partenza a {value}.",
        ability: "La tua {ability} ({score}) dà {value}.",
        proficiency: "Il tuo bonus di competenza dà {value}.",
        add: "{label} aggiunge {value}.",
        set: "{label} lo porta a {value}.",
        setFormula: "{label}: {rule} → {value}.",
        mul: "{label} lo moltiplica per {value}.",
        min: "{label} lo porta almeno a {value}.",
        max: "{label} lo limita a {value}.",
        patch: "{label} lo cambia in {value}.",
        inactive: "{label} si applicherebbe se {condition}.",
        inactiveUnknown: "{label} si applicherebbe in altre circostanze."
    },
    when: {
        and: "e",
        or: "o",
        not: "non è vero che {condition}",
        level: {
            min: "sei di livello {min} o superiore",
            max: "sei di livello {max} o inferiore",
            range: "sei tra il livello {min} e il livello {max}",
            any: "hai un livello"
        },
        classLevel: {
            min: "hai {min} o più livelli da {class}",
            max: "hai {max} o meno livelli da {class}",
            range: "hai tra {min} e {max} livelli da {class}",
            any: "hai livelli da {class}"
        },
        hasFeature: "hai {feature}",
        armorNone: "non indossi un'armatura",
        armorAny: "indossi un'armatura",
        armor: "indossi un'armatura {category}",
        armorCategories: {
            light: "leggera",
            medium: "media",
            heavy: "pesante"
        },
        shield: "imbracci uno scudo",
        noShield: "non imbracci uno scudo",
        wielding: "impugni {weapon}",
        wieldingOnly: "impugni soltanto {weapon}",
        weapon: {
            any: "un'arma",
            with: "un'arma ({traits})",
            count: "{count} × {weapon}",
            unarmed: "i tuoi colpi senz'armi",
            simple: "semplice",
            martial: "da guerra",
            twoHanded: "a due mani",
            ranged: "a distanza",
            melee: "da mischia",
            monk: "arma da monaco"
        },
        armorStrengthUnmet: "la tua Forza è inferiore a quella richiesta dalla tua armatura",
        armorStrengthMet: "la tua Forza soddisfa quella richiesta dalla tua armatura",
        conditionActive: "sei sotto l'effetto di {condition}",
        toggled: "{state} è attivo",
        resourceAtLeast: "ti restano almeno {amount} {resource}",
        answer: "hai scelto {option} per {choice}",
        knowsSpell: "conosci {spell}",
        ability: "la tua {ability} è {min} o superiore",
        proficient: "hai competenza in {item}",
        species: "sei {species}",
        class: "hai livelli da {class}",
        fallback: "vale {condition}"
    }
};
