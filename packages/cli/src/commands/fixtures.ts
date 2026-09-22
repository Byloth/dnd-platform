/**
 * `dnd fixtures [dirs…] [--update] [--filter <name>] [--json]`
 *
 * Golden fixtures (docs/phase-0/04-testing-strategy.md): every
 * `<dir>/<name>/` with a `character.yaml` is loaded with the packages listed
 * in its `packages.yaml`, derived, compared with the hand-written
 * `expected.yaml` and with `snapshot.json` (canonical JSON of the whole
 * sheet). A fixture whose packages are missing is skipped, never failed.
 * A fixture directory holding `session.yaml` is a session fixture instead
 * (commands/sessions.ts): its events go through `apply`, step by step.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";

import { derive, loadPackages, stableStringify } from "@byloth/dnd-platform-engine";
import type { Character, ComputedSheet, Selection, SpellView } from "@byloth/dnd-platform-engine";

import { PRIVATE_ROOT, findRepositoryRoot } from "../io/repository.js";
import { toPackageSource } from "../io/to-package-source.js";
import { computeCoverage, writeCoverageReport } from "./coverage.js";
import { runSession } from "./sessions.js";

export { findRepositoryRoot };

/** Fixture roots scanned by default (golden characters and sessions); the private ones are absent in CI. */
export const DEFAULT_FIXTURE_DIRS: readonly string[] = [
    "fixtures/characters",
    "fixtures/sessions",
    `${PRIVATE_ROOT}/fixtures`,
    `${PRIVATE_ROOT}/fixtures/sessions`
];

export type FixtureStatus = "pass" | "fail" | "skip" | "updated";

export interface FixtureReport
{
    readonly name: string;
    readonly directory: string;
    readonly status: FixtureStatus;
    /** Failure lines, or the single skip reason. */
    readonly details: readonly string[];
}

export interface FixturesOptions
{
    readonly dirs?: readonly string[];
    readonly update?: boolean;
    readonly filter?: string;
    readonly root?: string;
}

interface PackagesFile
{
    readonly packages: readonly string[];
    readonly requires?: readonly string[];
    /** Content selection applied at load (DEC-20), as a campaign would. */
    readonly selection?: Selection;
}

interface ExpectedResource
{
    readonly max: number | string;
    readonly recharge?: readonly string[];
}
interface ExpectedAction
{
    readonly activation: string;
    readonly cost?: Readonly<Record<string, number>>;
}
interface ExpectedSpellcasting
{
    readonly dc?: number;
    readonly attackBonus?: number;
    readonly slots?: Readonly<Record<string, number>>;
    readonly cantripsKnown?: number;
    readonly spellsKnown?: number;
}
interface ExpectedAttack
{
    readonly toHit?: number;
    readonly damage?: string;
    readonly type?: string;
}
interface Expected
{
    readonly values?: Readonly<Record<string, number | string>>;
    /** Attack row id → to-hit bonus, printable damage, damage type. */
    readonly attacks?: Readonly<Record<string, ExpectedAttack>>;
    /** Feature ids that must be active. */
    readonly features?: readonly string[];
    /** Choice key → `answered` or `unanswered`. */
    readonly choices?: Readonly<Record<string, "answered" | "unanswered">>;
    /** Class id → expected spellcasting numbers. */
    readonly spellcasting?: Readonly<Record<string, ExpectedSpellcasting>>;
    /** Spell id → how it is paid: `free`, `slot`, `<resource>:<amount>` or `uses:<n>`. */
    readonly spells?: Readonly<Record<string, string>>;
    readonly provenance?: Readonly<Record<string, readonly string[]>>;
    readonly resources?: Readonly<Record<string, ExpectedResource>>;
    readonly actions?: Readonly<Record<string, ExpectedAction>>;
    readonly proficiencies?: readonly string[];
    readonly sections?: { readonly active?: readonly string[], readonly inactive?: readonly string[] };
    readonly warnings?: readonly string[];
}

function readYaml<T>(path: string): T
{
    return parse(readFileSync(path, "utf8")) as T;
}

function show(value: unknown): string
{
    return JSON.stringify(value);
}

