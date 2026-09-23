import { describe, expect, it } from "vitest";

import { compareVersions } from "../src/index.js";

describe("compareVersions", () =>
{
    it("compares dotted versions part by part, as numbers", () =>
    {
        expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
        expect(compareVersions("0.1.0", "0.1")).toBe(0);
        const sorted = ["1.0.0", "0.2.0", "0.10.1", "0.10.0"].sort(compareVersions);
        expect(sorted).toEqual(["0.2.0", "0.10.0", "0.10.1", "1.0.0"]);
    });
});
