/**
 * Plugin system (framework-free core).
 *
 * A plugin is a ZIP with a `manifest.json`. `PluginManager` validates the
 * archive, stores it through the `VisualizerPluginStore` port and resolves it
 * for a host. One manager serves every kind — visualizers, lyrics providers,
 * music sources and metadata providers — so install, validate and store are
 * shared and only the host differs per kind. This module stays portable so a
 * Tauri or server binding can reuse it.
 *
 * Extension seams:
 *  - new kinds: add the id to `PluginKind` and a descriptor union member in
 *    `contracts/PluginProvider`.
 *  - new runtimes: add a descriptor in `@/core/visualizers/contracts`
 *    `VisualizerRuntime` and a host factory in `@/lib/visualizers`.
 *  - hosts live outside this module: `@/lib/plugins` for the manager instance
 *    and boot, `@/lib/visualizers` for runtime hosts.
 */
export * from "./contracts";
export {
  PluginManager,
  PluginInstallError,
  PluginLoadError,
} from "./PluginManager";
export type {
  InstallPluginOptions,
  InstallPluginResult,
  InspectedPlugin,
  PluginManagerOptions,
} from "./PluginManager";
export { coerceSettingsValues, getDefaultSettings } from "./manifest/settings";
export {
  parsePluginManifestJson,
  validatePluginManifest,
} from "./manifest/validateManifest";
export type {
  ManifestIssue,
  ManifestIssueCode,
  ManifestIssueSeverity,
  ManifestValidationResult,
} from "./manifest/validateManifest";
export {
  DEFAULT_ZIP_LIMITS,
  PackageArchiveError,
  readZipArchive,
} from "@/lib/packages";
export type {
  PackageArchiveEntry,
  PackageArchiveErrorCode,
  ReadZipOptions,
} from "@/lib/packages";
