/**
 * Play engine — `apply` and `undo` (docs/phase-0/03-engine-contract.md,
 * "Play algorithm"). Pure functions: the sheet says what the character can
 * do, the state says where it stands, the event says what happened. Dice
 * are never rolled here; the caller passes results in the event.
 *
 * Every event is validated against the sheet; a rejected event returns the
 * state untouched, an entry with empty slices and one warning. `force: true`
 * on the event skips the validation (DM overrides).
 *
 * The log entry records the touched top-level keys of the state before and
 * after the event, so `undo` is a pure restore of `before`.
 */

import type { PlayEffect } from "@byloth/dnd-platform-schema";

import { stableStringify } from "../canonical.js";
import { assertNever } from "../effects.js";
import { formatValue, isDice } from "../formula/evaluate.js";
import type {
    ActionView, ApplyResult, CharacterState, ComputedSheet, Diagnostic, Expiry, LogEntry, PlayEvent, ResourceView,
    RolledAmounts, SpellView
} from "../index.js";
import { evaluateInPlay } from "./environment.js";
import { normalizeExpiry, tick } from "./expiry.js";
import type { Clock } from "./expiry.js";

export interface ApplyOptions
{
    /** Id of the log entry; the caller owns the log and its numbering. */
    readonly id?: string;
}

export const PLAY_EVENT_TYPES = [
    "damage", "heal", "temp-hp", "spend-resource", "restore-resource", "cast-spell", "end-concentration", "end-spell",
    "toggle", "apply-condition", "remove-condition", "custom-effect", "end-custom-effect", "short-rest", "long-rest",
    "dawn", "death-save", "stabilise", "inspiration", "use-action", "start-turn", "end-turn", "note"

] as const satisfies readonly PlayEvent["type"][];

type State = CharacterState;
type Turn = NonNullable<State["turn"]>;
type Activation = NonNullable<Turn["used"]>[number];
type ActiveCondition = State["conditions"][number];
type ActiveToggle = NonNullable<State["toggles"]>[number];
type ActiveSpell = NonNullable<State["activeSpells"]>[number];
type CustomEffect = NonNullable<State["customEffects"]>[number];

const EMPTY_TURN: Turn = { used: [], actionsTaken: [], movementUsed: 0, active: false };

/** Spell uses ("once per long rest without a slot") are tracked as a resource named after the spell. */
export function spellUsesResource(spellId: string): string
{
    return `spell-uses-${spellId.replace(/[^a-z0-9]+/g, "-")}`;
}

// ---- draft state -------------------------------------------------------------------

/** Accumulates the changes of one event and produces the new state with its log slices. */
class Draft
{
    private readonly _before: Partial<State> = {};
    private readonly _after: Partial<State> = {};
    public readonly warnings: Diagnostic[] = [];

    public constructor(private readonly _state: State) { }

    public get<K extends keyof State>(key: K): State[K]
    {
        return (key in this._after) ? this._after[key] as State[K] : this._state[key];
    }

    public set<K extends keyof State>(key: K, value: State[K]): void
    {
        if (!(key in this._before) && Object.hasOwn(this._state, key))
        {
            (this._before as Record<string, unknown>)[key] = this._state[key];
        }
        (this._after as Record<string, unknown>)[key] = value;
    }

    public info(code: string, message: string, entity?: string): void
    {
        this.warnings.push({ severity: "info", code: code, message: message, ...(entity ? { entity: entity } : {}) });
    }
    public warn(code: string, message: string, entity?: string): void
    {
        this.warnings.push({
            severity: "warning", code: code, message: message, ...(entity ? { entity: entity } : {})
        });
    }

    public get changed(): boolean { return Object.keys(this._after).length > 0; }

    public finish(event: PlayEvent, id: string): ApplyResult
    {
        // Keys whose value did not change are left out, so that the entry stays minimal.
        const touched = (Object.keys(this._after) as (keyof State)[]).filter((key) =>
            !Object.hasOwn(this._state, key) ||
            (stableStringify(this._after[key]) !== stableStringify(this._state[key])));
        const after = Object.fromEntries(touched.map((key) => [key, this._after[key]])) as Partial<State>;
        const before = Object.fromEntries(
            touched.filter((key) => key in this._before).map((key) => [key, this._before[key]])
        ) as Partial<State>;

        const state: State = { ...this._state, ...after };
        const entry: LogEntry = { id: id, event: event, before: before, after: after };

        return { state: state, entry: entry, warnings: this.warnings };
    }
}

// ---- helpers --------------------------------------------------------------------------

function label(text: Text): string
{
    return text["en"] ?? Object.values(text).find((v) => v !== undefined) ?? "";
}

function hpMax(sheet: ComputedSheet): number
{
    const value = sheet.values["hp.max"]?.value;

    return typeof value === "number" ? value : 0;
}

