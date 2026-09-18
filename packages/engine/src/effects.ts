/**
 * Exhaustive dispatch over the effect catalogue and the play effects.
 *
 * The `switch` statements return through every `kind`; adding a kind to the
 * schemas without handling it here fails the type check (`assertNever`).
 * Bodies are filled in M0.3/M0.4; for now each kind reports its name.
 */

import type { Effect, PlayEffect } from "@byloth/dnd-platform-schema";

export function assertNever(value: never): never
{
    throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}

/** The catalogue kind of an effect, checked exhaustively. */
export function effectKind(effect: Effect): Effect["kind"]
{
    switch (effect.kind)
    {
        case "modify":
        case "modify-attacks":
        case "grant-proficiency":
        case "declare-resource":
        case "add-action":
        case "grant-spellcasting":
        case "grant-spells":
        case "extend-spell-list":
        case "roll-advantage":
        case "roll-disadvantage":
        case "defense":
        case "add-text":
        case "add-section":
        case "open-choice":
        case "define-table":
            return effect.kind;

        default:
            return assertNever(effect);
    }
}

/** The kind of a play effect, checked exhaustively. */
export function playEffectKind(effect: PlayEffect): PlayEffect["kind"]
{
    switch (effect.kind)
    {
        case "heal":
        case "tempHp":
        case "extraDamage":
        case "restoreResource":
        case "applyCondition":
        case "reroll":
        case "note":
            return effect.kind;

        default:
            return assertNever(effect);
    }
}
