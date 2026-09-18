import { describe, expect, it } from "vitest";

import { EFFECT_KINDS, PLAY_EFFECT_KINDS } from "@byloth/dnd-platform-schema";
import type { Effect, PlayEffect } from "@byloth/dnd-platform-schema";

import { effectKind, playEffectKind } from "../src/effects.js";

describe("exhaustive effect dispatch", () =>
{
    it("handles every effect kind of the schema", () =>
    {
        for (const kind of EFFECT_KINDS)
        {
            expect(effectKind({ kind } as Effect)).toBe(kind);
        }
    });

    it("handles every play effect kind of the schema", () =>
    {
        for (const kind of PLAY_EFFECT_KINDS)
        {
            expect(playEffectKind({ kind } as PlayEffect)).toBe(kind);
        }
    });
});
