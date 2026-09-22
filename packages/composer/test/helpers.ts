/** Disk reader for fixture packages, mirroring packages/cli/src/io (the composer itself does no I/O). */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

import { parse } from "yaml";

import { ENTITY_TYPE_FOR_DIRECTORY } from "@byloth/dnd-platform-schema";
import type { EntityType, PackageManifest, Ruleset } from "@byloth/dnd-platform-schema";
import type { PackageSource, SourceEntity } from "@byloth/dnd-platform-engine";

function* walk(dir: string): Generator<string>
{
    for (const entry of readdirSync(dir).sort())
    {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) { yield* walk(path); }
        else if (/\.ya?ml$/.test(entry)) { yield path; }
    }
}

const readYaml = (path: string): unknown => parse(readFileSync(path, "utf8")) as unknown;

export function readPackage(dir: string): PackageSource
{
    const manifest = readYaml(join(dir, "package.yaml")) as PackageManifest;
    const rulesetPath = join(dir, "ruleset.yaml");
    const entities: SourceEntity[] = [];
    for (const directory of readdirSync(dir).sort())
    {
        const path = join(dir, directory);
        if (!statSync(path).isDirectory()) { continue; }
        if (directory === "translations")
        {
            for (const file of walk(path))
            {
                const [language] = relative(path, file).split("/");
                const id = basename(file).replace(/\.ya?ml$/, "");
                const data = { language: language, strings: readYaml(file) };
                entities.push({ type: "translation", id: id, data: data, file: relative(dir, file) });
            }

            continue;
        }
        const type = (ENTITY_TYPE_FOR_DIRECTORY as Record<string, EntityType | undefined>)[directory];
        if (type === undefined) { continue; }
        for (const file of walk(path))
        {
            const data = readYaml(file) as { id: string };
            entities.push({ type: type, id: data.id, data: data, file: relative(dir, file) });
        }
    }

    const ruleset = existsSync(rulesetPath) ? { ruleset: readYaml(rulesetPath) as Ruleset } : {};

    return { manifest: manifest, ...ruleset, entities: entities };
}
