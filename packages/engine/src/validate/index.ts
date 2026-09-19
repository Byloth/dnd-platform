/**
 * `validate`: referential integrity of a loaded package set on top of the
 * loading diagnostics. Schema conformance is the CLI's job (`dnd validate`).
 */

import type { Diagnostic, Diagnostics, PackageSet } from "../index.js";

const ENTITY_TYPES = [
    "class", "subclass", "species", "background", "feat", "feature", "spell", "spell-list", "item", "condition", "rule",
    "table", "archetype"
];
const SEGMENT = "[a-z0-9]+(?:[-.][a-z0-9]+)*";
const ENTITY_ID = new RegExp(`^${SEGMENT}\\.(?:${ENTITY_TYPES.join("|")})\\.${SEGMENT}$`);
const TABLE_REF = /table\(([a-z0-9]+(?:[-.][a-z0-9]+)*)\)/g;
/** Keys whose string values are never entity references. */
const SKIP_KEYS = new Set(["id", "en", "it", "action", "resource", "state", "choice", "section", "toggle"]);

function references(node: unknown, path: string, out: { path: string, ref: string }[]): void
{
    if (typeof node === "string")
    {
        if (ENTITY_ID.test(node)) { out.push({ path: path, ref: node }); }
        for (const match of node.matchAll(TABLE_REF))
        {
            const ref = match[1]!;
            if (ENTITY_ID.test(ref)) { out.push({ path: path, ref: ref }); }
        }

        return;
    }
    if (Array.isArray(node))
    {
        node.forEach((item, index) => references(item, `${path}/${index}`, out));

        return;
    }
    if ((node !== null) && (typeof node === "object"))
    {
        const record = node as Record<string, unknown>;
        // A `modify` effect's target is a value path (attack.spell.bonus), not an entity id; a patch's target is.
        const valuePathTarget = record["kind"] === "modify";
        for (const [key, value] of Object.entries(record))
        {
            if (SKIP_KEYS.has(key) && (typeof value === "string")) { continue; }
            if (valuePathTarget && (key === "target")) { continue; }
            references(value, `${path}/${key}`, out);
        }
    }
}

export function validate(set: PackageSet): Diagnostics
{
    const out: Diagnostic[] = [...set.diagnostics.entries];
    const seen = new Set<string>();
    const check = (owner: string, pkg: string, data: unknown): void =>
    {
        const refs: { path: string, ref: string }[] = [];
        references(data, "", refs);
        for (const { path, ref } of refs)
        {
            if (set.entities.has(ref) || (ref === owner)) { continue; }
            const key = `${owner}${path}:${ref}`;
            if (seen.has(key)) { continue; }
            seen.add(key);
            out.push({
                severity: "error",
                code: "E_MISSING_REFERENCE",
                package: pkg,
                entity: owner,
                path: path,
                message: `"${ref}" is referenced but not loaded`
            });
        }
    };
    for (const entity of set.entities.values()) { check(entity.id, entity.package, entity.data); }
    check(set.ruleset.id ?? "ruleset", set.rulesetPackage, set.ruleset);

    return { ok: out.every((d) => d.severity !== "error"), entries: out };
}
