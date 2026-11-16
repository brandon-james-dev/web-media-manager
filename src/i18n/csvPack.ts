/**
 * CSV language packs.
 *
 * Every language but the default ships as a CSV a translator can open in a
 * spreadsheet. The file is bundled at build time (`?raw`) and parsed once at
 * startup, so a translation never needs a network request.
 *
 * A CSV is data, not code, so it can be wrong in ways the compiler cannot
 * see. The loader therefore validates every row against the registry and
 * keeps only the rows that are sound: a bad row falls back to the default
 * language instead of shipping a broken label, and the rest of the pack still
 * works. Loading never throws.
 */

import { parseCsv } from "./csv";
import {
  PLURAL_CATEGORIES,
  WMM_RESOURCE_KEYS,
  getLanguagePackKeys,
  isPluralResource,
  isWmmResourceKey,
  pluralFormKey,
  type LanguageResources,
} from "./resources";
import type { LanguagePack, WmmLanguage } from "./types";
import { validateLanguagePack, type ResourceIssue } from "./validation";

/** A bundled CSV and the metadata a pack needs besides its text. */
export interface CsvLanguageSource {
  language: WmmLanguage;
  nativeName: string;
  /** The file's text, imported with Vite's `?raw` suffix. */
  csv: string;
  /** Repo path, used in issue messages: `src/i18n/locales/es-MX.csv`. */
  file: string;
}

/** The header every language CSV starts with. */
export const CSV_HEADER = ["key"] as const;

const KEY_COLUMN = "key";
const CSV_EXTENSION = ".csv";
const LOCALES_DIR = "src/i18n/locales";

/** Every plural form key, whatever categories the language uses. */
const PLURAL_FORM_KEYS: ReadonlySet<string> = new Set(
  WMM_RESOURCE_KEYS.filter(isPluralResource).flatMap((key) =>
    PLURAL_CATEGORIES.map((category) => pluralFormKey(key, category))
  )
);

/** A tag is usable only when it is already in its canonical BCP 47 form. */
function isCanonicalLanguageTag(tag: string): boolean {
  try {
    return Intl.getCanonicalLocales(tag)[0] === tag;
  } catch {
    return false;
  }
}

/** The language's own name, or the tag when it is not a language. */
function nativeLanguageName(language: string): string {
  try {
    const name = new Intl.DisplayNames([language], {
      type: "language",
    }).of(language);
    if (!name) return language;
    return name.charAt(0).toLocaleUpperCase(language) + name.slice(1);
  } catch {
    return language;
  }
}

function invalidCsvIssue(
  source: CsvLanguageSource,
  header: readonly string[]
): ResourceIssue {
  return {
    code: "invalid-csv",
    severity: "error",
    key: source.file,
    language: source.language,
    message: `${source.file} must start with a header row containing "${KEY_COLUMN}" and "${source.language}" columns (expected "${[...CSV_HEADER, source.language].join(",")}"); found "${header.join(",")}".`,
  };
}

function invalidLanguageTagIssue(source: CsvLanguageSource): ResourceIssue {
  return {
    code: "invalid-csv",
    severity: "error",
    key: source.file,
    language: source.language,
    message: `${source.file} is named after "${source.language}", which is not a canonical BCP 47 language tag; rename the file to its canonical tag, such as "es-MX".`,
  };
}

/**
 * Parses one CSV into a pack plus the issues found while reading it.
 *
 * Only the `key` column and the column named after the pack's language are
 * read; any other column is ignored.
 * A row with an empty key is a blank spreadsheet row and is skipped. A row
 * with an empty translation is "not translated yet": it is left out of the
 * pack so the default language answers, and validation reports it.
 */
export function loadCsvLanguagePack(source: CsvLanguageSource): {
  pack: LanguagePack;
  issues: ResourceIssue[];
} {
  if (!isCanonicalLanguageTag(source.language)) {
    return {
      pack: {
        language: source.language,
        nativeName: source.nativeName,
        resources: {},
      },
      issues: [invalidLanguageTagIssue(source)],
    };
  }

  const rows = parseCsv(source.csv);
  const header = rows[0] ?? [];
  const keyIndex = header.indexOf(KEY_COLUMN);
  const valueIndex = header.indexOf(source.language);

  if (keyIndex === -1 || valueIndex === -1) {
    return {
      pack: {
        language: source.language,
        nativeName: source.nativeName,
        resources: {},
      },
      issues: [invalidCsvIssue(source, header)],
    };
  }

  const entries: (readonly [string, string])[] = [];
  for (const row of rows.slice(1)) {
    const key = (row[keyIndex] ?? "").trim();
    if (key === "") continue;

    const value = (row[valueIndex] ?? "").trim();
    if (value === "") continue;

    entries.push([key, value]);
  }

  const issues = validateLanguagePack(source.language, entries, source.file);
  const rejected = new Set(
    issues.filter((entry) => entry.severity === "error").map((entry) => entry.key)
  );

  const resources: Partial<Record<keyof LanguageResources, string>> = {};
  for (const [key, value] of entries) {
    if (rejected.has(key)) continue;
    if (!isWmmResourceKey(key) && !PLURAL_FORM_KEYS.has(key)) continue;
    resources[key as keyof LanguageResources] = value;
  }

  return {
    pack: {
      language: source.language,
      nativeName: source.nativeName,
      resources,
    },
    issues,
  };
}

/**
 * The rows a language CSV should contain: the header, then one row per pack
 * key the language needs in registry order, with the existing translation (or
 * an empty cell).
 *
 * Used by `npm run i18n:sync` to add new keys and drop retired ones without
 * touching the translations.
 */
export function createCsvLanguageRows(
  language: WmmLanguage,
  existing?: ReadonlyMap<string, string>
): string[][] {
  const rows: string[][] = [[...CSV_HEADER, language]];

  for (const key of getLanguagePackKeys(language)) {
    rows.push([key, existing?.get(key) ?? ""]);
  }

  return rows;
}

/**
 * The sources a set of bundled CSVs describes, one per file.
 *
 * The file name is the language tag, so adding a language needs no code
 * change: drop in `<tag>.csv` and it is discovered. `files` maps a glob path
 * (`./es-MX.csv`) to the file's text, which is what Vite's `import.meta.glob`
 * returns with `?raw` and `eager`.
 */
export function createCsvLanguageSources(
  files: Record<string, string>
): CsvLanguageSource[] {
  return Object.entries(files)
    .map(([path, csv]) => {
      const name = path.slice(
        path.lastIndexOf("/") + 1,
        -CSV_EXTENSION.length
      );

      return {
        language: name,
        nativeName: nativeLanguageName(name),
        csv,
        file: `${LOCALES_DIR}/${name}${CSV_EXTENSION}`,
      };
    })
    .sort((left, right) => left.language.localeCompare(right.language));
}
