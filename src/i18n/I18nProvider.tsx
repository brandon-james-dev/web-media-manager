/**
 * Provides the language service to the React tree.
 *
 * Also mirrors the active language onto `<html lang>`, which is what screen
 * readers and the browser's own text handling read.
 */

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { i18n } from "./instance";
import type { I18nService } from "./I18nService";
import { I18nContext } from "./useTranslation";

export function I18nProvider({
  service = i18n,
  children,
}: {
  service?: I18nService;
  children: ReactNode;
}) {
  const language = useSyncExternalStore(
    service.subscribe,
    service.getCurrentLanguage
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
  }, [language]);

  return <I18nContext.Provider value={service}>{children}</I18nContext.Provider>;
}
