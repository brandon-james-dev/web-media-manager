/**
 * The application's language service.
 *
 * Lives in its own module so the React context can default to it without
 * importing the barrel, which would close an import cycle through the
 * provider.
 *
 * The default language is code; every other language is a bundled CSV, loaded
 * and validated once here. `CSV_PACK_ISSUES` keeps what the loader found so
 * dev startup can report it without validating the filtered packs a second
 * time.
 */

import { loadCsvLanguagePack } from "./csvPack";
import { enUS } from "./en-US";
import { I18nService } from "./I18nService";
import { CSV_LANGUAGE_SOURCES } from "./locales";
import { localStorageLanguageStore } from "./storage";
import type { LanguagePack, WmmLanguage } from "./types";
import type { ResourceIssue } from "./validation";

const loadedCsvPacks = CSV_LANGUAGE_SOURCES.map((source) =>
  loadCsvLanguagePack(source)
);

/** Everything the CSV loader reported, one entry per problem. */
export const CSV_PACK_ISSUES: readonly ResourceIssue[] = loadedCsvPacks.flatMap(
  (entry) => entry.issues
);

export const LANGUAGE_PACKS: readonly LanguagePack[] = [
  enUS,
  ...loadedCsvPacks.map((entry) => entry.pack),
];

export const DEFAULT_LANGUAGE: WmmLanguage = "en-US";

export const i18n = new I18nService({
  packs: LANGUAGE_PACKS,
  defaultLanguage: DEFAULT_LANGUAGE,
  store: localStorageLanguageStore,
});