function resourceMax(resource: ResourceView): number | undefined
{
    return typeof resource.max.value === "number" ? resource.max.value : undefined;
}

function resourceCurrent(draft: Draft, resource: ResourceView): number | undefined
{
    const max = resourceMax(resource);
    if (max === undefined) { return undefined; }

    return draft.get("resources")[resource.id] ?? max;
}

function slotMax(sheet: ComputedSheet, level: number): number
{
    return sheet.spellcasting
        .reduce((best, view) => Math.max(best, view.slots.find((s) => s.level === level)?.max ?? 0), 0);
}

function slotCurrent(draft: Draft, sheet: ComputedSheet, key: string): number | undefined
{
    if (key === "pact")
    {
        const pact = sheet.spellcasting.find((v) => v.pact)?.pact;

        return pact === undefined ? undefined : draft.get("spellSlots")?.["pact"] ?? pact.slots;
    }
    const max = slotMax(sheet, Number(key));

    return max > 0 ? draft.get("spellSlots")?.[key] ?? max : undefined;
}

function setSlot(draft: Draft, key: string, value: number): void
{
    draft.set("spellSlots", { ...(draft.get("spellSlots") ?? {}), [key]: value });
}

function setResource(draft: Draft, id: string, value: number): void
{
    draft.set("resources", { ...draft.get("resources"), [id]: value });
}

function turnOf(draft: Draft): Turn
{
    return { ...EMPTY_TURN, ...(draft.get("turn") ?? {}) };
}

type Text = Readonly<Record<string, string | undefined>>;

function sameText(a: Text, b: Text): boolean
{
    return stableStringify(a) === stableStringify(b);
}

/** Manual slot ids accepted by spend/restore-resource: `spell-slot-3`, `spell-slot-pact`. */
function slotKeyOf(resource: string): string | undefined
{
    const match = /^spell-slot-(pact|[1-9])$/.exec(resource);

    return match?.[1];
}

// ---- hit points ------------------------------------------------------------------------

function clearConcentration(draft: Draft, reason: string): void
{
    const concentration = draft.get("concentration");
    if (!concentration) { return; }
    const active = draft.get("activeSpells") ?? [];
    const index = active.findIndex((s) => s.spell === concentration.spell);
    if (index >= 0) { draft.set("activeSpells", active.filter((_, i) => i !== index)); }
    draft.set("concentration", null);
    draft.info("I_CONCENTRATION_ENDED", `concentration on "${concentration.spell}" ended: ${reason}`,
        concentration.spell);
}

function heal(draft: Draft, sheet: ComputedSheet, amount: number): void
{
    const hp = draft.get("hp");
    const next = Math.min(hpMax(sheet), hp.current + Math.max(0, amount));
    if (next !== hp.current) { draft.set("hp", { ...hp, current: next }); }
    const saves = draft.get("deathSaves");
    if ((next > 0) && ((saves.successes > 0) || (saves.failures > 0)))
    {
        draft.set("deathSaves", { successes: 0, failures: 0 });
    }
}

function tempHp(draft: Draft, amount: number): void
{
    const hp = draft.get("hp");
    if (amount > hp.temporary) { draft.set("hp", { ...hp, temporary: amount }); }
    else { draft.info("I_TEMP_HP_KEPT", `temporary hit points stay at ${hp.temporary} (${amount} offered)`); }
}

function damage(draft: Draft, sheet: ComputedSheet, event: Extract<PlayEvent, { type: "damage" }>): void
{
    let amount = Math.max(0, event.amount);
    if (event.damageType !== undefined)
    {
        const applies = (kind: string): boolean =>
            sheet.defenses.some((d) => (d.defense === kind) && d.to.includes(event.damageType ?? ""));
        if (applies("immunity"))
        {
            draft.info("I_DEFENSE", `immune to ${event.damageType}: no damage`);
            amount = 0;
        }
        else
        {
            if (applies("vulnerability"))
            {
                amount *= 2;
                draft.info("I_DEFENSE", `vulnerable to ${event.damageType}: damage doubled to ${amount}`);
            }
            if (applies("resistance"))
            {
                amount = Math.floor(amount / 2);
                draft.info("I_DEFENSE", `resistant to ${event.damageType}: damage halved to ${amount}`);
            }
        }
    }
    const hp = draft.get("hp");
    const absorbed = Math.min(hp.temporary, amount);
    const toHp = amount - absorbed;
    const current = Math.max(0, hp.current - toHp);
    if ((absorbed > 0) || (current !== hp.current))
    {
        draft.set("hp", { current: current, temporary: hp.temporary - absorbed });
    }

    if ((hp.current > 0) && (current === 0))
    {
        draft.info("I_DOWN", "dropped to 0 hit points: unconscious, death saving throws begin");
        clearConcentration(draft, "dropped to 0 hit points");
    }
    else if ((hp.current === 0) && (amount > 0))
    {
        const rules = sheet.play.deathSaves;
        if (rules?.damage && (rules.damage.failures > 0))
        {
            const saves = draft.get("deathSaves");
            const failures = Math.min(rules.failures, saves.failures + rules.damage.failures);
            draft.set("deathSaves", { ...saves, failures: failures });
            if (failures >= rules.failures) { draft.warn("W_DEAD", `${rules.failures} failures: the character dies`); }
        }
    }
    else if ((current > 0) && (amount > 0) && draft.get("concentration"))
    {
        const rule = sheet.play.concentration;
        if (rule === undefined)
        {
            draft.warn("W_CONCENTRATION_CHECK", "concentration check (the ruleset does not define the DC)");
        }
        else
        {
            const dc = evaluateInPlay(rule.saveDc, sheet, { damage: amount });
            const shown = dc.ok ? formatValue(dc.value) : "?";
            draft.warn("W_CONCENTRATION_CHECK", `concentration check: Constitution saving throw DC ${shown}`);
        }
    }
}

