/**
 * Browser persistence for the language choice.
 *
 * A thin adapter over `safeStorage`, so a browser that refuses storage still
 * renders: the choice simply does not survive the session.
 */

import { safeStorageGet, safeStorageSet } from "@/lib/safeStorage";
import type { LanguagePreference, LanguagePreferenceStore } from "./types";

export const LANGUAGE_STORAGE_KEY = "wmm.language";

export const localStorageLanguageStore: LanguagePreferenceStore = {
  load: () => safeStorageGet(LANGUAGE_STORAGE_KEY),
  save: (preference: LanguagePreference) => {
    safeStorageSet(LANGUAGE_STORAGE_KEY, preference);
  },
};
