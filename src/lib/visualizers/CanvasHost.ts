import type {
  AnalysisFrame,
  VisualizationApi,
  VisualizerPlugin,
  VisualizerPluginModule,
} from "@/core/visualizers";
import {
  VisualizerRuntimeError,
  type RuntimeHostContext,
  type VisualizerRuntimeHost,
} from "./VisualizerRuntimeHost";

/**
 * CanvasHost — loads a plugin's TypeScript/JavaScript entry as an ES module and
 * drives the `VisualizerPlugin` lifecycle.
 *
 * The entry is executed from a Blob URL, never from the app's origin, and the
 * module is expected to export either `createPlugin(api)` or a plugin object as
 * its default export. TypeScript entries are type-stripped on load; the
 * transpiler is imported lazily so it is only downloaded when a `.ts` plugin is
 * actually mounted.
 */
function isPlugin(value: unknown): value is VisualizerPlugin {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<VisualizerPlugin>;
  return (
    typeof candidate.initialize === "function" &&
    typeof candidate.render === "function" &&
    typeof candidate.resize === "function" &&
    typeof candidate.dispose === "function"
  );
}

async function transpileTypeScript(
  source: string,
  path: string
): Promise<string> {
  const { transform } = await import("sucrase");
  return transform(source, {
    transforms: ["typescript"],
    filePath: path,
  }).code;
}

async function importPluginModule(
  source: string,
  path: string
): Promise<VisualizerPluginModule> {
  const code = path.toLowerCase().endsWith(".ts")
    ? await transpileTypeScript(source, path)
    : source;

  const url = URL.createObjectURL(
    new Blob([code], { type: "text/javascript" })
  );

  try {
    return (await import(/* @vite-ignore */ url)) as VisualizerPluginModule;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function resolvePlugin(
  module: VisualizerPluginModule,
  api: VisualizationApi
): Promise<VisualizerPlugin> {
  const candidate = module.createPlugin ?? module.default;

  if (typeof candidate === "function") {
    const plugin = await candidate(api);
    if (isPlugin(plugin)) {
      return plugin;
    }
  } else if (isPlugin(candidate)) {
    return candidate;
  }

  throw new VisualizerRuntimeError(
    "canvas2d-typescript",
    "The plugin entry must export createPlugin(api) or a default plugin object with initialize, render, resize and dispose."
  );
}

export class CanvasHost implements VisualizerRuntimeHost {
  private readonly context: RuntimeHostContext;
  private plugin: VisualizerPlugin | null = null;
  private failed = false;
  private disposed = false;

  constructor(context: RuntimeHostContext) {
    this.context = context;
  }

  async mount(): Promise<void> {
    const module = await importPluginModule(
      this.context.entrySource,
      this.context.manifest.entry
    );
    const plugin = await resolvePlugin(module, this.context.api);
    this.plugin = plugin;
    await plugin.initialize(this.context.api);
  }

  render(frame: AnalysisFrame): void {
    if (!this.plugin || this.failed || this.disposed) {
      return;
    }

    try {
      this.plugin.render(frame);
    } catch (error) {
      // A throwing plugin must not take the animation loop down with it: log
      // once, dispose the plugin and leave the canvas showing its last frame.
      this.failed = true;
      this.context.api.log("render() failed:", error);
      this.safeDispose();
    }
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (!this.plugin || this.disposed) {
      return;
    }

    const canvas = this.context.canvas;
    const nextWidth = Math.max(1, Math.round(width * pixelRatio));
    const nextHeight = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.width !== nextWidth) {
      canvas.width = nextWidth;
    }
    if (canvas.height !== nextHeight) {
      canvas.height = nextHeight;
    }

    try {
      this.plugin.resize(width, height);
    } catch (error) {
      this.context.api.log("resize() failed:", error);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.safeDispose();
  }

  private safeDispose(): void {
    const plugin = this.plugin;
    this.plugin = null;
    if (!plugin) {
      return;
    }

    try {
      plugin.dispose();
    } catch (error) {
      this.context.api.log("dispose() failed:", error);
    }
  }
}
