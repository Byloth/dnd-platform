/**
 * Cross-entity references found by shape: any string that looks like an
 * entity id (`<package>.<type>.<name>`) or a `table(<id>)` call inside a
 * formula. Shared by `validate` (referential integrity) and by the content
 * selection (pruning).
 */

const ENTITY_TYPES = [
    "class", "subclass", "species", "background", "feat", "feature", "spell", "spell-list", "item", "condition", "rule",
    "table", "archetype"
];
const SEGMENT = "[a-z0-9]+(?:[-.][a-z0-9]+)*";
export const ENTITY_ID = new RegExp(`^${SEGMENT}\\.(?:${ENTITY_TYPES.join("|")})\\.${SEGMENT}$`);
const TABLE_REF = /table\(([a-z0-9]+(?:[-.][a-z0-9]+)*)\)/g;
/** Keys whose string values are never entity references. */
const SKIP_KEYS = new Set(["id", "en", "it", "action", "resource", "state", "choice", "section", "toggle"]);

export interface Reference
{
    /** JSON-pointer-like path inside the walked value, e.g. `/levels/3/features/0`. */
    readonly path: string;
    readonly ref: string;
}

/** Collect every reference under `node`; `path` is the pointer of `node` itself. */
export function walkReferences(node: unknown, path: string, out: Reference[]): void
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
        node.forEach((item, index) => walkReferences(item, `${path}/${index}`, out));

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
            walkReferences(value, `${path}/${key}`, out);
        }
    }
}

/** Split a pointer into its segments (`/a/0/b` → `["a", "0", "b"]`). */
export function segments(path: string): string[]
{
    return path.split("/").filter((s) => s !== "");
}

/**
 * The pointer of the deepest array element that contains `path` inside
 * `data`, or `undefined` when `path` sits under no array. Used to remove a
 * dangling reference together with the smallest unit that carries it (a
 * feature entry, a spell entry, an effect).
 */
export function enclosingArrayElement(data: unknown, path: string): string | undefined
{
    let node: unknown = data;
    let found: string | undefined;
    let current = "";
    for (const segment of segments(path))
    {
        if ((node === null) || (typeof node !== "object")) { return found; }
        current = `${current}/${segment}`;
        if (Array.isArray(node)) { found = current; }
        node = (node as Record<string, unknown>)[segment];
    }

    return found;
}

/** Remove the array element at `path` from `data` in place; returns whether something was removed. */
export function spliceAt(data: unknown, path: string): boolean
{
    const parts = segments(path);
    const last = parts.pop();
    if (last === undefined) { return false; }

    let node: unknown = data;
    for (const segment of parts)
    {
        if ((node === null) || (typeof node !== "object")) { return false; }
        node = (node as Record<string, unknown>)[segment];
    }
    if (!Array.isArray(node)) { return false; }

    const index = Number(last);
    if (!Number.isInteger(index) || (index < 0) || (index >= node.length)) { return false; }
    node.splice(index, 1);

    return true;
}

/**
 * Order pointers so that splicing them one by one never invalidates the
 * next: a pointer under another comes first, and among siblings the higher
 * index comes first.
 */
export function compareForSplicing(a: string, b: string): number
{
    const x = segments(a);
    const y = segments(b);
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i += 1)
    {
        const p = x[i]!;
        const q = y[i]!;
        if (p === q) { continue; }

        const pn = Number(p);
        const qn = Number(q);
        if (Number.isInteger(pn) && Number.isInteger(qn)) { return qn - pn; }

        return p < q ? -1 : 1;
    }

    return y.length - x.length;
}
