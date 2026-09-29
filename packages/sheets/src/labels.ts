/**
 * The printed words of the classic sheet, in the sheet's language. Ability and skill names come from the
 * composer's catalogue (`SHEET_MESSAGES`), so the sheet and the site say the same thing.
 */

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
    spellcasting: "Spellcasting"
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
    spellcasting: "Incantesimi"
};

export function sheetLabels(language: string): SheetLabels
{
    return language === "it" ? IT : EN;
}