// ---- resources and slots ---------------------------------------------------------------

function spendResource(draft: Draft, sheet: ComputedSheet, id: string, amount: number, force: boolean): boolean
{
    const slotKey = slotKeyOf(id);
    if (slotKey !== undefined)
    {
        const current = slotCurrent(draft, sheet, slotKey);
        if (current === undefined)
        {
            draft.warn("W_UNKNOWN_RESOURCE", `no spell slots of level ${slotKey}`);

            return false;
        }
        if ((current < amount) && !force)
        {
            draft.warn("W_INSUFFICIENT_RESOURCE", `spell slots of level ${slotKey}: ${current} left, ${amount} needed`);

            return false;
        }
        setSlot(draft, slotKey, Math.max(0, current - amount));

        return true;
    }
    const resource = sheet.resources.find((r) => r.id === id);
    if (resource === undefined)
    {
        draft.warn("W_UNKNOWN_RESOURCE", `unknown resource "${id}"`);

        return false;
    }
    const current = resourceCurrent(draft, resource);
    if (current === undefined) { return true; } // unlimited: nothing to track
    if ((current < amount) && !force)
    {
        draft.warn("W_INSUFFICIENT_RESOURCE", `${label(resource.name)}: ${current} left, ${amount} needed`);

        return false;
    }
    setResource(draft, id, Math.max(0, current - amount));

    return true;
}

function restoreResource(draft: Draft, sheet: ComputedSheet, id: string, amount: number | "full"): boolean
{
    const slotKey = slotKeyOf(id);
    if (slotKey !== undefined)
    {
        const current = slotCurrent(draft, sheet, slotKey);
        if (current === undefined)
        {
            draft.warn("W_UNKNOWN_RESOURCE", `no spell slots of level ${slotKey}`);

            return false;
        }
        const max = slotKey === "pact" ?
            (sheet.spellcasting.find((v) => v.pact)?.pact?.slots ?? 0) :
            slotMax(sheet, Number(slotKey));
        setSlot(draft, slotKey, amount === "full" ? max : Math.min(max, current + amount));

        return true;
    }
    const resource = sheet.resources.find((r) => r.id === id);
    if (resource === undefined)
    {
        draft.warn("W_UNKNOWN_RESOURCE", `unknown resource "${id}"`);

        return false;
    }
    const max = resourceMax(resource);
    const current = resourceCurrent(draft, resource);
    if ((max === undefined) || (current === undefined)) { return true; }
    setResource(draft, id, amount === "full" ? max : Math.min(max, current + amount));

    return true;
}

type RechargeOn = "short-rest" | "long-rest" | "dawn";