function compareExpected(sheet: ComputedSheet, expected: Expected, name: string): string[]
{
    const failures: string[] = [];
    const fail = (what: string, wanted: unknown, got: unknown): void =>
    {
        failures.push(`${name}: ${what} expected ${show(wanted)} got ${show(got)}`);
    };

    for (const [path, wanted] of Object.entries(expected.values ?? {}))
    {
        const got = sheet.values[path]?.value;
        if (got !== wanted) { fail(`values.${path}`, wanted, got); }
    }
    for (const [path, wanted] of Object.entries(expected.provenance ?? {}))
    {
        const got = (sheet.values[path]?.provenance ?? [])
            .filter((c) => c.applied)
            .map((c) => c.label["en"] ?? Object.values(c.label)[0] ?? "");
        if (show(got) !== show(wanted)) { fail(`provenance.${path}`, wanted, got); }
    }
    for (const [id, wanted] of Object.entries(expected.resources ?? {}))
    {
        const resource = sheet.resources.find((r) => r.id === id);
        if (resource === undefined)
        {
            fail(`resources.${id}`, wanted, undefined);

            continue;
        }
        if (resource.max.value !== wanted.max) { fail(`resources.${id}.max`, wanted.max, resource.max.value); }
        if (wanted.recharge !== undefined)
        {
            const got = resource.recharge.map((r) => r.on);
            if (show(got) !== show(wanted.recharge)) { fail(`resources.${id}.recharge`, wanted.recharge, got); }
        }
    }
    for (const [id, wanted] of Object.entries(expected.actions ?? {}))
    {
        const action = sheet.actions.find((a) => a.id === id);
        if (action === undefined)
        {
            fail(`actions.${id}`, wanted, undefined);

            continue;
        }
        if (action.activation !== wanted.activation) { fail(`actions.${id}.activation`, wanted.activation, action.activation); }
        if (wanted.cost !== undefined)
        {
            const got: Record<string, number> = {};
            for (const cost of action.cost)
            {
                if ("amount" in cost) { got[cost.resource] = cost.amount; }
                else { got[cost.resource] = cost.level; }
            }
            if (show(got) !== show(wanted.cost)) { fail(`actions.${id}.cost`, wanted.cost, got); }
        }
    }
    for (const [classId, wanted] of Object.entries(expected.spellcasting ?? {}))
    {
        const got = sheet.spellcasting.find((c) => c.class === classId);
        if (got === undefined)
        {
            fail(`spellcasting.${classId}`, "present", sheet.spellcasting.map((c) => c.class));

            continue;
        }
        if ((wanted.dc !== undefined) && (got.dc.value !== wanted.dc)) { fail(`spellcasting.${classId}.dc`, wanted.dc, got.dc.value); }
        if ((wanted.attackBonus !== undefined) && (got.attackBonus.value !== wanted.attackBonus))
        {
            fail(`spellcasting.${classId}.attackBonus`, wanted.attackBonus, got.attackBonus.value);
        }
        for (const [level, max] of Object.entries(wanted.slots ?? {}))
        {
            const slot = got.slots.find((x) => x.level === Number(level));
            if ((slot?.max ?? 0) !== max) { fail(`spellcasting.${classId}.slots.${level}`, max, slot?.max ?? 0); }
        }
        if ((wanted.cantripsKnown !== undefined) && (got.cantripsKnown !== wanted.cantripsKnown))
        {
            fail(`spellcasting.${classId}.cantripsKnown`, wanted.cantripsKnown, got.cantripsKnown);
        }
        if ((wanted.spellsKnown !== undefined) && (got.spellsKnown !== wanted.spellsKnown))
        {
            fail(`spellcasting.${classId}.spellsKnown`, wanted.spellsKnown, got.spellsKnown);
        }
    }
    const payment = (p: SpellView["paidWith"]): string => "free" in p ? "free" : "slot" in p ? "slot" : "uses" in p ? `uses:${p.uses}` : `${p.resource}:${p.amount}`;
    for (const [spellId, wanted] of Object.entries(expected.spells ?? {}))
    {
        const got = sheet.spells.find((x) => x.id === spellId);
        if (got === undefined) { fail(`spells.${spellId}`, wanted, "absent"); }
        else if (payment(got.paidWith) !== wanted) { fail(`spells.${spellId}`, wanted, payment(got.paidWith)); }
    }
    for (const [id, wanted] of Object.entries(expected.attacks ?? {}))
    {
        const got = sheet.attacks.find((a) => a.id === id);
        if (got === undefined)
        {
            fail(`attacks.${id}`, "present", sheet.attacks.map((a) => a.id));

            continue;
        }
        if ((wanted.toHit !== undefined) && (got.attackBonus.value !== wanted.toHit)) { fail(`attacks.${id}.toHit`, wanted.toHit, got.attackBonus.value); }
        if ((wanted.damage !== undefined) && (got.damage !== wanted.damage)) { fail(`attacks.${id}.damage`, wanted.damage, got.damage); }
        if ((wanted.type !== undefined) && (got.damageType !== wanted.type)) { fail(`attacks.${id}.type`, wanted.type, got.damageType); }
    }
    const activeFeatures = new Set(sheet.features.map((x) => x.id));
    for (const wanted of expected.features ?? [])
    {
        if (!activeFeatures.has(wanted)) { fail("features", wanted, "absent"); }
    }
    for (const [key, wanted] of Object.entries(expected.choices ?? {}))
    {
        const got = sheet.choices.find((c) => c.key === key);
        const state = got === undefined ? "absent" : got.answered ? "answered" : "unanswered";
        if (state !== wanted) { fail(`choices.${key}`, wanted, state); }
    }
    const held = new Set(sheet.proficiencies.map((p) => `${p.type}:${p.item}`));
    for (const wanted of expected.proficiencies ?? [])
    {
        if (!held.has(wanted)) { fail("proficiencies", wanted, [...held].sort()); }
    }
    const sections = new Set(sheet.sections);
    for (const wanted of expected.sections?.active ?? [])
    {
        if (!sections.has(wanted)) { fail("sections.active", wanted, sheet.sections); }
    }
    for (const unwanted of expected.sections?.inactive ?? [])
    {
        if (sections.has(unwanted)) { fail("sections.inactive", unwanted, sheet.sections); }
    }
    const codes = new Set(sheet.warnings.map((w) => w.code));
    for (const wanted of expected.warnings ?? [])
    {
        if (!codes.has(wanted)) { fail("warnings", wanted, [...codes].sort()); }
    }

    return failures;
}

