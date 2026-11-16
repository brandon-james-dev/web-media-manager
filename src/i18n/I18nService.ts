/**
 * Language resolution and text lookup.
 *
 * One service owns the active language, the packs that can supply text, and
 * the persistence port that remembers the choice. React reads it through
 * `useTranslation`; non-React code uses the singleton in `instance.ts`.
 *
 * Lookup never fails: a key missing from the active pack falls back to the
 * default pack, then to the key itself, so a half-translated language shows
 * readable text instead of blanks. Every fallback is reported once per
 * (language, key) so a missing translation is noticed without flooding the
 * console on each render.
 */

import { formatTemplate } from "./format";
import {
  isPluralResource,
  isWmmResourceKey,
  pluralFormKey,
  type PluralCategory,
  type ResourceArg,
  type ResourceArgs,
  type WmmPluralKey,
  type WmmResourceKey,
} from "./resources";
import {
  AUTO_LANGUAGE,
  type LanguagePack,
  type LanguagePreference,
  type LanguagePreferenceStore,
  type WmmLanguage,
} from "./types";

export interface I18nServiceOptions {
  packs: readonly LanguagePack[];
  defaultLanguage: WmmLanguage;
  store?: LanguagePreferenceStore;
  /** Preferred tags, most wanted first. Defaults to `navigator.languages`. */
  detect?: () => readonly string[];
  onMissing?: (key: string, language: WmmLanguage) => void;
}

function isThenable<T>(value: T | Promise<T> | undefined): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<T>).then === "function"
  );
}

function detectNavigatorLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  const preferred = navigator.languages;
  if (Array.isArray(preferred) && preferred.length > 0) return preferred;
  return navigator.language ? [navigator.language] : [];
}

