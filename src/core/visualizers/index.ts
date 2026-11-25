/**
 * Visualizer runtime contracts (framework-free core).
 *
 * The plugin system itself lives in `@/core/plugins`: install, validate and
 * store are shared by every plugin kind. This module keeps only what is
 * specific to rendering a visualizer — the analysis frame a runtime reads, the
 * module shape an entry file exports, and the runtime descriptors a manifest
 * names. Runtime hosts live in `@/lib/visualizers` because they touch browser
 * APIs; this module stays portable so a Tauri or server binding can reuse it.
 *
 * Extension seams:
 *  - new runtimes: add a descriptor in `contracts/VisualizerRuntime` and a host
 *    factory in `@/lib/visualizers/createRuntimeHost`.
 *  - offline analysis: `contracts/SongAnalysis` describes the stored form; a
 *    frame source backed by it can replace `AnalyserFrameSource` without
 *    touching the plugin contract.
 */
export * from "./contracts";
export { AnalyserFrameSource } from "./analysis/AnalyserFrameSource";
