/**
 * The sheet's interface strings in English (docs/phase-1/06-localisation.md): everything the composer writes
 * that does not come from content. The syntax is vue-i18n's (`{name}` parameters, `a | b` plural forms), so
 * the web application merges these messages into its catalogues; the composer's own translator reads the
 * same syntax, so the CLI needs no setup. Game terms follow docs/03-glossary.md.
 */

export const en = {
    sections: {
        core: "Core",
        abilities: "Abilities",
        skills: "Skills",
        senses: "Senses",
        combat: "Combat",
        attacks: "Attacks",
        actions: "Actions",
        resources: "Resources",
        spellcasting: "Spellcasting",
        spells: "Spells",
        features: "Features & traits",
        equipment: "Equipment",
        personality: "Personality",
        conditions: "Conditions & effects",
        notes: "Notes",
        credits: "Credits"
    },
    abilities: {
        str: "Strength",
        dex: "Dexterity",
        con: "Constitution",
        int: "Intelligence",
        wis: "Wisdom",
        cha: "Charisma"
    },
    skills: {
        "acrobatics": "Acrobatics",
        "animal-handling": "Animal handling",
        "arcana": "Arcana",
        "athletics": "Athletics",
        "deception": "Deception",
        "history": "History",
        "insight": "Insight",
        "intimidation": "Intimidation",
        "investigation": "Investigation",
        "medicine": "Medicine",
        "nature": "Nature",
        "perception": "Perception",
        "performance": "Performance",
        "persuasion": "Persuasion",
        "religion": "Religion",
        "sleight-of-hand": "Sleight of hand",
        "stealth": "Stealth",
        "survival": "Survival"
    },
    activations: {
        "action": "Actions",
        "bonus-action": "Bonus actions",
        "reaction": "Reactions",
        "free": "Free",
        "special": "Special"
    },
    origins: {
        species: "Species",
        subspecies: "Subspecies",
        class: "Class",
        subclass: "Subclass",
        background: "Background",
        feat: "Feats",
        item: "Items",
        condition: "Conditions",
        option: "Options",
        spell: "Active spells",
        custom: "Custom effects"
    },
    spellLevels: {
        0: "Cantrips",
        1: "1st level",
        2: "2nd level",
        3: "3rd level",
        4: "4th level",
        5: "5th level",
        6: "6th level",
        7: "7th level",
        8: "8th level",
        9: "9th level"
    },
    slotLevels: {
        1: "1st",
        2: "2nd",
        3: "3rd",
        4: "4th",
        5: "5th",
        6: "6th",
        7: "7th",
        8: "8th",
        9: "9th"
    },
    units: {
        feet: "{value} ft",
        pounds: "{value} lb"
    },
    core: {
        ac: "Armor Class",
        initiative: "Initiative",
        speed: "Speed",
        speedOther: "{type} {value} ft",
        hp: "Hit Points",
        temporary: "+{value} temporary",
        hitDice: "Hit Dice",
        spent: "{count} spent",
        proficiency: "Proficiency Bonus",
        passivePerception: "Passive Perception",
        inspiration: "Inspiration",
        yes: "yes"
    },
    proficiencies: {
        armor: "Armor",
        weapon: "Weapons",
        tool: "Tools",
        language: "Languages"
    },
    senses: {
        sense: "{name} {value} ft",
        passive: "Passive {skill} {value}"
    },
    combat: {
        attacksPerAction: "Attacks per action",
        carrying: "Carrying capacity",
        on: "on {target}",
        against: "against {list}",
        defenses: {
            "resistance": "Resistance",
            "immunity": "Immunity",
            "vulnerability": "Vulnerability",
            "condition-immunity": "Condition immunity"
        },
        modifiers: {
            advantage: "Advantage",
            disadvantage: "Disadvantage"
        }
    },
    attacks: {
        ranged: "ranged",
        melee: "melee",
        magical: "magical",
        crit: "crit {range}–20"
    },
    actions: {
        resourceCost: "{amount} {resource}",
        slotCost: "level {level} slot",
        after: "after {action}",
        dc: "DC {value}",
        attack: "attack {value}",
        die: "{name} die",
        saveDc: "save DC {value}",
        toggles: "toggles {state}"
    },
    resources: {
        all: "all",
        shortRest: "short rest",
        longRest: "long rest",
        on: "{amount} on a {rest}",
        regains: "regains {list}"
    },
    spellcasting: {
        saveDc: "save DC {value}",
        spellAttack: "spell attack {value}",
        preparation: "{type} spells",
        ritual: "ritual casting",
        cantrips: "{count} cantrips",
        known: "{count} spells known",
        pact: "pact (level {level})"
    },
    spells: {
        atWill: "at will",
        uses: "{uses}/{recharge}",
        longRest: "long rest"
    },
    equipment: {
        equipped: "equipped",
        attuned: "attuned"
    },
    personality: {
        traits: "Traits",
        ideals: "Ideals",
        bonds: "Bonds",
        flaws: "Flaws",
        appearance: "Appearance"
    },
    conditions: {
        level: "level {level}",
        untilRemoved: "until removed",
        on: "on",
        concentrating: "concentrating"
    },
    notes: {
        progress: "{answered} of {count} {of}(s)"
    }
};

export type SheetMessages = typeof en;
