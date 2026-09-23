/**
 * The composer's strings and the translator it uses when the caller brings none. A caller with its own
 * translation layer (the web application's vue-i18n) merges `SHEET_MESSAGES` into its catalogues under the
 * `sheet` key and passes its own `translate`; the composer stays framework-free (docs/phase-1/06-localisation.md).
 */

import { en } from "./en.js";
import { it } from "./it.js";
import type { SheetMessages } from "./en.js";

export type { SheetMessages };

export type TranslateParams = Readonly<Record<string, string | number>>;

/** `translate("sheet.core.ac")`, `translate("sheet.units.feet", { value: 30 })`; a missing key returns the key. */
export type Translate = (key: string, params?: TranslateParams) => string;

/** Every language the composer ships, each under the `sheet` key its callers merge. */
export const SHEET_MESSAGES: Readonly<Record<string, { readonly sheet: SheetMessages }>> = {
    en: { sheet: en },
    it: { sheet: it }
};

function lookup(messages: unknown, key: string): string | undefined
{
    let node = messages;
    for (const part of key.split("."))
    {
        if ((typeof node !== "object") || (node === null)) { return undefined; }
        node = (node as Record<string, unknown>)[part];
    }

    return typeof node === "string" ? node : undefined;
}

/** vue-i18n's choice of plural form: two forms are one / other, three are zero / one / other. */
function pluralForm(message: string, count: number): string
{
    const forms = message.split("|").map((f) => f.trim());
    if (forms.length === 1) { return message; }
    if (forms.length === 2) { return forms[count === 1 ? 0 : 1]!; }

    return forms[count === 0 ? 0 : count === 1 ? 1 : 2]!;
}

/** The composer's own translator over `SHEET_MESSAGES`: the language asked for, English for a missing key. */
export function createTranslate(language = "en"): Translate
{
    const own = SHEET_MESSAGES[language];
    const english = SHEET_MESSAGES["en"];

    return (key, params = {}) =>
    {
        const message = (own ? lookup(own, key) : undefined) ?? lookup(english, key);
        if (message === undefined) { return key; }

        const count = params["count"];
        const form = typeof count === "number" ? pluralForm(message, count) : message;

        return form.replace(/\{(\w+)\}/g, (whole, name: string) =>
            (params[name] !== undefined ? String(params[name]) : whole));
    };
}
