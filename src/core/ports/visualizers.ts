import type {
  InstalledVisualizerPlugin,
  PluginFileRecord,
  PluginSettingsRecord,
} from "@/core/visualizers/contracts";

/**
 * Visualizer plugin store port.
 *
 * The plugin manager owns install/validate/load logic; this port owns bytes.
 * The browser binding is Dexie (`plugins`, `pluginFiles`, `pluginSettings`);
 * a Tauri or server binding can implement the same interface over SQLite or
 * the filesystem without the manager changing.
 */
export interface VisualizerPluginStore {
  listPlugins(): Promise<InstalledVisualizerPlugin[]>;
  getPlugin(id: string): Promise<InstalledVisualizerPlugin | undefined>;
  putPlugin(plugin: InstalledVisualizerPlugin): Promise<void>;
  /** Removes the plugin row, its files and its settings. */
  deletePlugin(id: string): Promise<void>;

  listFiles(pluginId: string): Promise<PluginFileRecord[]>;
  getFile(
    pluginId: string,
    path: string
  ): Promise<PluginFileRecord | undefined>;
  putFiles(files: PluginFileRecord[]): Promise<void>;
  deleteFiles(pluginId: string): Promise<void>;

  getSettings(pluginId: string): Promise<PluginSettingsRecord | undefined>;
  putSettings(settings: PluginSettingsRecord): Promise<void>;
  deleteSettings(pluginId: string): Promise<void>;
}

let visualizerPluginStoreProvider: (() => VisualizerPluginStore) | null = null;

/** Register the platform's plugin store provider during bootstrap. */
export function setVisualizerPluginStoreProvider(
  provider: () => VisualizerPluginStore
): void {
  visualizerPluginStoreProvider = provider;
}

/** Access the plugin store through the portable port. */
export function getVisualizerPluginStore(): VisualizerPluginStore {
  if (!visualizerPluginStoreProvider) {
    throw new Error(
      "[core/ports/visualizers] No plugin store provider registered — call setVisualizerPluginStoreProvider() during bootstrap."
    );
  }
  return visualizerPluginStoreProvider();
}
