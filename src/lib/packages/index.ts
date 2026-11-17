/**
 * Shared helpers for installable packages such as themes and visualizer
 * plugins: ZIP reading with safety limits, MIME types and version comparison.
 *
 * @example
 * ```ts
 * import { compareVersions, mimeTypeOf, readZipArchive } from "@/lib/packages";
 * const entries = readZipArchive(bytes, { maxEntries: 500 });
 * mimeTypeOf(entries[0].path);
 * compareVersions("1.2.0", "1.10.0") < 0;
 * ```
 */
export {
  DEFAULT_ZIP_LIMITS,
  PackageArchiveError,
  readZipArchive,
} from "./zip/readZipArchive";
export type {
  PackageArchiveEntry,
  PackageArchiveErrorCode,
  ReadZipOptions,
} from "./zip/readZipArchive";
export { mimeTypeOf } from "./mimeTypeOf";
export { SEMVER_PATTERN, compareVersions } from "./semver";