function warnMissing(key: string, language: WmmLanguage): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[i18n] ${language} has no text for "${key}"; using the default language.`
    );
  }
}

export class I18nService {
  private readonly packs: ReadonlyMap<WmmLanguage, LanguagePack>;
  private readonly defaultLanguage: WmmLanguage;
  private readonly store: LanguagePreferenceStore | undefined;
  private readonly detect: () => readonly string[];
  private readonly onMissing: (key: string, language: WmmLanguage) => void;
  private readonly listeners = new Set<(language: WmmLanguage) => void>();
  private readonly reported = new Set<string>();
  private readonly pluralRules = new Map<WmmLanguage, Intl.PluralRules>();
  private language: WmmLanguage;
  private preference: LanguagePreference = AUTO_LANGUAGE;
  private changedExplicitly = false;

  constructor(options: I18nServiceOptions) {
    this.packs = new Map(options.packs.map((pack) => [pack.language, pack]));
    this.defaultLanguage = options.defaultLanguage;
    this.store = options.store;
    this.detect = options.detect ?? detectNavigatorLanguages;
    this.onMissing = options.onMissing ?? warnMissing;
    this.language = this.detectLanguage();

    if (typeof window !== "undefined" && !options.detect) {
      window.addEventListener("languagechange", this.followDetected);
    }

    const stored = this.store?.load();
    if (isThenable(stored)) {
      // An asynchronous store cannot answer before the first render, so start
      // from the detected language and adopt the stored one when it arrives.
      void stored
        .then((value) => {
          if (this.changedExplicitly) return;
          const language = this.matchStored(value);
          if (language) this.applyPreference(language);
        })
        .catch(() => {
          // A store that cannot be read leaves the detected language in place.
        });
      return;
    }

    const language = this.matchStored(stored);
    if (language) {
      this.preference = language;
      this.language = language;
    }
  }

  /** The active language. Stable reference, so it can be a store snapshot. */
  readonly getCurrentLanguage = (): WmmLanguage => this.language;

  /** The stored choice: a language, or `"auto"` to follow the browser. */
  readonly getLanguagePreference = (): LanguagePreference => this.preference;

  /** The language `"auto"` resolves to right now. */
  getDetectedLanguage(): WmmLanguage {
    return this.detectLanguage();
  }

  getAvailableLanguages(): readonly {
    language: WmmLanguage;
    nativeName: string;
  }[] {
    return [...this.packs.values()].map((pack) => ({
      language: pack.language,
      nativeName: pack.nativeName,
    }));
  }

  isLanguage(tag: string): tag is WmmLanguage {
    return this.packs.has(tag as WmmLanguage);
  }

  /** Notifies on every language change; the returned function unsubscribes. */
  readonly subscribe = (
    listener: (language: WmmLanguage) => void
  ): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * The raw string for a key, templates unformatted. A plural has no single
   * string, so this returns its `Other` form.
   */
  get(key: WmmResourceKey): string {
    if (isPluralResource(key)) return this.pluralOther(key) ?? key;

    const current = this.packs.get(this.language)?.resources[key];
    if (typeof current === "string") return current;

    const fallback = this.packs.get(this.defaultLanguage)?.resources[key];
    this.reportMissing(key);
    return typeof fallback === "string" ? fallback : key;
  }

  format<K extends WmmResourceKey>(key: K, ...args: ResourceArgs<K>): string {
    const values =
      (args as readonly (readonly ResourceArg[] | undefined)[])[0] ?? [];
    if (isPluralResource(key)) {
      const text = this.pluralText(key, Number(values[0] ?? 0)) ?? key;
      return formatTemplate(text, values);
    }
    return formatTemplate(this.get(key), values);
  }

  /** `format`, bound so it can be destructured from `useTranslation()`. */
  readonly t = <K extends WmmResourceKey>(
    key: K,
    ...args: ResourceArgs<K>
  ): string => this.format(key, ...args);

  /**
   * Sets and persists the preference. `"auto"` follows the browser's
   * preferred languages, including later changes to them.
   */
  changeLanguage(preference: LanguagePreference): void {
    if (preference !== AUTO_LANGUAGE && !this.isLanguage(preference)) {
      throw new Error(
        `[i18n] Unknown language "${preference}". Available: ${AUTO_LANGUAGE}, ${this.getAvailableLanguages()
          .map((entry) => entry.language)
          .join(", ")}`
      );
    }

    this.changedExplicitly = true;
    if (preference === this.preference) return;

    const saved = this.store?.save(preference);
    if (isThenable(saved)) {
      void saved.catch(() => {
        // Storage unavailable: the choice holds for this session only.
      });
    }

    this.applyPreference(preference);
  }

  /**
   * Untyped entry point for values that arrive as data rather than code — the
   * `labelKey`, `titleKey`, `resourceKey` and `templateKey` attributes a theme
   * renderer will read. Unknown names return `undefined` so the caller can
   * reject them instead of rendering a raw key.
   */
  resolve(name: string, args?: readonly ResourceArg[]): string | undefined {
    if (!isWmmResourceKey(name)) return undefined;
    return formatTemplate(this.get(name), args ?? []);
  }

  private applyPreference(preference: LanguagePreference): void {
    this.preference = preference;
    this.setLanguage(
      preference === AUTO_LANGUAGE ? this.detectLanguage() : preference,
      true
    );
  }

  private readonly followDetected = (): void => {
    if (this.preference !== AUTO_LANGUAGE) return;
    this.setLanguage(this.detectLanguage(), false);
  };

  private setLanguage(language: WmmLanguage, notifyAlways: boolean): void {
    if (language === this.language && !notifyAlways) return;
    this.language = language;
    for (const listener of this.listeners) listener(language);
  }

  private reportMissing(key: string): void {
    const id = `${this.language}|${key}`;
    if (this.reported.has(id)) return;
    this.reported.add(id);
    this.onMissing(key, this.language);
  }

  private pluralRulesFor(language: WmmLanguage): Intl.PluralRules {
    const cached = this.pluralRules.get(language);
    if (cached) return cached;

    let rules: Intl.PluralRules;
    try {
      rules = new Intl.PluralRules(language);
    } catch {
      rules = new Intl.PluralRules(this.defaultLanguage);
    }
    this.pluralRules.set(language, rules);
    return rules;
  }

  private selectCategory(
    language: WmmLanguage,
    count: number
  ): PluralCategory {
    return this.pluralRulesFor(language).select(count) as PluralCategory;
  }

  /**
   * The active language's text for `count`: its category form, then its
   * `Other` form, then the default language's form for the same count, then
   * the default language's `Other` form.
   */
  private pluralText(base: WmmPluralKey, count: number): string | undefined {
    const formKey = pluralFormKey(base, this.selectCategory(this.language, count));
    const active = this.packs.get(this.language)?.resources[formKey];
    if (typeof active === "string") return active;

    this.reportMissing(formKey);

    const activeOther = this.packs.get(this.language)?.resources[
      pluralFormKey(base, "other")
    ];
    if (typeof activeOther === "string") return activeOther;

    const fallback = this.packs.get(this.defaultLanguage)?.resources[
      pluralFormKey(base, this.selectCategory(this.defaultLanguage, count))
    ];
    if (typeof fallback === "string") return fallback;

    const fallbackOther = this.packs.get(this.defaultLanguage)?.resources[
      pluralFormKey(base, "other")
    ];
    return typeof fallbackOther === "string" ? fallbackOther : undefined;
  }

  private pluralOther(base: WmmPluralKey): string | undefined {
    const formKey = pluralFormKey(base, "other");
    const active = this.packs.get(this.language)?.resources[formKey];
    if (typeof active === "string") return active;

    this.reportMissing(formKey);

    const fallback = this.packs.get(this.defaultLanguage)?.resources[formKey];
    return typeof fallback === "string" ? fallback : undefined;
  }

  private matchStored(value: string | null | undefined): WmmLanguage | undefined {
    if (typeof value !== "string") return undefined;
    return this.isLanguage(value) ? value : undefined;
  }

  private detectLanguage(): WmmLanguage {
    for (const tag of this.detect()) {
      const language = this.matchTag(tag);
      if (language) return language;
    }
    return this.defaultLanguage;
  }

  private matchTag(tag: string): WmmLanguage | undefined {
    const normalized = tag.toLowerCase();
    if (normalized === "") return undefined;

    for (const language of this.packs.keys()) {
      if (language.toLowerCase() === normalized) return language;
    }

    const base = normalized.split("-")[0];
    for (const language of this.packs.keys()) {
      if (language.toLowerCase().split("-")[0] === base) return language;
    }

    return undefined;
  }
}
