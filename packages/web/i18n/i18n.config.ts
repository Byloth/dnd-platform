import { SHEET_MESSAGES } from "@byloth/dnd-platform-composer";

// The sheet's strings are the composer's (docs/phase-1/06-localisation.md): merged here under `sheet`, next to
// the interface catalogues of i18n/locales/, so one catalogue serves the CLI and the web.
export default defineI18nConfig(() => ({
  fallbackLocale: "en",
  messages: {
    en: { ...SHEET_MESSAGES["en"] },
    it: { ...SHEET_MESSAGES["it"] }
  }
}));
