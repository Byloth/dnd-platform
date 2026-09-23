/** Package versions are dotted numbers (`0.10.0` comes after `0.9.0`); compared part by part, missing parts as 0. */
export function compareVersions(a: string, b: string): number
{
    const left = a.split(".").map(Number);
    const right = b.split(".").map(Number);
    for (let i = 0; i < Math.max(left.length, right.length); i += 1)
    {
        const difference = (left[i] ?? 0) - (right[i] ?? 0);
        if (difference !== 0) { return difference; }
    }

    return 0;
}
