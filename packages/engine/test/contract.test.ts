import { describe, expect, it } from "vitest";

import * as engine from "../src/index.js";

describe("engine contract", () =>
{
    it("exposes the four contract functions (loadPackages and validate are the loader's)", () =>
    {
        const exported = Object.keys(engine).filter((key) => typeof engine[key as keyof typeof engine] === "function")
            .sort();

        const contract = ["apply", "derive", "explain", "undo"];

        expect(exported).toEqual(expect.arrayContaining(contract));
    });
});
