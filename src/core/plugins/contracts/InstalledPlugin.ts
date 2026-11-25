import type {
  PluginSettingsValues,
  VisualizerPluginManifest,
} from "./PluginManifest";

/**
 * An installed plugin row. The manifest is denormalized onto the row so the
 * selector can render a full card from one table read.
 */
export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  /** Present for executable plugins; absent for declarative ones. */
  runtime?: VisualizerPluginManifest["runtime"];
  kind: NonNullable<VisualizerPluginManifest["kind"]>;
  author?: string;
  description?: string;
  /** Present for executable plugins; absent for declarative ones. */
  entryPath?: string;
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
  plugin: InstalledPlugin;
  files: ReadonlyMap<string, Uint8Array>;
  entrySource: string;
  vertexSource?: string;
}
