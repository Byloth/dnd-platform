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
        "acid": "acid",
        "bludgeoning": "bludgeoning",
        "cold": "cold",
        "fire": "fire",
        "force": "force",
        "lightning": "lightning",
        "necrotic": "necrotic",
        "piercing": "piercing",
        "poison": "poison",
        "psychic": "psychic",
        "radiant": "radiant",
        "slashing": "slashing",
        "thunder": "thunder",
        "magical-sleep": "magical sleep",
        "disease": "disease"
    },
    proficiencyNames: {
        tool: {
            "vehicles-land": "Vehicles (land)",
            "vehicles-water": "Vehicles (water)",
            "musical-instrument": "Musical instrument",
            "artisans-tools": "Artisan's tools",
            "gaming-set": "Gaming set"
        },
        language: { "druidic": "Druidic", "thieves-cant": "Thieves' cant" },
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
        resourceUses: "{resource} ×{amount}",
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
    text: {
        level: "level {level}",
        ruleset: "Ruleset {ruleset} · packages {packages}",
        score: "Score",
        mod: "Mod",
        save: "Save",
        untrained: "untrained",
        proficient: "proficient",
        expertise: "expertise",
        attack: "Attack",
        toHit: "To hit",
        damage: "Damage",
        notAvailable: "not available now",
        baseActions: "Base actions",
        slots: "Slots",
        concentration: "concentration",
        alwaysPrepared: "always prepared",
        choicesOpen: "Choices still open",
        warnings: "Warnings"
    },
    choices: {
        names: {
            skills: "Skills",
            spells: "Spells",
            cantrips: "Cantrips",
            languages: "Languages",
            tools: "Tools",
            expertise: "Expertise",
            asi: "Ability Score Improvement"
        },
        kinds: {
            "skill": "Skill",
            "spell": "Spells",
            "language": "Language",
            "tool": "Tool",
            "option": "Option",
            "subclass": "Subclass",
            "fighting-style": "Fighting style",
            "asi-or-feat": "Ability score improvement or feat",
            "feat": "Feat"
        }
    },
    warnings: {
        unanswered: "{owner}: {choice}, {answered} of {count} chosen",
        excluded: "{name} is outside the packages chosen for this character; the sheet keeps it",
        missing: "{name} is not in the loaded packages",
        duplicateAction: "{name} is declared twice; the first one counts",
        version: "{name} is at version {loaded}; the character was made with {pinned}"
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
        kinds: { "set": "set to {value}", "set-formula": "by formula, {value}", "patch": "changed to {value}" },
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
    },
    creature: {
        labels: {
            ac: "Armor Class",
            hp: "Hit Points",
            speed: "Speed",
            saves: "Saving Throws",
            skills: "Skills",
            vulnerabilities: "Damage Vulnerabilities",
            resistances: "Damage Resistances",
            immunities: "Damage Immunities",
            conditionImmunities: "Condition Immunities",
            senses: "Senses",
            languages: "Languages",
            challenge: "Challenge",
            actions: "Actions",
            bonusActions: "Bonus Actions",
            reactions: "Reactions",
            legendary: "Legendary Actions"
        },
        kind: "{size} {type}",
        swarm: "{size} swarm of {of} {type}",
        sizes: {
            m: {
                tiny: "Tiny",
                small: "Small",
                medium: "Medium",
                large: "Large",
                huge: "Huge",
                gargantuan: "Gargantuan"
            },
            f: {
                tiny: "Tiny",
                small: "Small",
                medium: "Medium",
                large: "Large",
                huge: "Huge",
                gargantuan: "Gargantuan"
            }
        },
        sizesPlural: {
            m: {
                tiny: "Tiny",
                small: "Small",
                medium: "Medium",
                large: "Large",
                huge: "Huge",
                gargantuan: "Gargantuan"
            },
            f: {
                tiny: "Tiny",
                small: "Small",
                medium: "Medium",
                large: "Large",
                huge: "Huge",
                gargantuan: "Gargantuan"
            }
        },
        types: {
            aberration: "aberration",
            beast: "beast",
            celestial: "celestial",
            construct: "construct",
            dragon: "dragon",
            elemental: "elemental",
            fey: "fey",
            fiend: "fiend",
            giant: "giant",
            humanoid: "humanoid",
            monstrosity: "monstrosity",
            ooze: "ooze",
            plant: "plant",
            undead: "undead"
        },
        typesPlural: {
            aberration: "aberrations",
            beast: "beasts",
            celestial: "celestials",
            construct: "constructs",
            dragon: "dragons",
            elemental: "elementals",
            fey: "fey",
            fiend: "fiends",
            giant: "giants",
            humanoid: "humanoids",
            monstrosity: "monstrosities",
            ooze: "oozes",
            plant: "plants",
            undead: "undead"
        },
        /** The grammatical gender of each type, for the size that agrees with it ("m" or "f"). */
        typeGender: {
            aberration: "m",
            beast: "m",
            celestial: "m",
            construct: "m",
            dragon: "m",
            elemental: "m",
            fey: "m",
            fiend: "m",
            giant: "m",
            humanoid: "m",
            monstrosity: "m",
            ooze: "m",
            plant: "m",
            undead: "m",
            swarm: "m"
        },
        subtypes: {
            "any-race": "any race",
            "demon": "demon",
            "devil": "devil",
            "dwarf": "dwarf",
            "elf": "elf",
            "gnoll": "gnoll",
            "gnome": "gnome",
            "goblinoid": "goblinoid",
            "grimlock": "grimlock",
            "human": "human",
            "kobold": "kobold",
            "lizardfolk": "lizardfolk",
            "merfolk": "merfolk",
            "orc": "orc",
            "sahuagin": "sahuagin",
            "shapechanger": "shapechanger",
            "titan": "titan"
        },
        saveAbbreviations: { str: "Str", dex: "Dex", con: "Con", int: "Int", wis: "Wis", cha: "Cha" },
        hover: "(hover)",
        inForm: "{value} in {form} form",
        blindBeyond: "(blind beyond this radius)",
        passive: "passive Perception {value}",
        /** "yes" when the language prints the passive Perception before the other senses. */
        passiveFirst: "no",
        challenge: "{cr} ({xp} XP)",
        usage: {
            perDay: "{n}/Day",
            recharge: "Recharge {min}–6",
            rechargeSix: "Recharge 6",
            shortRest: "Recharges after a Short or Long Rest",
            longRest: "Recharges after a Long Rest",
            cost: "Costs {count} Actions"
        },
        save: "DC {dc} {ability}",
        legendaryIntro: "The {name} can take {count} legendary actions, choosing from the options below. " +
            "Only one legendary action option can be used at a time and only at the end of another creature's turn. " +
            "The {name} regains spent legendary actions at the start of its turn."
    },
    entry: {
        labels: {
            castingTime: "Casting Time",
            range: "Range",
            components: "Components",
            duration: "Duration",
            classes: "Classes",
            cost: "Cost",
            weight: "Weight",
            damage: "Damage",
            properties: "Properties",
            ac: "Armor Class",
            strength: "Strength",
            stealth: "Stealth",
            charges: "Charges",
            higherLevels: "At Higher Levels",
            contents: "Contents"
        },
        schools: {
            abjuration: "abjuration",
            conjuration: "conjuration",
            divination: "divination",
            enchantment: "enchantment",
            evocation: "evocation",
            illusion: "illusion",
            necromancy: "necromancy",
            transmutation: "transmutation"
        },
        spell: {
            cantrip: "{school} cantrip",
            levelled: "{level}-level {school}",
            ritual: "{kind} (ritual)"
        },
        castingTime: {
            "action": "1 action",
            "bonus-action": "1 bonus action",
            "reaction": "1 reaction",
            "trigger": "{time}, {trigger}",
            "minutes": "{count} minute | {count} minutes",
            "hours": "{count} hour | {count} hours",
            "special": "Special"
        },
        range: {
            self: "Self",
            touch: "Touch",
            sight: "Sight",
            unlimited: "Unlimited",
            special: "Special",
            withArea: "{range} ({area})"
        },
        distance: {
            feet: "{value} feet",
            metres: "{value} metres",
            foot: "foot",
            metre: "metre"
        },
        area: {
            sphere: "{value}-{unit}-radius sphere",
            cylinder: "{value}-{unit}-radius cylinder",
            cone: "{value}-{unit} cone",
            cube: "{value}-{unit} cube",
            line: "{value}-{unit} line"
        },
        duration: {
            "instantaneous": "Instantaneous",
            "until-dispelled": "Until dispelled",
            "special": "Special",
            "concentration": "Concentration, up to {time}",
            "rounds": "{count} round | {count} rounds",
            "minutes": "{count} minute | {count} minutes",
            "hours": "{count} hour | {count} hours",
            "days": "{count} day | {count} days"
        },
        item: {
            types: {
                weapon: "Weapon",
                armor: "Armor",
                shield: "Shield",
                tool: "Tool",
                gear: "Adventuring gear",
                consumable: "Consumable",
                wondrous: "Wondrous item",
                ammunition: "Ammunition"
            },
            weapon: { simple: "Simple weapon", martial: "Martial weapon" },
            armor: { light: "Light armor", medium: "Medium armor", heavy: "Heavy armor" },
            rarity: {
                "common": "common",
                "uncommon": "uncommon",
                "rare": "rare",
                "very-rare": "very rare",
                "legendary": "legendary",
                "artifact": "artifact"
            },
            magic: "{type}, {rarity}",
            attunement: "{kind} (requires attunement)",
            attunementBy: "{kind} (requires attunement by {by})",
            coins: { cp: "{value} cp", sp: "{value} sp", ep: "{value} ep", gp: "{value} gp", pp: "{value} pp" },
            properties: {
                "ammunition": "ammunition",
                "finesse": "finesse",
                "heavy": "heavy",
                "light": "light",
                "loading": "loading",
                "reach": "reach",
                "special": "special",
                "thrown": "thrown",
                "two-handed": "two-handed",
                "versatile": "versatile"
            },
            withRange: "{property} (range {range})",
            withDie: "{property} ({dice})",
            acDex: "{base} + Dex modifier",
            acDexMax: "{base} + Dex modifier (max {max})",
            strength: "Str {value}",
            stealth: "Disadvantage",
            quantity: "{count} × {name}"
        },
        condition: "Condition"
    }
};

export type SheetMessages = typeof en;
