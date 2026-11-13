import type { AnalysisFrame } from "./AnalysisFrame";
import type { PluginSettingsValues } from "./PluginManifest";

export interface VisualizationSize {
  /** CSS pixels. */
  width: number;
  height: number;
  /** Device pixels per CSS pixel, for canvases that size their backing store. */
  pixelRatio: number;
}

/**
 * Colors sampled from the current artwork, the same palette the now-playing
 * backdrop paints with. Values are CSS color strings.
 */
export interface VisualizerPalette {
  primary: string;
  secondary: string;
  tertiary: string;
}

/**
 * The surface a plugin is given at `initialize()`.
 *
 * It is deliberately small and read-only: plugins read settings and size, and
 * subscribe to changes. They never reach into the app, the audio graph or
 * storage — everything they need arrives through `render(frame)`.
 */
export interface VisualizationApi {
  readonly pluginId: string;
  readonly canvas: HTMLCanvasElement;
  getSize(): VisualizationSize;
  getSettings(): PluginSettingsValues;
  getTheme(): "light" | "dark";
  /**
   * Artwork palette for the current track, or null before artwork is sampled.
   * Read it per frame: it changes when the track changes.
   */
  getPalette(): VisualizerPalette | null;
  /** Console logging namespaced to the plugin, so hosts can filter it. */
  log(...args: unknown[]): void;
  /** Subscribe to settings changes. Returns an unsubscribe function. */
  onSettingsChange(
    listener: (values: PluginSettingsValues) => void
  ): () => void;
}

/**
 * The plugin contract for every runtime that executes code. Shader plugins are
 * adapted to this interface by their host, so the app only ever drives
 * `VisualizerPlugin`.
 */
export interface VisualizerPlugin {
  initialize(api: VisualizationApi): Promise<void>;
  render(frame: AnalysisFrame): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

/**
 * Shape a `canvas2d-typescript` entry module may export: a factory receiving
 * the API, or a ready-made plugin object as the default export.
 */
export interface VisualizerPluginModule {
  createPlugin?: (
    api: VisualizationApi
  ) => VisualizerPlugin | Promise<VisualizerPlugin>;
  default?:
    | VisualizerPlugin
    | ((api: VisualizationApi) => VisualizerPlugin | Promise<VisualizerPlugin>);
}
