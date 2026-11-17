/**
 * Validation stages 1 (archive) and 2 (manifest) for theme packages.
 *
 * @example
 * ```json
 * { "kind": "theme", "spec": "1.0", "id": "classic-blue", "name": "Classic Blue",
 *   "version": "1.2.0", "formFactors": ["desktop"], "colorSchemes": ["dark"] }
 * ```
 * @example
 * ```ts
 * const archive = checkArchive(await file.arrayBuffer());
 * const { manifest, issues } = checkManifest(archive.files, appVersion);
 * ```
 */
export {
  HOST_SPEC,
  PACKAGE_LIMITS,
  checkArchive,
  checkManifest,
} from "./checkPackage";
export type {
  ColorScheme,
  ManifestResult,
  ThemeArchive,
  ThemeManifest,
} from "./checkPackage";
