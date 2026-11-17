import type {
  PluginSettingsValues,
  VisualizerPluginManifest,
} from "./PluginManifest";

/**
 * An installed plugin row. The manifest is denormalized onto the row so the
 * selector can render a full card from one table read.
 */
export interface InstalledVisualizerPlugin {
  id: string;
  name: string;
  version: string;
  runtime: VisualizerPluginManifest["runtime"];
  kind: NonNullable<VisualizerPluginManifest["kind"]>;
  author?: string;
  description?: string;
  entryPath: string;
  thumbnailPath?: string;
  manifest: VisualizerPluginManifest;
  installedAt: number;
  updatedAt: number;
  fileCount: number;
  sizeBytes: number;
}

export interface PluginSettingsRecord {
  pluginId: string;
  values: PluginSettingsValues;
  updatedAt: number;
}

/** A plugin resolved from storage, ready for a runtime host to mount. */
export interface LoadedVisualizerPlugin {
  plugin: InstalledVisualizerPlugin;
  files: ReadonlyMap<string, Uint8Array>;
  entrySource: string;
  vertexSource?: string;
}
