/**
 * Scope the transcription of the Player's Handbook (2014) into the private
 * package `content-private/phb14/` (docs/phase-0/06-private-packages.md).
 *
 * Reads the OCR text of the owned book, `content-private/sources/text/phb14.md`
 * (one `<!-- page N -->` marker per PDF page; printed page = PDF page − 1),
 * and writes the work partitions the drafting agents receive into
 * `content-private/work/phb14/` (git-ignored): one record per entity with
 * its fixed id, printed page, line span and raw OCR slice, plus the list of
 * SRD ids that may be referenced, the class spell-list additions and a
 * report of everything that needs a human decision.
 *
 * Nothing from the book is embedded here; without the private source the
 * script exits quietly.
 *
 * Known limit: a span starts at the entity's heading, so text the OCR placed
 * before the heading on the same page (a left column read after the right one)
 * is missed; re-OCR that page with content-private/sources/column-ocr.py.
 *
 *   node tools/import/src/phb-scope.ts
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { stringify } from "yaml";

import { REPO_ROOT } from "./lib.ts";

const SOURCE = resolve(REPO_ROOT, "content-private/sources/text/phb14.md");
const OUT = resolve(REPO_ROOT, "content-private/work/phb14");
const SRD = resolve(REPO_ROOT, "packages/content/srd51");

if (!existsSync(SOURCE))
{
    console.log("phb-scope: private source not present, nothing to do");
    process.exit(0);
}

// ---- the text ------------------------------------------------------------------------------

const COLUMNS = resolve(REPO_ROOT, "content-private/sources/text/phb14-columns");
/** Page-level OCR, with the pages re-OCR'd column by column (`column-ocr.py`) swapped in. */
const lines: string[] = [];
{
    const raw = readFileSync(SOURCE, "utf8").split("\n");
    let skipping = false;
    for (const line of raw)
    {
        const m = /^<!-- page (\d+) -->$/.exec(line);
        if (m)
        {
            const column = resolve(COLUMNS, `${m[1]}.md`);
            skipping = existsSync(column);
            lines.push(line);
            if (skipping)
            {
                lines.push(...readFileSync(column, "utf8").split("\n")
                    .slice(1));
            }

            continue;
        }
        if (!skipping) { lines.push(line); }
    }
}
/** PDF page of each line (1-based). */
const pageOfLine: number[] = [];
{
    let page = 0;
    for (const line of lines)
    {
        const m = /^<!-- page (\d+) -->$/.exec(line);
        if (m) { page = Number(m[1]); }
        pageOfLine.push(page);
    }
}
const printed = (lineIndex: number): number => pageOfLine[lineIndex]! - 1;

function lastIndex(pattern: RegExp, from = 0, to = lines.length): number
{
    for (let i = to - 1; i >= from; i -= 1)
    {
        if (pattern.test(lines[i]!)) { return i; }
    }

    return -1;
}
function firstIndex(pattern: RegExp, from = 0, to = lines.length): number
{
    for (let i = from; i < to; i += 1)
    {
        if (pattern.test(lines[i]!)) { return i; }
    }

    return -1;
}

/** Chapter starts: the last occurrence, because the first ones are the table of contents. */
const chapters = {
    races: lastIndex(/^CHAPTER 2: RACES/),
    classes: lastIndex(/^CHAPTER 3: CLASSES/),
    personality: lastIndex(/^CHAPTER 4: PERSONALITY/),
    equipment: lastIndex(/^CHAPTER 5: EQUIPMENT/),
    customization: lastIndex(/^CHAPTER 6: CUSTOMIZATION/),
    abilities: lastIndex(/^CHAPTER 7: USING ABILITY/),
    spells: lastIndex(/^CHAPTER (11|II): SPELLS/),
    spellDescriptions: -1,
    appendixA: lastIndex(/^APPENDIX A: CONDITIONS$/)
};
// the descriptions start on the same page as the end of the lists: first occurrence after the chapter start
chapters.spellDescriptions = firstIndex(/^[^A-Za-z]*SPELL DESCRIPT/i, chapters.spells);
for (const [name, index] of Object.entries(chapters))
{
    if (index < 0) { throw new Error(`chapter boundary not found: ${name}`); }
}

