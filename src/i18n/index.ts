/**
 * Public surface of the resource / i18n framework.
 *
 * Everything a component, a test or (later) a theme renderer needs comes from
 * here: the registry and its derived types, the language packs, the service
 * and its singleton, validation, and the React hook. `I18nProvider` is
 * imported from `@/i18n/I18nProvider` instead: a component module pulls the
 * dev-server refresh preamble, which reads `window` and breaks the web worker
 * that reaches this barrel.
 */

import { enUS } from "./en-US";
import { CSV_PACK_ISSUES } from "./instance";
import { validateLanguagePacks, type ResourceIssue } from "./validation";

export * from "./resources";
export * from "./types";
export * from "./format";
export * from "./validation";
export * from "./storage";
export * from "./instance";
export { enUS } from "./en-US";
export { parseCsv, serializeCsv } from "./csv";
export {
  createCsvLanguageRows,
  loadCsvLanguagePack,
  type CsvLanguageSource,
} from "./csvPack";
export { CSV_LANGUAGE_SOURCES } from "./locales";
export { I18nService } from "./I18nService";
export type { I18nServiceOptions } from "./I18nService";
export { I18nContext, useTranslation } from "./useTranslation";
export type { UseTranslationResult } from "./useTranslation";

/**
 * Validates the packs this build ships with (dev startup, tests).
 *
 * The default pack is validated from its entries; a CSV pack is validated by
 * the loader, which already reported every row it read, so its issues are
 * reused instead of re-validating the filtered pack (which would report every
 * untranslated key a second time).
 */
export function validateAppResources(): ResourceIssue[] {
  return [...validateLanguagePacks([enUS]), ...CSV_PACK_ISSUES];
}
