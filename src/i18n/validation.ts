/**
 * Resource validation.
 *
 * Two audiences, one rule set. The TypeScript compiler already rejects a pack
 * with a missing or unknown key, but packs will later arrive as JSON or XML
 * from outside the build, so the same rules are checked at runtime: the
 * registry itself (naming, duplicates, template params) and each pack's
 * entries (coverage, placeholders). Entry lists rather than objects are the
 * input, because a parsed document can contain the same key twice and that is
 * exactly the kind of mistake a report should name.
 */

import {
  PLURAL_CATEGORIES,
  WMM_RESOURCE_KEYS,
  WMM_RESOURCE_KEY_PATTERN,
  WMM_RESOURCE_NAMESPACES,
  getLanguagePackKeys,
  getPluralCategories,
  getResourceArity,
  getResourceDescriptor,
  isPluralResource,
  isWmmResourceKey,
  pluralFormKey,
  type PluralCategory,
  type WmmPluralKey,
  type WmmResourceKey,
} from "./resources";
import { extractPlaceholders } from "./format";
import type { LanguagePack } from "./types";

export type ResourceIssueCode =
  | "invalid-key"
  | "duplicate-key"
  | "key-collision"
  | "missing-key"
  | "missing-translation"
  | "unexpected-key"
  | "invalid-placeholder"
  | "unused-placeholder"
  | "unused-plural-form"
  | "invalid-csv";

export interface ResourceIssue {
  code: ResourceIssueCode;
  severity: "error" | "warning";
  key: string;
  language?: string;
  message: string;
}

/** A template param name: a lowerCamelCase identifier. */
const PARAM_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

const NAMESPACE_LIST = WMM_RESOURCE_NAMESPACES.join(", ");

function issue(
  code: ResourceIssueCode,
  severity: ResourceIssue["severity"],
  key: string,
  message: string,
  language?: string
): ResourceIssue {
  return language === undefined
    ? { code, severity, key, message }
    : { code, severity, key, language, message };
}

/** One plural form key, and the plural and category it belongs to. */
interface PluralForm {
  base: WmmPluralKey;
  category: PluralCategory;
}

/**
 * Every plural form key of the given registry keys, mapped to its plural and
 * category, so a pack entry can be recognised as a form rather than a key.
 */
function pluralForms(keys: readonly WmmResourceKey[]): Map<string, PluralForm> {
  const forms = new Map<string, PluralForm>();
  for (const key of keys) {
    if (!isPluralResource(key)) continue;
    for (const category of PLURAL_CATEGORIES) {
      forms.set(pluralFormKey(key, category), { base: key, category });
    }
  }
  return forms;
}

/**
 * Checks the registry's own shape: key syntax, duplicates, case and prefix
 * collisions, and the params of every template descriptor.
 */
