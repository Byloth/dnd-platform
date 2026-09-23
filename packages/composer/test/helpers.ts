/** Fixture packages read from disk by the loader, as the CLI reads them (the composer itself does no I/O). */

import type { PackageSource } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";

export const readPackage = (dir: string): PackageSource => readPackageSource(dir);

// ---- fixture characters ----------------------------------------------------------

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";

import { loadPackages } from "@byloth/dnd-platform-loader";
import type { PackageSet } from "@byloth/dnd-platform-loader";
import { derive } from "@byloth/dnd-platform-engine";
import type { Character, ComputedSheet } from "@byloth/dnd-platform-engine";

export const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const CHARACTERS = resolve(ROOT, "fixtures", "characters");

/** A fixture character derived with its packages, as `dnd fixtures` does. */
export function fixture(name: string): { character: Character, packages: PackageSet, sheet: ComputedSheet }
{
    const dir = join(CHARACTERS, name);
    const file = parse(readFileSync(join(dir, "packages.yaml"), "utf8")) as { packages: readonly string[] };
    const character = parse(readFileSync(join(dir, "character.yaml"), "utf8")) as Character;
    const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
    const packages = loadPackages(file.packages.map((p) => readPackage(resolve(ROOT, p))), { pins: pins });

    return { character: character, packages: packages, sheet: derive(character, packages) };
}
