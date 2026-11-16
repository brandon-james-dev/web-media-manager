/**
 * Language pack contract.
 *
 * A pack is one language's text for the registered resource keys. The default
 * language is a typed code file, so its `resources` is the full
 * `LanguageResources` (`DefaultLanguagePack`) and a missing or unknown key
 * does not compile. Every other language is a CSV a non-technical translator
 * edits, so its `resources` is partial: an untranslated key falls back to the
 * default language instead of breaking the build.
 *
 * `LanguagePreferenceStore` is the persistence PORT, not an implementation:
 * the browser binding stores the tag in localStorage today, and a Dexie-backed
 * store (which is asynchronous) can replace it without touching the service.
 * That is why both methods may return a promise.
 */

import type { LanguageResources } from "./resources";

/**
 * A BCP 47 language tag. Any tag a bundled CSV is named after is a language
 * the application ships text for, so the type is open rather than a union of
 * the tags that exist today.
 */
export type WmmLanguage = string;

export interface LanguagePack {
  language: WmmLanguage;
  /** The language's own name, shown in the language picker. */
  nativeName: string;
  /** Partial: a key with no text falls back to the default language. */
  resources: Readonly<Partial<LanguageResources>>;
}

/**
 * A pack that covers every key. The default language is written as code and
 * declared `satisfies DefaultLanguagePack`, so English completeness stays a
 * compile error.
 */
export type DefaultLanguagePack = LanguagePack & {
  resources: LanguageResources;
};

/**
 * What the user chose: a specific language, or `"auto"` to follow the
 * browser's preferred languages. `"auto"` is the default when nothing is
 * stored.
 */
export type LanguagePreference = WmmLanguage | "auto";

export const AUTO_LANGUAGE = "auto" satisfies LanguagePreference;

export interface LanguagePreferenceStore {
  load(): string | null | Promise<string | null>;
  save(preference: LanguagePreference): void | Promise<void>;
}
