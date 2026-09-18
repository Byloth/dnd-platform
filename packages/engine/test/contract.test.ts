import { describe, expect, it } from "vitest";

import * as engine from "../src/index.js";

describe("engine contract", () =>
{
    it("exposes exactly the six contract functions", () =>
    {
        const exported = Object.keys(engine).filter((key) => typeof engine[key as keyof typeof engine] === "function")
            .sort();

        expect(exported).toEqual(["apply", "derive", "explain", "loadPackages", "undo", "validate"]);
    });
});
