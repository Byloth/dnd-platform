/**
 * The printed words of the classic sheet, in the sheet's language. Ability and skill names come from the
 * composer's catalogue (`SHEET_MESSAGES`), so the sheet and the site say the same thing.
 */

import type { Activation } from "./cards.js";

export interface SheetLabels
{
    readonly characterName: string;
    readonly classLevel: string;
    readonly background: string;
    readonly player: string;
    readonly species: string;
    readonly alignment: string;
    readonly experience: string;
    readonly inspiration: string;
    readonly proficiencyBonus: string;
    readonly savingThrows: string;
    readonly skills: string;
    readonly passivePerception: string;
    readonly proficienciesLanguages: string;
    readonly armorClass: string;
    readonly initiative: string;
    readonly speed: string;
    readonly hpMax: string;
    readonly hpCurrent: string;
    readonly hpTemporary: string;
    /** The same, short enough for the small box beside the current hit points. */
    readonly hpTemporaryShort: string;
    readonly hitDice: string;
    readonly hitDiceTotal: string;
    readonly deathSaves: string;
    readonly successes: string;
    readonly failures: string;
    readonly attacks: string;
    readonly attackName: string;
    readonly attackBonus: string;
    readonly attackDamage: string;
    readonly equipment: string;
    readonly coins: readonly [string, string, string, string, string];
    readonly traits: string;
    readonly ideals: string;
    readonly bonds: string;
    readonly flaws: string;
    readonly features: string;
    readonly score: string;
    readonly compatible: string;
    readonly legal: string;
    readonly equipped: string;
    readonly spellcasting: string;
    // Page 2
    readonly age: string;
    readonly height: string;
    readonly weight: string;
    readonly eyes: string;
    readonly skin: string;
    readonly hair: string;
    readonly appearance: string;
    readonly backstory: string;
    readonly allies: string;
    readonly symbol: string;
    readonly resources: string;
    readonly resourceName: string;
    readonly resourceLeft: string;
    readonly conditions: string;
    readonly additionalFeatures: string;
    readonly treasure: string;
    // Page 3
    readonly spellcastingClass: string;
    readonly spellcastingAbility: string;
    readonly spellSaveDc: string;
    readonly spellAttackBonus: string;
    readonly cantrips: string;
    readonly slotsTotal: string;
    readonly slotsExpended: string;
    readonly pact: string;
    /** `{count}` spells more than the lines: on the last line of their level. */
    readonly moreSpells: string;
    // Cards and credits
    readonly activations: Readonly<Record<Activation, string>>;
    readonly spells: string;
    readonly forYou: string;
    readonly continued: string;
    readonly concentration: string;
    /** "(p. {page})": where a feature's card is. */
    readonly pageRef: string;
    readonly credits: string;
    readonly creditsIntro: string;
    readonly privatePackage: string;
    readonly fontsCredit: string;
}

const EN: SheetLabels = {
    characterName: "Character name",
    classLevel: "Class & level",
    background: "Background",
    player: "Player name",
    species: "Species",
    alignment: "Alignment",
    experience: "Experience points",
    inspiration: "Inspiration",
    proficiencyBonus: "Proficiency bonus",
    savingThrows: "Saving throws",
    skills: "Skills",
    passivePerception: "Passive Wisdom (Perception)",
    proficienciesLanguages: "Other proficiencies & languages",
    armorClass: "Armor class",
    initiative: "Initiative",
    speed: "Speed",
    hpMax: "Hit point maximum",
    hpCurrent: "Current hit points",
    hpTemporary: "Temporary hit points",
    hpTemporaryShort: "Temporary",
    hitDice: "Hit dice",
    hitDiceTotal: "Total",
    deathSaves: "Death saves",
    successes: "Successes",
    failures: "Failures",
    attacks: "Attacks & spellcasting",
    attackName: "Name",
    attackBonus: "Atk bonus",
    attackDamage: "Damage / type",
    equipment: "Equipment",
    coins: ["CP", "SP", "EP", "GP", "PP"],
    traits: "Personality traits",
    ideals: "Ideals",
    bonds: "Bonds",
    flaws: "Flaws",
    features: "Features & traits",
    score: "Score",
    compatible: "Compatible with the fifth edition rules (SRD 5.1)",
    legal: "Not affiliated with Wizards of the Coast. Includes material from the System Reference Document 5.1 " +
        "by Wizards of the Coast LLC, licensed under CC-BY-4.0.",
    equipped: "equipped",
    spellcasting: "Spellcasting",
    age: "Age",
    height: "Height",
    weight: "Weight",
    eyes: "Eyes",
    skin: "Skin",
    hair: "Hair",
    appearance: "Character appearance",
    backstory: "Character backstory",
    allies: "Allies & organizations",
    symbol: "Symbol",
    resources: "Resources",
    resourceName: "Name",
    resourceLeft: "Left",
    conditions: "Conditions",
    additionalFeatures: "Additional features & traits",
    treasure: "Treasure",
    spellcastingClass: "Spellcasting class",
    spellcastingAbility: "Spellcasting ability",
    spellSaveDc: "Spell save DC",
    spellAttackBonus: "Spell attack bonus",
    cantrips: "Cantrips",
    slotsTotal: "Slots total",
    slotsExpended: "Slots expended",
    pact: "pact",
    moreSpells: "+{count} more",
    activations: {
        "action": "Action",
        "bonus-action": "Bonus action",
        "reaction": "Reaction",
        "free": "Free",
        "special": "Special",
        "passive": "Passive"
    },
    spells: "Spells",
    forYou: "For you",
    continued: "continued",
    concentration: "Concentration",
    pageRef: "(p. {page})",
    credits: "Credits",
    creditsIntro: "The content on this sheet comes from these packages, under these licences.",
    privatePackage: "Loaded locally by the owner of the book; not distributed with the platform.",
    fontsCredit: "Fonts: Cinzel (Natanael Gama), Atkinson Hyperlegible (Braille Institute of America), Patrick Hand " +
        "(Patrick Wagesreiter), under the SIL Open Font License 1.1."
};

