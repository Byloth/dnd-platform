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
        saves: "Saving throws",
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
    abbreviations: {
        str: "STR",
        dex: "DEX",
        con: "CON",
        int: "INT",
        wis: "WIS",
        cha: "CHA"
    },
    damage: {
        acid: "acid",
        bludgeoning: "bludgeoning",
        cold: "cold",
        fire: "fire",
        force: "force",
        lightning: "lightning",
        necrotic: "necrotic",
        piercing: "piercing",
        poison: "poison",
        psychic: "psychic",
        radiant: "radiant",
        slashing: "slashing",
        thunder: "thunder"
    },
    proficiencyNames: {
        tool: { "vehicles-land": "Vehicles (land)", "vehicles-water": "Vehicles (water)" },
        weapon: { simple: "Simple weapons", martial: "Martial weapons" },
        armor: { light: "Light armor", medium: "Medium armor", heavy: "Heavy armor", shield: "Shields" }
    },
    engineLabels: {
        baseScore: "Base score",
        adjustment: "Adjustment",
        scoreCap: "Score cap",
        proficiencyByLevel: "Proficiency bonus by level",
        proficiency: "Proficiency bonus",
        expertise: "Expertise",
        allSaves: "Bonus to all saving throws",
        allChecks: "Bonus to all ability checks",
        base: "Base",
        speciesSpeed: "Species speed",
        defaultSpeed: "Default speed",
        none: "None",
        oneAttack: "One attack per Attack action",
        longJump: "Strength score in feet",
        highJump: "3 + Strength modifier",
        carrying: "Strength score × 15",
        speciesSize: "Species size",
        saveDc: "Save DC",
        rollBonus: "Roll bonus",
        modifier: "{ability} modifier",
        firstLevel: "Level 1 ({class})",
        moreLevel: "1 more level ({class})",
        moreLevels: "{n} more levels ({class})"
    },
    units: {
        feet: "{value} ft",
        pounds: "{value} lb",
        metres: "{value} m",
        kilograms: "{value} kg"
    },
    core: {
        ac: "Armor Class",
        initiative: "Initiative",
        speed: "Speed",
        speedOther: "{type} {value}",
        speedTypes: { climb: "climb", fly: "fly", swim: "swim", burrow: "burrow" },
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
        names: {
            darkvision: "Darkvision", blindsight: "Blindsight", tremorsense: "Tremorsense", truesight: "Truesight"
        },
        sense: "{name} {value}",
        passive: "Passive {skill} {value}"
    },
    combat: {
        attacksPerAction: "Attacks per action",
        carrying: "Carrying capacity",
        on: "on {target}",
        against: "against {list}",
        rolls: { save: "saves", attack: "attacks", check: "checks", damage: "damage" },
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
        crit: "crit {range}–20",
        unarmed: "Unarmed strike",
        twoHanded: "{name} (two-handed)"
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
    reminders: {
        label: "Reminders"
    },
    notes: {
        progress: "{answered} of {count} {of}(s)"
    },
    explain: {
        base: "Everyone starts from {value}.",
        baseFrom: "{label} sets the starting value at {value}.",
        score: "You chose a score of {value}.",
        adjustment: "Your own adjustment adds {value}.",
        ability: "Your {ability} ({score}) gives {value}.",
        proficiency: "Your proficiency bonus gives {value}.",
        add: "{label} adds {value}.",
        set: "{label} sets it to {value}.",
        setFormula: "{label}: {rule} → {value}.",
        mul: "{label} multiplies it by {value}.",
        min: "{label} makes it at least {value}.",
        max: "{label} caps it at {value}.",
        patch: "{label} changes it to {value}.",
        inactive: "{label} would apply if {condition}.",
        inactiveUnknown: "{label} would apply in other circumstances."
    },
    when: {
        and: "and",
        or: "or",
        not: "it is not true that {condition}",
        level: {
            min: "you are level {min} or higher",
            max: "you are level {max} or lower",
            range: "you are between level {min} and level {max}",
            any: "you have a level"
        },
        classLevel: {
            min: "you have {min} or more levels in {class}",
            max: "you have {max} or fewer levels in {class}",
            range: "you have between {min} and {max} levels in {class}",
            any: "you have levels in {class}"
        },
        hasFeature: "you have {feature}",
        armorNone: "you wear no armor",
        armorAny: "you wear armor",
        armor: "you wear {category} armor",
        armorCategories: {
            light: "light",
            medium: "medium",
            heavy: "heavy"
        },
        shield: "you carry a shield",
        noShield: "you carry no shield",
        wielding: "you wield {weapon}",
        wieldingOnly: "you wield only {weapon}",
        weapon: {
            any: "a weapon",
            with: "a weapon ({traits})",
            count: "{count} × {weapon}",
            unarmed: "your unarmed strikes",
            simple: "simple",
            martial: "martial",
            twoHanded: "two-handed",
            ranged: "ranged",
            melee: "melee",
            monk: "monk weapon"
        },
        armorStrengthUnmet: "your Strength is below what your armor requires",
        armorStrengthMet: "your Strength meets what your armor requires",
        conditionActive: "you are affected by {condition}",
        toggled: "{state} is on",
        resourceAtLeast: "you have at least {amount} {resource} left",
        answer: "you chose {option} for {choice}",
        knowsSpell: "you know {spell}",
        ability: "your {ability} is {min} or higher",
        proficient: "you are proficient in {item}",
        species: "you are {species}",
        class: "you have levels in {class}",
        fallback: "{condition} holds"
    }
};

export type SheetMessages = typeof en;
