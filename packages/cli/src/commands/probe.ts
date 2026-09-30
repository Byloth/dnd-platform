/**
 * `dnd probe-language <language> [dirs…] [--json]`
 *
 * The derive-all probe of docs/phase-1/06-localisation.md: every fixture character composed in English and in the
 * language, with the language's translation packages, as the site composes it; any text of the translated sheet
 * that is word for word a text of the English one is reported, unless it is allowed (a proper name, a word the two
 * languages share: `fixtures/i18n/probe-allow.yaml`). Numbers, dice, units and identifiers are not texts.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";

import { compose } from "@byloth/dnd-platform-composer";
import type { SectionTree } from "@byloth/dnd-platform-composer";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";
import { compareVersions, loadPackages } from "@byloth/dnd-platform-loader";

import { PRIVATE_ROOT, tryRepositoryRoot } from "../io/repository.js";
import { resolvePackages } from "../io/resolve-packages.js";

/** Keys whose strings are identifiers, sources or data, not words a player reads. */
const NOT_TEXT = new Set([
    "id", "kind", "origin", "owner", "source", "package", "packages", "ruleset", "version", "state", "activation",
    "class", "feature", "entity", "formula", "mark", "type", "layout", "key", "caster", "list", "ability", "item",
    "condition", "provenance", "value", "raw", "effectIndex", "code",
    // The engine's own views copied into the tree (both languages side by side), not what a sheet prints.
    "action", "attack", "spell", "en"
]);

export interface ProbeFinding
{
    readonly text: string;
    readonly character: string;
    readonly path: string;
}

/** Every string a player reads in a tree, with its path. */
function texts(node: unknown, path: string, out: { text: string, path: string }[]): void
{
    if (typeof node === "string")
    {
        out.push({ text: node, path: path });

        return;
    }
    if (Array.isArray(node))
    {
        node.forEach((item, i) => texts(item, `${path}[${i}]`, out));

        return;
    }
    if (node && (typeof node === "object"))
    {
        for (const [key, value] of Object.entries(node))
        {
            if (!NOT_TEXT.has(key)) { texts(value, path ? `${path}.${key}` : key, out); }
        }
    }
}

/** A string with a word in it: not a number, a die, a unit or an identifier. */
function isWords(text: string): boolean
{
    if (/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(text)) { return false; }
    const words = text.replace(/\d+d\d+/g, " ").match(/\p{L}{3,}/gu) ?? [];

    return words.some((w) => !["ft", "lb", "cp", "sp", "ep", "gp", "pp"].includes(w.toLowerCase()));
}

/** The character's tree in a language; undefined when no translation of its packages is in that language. */
function tree(characterPath: string, character: Character, repoRoot: string, language: string): SectionTree | undefined
{
    const resolved = resolvePackages(characterPath, character, { repoRoot: repoRoot, language: language });

    const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
    const set = loadPackages(resolved.sources, {
        pins: pins, language: language, ...(resolved.selection ? { selection: resolved.selection } : {})
    });
    // Only when a translation was loaded for the character's packages, made for their versions (an excerpt of the
    // SRD has the SRD's id at an old version: the translation of today's SRD does not fit it).
    const translations = set.order.filter((m) => m.kind === "translation");
    const fits = translations.every((t) => t.dependencies.every((d) =>
    {
        const minimum = /^>=\s*(\S+)$/.exec(d.version)?.[1];
        const loaded = set.order.find((m) => m.id === d.id)?.version;

        return !minimum || !loaded || (compareVersions(loaded, minimum) >= 0);
    }));
    if ((language !== "en") && ((translations.length === 0) || !fits)) { return undefined; }
    const sheet = derive(character, set, { language: language });

    return compose(sheet, {
        character: character, packages: set, language: language, units: language === "en" ? "imperial" : "metric"
    });
}

export interface ProbeOptions
{
    readonly repoRoot: string;
    readonly language: string;
    /** Fixture character directories; default every one under fixtures/characters (and the private ones). */
    readonly directories?: readonly string[];
}

/** The texts of the translated sheets that are still in English. */
export function probeLanguage(options: ProbeOptions): ProbeFinding[]
{
    const roots = [join(options.repoRoot, "fixtures", "characters"), join(options.repoRoot, PRIVATE_ROOT, "fixtures")];
    const directories = options.directories ?? roots.filter((r) => existsSync(r))
        .flatMap((r) => readdirSync(r).map((d) => join(r, d)))
        .filter((d) => existsSync(join(d, "character.yaml")));
    const allowFile = join(options.repoRoot, "fixtures", "i18n", "probe-allow.yaml");
    const allowFileData = existsSync(allowFile) ?
        (parse(readFileSync(allowFile, "utf8")) as { texts?: string[], words?: string[] } | null) :
        null;
    const allowed = new Set(allowFileData?.texts ?? []);
    // Words the two languages share ("Ranger", "Warlock"): a text made only of them is not English.
    const shared = new Set((allowFileData?.words ?? []).map((w) => w.toLowerCase()));
    const sharedOnly = (text: string): boolean =>
        (text.match(/\p{L}{3,}/gu) ?? []).every((w) => shared.has(w.toLowerCase()));

    const findings: ProbeFinding[] = [];
    for (const directory of directories)
    {
        const characterPath = join(directory, "character.yaml");
        const character = parse(readFileSync(characterPath, "utf8")) as Character;
        const other = tree(characterPath, character, options.repoRoot, options.language);
        // A character whose packages have no translation in the language (a test ruleset, an excerpt) is skipped.
        if (!other) { continue; }
        const english: { text: string, path: string }[] = [];
        texts(tree(characterPath, character, options.repoRoot, "en"), "", english);
        const same = new Set(english.map((e) => e.text));
        const translated: { text: string, path: string }[] = [];
        texts(other, "", translated);
        for (const { text, path } of translated)
        {
            if (!same.has(text) || !isWords(text) || allowed.has(text) || sharedOnly(text)) { continue; }
            if (text === character.name) { continue; }
            findings.push({ text: text, character: directory.split("/").pop()!, path: path });
        }
    }

    return findings;
}

export function runProbe(argv: readonly string[]): number
{
    const [language, ...rest] = argv.filter((a) => !a.startsWith("--"));
    if (!language)
    {
        process.stderr.write("dnd probe-language: which language? (dnd probe-language it)\n");

        return 2;
    }
    const repoRoot = tryRepositoryRoot() ?? process.cwd();
    const findings = probeLanguage({
        repoRoot: repoRoot, language: language, ...(rest.length > 0 ? { directories: rest.map((d) => resolve(d)) } : {})
    });
    if (argv.includes("--json"))
    {
        process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
    }
    else
    {
        // One line per text, with how many times and one place it was found.
        const byText = new Map<string, ProbeFinding[]>();
        for (const f of findings) { byText.set(f.text, [...byText.get(f.text) ?? [], f]); }
        for (const [text, list] of [...byText].sort((a, b) => b[1].length - a[1].length))
        {
            process.stdout.write(`${String(list.length).padStart(4)}  ${JSON.stringify(text)}  (${list[0]!.character}: ` +
                `${list[0]!.path})\n`);
        }
        process.stdout.write(`${byText.size} English text(s) in the ${language} sheets\n`);
    }

    return findings.length === 0 ? 0 : 1;
}
