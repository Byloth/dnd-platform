/**
 * What the composers of single entities share (the creature's stat block, the compendium's entries): the
 * translator with a fallback, localized texts, numbers in the language, distances and weights in the chosen
 * units, entity names and lists. The sheet's composer keeps its own, bound to the derived sheet.
 */

import type { PackageSet } from "@byloth/dnd-platform-loader";

import { createTranslate } from "./messages/index.js";
import type { Translate, TranslateParams } from "./messages/index.js";

export type Text = Readonly<Record<string, string | undefined>>;
export type Value = number | string;

export interface DisplayOptions
{
    readonly packages: PackageSet;
    readonly language?: string;
    readonly translate?: Translate;
    /** Default `imperial`; `metric` as in the sheet (5 ft = 1,5 m, 1 lb = 0,5 kg). */
    readonly units?: "imperial" | "metric";
}

export abstract class DisplayComposer
{
    protected readonly _language: string;
    protected readonly _translate: Translate;

    public constructor(protected readonly _options: DisplayOptions)
    {
        this._language = _options.language ?? "en";
        this._translate = _options.translate ?? createTranslate(this._language);
    }

    /** A key of the `sheet` catalogue; the fallback when the key is missing, if one is given. */
    protected t(key: string, params?: TranslateParams, fallback?: string): string
    {
        const text = this._translate(`sheet.${key}`, params);

        return (text === `sheet.${key}` && fallback !== undefined) ? fallback : text;
    }

    protected text(label: Text | undefined): string
    {
        if (label === undefined) { return ""; }

        return label[this._language] ?? label["en"] ?? Object.values(label).find((v) => v !== undefined) ?? "";
    }

    protected number(value: number): string
    {
        return new Intl.NumberFormat(this._language, { maximumFractionDigits: 1 }).format(value);
    }

    protected get metric(): boolean { return this._options.units === "metric"; }

    /** A distance in feet, in the chosen units. */
    protected feet(value: Value): string
    {
        if (!this.metric || (typeof value !== "number")) { return this.t("units.feet", { value: value }); }

        return this.t("units.metres", { value: this.number(value * 0.3) });
    }

    /** A weight in pounds, in the chosen units. */
    protected pounds(value: Value): string
    {
        if (!this.metric || (typeof value !== "number"))
        {
            return this.t("units.pounds", { value: typeof value === "number" ? this.number(value) : value });
        }

        return this.t("units.kilograms", { value: this.number(value * 0.5) });
    }

    protected entityName(id: string): string
    {
        const data = this._options.packages.entities.get(id as never)?.data as { name?: Text } | undefined;

        return data?.name ? this.text(data.name) : id.split(".").pop() ?? id;
    }

    protected list(items: readonly string[], type: "conjunction" | "disjunction" = "conjunction"): string
    {
        return new Intl.ListFormat(this._language, { type: type }).format(items);
    }
}