/** Restores every resource whose recharge rule fires on `on` (a long rest also fires short-rest rules). */
function recharge(draft: Draft, sheet: ComputedSheet, on: RechargeOn, rolled: RolledAmounts | undefined): void
{
    const fires = (rule: string): boolean => (rule === on) || ((on === "long-rest") && (rule === "short-rest"));
    for (const resource of sheet.resources)
    {
        const max = resourceMax(resource);
        if (max === undefined) { continue; }
        for (const rule of resource.recharge)
        {
            if (!fires(rule.on)) { continue; }
            const current = resourceCurrent(draft, resource) ?? max;
            if (rule.amount === "full")
            {
                setResource(draft, resource.id, max);

                continue;
            }
            let gain: number;
            if (typeof rule.amount === "number") { gain = rule.amount; }
            else
            {
                const evaluated = evaluateInPlay(rule.amount, sheet);
                if (!evaluated.ok)
                {
                    draft.warn("E_FORMULA", `recharge of "${resource.id}": ${evaluated.message}`);

                    continue;
                }
                if (isDice(evaluated.value))
                {
                    const roll = rolled?.[resource.id];
                    if (roll === undefined)
                    {
                        const dice = formatValue(evaluated.value);
                        draft.info("I_ROLL_NEEDED",
                            `roll ${dice} for "${label(resource.name)}" and restore it (rolled.${resource.id})`);

                        continue;
                    }
                    gain = roll;
                }
                else { gain = evaluated.value; }
            }
            setResource(draft, resource.id, Math.min(max, current + Math.max(0, gain)));
        }
    }
    // Spell uses ("uses: 1, recharge: long-rest") are full again: the tracking key disappears.
    const resources = draft.get("resources");
    const restored = new Set(sheet.spells
        .filter((spell) => ("uses" in spell.paidWith) && fires(spell.paidWith.recharge))
        .map((spell) => spellUsesResource(spell.id))
        .filter((key) => key in resources));
    if (restored.size > 0)
    {
        draft.set("resources", Object.fromEntries(Object.entries(resources).filter(([key]) => !restored.has(key))));
    }
}

// ---- expiry -----------------------------------------------------------------------------

function expire(draft: Draft, clock: Clock, hours?: number): void
{
    const conditions = tick(draft.get("conditions"), clock, hours);
    if (conditions.changed) { draft.set("conditions", conditions.kept); }
    const toggles = tick(draft.get("toggles") ?? [], clock, hours);
    if (toggles.changed) { draft.set("toggles", toggles.kept); }
    const custom = tick(draft.get("customEffects") ?? [], clock, hours);
    if (custom.changed) { draft.set("customEffects", custom.kept); }
    const spells = tick(draft.get("activeSpells") ?? [], clock, hours);
    if (spells.changed) { draft.set("activeSpells", spells.kept); }
    for (const item of [...conditions.expired, ...toggles.expired, ...custom.expired, ...spells.expired])
    {
        const what = "condition" in item ?
            item.condition :
            "state" in item ? item.state : "spell" in item ? item.spell : label(item.name);
        draft.info("I_EXPIRED", `"${what}" ended (${clock})`);
    }
    const concentration = draft.get("concentration");
    if (concentration && spells.expired.some((s) => s.spell === concentration.spell))
    {
        draft.set("concentration", null);
    }
}

// ---- conditions, toggles, custom effects ---------------------------------------------

function addCondition(
    draft: Draft,
    sheet: ComputedSheet,
    id: string,
    level: number | undefined,
    expires: Expiry | undefined,
    force: boolean
): boolean
{
    const ref = sheet.play.conditions.find((c) => c.id === id);
    if ((ref === undefined) && !force)
    {
        draft.warn("W_UNKNOWN_CONDITION", `unknown condition "${id}"`, id);

        return false;
    }
    let wanted = level;
    if (ref?.maxLevel !== undefined)
    {
        wanted ??= 1;
        if ((wanted > ref.maxLevel) && !force)
        {
            draft.warn("W_CONDITION_LEVEL", `"${id}" has levels 1 to ${ref.maxLevel}, ${wanted} asked`, id);

            return false;
        }
    }
    const stored = normalizeExpiry(expires, turnOf(draft).active === true);
    const entry: ActiveCondition = {
        condition: id,
        ...(wanted !== undefined ? { level: wanted } : {}),
        ...(stored !== undefined ? { expires: stored } : {})
    };
    const conditions = draft.get("conditions");
    const index = conditions.findIndex((c) => c.condition === id);
    if (index < 0)
    {
        draft.set("conditions", [...conditions, entry]);

        return true;
    }
    if ((level === undefined) && !force)
    {
        draft.warn("W_CONDITION_PRESENT", `"${id}" is already active`, id);

        return false;
    }
    draft.set("conditions", conditions.map((c, i) => i === index ? { ...c, ...entry } : c));

    return true;
}

function setToggle(draft: Draft, sheet: ComputedSheet, state: string, on: boolean, force: boolean): boolean
{
    const declared = sheet.toggles.find((t) => t.state === state);
    if ((declared === undefined) && !force)
    {
        draft.warn("W_UNKNOWN_TOGGLE", `unknown toggle "${state}"`);

        return false;
    }
    const toggles = draft.get("toggles") ?? [];
    const index = toggles.findIndex((t) => t.state === state);
    if (on)
    {
        if (index >= 0)
        {
            if (!force) { draft.warn("W_ALREADY_ACTIVE", `"${state}" is already on`); }

            return force;
        }
        const expires = normalizeExpiry(declared?.expires, turnOf(draft).active === true);
        const entry: ActiveToggle = { state: state, ...(expires !== undefined ? { expires: expires } : {}) };
        draft.set("toggles", [...toggles, entry]);

        return true;
    }
    if (index < 0)
    {
        if (!force) { draft.warn("W_NOT_ACTIVE", `"${state}" is not on`); }

        return force;
    }
    draft.set("toggles", toggles.filter((_, i) => i !== index));

    return true;
}

