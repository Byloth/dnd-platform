/**
 * Canonical JSON: recursively sorted object keys, arrays kept in order,
 * `undefined` properties dropped. Golden fixtures compare this form.
 */

export function canonicalize(value: unknown): unknown
{
    if (Array.isArray(value)) { return value.map(canonicalize); }
    if (value instanceof Map) { return canonicalize(Object.fromEntries(value)); }
    if (value instanceof Set) { return canonicalize([...value]); }
    if ((value !== null) && (typeof value === "object"))
    {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

        return Object.fromEntries(entries.map(([k, v]) => [k, canonicalize(v)]));
    }

    return value;
}

export function stableStringify(value: unknown, indent = 2): string
{
    return `${JSON.stringify(canonicalize(value), null, indent)}\n`;
}