export function validateResourceRegistry(
  keys: readonly string[] = WMM_RESOURCE_KEYS
): ResourceIssue[] {
  const issues: ResourceIssue[] = [];
  const seen = new Set<string>();
  const seenLower = new Map<string, string>();

  for (const key of keys) {
    if (!WMM_RESOURCE_KEY_PATTERN.test(key)) {
      issues.push(
        issue(
          "invalid-key",
          "error",
          key,
          `"${key}" is not a valid resource key. Use one of the namespaces ${NAMESPACE_LIST}, followed by lowerCamelCase segments separated by dots (for example "playback.nowPlaying"), and register it in src/i18n/resources.ts.`
        )
      );
    }

    if (seen.has(key)) {
      issues.push(
        issue(
          "duplicate-key",
          "error",
          key,
          `"${key}" is registered more than once in src/i18n/resources.ts; keep a single entry.`
        )
      );
    }
    seen.add(key);

    const lower = key.toLowerCase();
    const previous = seenLower.get(lower);
    if (previous === undefined) {
      seenLower.set(lower, key);
    } else if (previous !== key) {
      issues.push(
        issue(
          "key-collision",
          "error",
          key,
          `"${key}" and "${previous}" differ only by case. Keys must be unique ignoring case, because theme authors confuse casing; rename one in src/i18n/resources.ts.`
        )
      );
    }
  }

  const unique = [...seen];
  for (const key of unique) {
    for (const other of unique) {
      if (other !== key && other.startsWith(`${key}.`)) {
        issues.push(
          issue(
            "key-collision",
            "error",
            key,
            `"${key}" is a prefix of "${other}". A nested JSON export would need "${key}" to be both a string and an object; rename one in src/i18n/resources.ts.`
          )
        );
      }
    }
  }

  for (const key of unique) {
    if (!isWmmResourceKey(key)) continue;
    const descriptor = getResourceDescriptor(key);

    if (descriptor.kind === "plural" && descriptor.params.length === 0) {
      issues.push(
        issue(
          "invalid-placeholder",
          "error",
          key,
          `Plural "${key}" declares no params. A plural needs at least the count placeholder; add it in src/i18n/resources.ts.`
        )
      );
    }

    if (descriptor.kind !== "template") continue;

    if (descriptor.params.length === 0) {
      issues.push(
        issue(
          "invalid-placeholder",
          "error",
          key,
          `Template "${key}" declares no params. A template needs at least one named placeholder; add them in src/i18n/resources.ts.`
        )
      );
    }

    const seenParams = new Set<string>();
    for (const param of descriptor.params) {
      if (!PARAM_PATTERN.test(param)) {
        issues.push(
          issue(
            "invalid-placeholder",
            "error",
            key,
            `Template "${key}" declares the param "${param}", which is not a lowerCamelCase identifier; rename it in src/i18n/resources.ts.`
          )
        );
      }
      if (seenParams.has(param)) {
        issues.push(
          issue(
            "invalid-placeholder",
            "error",
            key,
            `Template "${key}" declares the param "${param}" more than once; give each placeholder its own name in src/i18n/resources.ts.`
          )
        );
      }
      seenParams.add(param);
    }
  }

  const forms = pluralForms(WMM_RESOURCE_KEYS);
  for (const key of unique) {
    const form = forms.get(key);
    if (form === undefined) continue;
    issues.push(
      issue(
        "key-collision",
        "error",
        key,
        `"${key}" is registered as a resource key and is also the ${form.category} form of the plural "${form.base}". Rename one in src/i18n/resources.ts.`
      )
    );
  }

  return issues;
}

/**
 * Checks one language's entries against the registry: coverage, duplicates,
 * stray keys, empty text and placeholder use. `file` names the source in every
 * message, so a CSV row is reported against the CSV rather than a TS file.
 */
export function validateLanguagePack(
  language: string,
  entries: Iterable<readonly [string, unknown]>,
  file: string = `src/i18n/${language}.ts`
): ResourceIssue[] {
  const issues: ResourceIssue[] = [];
  const seen = new Set<string>();
  const forms = pluralForms(WMM_RESOURCE_KEYS);
  const categories = getPluralCategories(language);

  for (const [key, value] of entries) {
    if (seen.has(key)) {
      issues.push(
        issue(
          "duplicate-key",
          "error",
          key,
          `"${key}" appears more than once in ${file}; keep a single entry.`,
          language
        )
      );
      continue;
    }
    seen.add(key);

    const isKey = isWmmResourceKey(key);
    const form = isKey ? undefined : forms.get(key);

    if (!isKey && form === undefined) {
      issues.push(
        issue(
          "unexpected-key",
          "error",
          key,
          `"${key}" is not a registered resource key. Remove it from ${file}, or register it in src/i18n/resources.ts.`,
          language
        )
      );
      continue;
    }

    if (typeof value !== "string" || value.trim() === "") {
      issues.push(
        issue(
          "missing-translation",
          "error",
          key,
          `"${key}" has no text. Add a translation to ${file}.`,
          language
        )
      );
      continue;
    }

    if (form !== undefined) {
      if (!categories.includes(form.category)) {
        issues.push(
          issue(
            "unused-plural-form",
            "warning",
            key,
            `"${key}" is the ${form.category} form of "${form.base}", but ${language} never uses that category. Remove it from ${file}.`,
            language
          )
        );
      }

      const formArity = getResourceArity(form.base);
      for (const index of extractPlaceholders(value)) {
        if (index >= formArity) {
          issues.push(
            issue(
              "invalid-placeholder",
              "error",
              key,
              `"${key}" uses {${index}} but "${form.base}" declares ${formArity} param(s). Fix the placeholder in ${file}, or add the param in src/i18n/resources.ts.`,
              language
            )
          );
        }
      }
      continue;
    }

    const arity = getResourceArity(key as WmmResourceKey);
    const placeholders = extractPlaceholders(value);

    if (arity === 0) {
      if (placeholders.length > 0) {
        issues.push(
          issue(
            "invalid-placeholder",
            "error",
            key,
            `"${key}" is a text resource but its translation uses {${placeholders[0]}}. Text resources take no arguments; remove the placeholder from ${file}.`,
            language
          )
        );
      }
      continue;
    }

    for (const index of placeholders) {
      if (index >= arity) {
        issues.push(
          issue(
            "invalid-placeholder",
            "error",
            key,
            `"${key}" uses {${index}} but the template declares ${arity} param(s). Fix the placeholder in ${file}, or add the param in src/i18n/resources.ts.`,
            language
          )
        );
      }
    }

    for (let index = 0; index < arity; index += 1) {
      if (placeholders.includes(index)) continue;
      issues.push(
        issue(
          "unused-placeholder",
          "warning",
          key,
          `"${key}" never uses {${index}}. Callers still have to pass it; use it in ${file}.`,
          language
        )
      );
    }
  }

  for (const key of getLanguagePackKeys(language)) {
    if (seen.has(key)) continue;
    const form = forms.get(key);
    issues.push(
      issue(
        "missing-key",
        "error",
        key,
        form === undefined
          ? `"${key}" is registered in src/i18n/resources.ts but has no text. Add it to ${file}.`
          : `"${key}" is the ${form.category} form of "${form.base}" and has no text. Add it to ${file}.`,
        language
      )
    );
  }

  return issues;
}

