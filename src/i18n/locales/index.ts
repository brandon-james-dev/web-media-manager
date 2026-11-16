/**
 * Bundled language CSVs.
 *
 * Every `*.csv` in this directory is imported with Vite's `?raw` suffix, so
 * its text is part of the build and a translation never needs a network
 * request. The file name is the language tag, so adding a language means
 * dropping in a CSV and nothing else. The `file` path is what issue messages
 * name, so a translator is sent to the row to fix.
 */

import { createCsvLanguageSources } from "../csvPack";
import type { CsvLanguageSource } from "../csvPack";

const files = import.meta.glob("./*.csv", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const CSV_LANGUAGE_SOURCES: readonly CsvLanguageSource[] =
  createCsvLanguageSources(files);
