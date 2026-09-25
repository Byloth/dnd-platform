/**
 * `dnd derive <character.yaml> [--json | --text] [--package <dir>]… [--explain <path>] [--language <code>]
 *              [--units imperial|metric] [--no-color] [--width <n>]`
 *
 * Computes the sheet of a character. `--text` (the default) prints the
 * readable sheet (render/text.ts); `--json` prints the canonical JSON, byte
 * for byte what a fixture's `snapshot.json` holds; `--explain` prints the
 * provenance of one value path instead.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import pc from "picocolors";
import { parse } from "yaml";

import { stableStringify } from "@byloth/dnd-platform-schema";
import { loadPackages } from "@byloth/dnd-platform-loader";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character } from "@byloth/dnd-platform-engine";

import { tryRepositoryRoot } from "../io/repository.js";
import { ResolveError, resolvePackages } from "../io/resolve-packages.js";
import { renderExplanation, renderSheet } from "../render/text.js";

function option(argv: readonly string[], name: string): string | undefined
{
    const index = argv.indexOf(name);
    if (index < 0) { return undefined; }
    const value = argv[index + 1];

    return (value === undefined || value.startsWith("--")) ? "" : value;
}

function optionValues(argv: readonly string[], name: string): string[]
{
    return argv.flatMap((arg, index) => (arg === name && argv[index + 1] !== undefined) ? [argv[index + 1]!] : []);
}

export function runDerive(argv: readonly string[]): number
{
    const valued = new Set(["--package", "--explain", "--language", "--units", "--width"]);
    const positional = argv.filter((arg, index) => !arg.startsWith("--") && !valued.has(argv[index - 1] ?? ""));
    const characterPath = positional[0];
    if (characterPath === undefined || positional.length > 1)
    {
        process.stderr.write("dnd derive: expected exactly one character.yaml\n");

        return 2;
    }
    for (const name of valued)
    {
        if (option(argv, name) === "")
        {
            process.stderr.write(`dnd derive: ${name} needs a value\n`);

            return 2;
        }
    }
    const json = argv.includes("--json");
    const explain = option(argv, "--explain");
    const language = option(argv, "--language");
    const unitsText = option(argv, "--units");
    if ((unitsText !== undefined) && (unitsText !== "imperial") && (unitsText !== "metric"))
    {
        process.stderr.write("dnd derive: --units must be imperial or metric\n");

        return 2;
    }
    const units = unitsText as "imperial" | "metric" | undefined;
    const widthText = option(argv, "--width");
    const width = widthText === undefined ? undefined : Number(widthText);
    if (width !== undefined && (!Number.isInteger(width) || width < 60))
    {
        process.stderr.write("dnd derive: --width must be an integer of at least 60\n");

        return 2;
    }
    // picocolors honours NO_COLOR, FORCE_COLOR and whether stdout is a terminal.
    const color = !argv.includes("--no-color") && !json && pc.isColorSupported;

    const repoRoot = tryRepositoryRoot();
    if (repoRoot === undefined)
    {
        process.stderr.write("dnd derive: not inside the repository; packages are resolved from packages/content and content-private\n");

        return 2;
    }
    const path = resolve(characterPath);
    if (!existsSync(path))
    {
        process.stderr.write(`dnd derive: ${characterPath} not found\n`);

        return 2;
    }

    let character: Character;
    try { character = parse(readFileSync(path, "utf8")) as Character; }
    catch (error)
    {
        process.stderr.write(`dnd derive: ${characterPath}: ${(error as Error).message}\n`);

        return 1;
    }
    let resolved;
    try
    {
        resolved = resolvePackages(path, character, {
            repoRoot: repoRoot,
            extra: optionValues(argv, "--package"),
            ...(language !== undefined ? { language: language } : {})
        });
    }
    catch (error)
    {
        const prefix = error instanceof ResolveError ? "" : "cannot read a package: ";
        process.stderr.write(`dnd derive: ${prefix}${(error as Error).message}\n`);

        return 1;
    }

    const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
    const set = loadPackages(resolved.sources, {
        pins: pins,
        ...(resolved.selection ? { selection: resolved.selection } : {}),
        ...(language !== undefined ? { language: language } : {})
    });
    if (!set.diagnostics.ok)
    {
        for (const d of set.diagnostics.entries.filter((e) => e.severity === "error"))
        {
            process.stderr.write(`${d.package ?? ""}${d.entity ? ` ${d.entity}` : ""}: ${d.code} ${d.message}\n`);
        }

        return 1;
    }
    const sheet = derive(character, set, language !== undefined ? { language: language } : {});
    const options = {
        character: character,
        packages: set,
        color: color,
        ...(language !== undefined ? { language: language } : {}),
        ...(units !== undefined ? { units: units } : {}),
        ...(width !== undefined ? { width: width } : {})
    };

    if (explain !== undefined)
    {
        process.stdout.write(renderExplanation(sheet, explain, options));

        return sheet.values[explain] === undefined ? 1 : 0;
    }
    process.stdout.write(json ? stableStringify(sheet) : renderSheet(sheet, options));

    return 0;
}
