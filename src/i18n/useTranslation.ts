/**
 * React binding for the language service.
 *
 * `useSyncExternalStore` subscribes to the service's own listener list, so a
 * language change re-renders every consumer without a provider-level state
 * copy. The context defaults to the singleton, so a component works even when
 * no provider is mounted (tests, isolated stories).
 */

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { i18n } from "./instance";
import type { I18nService } from "./I18nService";
import type { ResourceArgs, WmmResourceKey } from "./resources";
import type { LanguagePreference, WmmLanguage } from "./types";

export const I18nContext = createContext<I18nService>(i18n);

export interface UseTranslationResult {
  t: <K extends WmmResourceKey>(key: K, ...args: ResourceArgs<K>) => string;
  format: <K extends WmmResourceKey>(
    key: K,
    ...args: ResourceArgs<K>
  ) => string;
  get: (key: WmmResourceKey) => string;
  language: WmmLanguage;
  /** The stored choice; `"auto"` follows the browser. */
  preference: LanguagePreference;
  /** The language `"auto"` currently resolves to. */
  detectedLanguage: WmmLanguage;
  changeLanguage: (preference: LanguagePreference) => void;
  languages: readonly { language: WmmLanguage; nativeName: string }[];
}

export function useTranslation(): UseTranslationResult {
  const service = useContext(I18nContext);
  const language = useSyncExternalStore(
    service.subscribe,
    service.getCurrentLanguage
  );
  const preference = useSyncExternalStore(
    service.subscribe,
    service.getLanguagePreference
  );

  return useMemo(
    () => ({
      t: service.t,
      format: service.format.bind(service),
      get: service.get.bind(service),
      language,
      preference,
      detectedLanguage: service.getDetectedLanguage(),
      changeLanguage: service.changeLanguage.bind(service),
      languages: service.getAvailableLanguages(),
    }),
    [service, language, preference]
  );
}
