/**
 * Visualizer plugin system (framework-free core).
 *
 * A plugin is a ZIP with a `manifest.json`; the manifest names a runtime and an
 * entry file. `PluginManager` validates the archive, stores it through the
 * `VisualizerPluginStore` port and resolves it for a runtime host. Runtime
 * hosts live in `@/lib/visualizers` because they touch browser APIs; this
 * module stays portable so a Tauri or server binding can reuse it.
 *
 * Extension seams:
 *  - new runtimes: add a descriptor in `contracts/VisualizerRuntime` and a host
 *    factory in `@/lib/visualizers/createRuntimeHost`.
 *  - offline analysis: `contracts/SongAnalysis` describes the stored form; a
 *    frame source backed by it can replace `AnalyserFrameSource` without
 *    touching the plugin contract.
 *  - theme/layout plugins: `PluginKind` already distinguishes them, so they
 *    share install/validate/store and only need their own host.
 */
export * from "./contracts";
export { PluginManager, PluginInstallError, PluginLoadError } from "./PluginManager";
export type {
  InstallPluginOptions,
  InstallPluginResult,
  InspectedPlugin,
  PluginManagerOptions,
} from "./PluginManager";
export { AnalyserFrameSource } from "./analysis/AnalyserFrameSource";
export {
  coerceSettingsValues,
  getDefaultSettings,
} from "./manifest/settings";
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
  PluginArchiveError,
  readZipArchive,
} from "./zip/readZipArchive";
export type {
  PluginArchiveEntry,
  PluginArchiveErrorCode,
  ReadZipOptions,
} from "./zip/readZipArchive";
