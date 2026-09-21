/**
 * `validate`: referential integrity of a loaded package set on top of the
 * loading diagnostics. Schema conformance is the CLI's job (`dnd validate`).
 */

import type { Diagnostic, Diagnostics, PackageSet } from "../index.js";
import { walkReferences } from "../load/references.js";
import type { Reference } from "../load/references.js";

/**
 * Every reference must name a loaded entity. Under a selection (DEC-20)
 * excluded entities stay loaded, inactive, so a reference to one of them is
 * never a missing reference: the loader has already pruned it from the
 * entities that stay active and reported it as `I_PRUNED`.
 */
export function validate(set: PackageSet): Diagnostics
{
    const out: Diagnostic[] = [...set.diagnostics.entries];
    const seen = new Set<string>();
    const check = (owner: string, pkg: string, data: unknown): void =>
    {
        const refs: Reference[] = [];
        walkReferences(data, "", refs);
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
