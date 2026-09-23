/**
 * Session fixtures (docs/phase-0/04-testing-strategy.md, level 5): a
 * fixture directory holding `session.yaml` next to `character.yaml` and
 * `packages.yaml`. The character is derived once, then every step's event
 * goes through `apply`; the expected slice of the state, the warning codes,
 * the rejection and re-derived values are checked after each step. At the
 * end every entry is undone in reverse order and the state must be back to
 * the initial one.
 *
 *   steps:
 *     - event: { type: use-action, action: flurry-of-blows }
 *       expect: { resources: { ki: 2 }, turn: { used: [action, bonus-action] } }
 *     - event: { type: spend-resource, resource: ki, amount: 9 }
 *       expect: { rejected: true, warnings: [W_INSUFFICIENT_RESOURCE] }
 *     - event: { type: toggle, state: patient-defense, on: true }
 *       expect: { values: { ac: 17 } }
 *
 * `expect` matches the state partially: an object matches when every key it
 * lists matches, an array must be equal as a whole.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parse } from "yaml";

import { stableStringify } from "@byloth/dnd-platform-schema";
import { loadPackages } from "@byloth/dnd-platform-loader";
import { apply, derive, undo } from "@byloth/dnd-platform-engine";
import type { Selection } from "@byloth/dnd-platform-loader";
import type { Character, CharacterState, ComputedSheet, LogEntry, PlayEvent } from "@byloth/dnd-platform-engine";

import { readPackageSource } from "@byloth/dnd-platform-loader/node";

export interface SessionReport
{
    readonly name: string;
    readonly directory: string;
    readonly status: "pass" | "fail" | "skip";
    readonly details: readonly string[];
}

interface PackagesFile
{
    readonly packages: readonly string[];
    readonly requires?: readonly string[];
    readonly selection?: Selection;
}

type Expected = Partial<CharacterState> & {
    readonly warnings?: readonly string[];
    readonly rejected?: boolean;
    readonly values?: Readonly<Record<string, number | string>>;
};
interface Step
{
    readonly event: PlayEvent;
    readonly expect?: Expected;
}
interface SessionFile { readonly steps: readonly Step[] }

function readYaml<T>(path: string): T
{
    return parse(readFileSync(path, "utf8")) as T;
}

const show = (value: unknown): string => JSON.stringify(value);

/** Partial deep match: objects by the keys of `wanted`, arrays and scalars as a whole. */
function matches(wanted: unknown, got: unknown): boolean
{
    if (Array.isArray(wanted) || (typeof wanted !== "object") || (wanted === null))
    {
        return stableStringify(wanted) === stableStringify(got);
    }
    if ((typeof got !== "object") || (got === null)) { return false; }

    return Object.entries(wanted).every(([key, value]) => matches(value, (got as Record<string, unknown>)[key]));
}

function checkStep(
    index: number,
    step: Step,
    sheet: ComputedSheet,
    character: Character,
    set: Parameters<typeof derive>[1],
    state: CharacterState,
    entry: LogEntry,
    codes: readonly string[]
): string[]
{
    const failures: string[] = [];
    const at = `step ${index + 1} (${step.event.type})`;
    const { warnings, rejected, values, ...slice } = step.expect ?? {};

    for (const [key, wanted] of Object.entries(slice))
    {
        const got = (state as Record<string, unknown>)[key];
        if (!matches(wanted, got)) { failures.push(`${at}: ${key} expected ${show(wanted)} got ${show(got)}`); }
    }
    for (const code of warnings ?? [])
    {
        if (!codes.includes(code)) { failures.push(`${at}: warning ${code} expected, got ${show(codes)}`); }
    }
    if (rejected === true)
    {
        if (Object.keys(entry.after).length > 0) { failures.push(`${at}: expected a rejection, the state changed`); }
        if (codes.length === 0) { failures.push(`${at}: expected a rejection warning`); }
    }
    if (values !== undefined)
    {
        const again = derive({ ...character, state: state }, set);
        for (const [path, wanted] of Object.entries(values))
        {
            const got = again.values[path]?.value;
            if (got !== wanted) { failures.push(`${at}: values.${path} expected ${show(wanted)} got ${show(got)}`); }
        }
    }

    return failures;
}

export function runSession(root: string, directory: string, name: string): SessionReport
{
    const packagesFile = readYaml<PackagesFile>(join(directory, "packages.yaml"));
    const missing = packagesFile.packages.filter((path) => !existsSync(resolve(root, path)));
    if (missing.length > 0)
    {
        return { name: name, directory: directory, status: "skip", details: [`missing package directories: ${missing.join(", ")}`] };
    }
    const sources = packagesFile.packages.map((path) => readPackageSource(resolve(root, path)));
    const loadedIds = new Set(sources.map((s) => s.manifest.id));
    const missingIds = (packagesFile.requires ?? []).filter((id) => !loadedIds.has(id));
    if (missingIds.length > 0)
    {
        return { name: name, directory: directory, status: "skip", details: [`missing packages: ${missingIds.join(", ")}`] };
    }

    const character = readYaml<Character>(join(directory, "character.yaml"));
    const session = readYaml<SessionFile>(join(directory, "session.yaml"));
    const pins = Object.fromEntries(character.packages.map((p) => [p.id, p.version]));
    const selection = packagesFile.selection;
    const set = loadPackages(sources, { pins: pins, ...(selection !== undefined ? { selection: selection } : {}) });
    const sheet = derive(character, set);

    const failures: string[] = [];
    const log: LogEntry[] = [];
    let state = character.state;
    session.steps.forEach((step, index) =>
    {
        const result = apply(sheet, state, step.event, { id: `step-${index + 1}` });
        const codes = result.warnings.map((w) => w.code);
        failures.push(...checkStep(index, step, sheet, character, set, result.state, result.entry, codes));
        log.push(result.entry);
        state = result.state;
    });

    for (const entry of [...log].reverse()) { state = undo(state, entry); }
    if (stableStringify(state) !== stableStringify(character.state))
    {
        failures.push(`undo of every step does not restore the initial state: got ${show(state)}`);
    }

    return failures.length > 0 ?
        { name: name, directory: directory, status: "fail", details: failures.map((f) => `${name}: ${f}`) } :
        { name: name, directory: directory, status: "pass", details: [] };
}
