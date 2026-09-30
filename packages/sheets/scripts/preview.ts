/**
 * The preview loop of the sheet templates: renders the reference characters and the blank sheet to PDF and PNG.
 *
 *   pnpm --filter @byloth/dnd-platform-sheets build && node packages/sheets/scripts/preview.ts <out dir> [hand…]
 *
 * The private reference Monk is included when content-private is present.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

import { parse } from "yaml";

import { compose } from "@byloth/dnd-platform-composer";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";
import { loadPackages } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import { renderSheet } from "../dist/index.js";
import type { Hand, PageSize, SheetFonts } from "../dist/index.js";
import { renderPngs } from "./render-png.ts";

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const font = (file: string): Uint8Array => readFileSync(require.resolve(file));
const HAND_FILES: Record<Hand, string> = {
    handwriting: "@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff",
    print: "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff"
};
function fonts(hand: Hand): SheetFonts
{
    return {
        display: font("@fontsource/cinzel/files/cinzel-latin-700-normal.woff"),
        text: font("@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff"),
        textBold: font("@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff"),
        hand: font(HAND_FILES[hand])
    };
}

const TRANSLATIONS: Record<string, string> = {
    "packages/content/srd51": "packages/content/srd51-it",
    "content-private/phb14": "content-private/phb14-it"
};

function composed(dir: string, language: string): { tree: ReturnType<typeof compose>, character: Character }
{
    const file = parse(readFileSync(join(dir, "packages.yaml"), "utf8")) as { packages: readonly string[] };
    const character = parse(readFileSync(join(dir, "character.yaml"), "utf8")) as Character;
    const dirs = [...file.packages];
    if (language !== "en")
    {
        for (const p of file.packages)
        {
            const translation = TRANSLATIONS[p];
            if (translation && existsSync(resolve(ROOT, translation))) { dirs.push(translation); }
        }
    }
    const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
    const packages = loadPackages(dirs.map((p) => readPackageSource(resolve(ROOT, p))), { pins: pins });
    const sheet = derive(character, packages, { language: language });

    return {
        tree: compose(sheet, { character: character,
            packages: packages,
            language: language,
            mode: "print",
            units: language === "it" ? "metric" : "imperial" }),
        character: character
    };
}

const out = resolve(process.argv[2] ?? "preview");
const hands = (process.argv.slice(3).length > 0 ? process.argv.slice(3) : ["handwriting"]) as Hand[];
mkdirSync(out, { recursive: true });

const jobs: { name: string, dir?: string, language: string, pageSize: PageSize }[] = [
    { name: "monk-en", dir: "fixtures/characters/monk-l3-base", language: "en", pageSize: "a4" },
    { name: "wizard-it", dir: "fixtures/characters/created-wizard", language: "it", pageSize: "a4" },
    { name: "cleric-en", dir: "fixtures/characters/cleric-l5", language: "en", pageSize: "a4" },
    { name: "multiclass-en-letter", dir: "fixtures/characters/multiclass-caster", language: "en", pageSize: "letter" },
    { name: "blank-en-letter", language: "en", pageSize: "letter" },
    { name: "blank-it", language: "it", pageSize: "a4" }
];
if (existsSync(resolve(ROOT, "content-private/fixtures/reference-monk")))
{
    jobs.push({ name: "reference-monk-it", dir: "content-private/fixtures/reference-monk", language: "it", pageSize: "a4" });
}

const pdfs: string[] = [];
for (const hand of hands)
{
    for (const job of jobs)
    {
        const input = job.dir ?
            { language: job.language, ...composed(resolve(ROOT, job.dir), job.language) } :
            { language: job.language };
        const sheet = await renderSheet(input, { fonts: fonts(hand), hand: hand, pageSize: job.pageSize });
        const file = join(out, `${job.name}-${hand}.pdf`);
        writeFileSync(file, sheet.bytes);
        pdfs.push(file);
    }
}
for (const png of await renderPngs(pdfs, Number(process.env.PREVIEW_SCALE ?? 2))) { console.log(png); }