/** Registry issues plus every pack's issues, including repeated languages. */
export function validateLanguagePacks(
  packs: readonly LanguagePack[]
): ResourceIssue[] {
  const issues = validateResourceRegistry();
  const seen = new Set<string>();

  for (const pack of packs) {
    if (seen.has(pack.language)) {
      issues.push(
        issue(
          "duplicate-key",
          "error",
          pack.language,
          `Two language packs declare "${pack.language}". Keep one entry in LANGUAGE_PACKS (src/i18n/instance.ts).`,
          pack.language
        )
      );
      continue;
    }
    seen.add(pack.language);
    issues.push(
      ...validateLanguagePack(pack.language, Object.entries(pack.resources))
    );
  }

  return issues;
}

/** One line per issue, grouped by language (registry issues first). */
export function formatResourceIssues(issues: readonly ResourceIssue[]): string {
  const groups = new Map<string, ResourceIssue[]>();

  for (const entry of issues) {
    const group = entry.language ?? "registry";
    const list = groups.get(group);
    if (list) {
      list.push(entry);
    } else {
      groups.set(group, [entry]);
    }
  }

  const lines: string[] = [];
  for (const [group, list] of groups) {
    for (const entry of list) {
      lines.push(`[i18n] ${group} ${entry.code} "${entry.key}": ${entry.message}`);
    }
  }

  return lines.join("\n");
}

/**
 * Logs a validation result: one grouped message for errors and one for
 * warnings, so a broken pack does not flood the console.
 */
export function reportResourceIssues(
  issues: readonly ResourceIssue[],
  logger: Pick<Console, "error" | "warn"> = console
): void {
  if (issues.length === 0) return;

  const errors = issues.filter((entry) => entry.severity === "error");
  if (errors.length > 0) {
    logger.error(
      `[i18n] ${errors.length} resource error(s):\n${formatResourceIssues(errors)}`
    );
  }

  const warnings = issues.filter((entry) => entry.severity === "warning");
  if (warnings.length > 0) {
    logger.warn(
      `[i18n] ${warnings.length} resource warning(s):\n${formatResourceIssues(warnings)}`
    );
  }
}

/** Throws when any pack has an error-severity issue (used by tests/tooling). */
export function assertValidResources(packs: readonly LanguagePack[]): void {
  const errors = validateLanguagePacks(packs).filter(
    (entry) => entry.severity === "error"
  );
  if (errors.length > 0) {
    throw new Error(formatResourceIssues(errors));
  }
}
