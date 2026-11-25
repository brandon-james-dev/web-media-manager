import type { PackageFileStore } from "@/core/ports/packageFiles";
import type {
  InstalledPlugin,
  PluginSettingsRecord,
} from "@/core/plugins/contracts";

/**
 * Visualizer plugin store port.
 *
 * The plugin manager owns install/validate/load logic; this port owns the
 * plugin rows and settings. Plugin bytes go through the shared
 * {@link PackageFileStore} in `files`, over the `pluginFiles` table, so theme
 * and plugin files never mix. The browser binding is Dexie (`plugins`,
 * `pluginFiles`, `pluginSettings`); a Tauri or server binding can implement the
 * same interface over SQLite or the filesystem without the manager changing.
 */
export interface VisualizerPluginStore {
  listPlugins(): Promise<InstalledPlugin[]>;
  getPlugin(id: string): Promise<InstalledPlugin | undefined>;
  putPlugin(plugin: InstalledPlugin): Promise<void>;
  /** Removes the plugin row, its files and its settings. */
  deletePlugin(id: string): Promise<void>;

  /** The plugin's stored bytes, keyed by the plugin id. */
  readonly files: PackageFileStore;

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
