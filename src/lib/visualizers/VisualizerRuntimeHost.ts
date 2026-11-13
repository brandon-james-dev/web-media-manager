import type {
  AnalysisFrame,
  VisualizationApi,
  VisualizerPluginManifest,
  VisualizerRuntime,
} from "@/core/visualizers";

/**
 * A runtime host adapts one execution model (shader, canvas module, wasm) to
 * the canvas the app owns. The React host drives only this interface, so a new
 * runtime never reaches into component code.
 */
export interface RuntimeHostContext {
  canvas: HTMLCanvasElement;
  api: VisualizationApi;
  manifest: VisualizerPluginManifest;
  files: ReadonlyMap<string, Uint8Array>;
  entrySource: string;
  vertexSource?: string;
}

export interface VisualizerRuntimeHost {
  mount(): Promise<void>;
  render(frame: AnalysisFrame): void;
  /** CSS-pixel size plus the device pixel ratio to size the backing store. */
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

export type RuntimeHostFactory = (
  context: RuntimeHostContext
) => VisualizerRuntimeHost;

export class VisualizerRuntimeError extends Error {
  readonly runtime: VisualizerRuntime;

  constructor(runtime: VisualizerRuntime, message: string) {
    super(message);
    this.name = "VisualizerRuntimeError";
    this.runtime = runtime;
  }
}
