/** Canonical JSON (src/canonical.ts): the form bundles and golden fixtures are compared in. */

import { describe, expect, it } from "vitest";

import { canonicalize, stableStringify } from "../src/index.js";

describe("canonical JSON", () =>
{
    it("canonicalize sorts object keys recursively and keeps array order", () =>
    {
        const value = { b: [3, { z: 1, a: 2 }, 1], a: { y: null, x: "s" } };

        const expected = "{\"a\":{\"x\":\"s\",\"y\":null},\"b\":[3,{\"a\":2,\"z\":1},1]}";

        expect(JSON.stringify(canonicalize(value))).toBe(expected);
        expect(stableStringify(value)).toBe(stableStringify({ a: { x: "s", y: null }, b: [3, { a: 2, z: 1 }, 1] }));
    });
});