// ---- play effects ---------------------------------------------------------------------

/** Executes the play effects the engine implements; the rest become notes for the player. */
function runPlayEffects(
    draft: Draft,
    sheet: ComputedSheet,
    effects: readonly PlayEffect[],
    rolled: number | undefined,
    extra: Readonly<Record<string, number>>,
    entity: string
): void
{
    const amountOf = (formula: string, what: string): number | undefined =>
    {
        const evaluated = evaluateInPlay(formula, sheet, extra);
        if (!evaluated.ok)
        {
            draft.warn("E_FORMULA", `${what}: ${evaluated.message}`, entity);

            return undefined;
        }
        if (!isDice(evaluated.value)) { return evaluated.value; }
        if (rolled !== undefined) { return rolled; }
        const dice = formatValue(evaluated.value);
        draft.info("I_ROLL_NEEDED", `roll ${dice} for ${what} and apply it (event field rolled)`, entity);

        return undefined;
    };
    for (const effect of effects)
    {
        const note = effect.note ? ` ${label(effect.note)}` : "";
        switch (effect.kind)
        {
            case "heal":
            {
                if (effect.target === "other")
                {
                    draft.info("I_PLAY_EFFECT", `heals another creature for ${effect.amount}.${note}`, entity);
                    break;
                }
                const amount = amountOf(effect.amount, "healing");
                if (amount !== undefined) { heal(draft, sheet, amount); }
                break;
            }
            case "tempHp":
            {
                const amount = amountOf(effect.amount, "temporary hit points");
                if (amount !== undefined) { tempHp(draft, amount); }
                break;
            }
            case "restoreResource":
            {
                if (effect.resource === "spell-slots")
                {
                    if ((effect.amount === "full") && (effect.budget === undefined))
                    {
                        if (draft.get("spellSlots") !== undefined) { draft.set("spellSlots", {}); }
                    }
                    else
                    {
                        const budget = effect.budget ? `, budget ${effect.budget}` : "";
                        draft.info("I_PLAY_EFFECT",
                            `recover spell slots (${effect.amount}${budget}): choose and restore them.${note}`,
                            entity);
                    }
                    break;
                }
                let amount: number | "full" | undefined;
                if ((effect.amount === "full") || (typeof effect.amount === "number")) { amount = effect.amount; }
                else { amount = amountOf(effect.amount, `recovery of "${effect.resource}"`); }
                if (amount !== undefined) { restoreResource(draft, sheet, effect.resource, amount); }
                break;
            }
            case "applyCondition":
                if (effect.target === "other")
                {
                    draft.info("I_PLAY_EFFECT", `applies "${effect.condition}" to the target.${note}`, entity);
                    break;
                }
                addCondition(draft, sheet, effect.condition, undefined, effect.expires, true);
                break;
            case "extraDamage":
            {
                const type = effect.damageType ? ` ${effect.damageType}` : "";
                const once = effect.once ? ` (once per ${effect.once.replace("per-", "")})` : "";
                const amount = effect.dice ?? effect.formula ?? "";
                draft.info("I_PLAY_EFFECT", `extra damage ${amount}${type}${once}.${note}`, entity);
                break;
            }
            case "reroll":
            {
                const keep = effect.keep === "new" ? "new" : "higher";
                draft.info("I_PLAY_EFFECT", `reroll the ${effect.roll} roll, keep the ${keep} result.${note}`, entity);
                break;
            }
            case "note":
                draft.info("I_PLAY_EFFECT", `${label(effect.text)}${note}`, entity);
                break;
            default:
                assertNever(effect);
        }
    }
}

// ---- spells and actions ------------------------------------------------------------------

function paySpell(
    draft: Draft,
    sheet: ComputedSheet,
    spell: SpellView,
    slotLevel: number | undefined,
    force: boolean
): boolean
{
    const paid = spell.paidWith;
    if ("free" in paid) { return true; }
    if ("resource" in paid) { return spendResource(draft, sheet, paid.resource, paid.amount, force); }
    if ("uses" in paid)
    {
        const key = spellUsesResource(spell.id);
        const current = draft.get("resources")[key] ?? paid.uses;
        if ((current <= 0) && !force)
        {
            draft.warn("W_INSUFFICIENT_RESOURCE", `"${spell.id}": no uses left until ${paid.recharge}`, spell.id);

            return false;
        }
        setResource(draft, key, Math.max(0, current - 1));

        return true;
    }
    // A slot of the requested level, or the spell's own; Pact Magic slots when the caster has only those.
    const level = slotLevel ?? spell.level;
    if (level < spell.level)
    {
        if (!force)
        {
            draft.warn("W_NO_SLOT", `"${spell.id}" is level ${spell.level}; a level ${level} slot cannot cast it`,
                spell.id);
        }

        return force;
    }
    if (slotMax(sheet, level) > 0)
    {
        return spendResource(draft, sheet, `spell-slot-${level}`, 1, force);
    }
    const caster = sheet.spellcasting.find((v) => v.class === spell.caster) ?? sheet.spellcasting.find((v) => v.pact);
    const pact = caster?.pact;
    if (pact && (pact.level >= spell.level) && ((slotLevel === undefined) || (slotLevel === pact.level)))
    {
        return spendResource(draft, sheet, "spell-slot-pact", 1, force);
    }
    if (!force) { draft.warn("W_NO_SLOT", `no spell slot of level ${level} for "${spell.id}"`, spell.id); }

    return force;
}

