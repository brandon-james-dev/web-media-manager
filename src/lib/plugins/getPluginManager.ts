import { PluginManager } from "@/core/plugins";
import { getVisualizerPluginStore } from "@/core/ports";

let manager: PluginManager | null = null;

/**
 * The app's single PluginManager, bound to the registered plugin store port.
 *
 * One manager serves every plugin kind — visualizers, lyrics providers, music
 * sources and metadata providers — so components and the refresh routines all
 * read the same installed set. Components go through the TanStack Query hooks
 * in `@/hooks/useVisualizerPlugins`, which call this.
 *
 * @example
 * ```ts
 * const plugins = await getPluginManager().list();
 * ```
 */
export function getPluginManager(): PluginManager {
  if (!manager) {
    manager = new PluginManager({ store: getVisualizerPluginStore() });
  }

  return manager;
}
