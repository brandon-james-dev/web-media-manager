import { setVisualizerPluginStoreProvider } from "@/core/ports";
import { DexieVisualizerPluginStore } from "../dexie/DexieVisualizerPluginStore";

/**
 * Browser binding for the visualizer plugin store port. Called during app
 * bootstrap, before any component queries the plugin manager.
 */
export function registerBrowserVisualizerStoreProvider(): void {
  setVisualizerPluginStoreProvider(() => new DexieVisualizerPluginStore());
}
