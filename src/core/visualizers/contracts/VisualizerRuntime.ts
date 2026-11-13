/**
 * Visualizer runtimes.
 *
 * A runtime is the execution model a plugin's entry file is loaded into. The
 * manifest names one; the host registry maps it to an implementation. Adding a
 * runtime is a new descriptor here plus a host factory — nothing else in the
 * plugin system branches on the runtime id.
 */
export type VisualizerRuntime =
  | "webgl-shader"
  | "canvas2d-typescript"
  | "wasm";

export interface VisualizerRuntimeDescriptor {
  id: VisualizerRuntime;
  label: string;
  /** Entry file extensions this runtime can execute. */
  entryExtensions: readonly string[];
  /**
   * False for runtimes that are declared but not implemented yet. Manifests
   * naming them are rejected at install time with a clear message instead of
   * failing later at load time.
   */
  implemented: boolean;
  description: string;
}

export const VISUALIZER_RUNTIMES: readonly VisualizerRuntimeDescriptor[] = [
  {
    id: "webgl-shader",
    label: "WebGL shader",
    entryExtensions: [".glsl", ".frag", ".fs"],
    implemented: true,
    description:
      "A fragment shader rendered to a full-screen quad with audio uniforms.",
  },
  {
    id: "canvas2d-typescript",
    label: "Canvas 2D (TypeScript)",
    entryExtensions: [".ts", ".js", ".mjs"],
    implemented: true,
    description:
      "An ES module exporting a plugin object, rendered with Canvas 2D.",
  },
  {
    id: "wasm",
    label: "WebAssembly",
    entryExtensions: [".wasm"],
    implemented: false,
    description:
      "A WebAssembly module driven through the plugin API. Reserved for a later release.",
  },
];

const RUNTIME_BY_ID = new Map<VisualizerRuntime, VisualizerRuntimeDescriptor>(
  VISUALIZER_RUNTIMES.map((runtime) => [runtime.id, runtime])
);

export function isVisualizerRuntime(value: string): value is VisualizerRuntime {
  return RUNTIME_BY_ID.has(value as VisualizerRuntime);
}

export function getRuntimeDescriptor(
  runtime: VisualizerRuntime
): VisualizerRuntimeDescriptor | undefined {
  return RUNTIME_BY_ID.get(runtime);
}
