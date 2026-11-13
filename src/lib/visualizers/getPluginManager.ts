import { PluginManager } from "@/core/visualizers";
import { getVisualizerPluginStore } from "@/core/ports";

let manager: PluginManager | null = null;

/**
 * The app's single PluginManager, bound to the registered plugin store port.
 * Components go through the TanStack Query hooks in
 * `@/components/visualizer/useVisualizerPlugins`, which call this.
 */
export function getVisualizerPluginManager(): PluginManager {
  if (!manager) {
    manager = new PluginManager({ store: getVisualizerPluginStore() });
  }

  return manager;
}
