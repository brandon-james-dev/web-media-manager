import type { PackageFileStore } from "@/core/ports/packageFiles";
import type { VisualizerPluginStore } from "@/core/ports/visualizers";
import type {
  InstalledPlugin,
  PluginSettingsRecord,
} from "@/core/plugins/contracts";
import { DexiePackageFileStore } from "./DexiePackageFileStore";
import { getWmmMusicDb } from "./WmmMusicDb";

/**
 * Dexie-backed plugin store: one row per plugin, one row per file (raw bytes),
 * one row per plugin's settings. File bytes live in IndexedDB so an installed
 * plugin survives reloads without touching the filesystem or the network.
 */
export class DexieVisualizerPluginStore implements VisualizerPluginStore {
  private readonly db = getWmmMusicDb();
  readonly files: PackageFileStore = new DexiePackageFileStore(
    this.db.pluginFiles
  );

  async listPlugins(): Promise<InstalledPlugin[]> {
    return this.db.plugins.toArray();
  }

  async getPlugin(id: string): Promise<InstalledPlugin | undefined> {
    return this.db.plugins.get(id);
  }

  async putPlugin(plugin: InstalledPlugin): Promise<void> {
    await this.db.plugins.put(plugin);
  }

  async deletePlugin(id: string): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.plugins,
      this.db.pluginFiles,
      this.db.pluginSettings,
      async () => {
        await this.db.pluginFiles.where("ownerId").equals(id).delete();
        await this.db.pluginSettings.delete(id);
        await this.db.plugins.delete(id);
      }
    );
  }

  async getSettings(
    pluginId: string
  ): Promise<PluginSettingsRecord | undefined> {
    return this.db.pluginSettings.get(pluginId);
  }

  async putSettings(settings: PluginSettingsRecord): Promise<void> {
    await this.db.pluginSettings.put(settings);
  }

  async deleteSettings(pluginId: string): Promise<void> {
    await this.db.pluginSettings.delete(pluginId);
  }
}
