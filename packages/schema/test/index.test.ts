import { describe, expect, it } from "vitest";

import { EFFECT_KINDS, ENTITY_TYPES, FORMAT_VERSION } from "../src/index.js";

describe("schema vocabulary", () =>
{
    it("pins the format version", () =>
    {
        expect(FORMAT_VERSION).toBe(0);
    });

    it("keeps effect kinds and entity types unique", () =>
    {
        expect(new Set(EFFECT_KINDS).size).toBe(EFFECT_KINDS.length);
        expect(new Set(ENTITY_TYPES).size).toBe(ENTITY_TYPES.length);
    });
});