function slug(name: string): string
{
    return name
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
function titleCase(heading: string): string
{
    const small = new Set(["of", "the", "and", "a", "an", "in", "on", "to", "for", "or"]);

    return heading
        .toLowerCase()
        .split(/\s+/)
        .map((w, i) => (i > 0 && small.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

interface Record_
{
    id: string;
    name: string;
    file: string;
    page: number;
    pdfPage: number;
    lines: [number, number];
    text: string;
    [key: string]: unknown;
}

function slice(from: number, to: number): string
{
    return lines.slice(from, to).filter((l) => !/^<!-- page \d+ -->$/.test(l))
        .join("\n")
        .trim();
}

// ---- SRD ids the agents may reference --------------------------------------------------------

function* walk(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* walk(path); }
        else if (/\.ya?ml$/.test(entry)) { yield path; }
    }
}
const srdIds = new Set<string>();
for (const file of walk(SRD))
{
    for (const m of readFileSync(file, "utf8").matchAll(/^\s*(?:- )?id:\s*(srd51\.[a-z0-9.-]+)\s*$/gm)) { srdIds.add(m[1]!); }
}
const srdSpellIds = new Set([...srdIds].filter((id) => id.startsWith("srd51.spell.")));

// ---- subclasses ------------------------------------------------------------------------------

/** The 28 subclasses the SRD lacks: heading in the book → class. */
const SUBCLASSES: Record<string, string> = {
    "PATH OF THE TOTEM WARRIOR": "barbarian",
    "COLLEGE OF VALOR": "bard",
    "KNOWLEDGE DOMAIN": "cleric",
    "LIGHT DOMAIN": "cleric",
    "NATURE DOMAIN": "cleric",
    "TEMPEST DOMAIN": "cleric",
    "TRICKERY DOMAIN": "cleric",
    "WAR DOMAIN": "cleric",
    "CIRCLE OF THE MOON": "druid",
    "BATTLE MASTER": "fighter",
    "ELDRITCH KNIGHT": "fighter",
    "WAY OF SHADOW": "monk",
    "WAY OF THE FOUR ELEMENTS": "monk",
    "OATH OF THE ANCIENTS": "paladin",
    "OATH OF VENGEANCE": "paladin",
    "BEAST MASTER": "ranger",
    "ASSASSIN": "rogue",
    "ARCANE TRICKSTER": "rogue",
    "WILD MAGIC": "sorcerer",
    "THE ARCHFEY": "warlock",
    "THE GREAT OLD ONE": "warlock",
    "SCHOOL OF ABJURATION": "wizard",
    "SCHOOL OF CONJURATION": "wizard",
    "SCHOOL OF DIVINATION": "wizard",
    "SCHOOL OF ENCHANTMENT": "wizard",
    "SCHOOL OF ILLUSION": "wizard",
    "SCHOOL OF NECROMANCY": "wizard",
    "SCHOOL OF TRANSMUTATION": "wizard"
};
/** Headings that end a subclass span without being one (the next class, appendix material inside the chapter). */
const CLASS_HEADINGS = new Set([
    "BARBARIAN", "BARD", "CLERIC", "DRUID", "FIGHTER", "MONK", "PALADIN", "RANGER", "ROGUE", "SORCERER", "WARLOCK", "WIZARD",
    "PATH OF THE BERSERKER", "COLLEGE OF LORE", "LIFE DOMAIN", "CIRCLE OF THE LAND", "CHAMPION", "WAY OF THE OPEN HAND",
    "OATH OF DEVOTION", "HUNTER", "THIEF", "DRACONIC BLOODLINE", "THE FIEND", "SCHOOL OF EVOCATION",
    "ELDRITCH INVOCATIONS", "SACRED OATHS", "MARTIAL ARCHETYPES", "MONASTIC TRADITIONS", "ROGUISH ARCHETYPES",
    "SORCEROUS ORIGINS", "OTHERWORLDLY PATRONS", "ARCANE TRADITIONS", "DRUID CIRCLES", "DIVINE DOMAINS",
    "BARD COLLEGES", "PRIMAL PATHS", "RANGER ARCHETYPES"
]); // "MANEUVERS" and "ELEMENTAL DISCIPLINES" belong to their subclass and must stay inside its span
/** OCR renders small-caps headings in mixed case ("DIVINE WorD") and sometimes appends junk ("BARD i),"). */
const normalizeHeading = (line: string): string => line.trim().toUpperCase()
    .replace(/’/g, "'")
    .replace(/^[^A-Z]+/, "");
const isHeading = (line: string): boolean => /^[A-Z][A-Z0-9': /-]{1,50}$/.test(normalizeHeading(line));
/** `line` is the known heading `heading`, allowing up to 12 chars of OCR junk that are not another heading word. */
function isKnownHeading(line: string, heading: string): boolean
{
    const n = normalizeHeading(line);
    const head = n.slice(0, heading.length);
    // one OCR slip is tolerated in headings of six letters or more ("WOOP ELF")
    if ((head !== heading) && ((heading.length < 6) || (editDistance(head, heading) > 1))) { return false; }
    const rest = n.slice(heading.length);

    return (rest.length <= 12) && !/[A-Z]{3,}/.test(rest);
}
/** An ALL-CAPS line of the book (OCR may lower a few letters), used to end a span. */
function looksLikeHeading(line: string): boolean
{
    const letters = line.replace(/[^A-Za-z]/g, "");
    const upper = letters.replace(/[^A-Z]/g, "");

    return (letters.length >= 4) && isHeading(line) && (upper.length / letters.length >= 0.6);
}

const subclassRecords: Record_[] = [];
const subclassHeadingLines = new Map<string, number>();
for (let i = chapters.classes; i < chapters.personality; i += 1)
{
    const heading = Object.keys(SUBCLASSES).find((h) => isKnownHeading(lines[i]!, h));
    if ((heading !== undefined) && !subclassHeadingLines.has(heading))
    {
        // the first occurrence inside the chapter after the class's option table is the real one:
        // a subclass name also appears in the class's "choose an archetype" paragraph, but not as a line of its own
        subclassHeadingLines.set(heading, i);
    }
}
const boundaries = [...subclassHeadingLines.values()].sort((a, b) => a - b);
for (const [heading, start] of subclassHeadingLines)
{
    let end = chapters.personality;
    for (let i = start + 1; i < chapters.personality; i += 1)
    {
        const t = lines[i]!;
        const other = Object.keys(SUBCLASSES).some((h) => (h !== heading) && isKnownHeading(t, h));
        const cls = [...CLASS_HEADINGS].some((h) => isKnownHeading(t, h));
        if (other || cls || (boundaries.includes(i) && (i !== start)))
        {
            end = i;
            break;
        }
    }
    const cls = SUBCLASSES[heading]!;
    const name = titleCase(heading);
    subclassRecords.push({
        id: `phb14.subclass.${cls}.${slug(name)}`,
        name: name,
        class: `srd51.class.${cls}`,
        file: `subclasses/${cls}/${slug(name)}.yaml`,
        page: printed(start),
        pdfPage: pageOfLine[start]!,
        lines: [start + 1, end],
        text: slice(start, end)
    });
}
subclassRecords.sort((a, b) => a.lines[0] - b.lines[0]);

// ---- subraces and the variant human -------------------------------------------------------------

/** Subraces the SRD lacks: heading in the book → SRD species and subrace id. */
const SUBRACES: Record<string, { species: string, id: string, name: string }> = {
    "MOUNTAIN DWARF": { species: "dwarf", id: "mountain-dwarf", name: "Mountain Dwarf" },
    "WOOD ELF": { species: "elf", id: "wood-elf", name: "Wood Elf" },
    "DARK ELF (DROW)": { species: "elf", id: "dark-elf", name: "Dark Elf (Drow)" },
    "STOUT": { species: "halfling", id: "stout", name: "Stout" },
    "FOREST GNOME": { species: "gnome", id: "forest-gnome", name: "Forest Gnome" }
};
const RACE_HEADINGS = new Set([
    "DWARF", "ELF", "HALFLING", "HUMAN", "DRAGONBORN", "GNOME", "HALF-ELF", "HALF-ORC", "TIEFLING", "HILL DWARF", "HIGH ELF",
    "LIGHTFOOT", "ROCK GNOME", "DWARF NAMES", "ELF NAMES", "HALFLING NAMES", "GNOME NAMES", "HUMAN NAMES AND ETHNICITIES",
    "DWARF TRAITS", "ELF TRAITS", "HALFLING TRAITS", "HUMAN TRAITS", "GNOME TRAITS", "VARIANT HUMAN TRAITS", "DRAGONBORN TRAITS"
]);
const subraceRecords: Record_[] = [];
{
    const found: { heading: string, line: number }[] = [];
    for (let i = chapters.races; i < chapters.classes; i += 1)
    {
        const heading = Object.keys(SUBRACES).find((h) => isKnownHeading(lines[i]!, h));
        if ((heading !== undefined) && !found.some((f) => f.heading === heading))
        {
            // the subrace heading proper is followed by its flavour text, not by a table or a name list
            found.push({ heading: heading, line: i });
        }
        if (isKnownHeading(lines[i]!, "VARIANT HUMAN TRAITS") && !found.some((f) => f.heading === "VARIANT HUMAN TRAITS"))
        {
            found.push({ heading: "VARIANT HUMAN TRAITS", line: i });
        }
    }
    for (const f of found)
    {
        let end = chapters.classes;
        for (let i = f.line + 1; i < chapters.classes; i += 1)
        {
            const t = lines[i]!;
            const known = [...Object.keys(SUBRACES), ...RACE_HEADINGS];
            const other = known.some((h) => (h !== f.heading) && isKnownHeading(t, h));
            if (other || looksLikeHeading(t))
            {
                end = i;
                break;
            }
        }
        if (f.heading === "VARIANT HUMAN TRAITS")
        {
            subraceRecords.push({
                id: "phb14.species.human-variant",
                name: "Human (Variant)",
                file: "species/human-variant.yaml",
                base: "srd51.species.human",
                page: printed(f.line),
                pdfPage: pageOfLine[f.line]!,
                lines: [f.line + 1, end],
                text: slice(f.line, end)
            });

            continue;
        }
        const sub = SUBRACES[f.heading]!;
        subraceRecords.push({
            id: `phb14.species.${sub.species}.${sub.id}`,
            name: sub.name,
            file: `patches/${sub.species}-subspecies.yaml`,
            patch: { id: `phb14.patch.${sub.species}-subspecies`, target: `srd51.species.${sub.species}`, append: "subspecies" },
            page: printed(f.line),
            pdfPage: pageOfLine[f.line]!,
            lines: [f.line + 1, end],
            text: slice(f.line, end)
        });
    }
}

// ---- feats ----------------------------------------------------------------------------------

const featsStart = lastIndex(/^FEATS$/, chapters.customization, chapters.abilities);
const FEATS = [
    "ALERT", "ATHLETE", "ACTOR", "CHARGER", "CROSSBOW EXPERT", "DEFENSIVE DUELIST", "DUAL WIELDER", "DUNGEON DELVER",
    "DURABLE", "ELEMENTAL ADEPT", "GRAPPLER", "GREAT WEAPON MASTER", "HEALER", "HEAVILY ARMORED", "HEAVY ARMOR MASTER",
    "INSPIRING LEADER", "KEEN MIND", "LIGHTLY ARMORED", "LINGUIST", "LUCKY", "MAGE SLAYER", "MAGIC INITIATE",
    "MARTIAL ADEPT", "MEDIUM ARMOR MASTER", "MOBILE", "MODERATELY ARMORED", "MOUNTED COMBATANT", "OBSERVANT",
    "POLEARM MASTER", "RESILIENT", "RITUAL CASTER", "SAVAGE ATTACKER", "SENTINEL", "SHARPSHOOTER", "SHIELD MASTER",
    "SKILLED", "SKULKER", "SPELL SNIPER", "TAVERN BRAWLER", "TOUGH", "WAR CASTER", "WEAPON MASTER"
];
const featRecords: Record_[] = [];
const mergedFeatLines: string[] = [];
{
    const headings: { line: number, name: string }[] = [];
    for (let i = featsStart + 1; i < chapters.abilities; i += 1)
    {
        const found = FEATS.filter((f) => isKnownHeading(lines[i]!, f) && !headings.some((h) => h.name === f));
        if (found.length === 0) { continue; }
        if (found.length > 1) { mergedFeatLines.push(`${i + 1}: ${lines[i]}`); }
        for (const f of found) { headings.push({ line: i, name: f }); }
    }
    headings.forEach((h, k) =>
    {
        const start = h.line;
        const end = headings.slice(k + 1).find((x) => x.line > start)?.line ?? chapters.abilities;
        const name = titleCase(h.name);
        featRecords.push({
            id: `phb14.feat.${slug(name)}`,
            name: name,
            file: `feats/${slug(name)}.yaml`,
            page: printed(start),
            pdfPage: pageOfLine[start]!,
            lines: [start + 1, end],
            text: slice(start, end)
        });
    });
}

// ---- backgrounds ----------------------------------------------------------------------------

const backgroundsStart = lastIndex(/^BACKGROUNDS$/, chapters.personality, chapters.equipment);
const BACKGROUNDS = [
    "ACOLYTE", "CHARLATAN", "CRIMINAL", "ENTERTAINER", "FOLK HERO", "GUILD ARTISAN", "HERMIT", "NOBLE", "OUTLANDER",
    "SAGE", "SAILOR", "SOLDIER", "URCHIN"
];
const backgroundRecords: Record_[] = [];
{
    const headings: { line: number, name: string, variant?: string }[] = [];
    for (let i = backgroundsStart + 1; i < chapters.equipment; i += 1)
    {
        const t = lines[i]!.trim();
        const known = BACKGROUNDS.find((b) => isKnownHeading(t, b));
        const seen = headings.some((h) => h.name === known && h.variant === undefined);
        if ((known !== undefined) && !seen) { headings.push({ line: i, name: known }); }
        const v = /^VARIANT ([A-Z ]+): ([A-Z ]+)$/.exec(normalizeHeading(t));
        if (v && (v[1] !== "FEATURE")) { headings.push({ line: i, name: v[2]!, variant: v[1]! }); }
    }
    headings.forEach((h, k) =>
    {
        const end = headings[k + 1]?.line ?? chapters.equipment;
        const name = titleCase(h.name);
        if (h.name === "ACOLYTE") { return; } // in the SRD already
        backgroundRecords.push({
            id: `phb14.background.${slug(name)}`,
            name: name,
            ...(h.variant ? { variantOf: `phb14.background.${slug(titleCase(h.variant))}` } : {}),
            file: `backgrounds/${slug(name)}.yaml`,
            page: printed(h.line),
            pdfPage: pageOfLine[h.line]!,
            lines: [h.line + 1, end],
            text: slice(h.line, end)
        });
    });
}

// ---- spells ---------------------------------------------------------------------------------

const SPELL_HEADER = /^(?:.{1,4}-[a-z!|1]{4,6} [a-z]+|[a-z]+ cantrip)( \(ritual\))?$/i;
const NOT_SPELLS = new Set(["SPELLS", "SPELL DESCRIPTIONS", "CASTING TIME", "COMPONENTS", "DURATION", "RANGE"]);
interface SpellHeading { line: number, name: string, slug: string }
const spellHeadings: SpellHeading[] = [];
for (let i = chapters.spellDescriptions + 1; i < chapters.appendixA; i += 1)
{
    const t = normalizeHeading(lines[i]!);
    if (!isHeading(t) || /^(PART|CHAPTER)/.test(t) || NOT_SPELLS.has(t)) { continue; }
    const following = lines.slice(i + 1, i + 3).map((l) => l.trim());
    if (!following.some((l) => SPELL_HEADER.test(l))) { continue; }
    spellHeadings.push({ line: i, name: titleCase(t), slug: slug(t) });
}
/** SRD ids strip the wizard's name (Bigby's Hand → arcane-hand …): try both the plain slug and known aliases. */
const ALIASES: Record<string, string> = {
    "bigbys-hand": "arcane-hand",
    "drawmijs-instant-summons": "instant-summons",
    "evards-black-tentacles": "black-tentacles",
    "leomunds-secret-chest": "secret-chest",
    "leomunds-tiny-hut": "tiny-hut",
    "melfs-acid-arrow": "acid-arrow",
    "mordenkainens-faithful-hound": "faithful-hound",
    "mordenkainens-magnificent-mansion": "magnificent-mansion",
    "mordenkainens-private-sanctum": "private-sanctum",
    "mordenkainens-sword": "arcane-sword",
    "nystuls-magic-aura": "arcanists-magic-aura",
    "otilukes-freezing-sphere": "freezing-sphere",
    "otilukes-resilient-sphere": "resilient-sphere",
    "ottos-irresistible-dance": "irresistible-dance",
    "rarys-telepathic-bond": "telepathic-bond",
    "tashas-hideous-laughter": "hideous-laughter",
    "tensers-floating-disk": "floating-disk"
};
/** The spells of the book that the SRD lacks (names only). */
const PHB_SPELLS = [
    "Arcane Gate", "Armor of Agathys", "Arms of Hadar", "Aura of Life", "Aura of Purity", "Aura of Vitality",
    "Banishing Smite", "Beast Sense", "Blade Ward", "Blinding Smite", "Chromatic Orb", "Circle of Power",
    "Cloud of Daggers", "Compelled Duel", "Conjure Barrage", "Conjure Volley", "Cordon of Arrows", "Crown of Madness",
    "Crusader's Mantle", "Destructive Wave", "Dissonant Whispers", "Elemental Weapon", "Ensnaring Strike", "Feign Death",
    "Friends", "Grasping Vine", "Hail of Thorns", "Hex", "Hunger of Hadar", "Lightning Arrow", "Phantasmal Force",
    "Power Word Heal", "Ray of Sickness", "Searing Smite", "Staggering Smite", "Swift Quiver", "Telepathy", "Thorn Whip",
    "Thunderous Smite", "Tsunami", "Witch Bolt", "Wrathful Smite"
];
function editDistance(a: string, b: string): number
{
    const row = (i: number): number[] => [i, ...Array.from({ length: b.length }, () => 0)];
    const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => row(i));
    for (let j = 1; j <= b.length; j += 1) { d[0]![j] = j; }
    for (let i = 1; i <= a.length; i += 1)
    {
        for (let j = 1; j <= b.length; j += 1)
        {
            const substitution = d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
            d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, substitution);
        }
    }

    return d[a.length]![b.length]!;
}
const tolerance = (s: string): number => (s.length <= 6 ? 1 : s.length <= 12 ? 2 : 3);
function sameSpell(headingSlug: string, wanted: string): boolean
{
    return (headingSlug === wanted) || (editDistance(headingSlug, wanted) <= tolerance(wanted));
}
const matchedByAlias: string[] = [];
const newSpells: SpellHeading[] = [];
const missingPhbSpells: string[] = [];
for (const name of PHB_SPELLS)
{
    const wanted = slug(name);
    const hit = spellHeadings.find((h) => sameSpell(h.slug, wanted));
    if (hit === undefined)
    {
        missingPhbSpells.push(name);

        continue;
    }
    if (hit.slug !== wanted) { matchedByAlias.push(`${hit.slug} → ${wanted}`); }
    newSpells.push({ line: hit.line, name: name, slug: wanted });
}
/** Headings that are neither an SRD spell (exactly, by alias or within tolerance) nor a PHB spell: to be checked. */
const unknownHeadings = spellHeadings.filter((h) =>
{
    if (newSpells.some((n) => n.line === h.line)) { return false; }
    const candidates = [h.slug, ALIASES[h.slug] ?? "", h.slug.replace(/^[a-z]+s-/, ""), slug(h.name.replace(/\//g, ""))];
    if (candidates.some((c) => c && srdSpellIds.has(`srd51.spell.${c}`))) { return false; }

    return ![...srdSpellIds].some((id) => sameSpell(h.slug, id.replace("srd51.spell.", "")));
}).map((h) => `${h.name} (line ${h.line + 1})`);
const spellRecords: Record_[] = newSpells.map((h) =>
{
    const end = spellHeadings.find((x) => x.line > h.line)?.line ?? chapters.appendixA;

    return {
        id: `phb14.spell.${h.slug}`,
        name: h.name,
        file: `spells/${h.slug}.yaml`,
        page: printed(h.line),
        pdfPage: pageOfLine[h.line]!,
        lines: [h.line + 1, end],
        text: slice(h.line, end)
    };
});
const unmatchedSrdSpells = [...srdSpellIds].filter((id) =>
{
    const s = id.replace("srd51.spell.", "");

    return !spellHeadings.some((h) =>
        sameSpell(h.slug, s) || ALIASES[h.slug] === s || h.slug.replace(/^[a-z]+s-/, "") === s || slug(h.name.replace(/\//g, "")) === s);
});

// ---- class spell lists ---------------------------------------------------------------------

const LIST_CLASSES = ["BARD", "CLERIC", "DRUID", "PALADIN", "RANGER", "SORCERER", "WARLOCK", "WIZARD"];
/** "<CLASS> SPELLS" heading of a list page, tolerant to OCR damage on the class name. */
function listClassOf(line: string): string | undefined
{
    const n = normalizeHeading(line);
    const m = /^(.{3,12}) SPELLS?\b.{0,4}$/.exec(n);
    if (!m) { return undefined; }

    return LIST_CLASSES.find((c) => editDistance(m[1]!, c) <= 2)?.toLowerCase();
}
const spellLists: Record<string, string[]> = {};
const unmatchedListLines: string[] = [];
{
    // The list pages are two columns merged line by line: names break across lines and mix with the other column.
    // Membership is decided by searching each new spell's name in the class section's text, whitespace-insensitive.
    const sections: { cls: string, from: number, to: number }[] = [];
    for (let i = chapters.spells; i < chapters.spellDescriptions; i += 1)
    {
        const cls = listClassOf(lines[i]!);
        if ((cls === undefined) || sections.some((x) => x.cls === cls)) { continue; }
        sections.push({ cls: cls, from: i, to: chapters.spellDescriptions });
    }
    sections.forEach((s, k) =>
    {
        if (sections[k + 1]) { s.to = sections[k + 1]!.from; }
    });
    const blob = (from: number, to: number): string => lines.slice(from, to).join(" ")
        .toLowerCase()
        .replace(/[^a-z]+/g, " ");
    for (const s of sections)
    {
        const text = ` ${blob(s.from, s.to)} `;
        const words = text.split(" ").filter((w) => w !== "");
        spellLists[s.cls] = newSpells
            .filter((h) =>
            {
                const target = h.name.toLowerCase().replace(/[^a-z]+/g, " ")
                    .trim()
                    .split(" ");
                for (let i = 0; i + target.length <= words.length; i += 1)
                {
                    const window = words.slice(i, i + target.length).join(" ");
                    if (editDistance(window, target.join(" ")) <= tolerance(target.join(" "))) { return true; }
                }

                return false;
            })
            .map((h) => `phb14.spell.${h.slug}`);
    }
    for (const h of newSpells)
    {
        if (!Object.values(spellLists).some((ids) => ids.includes(`phb14.spell.${h.slug}`))) { unmatchedListLines.push(`${h.slug}: found in no class list`); }
    }
}

// ---- output ---------------------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
const half = Math.ceil(spellRecords.length / 2);
const packets: Record<string, Record_[]> = {
    "04-monk-rogue-warlock-barbarian": subclassRecords.filter((r) => /monk|rogue|warlock|barbarian/.test(r.id) && !r.id.endsWith("way-of-shadow")),
    "05-martial": subclassRecords.filter((r) => /fighter|bard|ranger|paladin/.test(r.id)),
    "06-divine": subclassRecords.filter((r) => /cleric/.test(r.id)),
    "07-arcane-primal": subclassRecords.filter((r) => /wizard|sorcerer|druid/.test(r.id)),
    "03-subraces": subraceRecords,
    "08-backgrounds": backgroundRecords,
    "09-feats": featRecords,
    "01-spells-a": spellRecords.slice(0, half),
    "02-spells-i": spellRecords.slice(half)
};
for (const [name, records] of Object.entries(packets))
{
    writeFileSync(resolve(OUT, `${name}.yaml`), stringify({ packet: name, records: records }, { lineWidth: 0 }));
}
writeFileSync(resolve(OUT, "spell-lists.yaml"), stringify(spellLists));
writeFileSync(resolve(OUT, "srd-ids.txt"), `${[...srdIds].sort().join("\n")}\n`);

const report = [
    "# phb14 scope report",
    "",
    `Source: ${SOURCE}`,
    "",
    "| Set | Records |",
    "|---|---|",
    `| subclasses | ${subclassRecords.length} / 28 |`,
    `| subraces + variant human | ${subraceRecords.length} / 6 |`,
    `| feats | ${featRecords.length} / 41 |`,
    `| backgrounds (+ variants) | ${backgroundRecords.length} / 17 |`,
    `| spell headings detected | ${spellHeadings.length} |`,
    `| PHB-only spells found / expected | ${spellRecords.length} / ${PHB_SPELLS.length} |`,
    `| spell headings neither SRD nor PHB (check) | ${unknownHeadings.length} |`,
    `| SRD spells not found in the book (check aliases) | ${unmatchedSrdSpells.length} |`,
    `| new spells found in no class list | ${unmatchedListLines.length} |`,
    `| feat heading lines merged across columns | ${mergedFeatLines.length} |`,
    "",
    "## Subclasses",
    ...subclassRecords.map((r) => `- ${r.id} (p. ${r.page}, lines ${r.lines[0]}–${r.lines[1]}, ${r.text.length} chars)`),
    "",
    "## Subraces",
    ...subraceRecords.map((r) => `- ${r.id} (p. ${r.page}, ${r.text.length} chars)`),
    "",
    "## Feats",
    ...featRecords.map((r) => `- ${r.id} (p. ${r.page}, ${r.text.length} chars)`),
    "",
    "## Backgrounds",
    ...backgroundRecords.map((r) => `- ${r.id}${r["variantOf"] ? ` (variant of ${String(r["variantOf"])})` : ""} (p. ${r.page}, ${r.text.length} chars)`),
    "",
    "## New spells",
    ...spellRecords.map((r) => `- ${r.id} (p. ${r.page}, ${r.text.length} chars)`),
    "",
    "## PHB spells not found in the descriptions",
    ...missingPhbSpells.map((m) => `- ${m}`),
    "",
    "## Spell headings matched within OCR tolerance",
    ...matchedByAlias.map((m) => `- ${m}`),
    "",
    "## Spell headings neither SRD nor PHB",
    ...unknownHeadings.map((m) => `- ${m}`),
    "",
    "## SRD spells not found in the book",
    ...unmatchedSrdSpells.map((id) => `- ${id}`),
    "",
    "## Class spell lists (new spells only)",
    ...Object.entries(spellLists).map(([cls, ids]) => `- ${cls}: ${ids.length}`),
    "",
    "## New spells found in no class list",
    ...unmatchedListLines.map((l) => `- ${l}`),
    "",
    "## Feat heading lines merged across columns (re-OCR these pages by column)",
    ...mergedFeatLines.map((l) => `- ${l}`),
    ""

].join("\n");
writeFileSync(resolve(OUT, "report.md"), report);
console.log(report.split("\n").slice(0, 14)
    .join("\n"));