function durationExpiry(spell: SpellView): Expiry | undefined
{
    const d = spell.duration;
    if (d.type === "instantaneous") { return undefined; }
    if (d.rounds !== undefined) { return { rounds: d.rounds }; }
    if (d.minutes !== undefined) { return { minutes: d.minutes }; }
    if (d.hours !== undefined) { return { hours: d.hours }; }
    if (d.days !== undefined) { return { hours: d.days * 24 }; }

    return { manual: true };
}

type CastSpell = Extract<PlayEvent, { type: "cast-spell" }>;

function castSpell(draft: Draft, sheet: ComputedSheet, event: CastSpell, id: string): void
{
    const spell = sheet.spells.find((s) => s.id === event.spell);
    if (spell === undefined)
    {
        draft.warn("W_UNKNOWN_SPELL", `"${event.spell}" is not among the character's spells`, event.spell);

        return;
    }
    if (!paySpell(draft, sheet, spell, event.slotLevel, event.force === true)) { return; }

    if (spell.duration.concentration)
    {
        const current = draft.get("concentration");
        if (current && (current.spell !== spell.id))
        {
            const active = draft.get("activeSpells") ?? [];
            draft.set("activeSpells", active.filter((s) => s.spell !== current.spell));
            draft.info("I_CONCENTRATION_REPLACED", `concentration on "${current.spell}" ends`, current.spell);
        }
        draft.set("concentration", { spell: spell.id, since: id });
    }
    const expires = durationExpiry(spell);
    if (expires !== undefined)
    {
        const entry: ActiveSpell = {
            spell: spell.id,
            ...(event.slotLevel !== undefined ? { slotLevel: event.slotLevel } : {}),
            expires: expires
        };
        draft.set("activeSpells", [...(draft.get("activeSpells") ?? []), entry]);
    }
    if (spell.onCast)
    {
        const extra = { slotLevel: event.slotLevel ?? spell.level };
        runPlayEffects(draft, sheet, spell.onCast, event.rolled, extra, spell.id);
    }
}

function useAction(draft: Draft, sheet: ComputedSheet, event: Extract<PlayEvent, { type: "use-action" }>): void
{
    const force = event.force === true;
    const action: ActionView | undefined = sheet.actions.find((a) => a.id === event.action);
    if (action === undefined)
    {
        draft.warn("W_UNKNOWN_ACTION", `unknown action "${event.action}"`);

        return;
    }
    const turn = turnOf(draft);
    if (!action.available && !force)
    {
        draft.warn("W_UNAVAILABLE_ACTION", `"${event.action}" is not available now`);

        return;
    }
    if ((action.activation !== "special") && (turn.used ?? []).includes(action.activation) && !force)
    {
        draft.warn("W_ACTIVATION_USED", `the ${action.activation} of this turn is already used`);

        return;
    }
    const after = action.requires?.afterAction;
    if ((after !== undefined) && !(turn.actionsTaken ?? []).includes(after) && !force)
    {
        draft.warn("W_REQUIRES_ACTION", `"${event.action}" requires the ${after} action first`);

        return;
    }
    for (const cost of action.cost)
    {
        const ok = "amount" in cost ?
            spendResource(draft, sheet, cost.resource, cost.amount, force) :
            spendResource(draft, sheet, `spell-slot-${cost.level}`, 1, force);
        if (!ok) { return; }
    }
    const used: Activation[] = (action.activation === "special") || (turn.used ?? []).includes(action.activation) ?
        turn.used ?? [] :
        [...(turn.used ?? []), action.activation];
    draft.set("turn", { ...turn, used: used, actionsTaken: [...(turn.actionsTaken ?? []), action.id] });
    if (action.toggle !== undefined) { setToggle(draft, sheet, action.toggle, true, true); }
    if (action.onUse) { runPlayEffects(draft, sheet, action.onUse, event.rolled, {}, action.id); }
}

// ---- rests ---------------------------------------------------------------------------------

