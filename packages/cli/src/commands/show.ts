/**
 * `dnd show <entity-id> [--package <dir>]… [--language <code>] [--units imperial|metric]`
 *
 * Prints one entity for review, as the composer writes it: a creature's stat block (DEC-24), or a spell, an item or
 * a condition as the compendium shows it (docs/phase-1/13-compendium.md). The Italian with `--language it`,
 * distances and weights in metric units with `--units metric`. The entity's package and its
 * dependencies are found among packages/content and content-private, plus the translations of the language.
 */

import { resolve } from "node:path";

import { loadPackages } from "@byloth/dnd-platform-loader";
import { readPackageSource } from "@byloth/dnd-platform-loader/node";
import type { PackageSource } from "@byloth/dnd-platform-loader";
import { composeCreature, composeEntry } from "@byloth/dnd-platform-composer";
import type { EntryView, StatBlock } from "@byloth/dnd-platform-composer";

import { discoverPackages, tryRepositoryRoot } from "../io/repository.js";
import { withTranslations } from "../io/resolve-packages.js";

function option(argv: readonly string[], name: string): string | undefined
{
    const index = argv.indexOf(name);

    return index < 0 ? undefined : argv[index + 1] ?? "";
}

export function renderStatBlock(block: StatBlock): string
{
    const lines = [block.name, block.header, ""];
    if (block.text) { lines.push(block.text, ""); }
    for (const line of block.core) { lines.push(`${line.label} ${line.value}`); }
    lines.push("");
    lines.push(block.abilities.map((a) => a.label.padEnd(9)).join(""));
    lines.push(block.abilities.map((a) => `${a.score} (${a.modifier})`.padEnd(9)).join("")
        .trimEnd());
    lines.push("");
    for (const line of block.details) { lines.push(`${line.label} ${line.value}`); }
    for (const section of block.sections)
    {
        lines.push("");
        if (section.title) { lines.push(section.title); }
        if (section.intro) { lines.push(section.intro, ""); }
        for (const entry of section.entries) { lines.push(`${entry.name}. ${entry.text}`); }
    }

    return `${lines.join("\n")}\n`;
}

export function renderEntry(view: EntryView): string
{
    const lines = [view.name, view.subtitle, ""];
    for (const line of view.lines) { lines.push(`${line.label}: ${line.value}`); }
    if (view.lines.length) { lines.push(""); }
    if (view.text) { lines.push(view.text, ""); }
    for (const section of view.sections) { lines.push(section.title, section.text, ""); }

    return `${lines.join("\n").trimEnd()}\n`;
}

export function runShow(argv: readonly string[]): number
{
    const valued = new Set(["--package", "--language", "--units"]);
    const positional = argv.filter((arg, index) => !arg.startsWith("--") && !valued.has(argv[index - 1] ?? ""));
    const id = positional[0];
    if ((id === undefined) || (positional.length > 1))
    {
        process.stderr.write("dnd show: expected exactly one entity id\n");

        return 2;
    }
    const language = option(argv, "--language");
    const units = option(argv, "--units");
    if ((units !== undefined) && (units !== "imperial") && (units !== "metric"))
    {
        process.stderr.write("dnd show: --units must be imperial or metric\n");

        return 2;
    }
    const repoRoot = tryRepositoryRoot();
    if (repoRoot === undefined)
    {
        process.stderr.write("dnd show: not inside the repository\n");

        return 2;
    }

    const extra = argv.flatMap((arg, index) => (arg === "--package" && argv[index + 1] ? [argv[index + 1]!] : []));
    const byId = new Map<string, { directory: string, source: PackageSource }>();
    for (const directory of [...discoverPackages(repoRoot).map((p) => p.directory), ...extra.map((d) => resolve(d))])
    {
        const source = readPackageSource(directory);
        byId.set(source.manifest.id, { directory: directory, source: source });
    }
    const wanted: string[] = [];
    const visit = (packageId: string): void =>
    {
        if (wanted.includes(packageId)) { return; }
        const found = byId.get(packageId);
        if (!found) { return; }
        wanted.push(packageId);
        found.source.manifest.dependencies.forEach((d) => visit(d.id));
    };
    const owner = [...byId.keys()].filter((p) => id.startsWith(`${p}.`))
        .sort((a, b) => b.length - a.length)[0];
    if (owner === undefined)
    {
        process.stderr.write(`dnd show: no package found for ${id}\n`);

        return 1;
    }
    visit(owner);
    const resolved = withTranslations({
        sources: wanted.map((p) => byId.get(p)!.source),
        directories: wanted.map((p) => byId.get(p)!.directory)

    }, { repoRoot: repoRoot, extra: extra, ...(language ? { language: language } : {}) });
    const set = loadPackages(resolved.sources, language ? { language: language } : {});
    if (!set.diagnostics.ok)
    {
        for (const d of set.diagnostics.entries.filter((e) => e.severity === "error"))
        {
            process.stderr.write(`${d.package ?? ""}${d.entity ? ` ${d.entity}` : ""}: ${d.code} ${d.message}\n`);
        }

        return 1;
    }
    const options = {
        packages: set,
        ...(language ? { language: language } : {}),
        ...(units ? { units: units as "imperial" | "metric" } : {})
    };
    const block = composeCreature(id, options);
    if (block !== undefined)
    {
        process.stdout.write(renderStatBlock(block));

        return 0;
    }
    const entry = composeEntry(id, options);
    if (entry === undefined)
    {
        process.stderr.write(`dnd show: ${id} is not a loaded creature, spell, item or condition\n`);

        return 1;
    }
    process.stdout.write(renderEntry(entry));

    return 0;
}
