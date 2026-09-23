import { describe, expect, it } from "vitest";

import * as loader from "../src/index.js";

describe("loader contract", () =>
{
    it("exposes the loading functions of the engine contract and the package checks", () =>
    {
        const exported = Object.keys(loader).filter((key) => typeof loader[key as keyof typeof loader] === "function")
            .sort();

        const contract = [
            "bundleText", "checkPackage", "checkReferences", "compareVersions", "loadPackages", "parseBundle",
            "readPackageFiles",
            "readPackageZip", "toBundle", "toPackageSource", "validate"
        ];

        expect(exported).toEqual(expect.arrayContaining(contract));
    });
});