function shortRest(draft: Draft, sheet: ComputedSheet, event: Extract<PlayEvent, { type: "short-rest" }>): void
{
    const rules = sheet.play.rests.short;
    const force = event.force === true;
    const count = event.hitDice.reduce((n, d) => n + d.rolls.length, 0);
    if (count > 0)
    {
        const total = sheet.play.hitDice.reduce((n, p) => n + p.total, 0);
        const available = total - draft.get("hitDice").spent;
        const unknownDie = event.hitDice.find((d) => !sheet.play.hitDice.some((p) => p.die === d.die));
        if ((rules.hitDice === "none") && !force)
        {
            draft.warn("W_HIT_DICE", "this ruleset does not spend Hit Dice on a short rest");

            return;
        }
        if ((count > available) && !force)
        {
            draft.warn("W_HIT_DICE", `${count} Hit Dice spent, ${available} available`);

            return;
        }
        if ((unknownDie !== undefined) && !force)
        {
            draft.warn("W_HIT_DICE", `the character has no d${unknownDie.die} Hit Dice`);

            return;
        }
        const con = sheet.values["mod.con"]?.value;
        const mod = typeof con === "number" ? con : 0;
        const healed = event.hitDice.flatMap((d) => d.rolls).reduce((n, roll) => n + Math.max(0, roll + mod), 0);
        heal(draft, sheet, healed);
        draft.set("hitDice", { spent: draft.get("hitDice").spent + count });
    }
    recharge(draft, sheet, "short-rest", event.rolled);
    expire(draft, "short-rest", rules.hours);
    if (draft.get("turn") !== undefined) { draft.set("turn", EMPTY_TURN); }
}

function longRest(draft: Draft, sheet: ComputedSheet, event: Extract<PlayEvent, { type: "long-rest" }>): void
{
    const rules = sheet.play.rests.long;
    const hp = draft.get("hp");
    if (rules.hitPoints === "full") { draft.set("hp", { current: hpMax(sheet), temporary: 0 }); }
    else if (hp.temporary > 0) { draft.set("hp", { ...hp, temporary: 0 }); }
    const spent = draft.get("hitDice").spent;
    if (spent > 0) { draft.set("hitDice", { spent: Math.max(0, spent - rules.hitDiceRecovered) }); }
    recharge(draft, sheet, "long-rest", event.rolled);
    if (draft.get("spellSlots") !== undefined) { draft.set("spellSlots", {}); }
    clearConcentration(draft, "long rest");
    const saves = draft.get("deathSaves");
    if ((saves.successes > 0) || (saves.failures > 0)) { draft.set("deathSaves", { successes: 0, failures: 0 }); }
    expire(draft, "long-rest", rules.hours);
    const recovered = rules.conditionLevelsRecovered ?? 0;
    if (recovered > 0)
    {
        const conditions = draft.get("conditions");
        const next = conditions.flatMap((c) =>
        {
            if (c.level === undefined) { return [c]; }
            const level = c.level - recovered;
            if (level <= 0)
            {
                draft.info("I_EXPIRED", `"${c.condition}" ended (long rest)`);

                return [];
            }

            return [{ ...c, level: level }];
        });
        if (stableStringify(next) !== stableStringify(conditions)) { draft.set("conditions", next); }
    }
    if (draft.get("turn") !== undefined) { draft.set("turn", EMPTY_TURN); }
}

// ---- death saves -----------------------------------------------------------------------

function deathSave(draft: Draft, sheet: ComputedSheet, event: Extract<PlayEvent, { type: "death-save" }>): void
{
    const rules = sheet.play.deathSaves;
    if (rules === undefined)
    {
        draft.warn("W_RULE_UNDEFINED", "the ruleset does not define death saving throws");

        return;
    }
    if ((draft.get("hp").current > 0) && (event.force !== true))
    {
        draft.warn("W_NOT_DYING", "death saving throws are rolled only at 0 hit points");

        return;
    }
    const saves = draft.get("deathSaves");
    if ((event.roll === 20) && rules.natural20)
    {
        draft.set("deathSaves", { successes: 0, failures: 0 });
        heal(draft, sheet, rules.natural20.hitPoints);
        draft.info("I_STABILISED", `natural 20: regains ${rules.natural20.hitPoints} hit point(s)`);

        return;
    }
    let successes = saves.successes;
    let failures = saves.failures;
    if ((event.roll === 1) && rules.natural1) { failures += rules.natural1.failures; }
    else if (event.roll >= rules.dc) { successes += 1; }
    else { failures += 1; }
    successes = Math.min(rules.successes, successes);
    failures = Math.min(rules.failures, failures);
    if (successes >= rules.successes)
    {
        draft.set("deathSaves", { successes: 0, failures: 0 });
        draft.info("I_STABILISED", `${rules.successes} successes: the character is stable`);

        return;
    }
    draft.set("deathSaves", { successes: successes, failures: failures });
    if (failures >= rules.failures) { draft.warn("W_DEAD", `${rules.failures} failures: the character dies`); }
}

