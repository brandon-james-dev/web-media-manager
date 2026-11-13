import type { VisualizerPluginStore } from "@/core/ports/visualizers";
import type {
  InstalledVisualizerPlugin,
  PluginFileRecord,
  PluginSettingsRecord,
} from "@/core/visualizers/contracts";
import { getWmmMusicDb } from "./WmmMusicDb";

/**
 * Dexie-backed plugin store: one row per plugin, one row per file (raw bytes),
 * one row per plugin's settings. File bytes live in IndexedDB so an installed
 * plugin survives reloads without touching the filesystem or the network.
 */
export class DexieVisualizerPluginStore implements VisualizerPluginStore {
  private readonly db = getWmmMusicDb();

  async listPlugins(): Promise<InstalledVisualizerPlugin[]> {
    return this.db.plugins.toArray();
  }

  async getPlugin(
    id: string
  ): Promise<InstalledVisualizerPlugin | undefined> {
    return this.db.plugins.get(id);
  }

  async putPlugin(plugin: InstalledVisualizerPlugin): Promise<void> {
    await this.db.plugins.put(plugin);
  }

  async deletePlugin(id: string): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.plugins,
      this.db.pluginFiles,
      this.db.pluginSettings,
      async () => {
        await this.db.pluginFiles.where("pluginId").equals(id).delete();
        await this.db.pluginSettings.delete(id);
        await this.db.plugins.delete(id);
      }
    );
  }

  async listFiles(pluginId: string): Promise<PluginFileRecord[]> {
    return this.db.pluginFiles.where("pluginId").equals(pluginId).toArray();
  }

  async getFile(
    pluginId: string,
    path: string
  ): Promise<PluginFileRecord | undefined> {
    return this.db.pluginFiles
      .where("[pluginId+path]")
      .equals([pluginId, path])
      .first();
  }

  async putFiles(files: PluginFileRecord[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    await this.db.pluginFiles.bulkPut(files);
  }

  async deleteFiles(pluginId: string): Promise<void> {
    await this.db.pluginFiles.where("pluginId").equals(pluginId).delete();
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
