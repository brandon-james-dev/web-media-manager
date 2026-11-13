import type { VisualizerRuntime } from "@/core/visualizers";
import { CanvasHost } from "./CanvasHost";
import { ShaderHost } from "./ShaderHost";
import {
  VisualizerRuntimeError,
  type RuntimeHostContext,
  type RuntimeHostFactory,
  type VisualizerRuntimeHost,
} from "./VisualizerRuntimeHost";

/**
 * Runtime registry: the one place that maps a manifest's `runtime` to an
 * implementation. `wasm` is intentionally absent — manifests naming it are
 * rejected at install time, and this guard covers a plugin stored by an older
 * build.
 */
const RUNTIME_HOSTS: Partial<Record<VisualizerRuntime, RuntimeHostFactory>> = {
  "webgl-shader": (context) => new ShaderHost(context),
  "canvas2d-typescript": (context) => new CanvasHost(context),
};

export function createRuntimeHost(
  runtime: VisualizerRuntime,
  context: RuntimeHostContext
): VisualizerRuntimeHost {
  const factory = RUNTIME_HOSTS[runtime];
  if (!factory) {
    throw new VisualizerRuntimeError(
      runtime,
      `The "${runtime}" runtime is not available in this version of the app.`
    );
  }

  return factory(context);
}
