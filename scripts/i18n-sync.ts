/**
 * Rewrites every language CSV from the registry.
 *
 * Run after adding, renaming or retiring a resource key:
 *
 *     npm run i18n:sync
 *
 * For each `src/i18n/locales/*.csv` the script keeps the translations it
 * already has, adds a row for every new registry key (empty translation, so
 * the default language answers until someone fills it in), drops rows whose
 * key no longer exists, and drops any column other than `key` and the
 * language. It never changes the translation of an existing row.
 *
 * The CSV text is read from disk rather than imported, because the app's
 * `?raw` import is a Vite feature this plain TS runner does not understand.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseCsv, serializeCsv } from "../src/i18n/csv";
import { createCsvLanguageRows } from "../src/i18n/csvPack";
import { getLanguagePackKeys } from "../src/i18n/resources";
import type { WmmLanguage } from "../src/i18n/types";

const LOCALES_DIR = path.resolve("src/i18n/locales");
const EXTENSION = ".csv";

const files = readdirSync(LOCALES_DIR)
  .filter((name) => name.endsWith(EXTENSION))
  .sort();

if (files.length === 0) {
  console.log(`[i18n:sync] no CSV files in ${LOCALES_DIR}`);
}

for (const name of files) {
  const file = path.join(LOCALES_DIR, name);
  const language = name.slice(0, -EXTENSION.length) as WmmLanguage;
  const rows = parseCsv(readFileSync(file, "utf8"));
  const header = rows[0] ?? [];
  const valueIndex = header.indexOf(language);

  const existing = new Map<string, string>();
  for (const row of rows.slice(1)) {
    const key = (row[0] ?? "").trim();
    if (key === "") continue;
    existing.set(key, valueIndex === -1 ? "" : (row[valueIndex] ?? "").trim());
  }

  const packKeys = getLanguagePackKeys(language);
  const added = packKeys.filter((key) => !existing.has(key));
  const dropped = [...existing.keys()].filter((key) => !packKeys.includes(key));

  writeFileSync(
    file,
    serializeCsv(createCsvLanguageRows(language, existing)),
    "utf8"
  );

  console.log(
    `[i18n:sync] ${name}: ${packKeys.length} keys, ${added.length} added, ${dropped.length} dropped`
  );
  for (const key of added) console.log(`  + ${key} (needs a translation)`);
  for (const key of dropped) console.log(`  - ${key} (no longer registered)`);
}