function runOne(root: string, directory: string, name: string, update: boolean): FixtureReport
{
    const packagesFile = readYaml<PackagesFile>(join(directory, "packages.yaml"));
    const missing = packagesFile.packages.filter((path) => !existsSync(resolve(root, path)));
    if (missing.length > 0)
    {
        return { name: name, directory: directory, status: "skip", details: [`missing package directories: ${missing.join(", ")}`] };
    }

    const sources = packagesFile.packages.map((path) => toPackageSource(resolve(root, path)));
    const loadedIds = new Set(sources.map((s) => s.manifest.id));
    const missingIds = (packagesFile.requires ?? []).filter((id) => !loadedIds.has(id));
    if (missingIds.length > 0)
    {
        return { name: name, directory: directory, status: "skip", details: [`missing packages: ${missingIds.join(", ")}`] };
    }

    const character = readYaml<Character>(join(directory, "character.yaml"));
    const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
    const selection = packagesFile.selection;
    const set = loadPackages(sources, { pins: pins, ...(selection !== undefined ? { selection: selection } : {}) });
    const sheet = derive(character, set);

    const expectedPath = join(directory, "expected.yaml");
    const failures = existsSync(expectedPath) ? compareExpected(sheet, readYaml<Expected>(expectedPath), name) : [];
    if ((failures.length > 0) && !set.cascade.empty)
    {
        for (const entry of set.cascade.inactive)
        {
            const via = entry.via === undefined ? "excluded" : `${entry.via.kind} via ${entry.via.requires}${entry.via.path}`;
            failures.push(`${name}: cascade: ${entry.id} inactive (${via})`);
        }
        for (const p of set.cascade.pruned) { failures.push(`${name}: cascade: ${p.from}${p.path} pruned (${p.ref})`); }
    }

    const canonical = `${stableStringify(sheet)}\n`;
    const snapshotPath = join(directory, "snapshot.json");
    let updated = false;
    if (update)
    {
        if (!existsSync(snapshotPath) || readFileSync(snapshotPath, "utf8") !== canonical)
        {
            writeFileSync(snapshotPath, canonical);
            updated = true;
        }
    }
    else if (!existsSync(snapshotPath))
    {
        failures.push(`${name}: snapshot.json missing (run with --update after reviewing the sheet)`);
    }
    else if (readFileSync(snapshotPath, "utf8") !== canonical)
    {
        failures.push(`${name}: snapshot.json differs from the derived sheet (review, then --update)`);
    }

    if (failures.length > 0) { return { name: name, directory: directory, status: "fail", details: failures }; }

    return { name: name, directory: directory, status: updated ? "updated" : "pass", details: [] };
}

