/**
 * Overlay: hand-authored (or agent-drafted, human-reviewed) mechanics that
 * the map stage merges onto the entities it generates from upstream data.
 * One file per entity id under tools/import/overlay/<entity-id>.yaml;
 * objects merge recursively, arrays and scalars are replaced, `null` deletes.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse, stringify } from "yaml";

import { IMPORT_DIR } from "./lib.ts";

export const OVERLAY_DIR = resolve(IMPORT_DIR, "overlay");

export function readOverlays(): Map<string, Record<string, unknown>>
{
    const overlays = new Map<string, Record<string, unknown>>();
    if (!existsSync(OVERLAY_DIR)) { return overlays; }
    for (const file of readdirSync(OVERLAY_DIR).sort())
    {
        if (!file.endsWith(".yaml")) { continue; }
        const data = parse(readFileSync(resolve(OVERLAY_DIR, file), "utf8")) as Record<string, unknown> | null;
        if (data) { overlays.set(file.replace(/\.yaml$/, ""), data); }
    }

    return overlays;
}

export function writeOverlay(id: string, data: Record<string, unknown>): void
{
    mkdirSync(OVERLAY_DIR, { recursive: true });
    writeFileSync(resolve(OVERLAY_DIR, `${id}.yaml`), stringify(data, { lineWidth: 0, blockQuote: "literal" }));
}

function isObject(value: unknown): value is Record<string, unknown>
{
    return (value !== null) && (typeof value === "object") && !Array.isArray(value);
}

export function deepMerge(base: Record<string, unknown>, overlay: Record<string, unknown>): Record<string, unknown>
{
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(overlay))
    {
        const current = out[key];
        if (value === null) { out[key] = undefined; }
        else if (isObject(value) && isObject(current)) { out[key] = deepMerge(current, value); }
        else { out[key] = value; }
    }

    return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

/** Apply overlays to an entity and to every nested object carrying an `id` (inline features, subspecies, options). */
export function applyOverlays(
    entity: Record<string, unknown>,
    overlays: Map<string, Record<string, unknown>>,
    used: Set<string>
): Record<string, unknown>
{
    const visit = (node: unknown): unknown =>
    {
        if (Array.isArray(node)) { return node.map(visit); }
        if (!isObject(node)) { return node; }
        let current: Record<string, unknown> = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, visit(v)]));
        const id = current["id"];
        if ((typeof id === "string") && overlays.has(id))
        {
            current = deepMerge(current, overlays.get(id)!);
            used.add(id);
        }

        return current;
    };

    return visit(entity) as Record<string, unknown>;
}
