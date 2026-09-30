/** What the sheet tests share: the font files, the fixture characters composed with their packages, a PDF's text. */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parse } from "yaml";

import { compose } from "@byloth/dnd-platform-composer";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";
import { loadPackages } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

import type { SheetFonts, SheetInput } from "../src/index.js";

const require = createRequire(import.meta.url);
export const ROOT = resolve(import.meta.dirname, "..", "..", "..");
export const PRIVATE_MONK = join(ROOT, "content-private", "fixtures", "reference-monk");

const font = (file: string): Uint8Array => readFileSync(require.resolve(`@fontsource/${file}`));
export const FONTS: SheetFonts = {
    display: font("cinzel/files/cinzel-latin-700-normal.woff"),
    text: font("atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff"),
    textBold: font("atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff"),
    textItalic: font("atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-italic.woff"),
    hand: font("patrick-hand/files/patrick-hand-latin-400-normal.woff")
};

const TRANSLATIONS: Readonly<Record<string, string>> = {
    "packages/content/srd51": "packages/content/srd51-it",
    "content-private/phb14": "content-private/phb14-it",
    "fixtures/packages/homebrew-feline": "fixtures/packages/homebrew-feline-it"
};

/** A fixture character (by name, or a directory) composed as the site composes it, with its package set. */
export function composed(nameOrDir: string, language = "en"): SheetInput
{
    const dir = existsSync(nameOrDir) ? nameOrDir : join(ROOT, "fixtures", "characters", nameOrDir);
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
    const tree = compose(sheet, { character: character, packages: packages, language: language });

    return { language: language, tree: tree, character: character, packages: packages };
}

/** The text of every page, as the pieces a viewer extracts (one per string drawn). */
export async function pageTexts(bytes: Uint8Array): Promise<string[][]>
{
    const doc = await getDocument({ data: bytes.slice() }).promise;
    const pages: string[][] = [];
    for (let i = 1; i <= doc.numPages; i += 1)
    {
        const content = await (await doc.getPage(i)).getTextContent();
        pages.push(content.items.map((item) => ("str" in item ? item.str : "")).filter((s) => s.trim() !== ""));
    }

    return pages;
}