// ---- dispatch ----------------------------------------------------------------------------

export function apply(
    sheet: ComputedSheet,
    state: CharacterState,
    event: PlayEvent,
    options: ApplyOptions = {}
): ApplyResult
{
    const id = options.id ?? "log-entry";
    const draft = new Draft(state);
    const force = event.force === true;

    switch (event.type)
    {
        case "damage":
            damage(draft, sheet, event);
            break;
        case "heal":
            heal(draft, sheet, event.amount);
            break;
        case "temp-hp":
            tempHp(draft, event.amount);
            break;
        case "spend-resource":
            spendResource(draft, sheet, event.resource, event.amount, force);
            break;
        case "restore-resource":
            restoreResource(draft, sheet, event.resource, event.amount);
            break;
        case "cast-spell":
            castSpell(draft, sheet, event, id);
            break;
        case "end-concentration":
            if (draft.get("concentration")) { clearConcentration(draft, "ended by the player"); }
            else { draft.warn("W_NOT_CONCENTRATING", "the character is not concentrating"); }
            break;
        case "end-spell":
        {
            const active = draft.get("activeSpells") ?? [];
            const index = active.findIndex((s) => s.spell === event.spell);
            if (index < 0)
            {
                draft.warn("W_NOT_ACTIVE", `"${event.spell}" is not active`, event.spell);
                break;
            }
            draft.set("activeSpells", active.filter((_, i) => i !== index));
            if (draft.get("concentration")?.spell === event.spell) { draft.set("concentration", null); }
            break;
        }
        case "toggle":
            setToggle(draft, sheet, event.state, event.on, force);
            break;
        case "apply-condition":
            addCondition(draft, sheet, event.condition, event.level, event.expires, force);
            break;
        case "remove-condition":
        {
            const conditions = draft.get("conditions");
            const index = conditions.findIndex((c) => c.condition === event.condition);
            if (index < 0) { draft.warn("W_CONDITION_ABSENT", `"${event.condition}" is not active`, event.condition); }
            else { draft.set("conditions", conditions.filter((_, i) => i !== index)); }
            break;
        }
        case "custom-effect":
        {
            const expires = normalizeExpiry(event.expires, turnOf(draft).active === true);
            const entry: CustomEffect = {
                name: event.name,
                ...(event.text ? { text: event.text } : {}),
                ...(event.effects ? { effects: [...event.effects] } : {}),
                ...(expires !== undefined ? { expires: expires } : {})
            };
            draft.set("customEffects", [...(draft.get("customEffects") ?? []), entry]);
            break;
        }
        case "end-custom-effect":
        {
            const custom = draft.get("customEffects") ?? [];
            const index = custom.findIndex((c) => sameText(c.name, event.name));
            if (index < 0) { draft.warn("W_NOT_ACTIVE", `no custom effect named "${label(event.name)}"`); }
            else { draft.set("customEffects", custom.filter((_, i) => i !== index)); }
            break;
        }
        case "short-rest":
            shortRest(draft, sheet, event);
            break;
        case "long-rest":
            longRest(draft, sheet, event);
            break;
        case "dawn":
            recharge(draft, sheet, "dawn", event.rolled);
            expire(draft, "dawn");
            break;
        case "death-save":
            deathSave(draft, sheet, event);
            break;
        case "stabilise":
            if ((draft.get("hp").current > 0) && !force)
            {
                draft.warn("W_NOT_DYING", "the character is not at 0 hit points");
            }
            else { draft.set("deathSaves", { successes: 0, failures: 0 }); }
            break;
        case "inspiration":
            draft.set("inspiration", event.value);
            break;
        case "use-action":
            useAction(draft, sheet, event);
            break;
        case "start-turn":
        {
            const turn = turnOf(draft);
            draft.set("turn", { ...turn, used: (turn.used ?? []).filter((a) => a !== "reaction"), active: true });
            expire(draft, "start-turn");
            break;
        }
        case "end-turn":
        {
            const turn = turnOf(draft);
            draft.set("turn", {
                ...turn,
                used: (turn.used ?? []).filter((a) => a === "reaction"),
                actionsTaken: [],
                movementUsed: 0,
                active: false
            });
            expire(draft, "end-turn");
            break;
        }
        case "note":
            break;
        default:
            assertNever(event);
    }

    return draft.finish(event, id);
}

export function undo(state: CharacterState, entry: LogEntry): CharacterState
{
    const kept = Object.entries(state).filter(([key]) => !(key in entry.after));

    return { ...Object.fromEntries(kept), ...entry.before } as CharacterState;
}