const IT: SheetLabels = {
    characterName: "Nome del personaggio",
    classLevel: "Classe e livello",
    background: "Background",
    player: "Nome del giocatore",
    species: "Specie",
    alignment: "Allineamento",
    experience: "Punti esperienza",
    inspiration: "Ispirazione",
    proficiencyBonus: "Bonus di competenza",
    savingThrows: "Tiri salvezza",
    skills: "Abilità",
    passivePerception: "Saggezza passiva (Percezione)",
    proficienciesLanguages: "Altre competenze e linguaggi",
    armorClass: "Classe armatura",
    initiative: "Iniziativa",
    speed: "Velocità",
    hpMax: "Punti ferita massimi",
    hpCurrent: "Punti ferita attuali",
    hpTemporary: "Punti ferita temporanei",
    hpTemporaryShort: "Temporanei",
    hitDice: "Dadi vita",
    hitDiceTotal: "Totale",
    deathSaves: "Tiri salvezza contro morte",
    successes: "Successi",
    failures: "Fallimenti",
    attacks: "Attacchi e incantesimi",
    attackName: "Nome",
    attackBonus: "Bonus att.",
    attackDamage: "Danni / tipo",
    equipment: "Equipaggiamento",
    coins: ["MR", "MA", "ME", "MO", "MP"],
    traits: "Tratti caratteriali",
    ideals: "Ideali",
    bonds: "Legami",
    flaws: "Difetti",
    features: "Privilegi e tratti",
    score: "Punteggio",
    compatible: "Compatibile con le regole della quinta edizione (SRD 5.1)",
    legal: "Non affiliato a Wizards of the Coast. Include materiale dal System Reference Document 5.1 " +
        "di Wizards of the Coast LLC, con licenza CC-BY-4.0.",
    equipped: "equipaggiato",
    spellcasting: "Incantesimi",
    age: "Età",
    height: "Altezza",
    weight: "Peso",
    eyes: "Occhi",
    skin: "Carnagione",
    hair: "Capelli",
    appearance: "Aspetto del personaggio",
    backstory: "Storia del personaggio",
    allies: "Alleati e organizzazioni",
    symbol: "Simbolo",
    resources: "Risorse",
    resourceName: "Nome",
    resourceLeft: "Restanti",
    conditions: "Condizioni",
    additionalFeatures: "Altri privilegi e tratti",
    treasure: "Tesoro",
    spellcastingClass: "Classe da incantatore",
    spellcastingAbility: "Caratteristica",
    spellSaveDc: "CD tiro salvezza",
    spellAttackBonus: "Bonus di attacco",
    cantrips: "Trucchetti",
    slotsTotal: "Slot totali",
    slotsExpended: "Slot spesi",
    pact: "patto",
    moreSpells: "+{count} altri",
    activations: {
        "action": "Azione",
        "bonus-action": "Azione bonus",
        "reaction": "Reazione",
        "free": "Gratuita",
        "special": "Speciale",
        "passive": "Passivo"
    },
    spells: "Incantesimi",
    forYou: "Per te",
    continued: "continua",
    concentration: "Concentrazione",
    pageRef: "(p. {page})",
    credits: "Crediti",
    creditsIntro: "I contenuti di questa scheda vengono da questi pacchetti, con queste licenze.",
    privatePackage: "Caricato localmente da chi possiede il libro; non distribuito con la piattaforma.",
    fontsCredit: "Caratteri: Cinzel (Natanael Gama), Atkinson Hyperlegible (Braille Institute of America), " +
        "Patrick Hand (Patrick Wagesreiter), con licenza SIL Open Font License 1.1."
};

export function sheetLabels(language: string): SheetLabels
{
    return language === "it" ? IT : EN;
}