/** Run every fixture under the given directories (default `DEFAULT_FIXTURE_DIRS`; a missing directory is skipped). */
export function runFixtures(options: FixturesOptions = {}): FixtureReport[]
{
    const root = options.root ?? findRepositoryRoot();
    const dirs = (options.dirs?.length ? options.dirs : DEFAULT_FIXTURE_DIRS).map((d) => resolve(root, d));
    const reports: FixtureReport[] = [];

    for (const dir of dirs)
    {
        if (!existsSync(dir)) { continue; }
        for (const name of readdirSync(dir).sort())
        {
            const directory = join(dir, name);
            if (!statSync(directory).isDirectory() || !existsSync(join(directory, "character.yaml"))) { continue; }
            if (options.filter !== undefined && !name.includes(options.filter)) { continue; }

            try
            {
                const session = existsSync(join(directory, "session.yaml"));
                reports.push(session ?
                    runSession(root, directory, name) :
                    runOne(root, directory, name, options.update === true));
            }
            catch (error)
            {
                reports.push({ name: name, directory: directory, status: "fail", details: [`${name}: ${(error as Error).message}`] });
            }
        }
    }

    return reports;
}

export function runFixturesCommand(argv: readonly string[]): number
{
    if (argv.includes("--coverage"))
    {
        const root = findRepositoryRoot();
        const report = computeCoverage(root, resolve(root, "fixtures/characters"), resolve(root, "packages/content/srd51"));
        writeCoverageReport(report, resolve(root, "fixtures/coverage.md"));
        for (const [type, b] of Object.entries(report.byType))
        {
            const shortIds = b.missing.map((id) => id.split(".")
                .slice(2)
                .join("."));
            const missing = (b.missing.length && b.total <= 60) ? ` (missing: ${shortIds.join(", ")})` : "";
            process.stdout.write(`${type}: ${b.covered}/${b.total}${missing}\n`);
        }
        process.stdout.write(report.ok ? "coverage OK for gated types\n" : "coverage below 100 % for a gated type\n");

        return report.ok ? 0 : 1;
    }
    const json = argv.includes("--json");
    const update = argv.includes("--update");
    const filterIndex = argv.indexOf("--filter");
    const filter = filterIndex >= 0 ? argv[filterIndex + 1] : undefined;
    const dirs = argv.filter((arg, index) => !arg.startsWith("--") && index !== filterIndex + 1);

    const reports = runFixtures({ dirs: dirs, update: update, ...(filter !== undefined ? { filter: filter } : {}) });
    const failed = reports.filter((r) => r.status === "fail").length;

    if (json)
    {
        process.stdout.write(`${JSON.stringify({ ok: failed === 0, fixtures: reports }, null, 2)}\n`);
    }
    else
    {
        if (dirs.length === 0)
        {
            const privateDir = `${PRIVATE_ROOT}/fixtures`;
            if (!existsSync(resolve(findRepositoryRoot(), privateDir)))
            {
                process.stdout.write(`${privateDir}: absent, private fixtures skipped\n`);
            }
        }
        for (const report of reports)
        {
            const label = report.status.toUpperCase().padEnd(7);
            process.stdout.write(`${label} ${report.name}${report.status === "skip" ? ` (${report.details[0]})` : ""}\n`);
            if (report.status === "fail")
            {
                for (const line of report.details) { process.stdout.write(`        ${line}\n`); }
            }
        }
        const counts = (["pass", "fail", "skip", "updated"] as const)
            .map((s) => `${reports.filter((r) => r.status === s).length} ${s}`)
            .join(", ");
        process.stdout.write(`${reports.length} fixture(s): ${counts}\n`);
    }

    return failed === 0 ? 0 : 1;
}
