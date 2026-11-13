import type { VisualizerPluginStore } from "@/core/ports/visualizers";
import {
  PLUGIN_MANIFEST_FILE,
  type InstalledVisualizerPlugin,
  type LoadedVisualizerPlugin,
  type PluginFileRecord,
  type PluginSettingsValues,
  type VisualizerPluginManifest,
} from "./contracts";
import { coerceSettingsValues, getDefaultSettings } from "./manifest/settings";
import {
  parsePluginManifestJson,
  type ManifestIssue,
} from "./manifest/validateManifest";
import {
  PluginArchiveError,
  readZipArchive,
  type PluginArchiveEntry,
} from "./zip/readZipArchive";

/**
 * PluginManager — install, validate, store, list, remove and load visualizer
 * plugins.
 *
 * The manager is framework-free and storage-agnostic: it reads a ZIP, validates
 * the manifest against the archive, and writes through the
 * `VisualizerPluginStore` port. React components reach it through TanStack
 * Query hooks; runtime hosts receive the `LoadedVisualizerPlugin` it returns.
 */
export interface PluginManagerOptions {
  store: VisualizerPluginStore;
  /** Injectable clock, so install timestamps are testable. */
  now?: () => number;
  maxPluginBytes?: number;
}

export interface InspectedPlugin {
  manifest: VisualizerPluginManifest;
  issues: ManifestIssue[];
  entries: PluginArchiveEntry[];
  sizeBytes: number;
}

export interface InstallPluginOptions {
  /** Overwrite an already-installed plugin with the same id. */
  replace?: boolean;
}

export interface InstallPluginResult {
  plugin: InstalledVisualizerPlugin;
  replaced: boolean;
  issues: ManifestIssue[];
}

/** A failed install/load, carrying the issues the UI should display. */
export class PluginInstallError extends Error {
  readonly issues: ManifestIssue[];

  constructor(issues: ManifestIssue[]) {
    const errors = issues.filter((issue) => issue.severity === "error");
    super(
      errors.length
        ? errors.map((issue) => issue.message).join(" ")
        : "The plugin could not be installed."
    );
    this.name = "PluginInstallError";
    this.issues = issues;
  }
}

export class PluginLoadError extends Error {
  readonly pluginId: string;

  constructor(pluginId: string, message: string) {
    super(message);
    this.name = "PluginLoadError";
    this.pluginId = pluginId;
  }
}

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".glsl": "text/plain",
  ".frag": "text/plain",
  ".fs": "text/plain",
  ".vert": "text/plain",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".ts": "text/typescript",
  ".wasm": "application/wasm",
};

function guessMimeType(path: string): string {
  const dot = path.lastIndexOf(".");
  const extension = dot === -1 ? "" : path.slice(dot).toLowerCase();
  return MIME_TYPES[extension] ?? "application/octet-stream";
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

async function toBytes(
  input: Blob | ArrayBuffer | Uint8Array
): Promise<ArrayBuffer | Uint8Array> {
  if (input instanceof Blob) {
    return input.arrayBuffer();
  }
  return input;
}

export class PluginManager {
  private readonly store: VisualizerPluginStore;
  private readonly now: () => number;
  private readonly maxPluginBytes: number | undefined;

  constructor(options: PluginManagerOptions) {
    this.store = options.store;
    this.now = options.now ?? (() => Date.now());
    this.maxPluginBytes = options.maxPluginBytes;
  }

  /**
   * Read and validate a ZIP without writing anything. Used by install and by
   * the manager dialog's "details" preview.
   */
  async inspectZip(
    input: Blob | ArrayBuffer | Uint8Array
  ): Promise<InspectedPlugin> {
    let entries: PluginArchiveEntry[];
    try {
      const limits =
        this.maxPluginBytes !== undefined
          ? { maxTotalBytes: this.maxPluginBytes }
          : undefined;
      entries = readZipArchive(await toBytes(input), limits);
    } catch (error) {
      if (error instanceof PluginArchiveError) {
        throw new PluginInstallError([
          {
            code: "archive-invalid",
            severity: "error",
            message: error.message,
          },
        ]);
      }
      throw error;
    }

    const manifestEntry = entries.find(
      (entry) => entry.path === PLUGIN_MANIFEST_FILE
    );
    if (!manifestEntry) {
      throw new PluginInstallError([
        {
          code: "manifest-missing",
          severity: "error",
          field: PLUGIN_MANIFEST_FILE,
          message: `The archive has no ${PLUGIN_MANIFEST_FILE} at its root.`,
        },
      ]);
    }

    const result = parsePluginManifestJson(
      decodeText(manifestEntry.bytes),
      entries.map((entry) => entry.path)
    );

    if (!result.valid || !result.manifest) {
      throw new PluginInstallError(result.issues);
    }

    return {
      manifest: result.manifest,
      issues: result.issues,
      entries,
      sizeBytes: entries.reduce((total, entry) => total + entry.size, 0),
    };
  }

  async installFromZip(
    input: Blob | ArrayBuffer | Uint8Array,
    options: InstallPluginOptions = {}
  ): Promise<InstallPluginResult> {
    const inspected = await this.inspectZip(input);
    const existing = await this.store.getPlugin(inspected.manifest.id);

    if (existing && !options.replace) {
      throw new PluginInstallError([
        {
          code: "already-installed",
          severity: "error",
          field: "id",
          message: `"${inspected.manifest.name}" is already installed. Remove it first, or install it as an update.`,
        },
      ]);
    }

    const timestamp = this.now();
    const plugin: InstalledVisualizerPlugin = {
      id: inspected.manifest.id,
      name: inspected.manifest.name,
      version: inspected.manifest.version,
      runtime: inspected.manifest.runtime,
      kind: inspected.manifest.kind ?? "visualizer",
      ...(inspected.manifest.author
        ? { author: inspected.manifest.author }
        : {}),
      ...(inspected.manifest.description
        ? { description: inspected.manifest.description }
        : {}),
      entryPath: inspected.manifest.entry,
      ...(inspected.manifest.thumbnail
        ? { thumbnailPath: inspected.manifest.thumbnail }
        : {}),
      manifest: inspected.manifest,
      installedAt: existing?.installedAt ?? timestamp,
      updatedAt: timestamp,
      fileCount: inspected.entries.length,
      sizeBytes: inspected.sizeBytes,
    };

    const files: PluginFileRecord[] = inspected.entries.map((entry) => ({
      pluginId: plugin.id,
      path: entry.path,
      bytes: entry.bytes,
      size: entry.size,
      mimeType: guessMimeType(entry.path),
    }));

    // Replace is delete-then-write: a plugin's file set can shrink between
    // versions, and stale files must not survive an update.
    await this.store.deleteFiles(plugin.id);
    await this.store.putPlugin(plugin);
    await this.store.putFiles(files);

    // Keep the user's settings across an update; seed defaults on first install.
    const storedSettings = await this.store.getSettings(plugin.id);
    if (!storedSettings) {
      await this.store.putSettings({
        pluginId: plugin.id,
        values: getDefaultSettings(plugin.manifest.settings),
        updatedAt: timestamp,
      });
    }

    return {
      plugin,
      replaced: existing !== undefined,
      issues: inspected.issues,
    };
  }

  async list(): Promise<InstalledVisualizerPlugin[]> {
    const plugins = await this.store.listPlugins();
    return plugins.sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<InstalledVisualizerPlugin | undefined> {
    return this.store.getPlugin(id);
  }

  async remove(id: string): Promise<void> {
    await this.store.deletePlugin(id);
  }

  /** Resolve a plugin's manifest, files and entry source for a runtime host. */
  async load(id: string): Promise<LoadedVisualizerPlugin> {
    const plugin = await this.store.getPlugin(id);
    if (!plugin) {
      throw new PluginLoadError(id, `Plugin "${id}" is not installed.`);
    }

    const records = await this.store.listFiles(id);
    const files = new Map(records.map((record) => [record.path, record.bytes]));
    const entryBytes = files.get(plugin.entryPath);
    if (!entryBytes) {
      throw new PluginLoadError(
        id,
        `Plugin "${plugin.name}" is missing its entry file "${plugin.entryPath}".`
      );
    }

    const vertexBytes = plugin.manifest.vertex
      ? files.get(plugin.manifest.vertex)
      : undefined;

    return {
      plugin,
      files,
      entrySource: decodeText(entryBytes),
      ...(vertexBytes ? { vertexSource: decodeText(vertexBytes) } : {}),
    };
  }

  /** The plugin's thumbnail as a Blob, or undefined when it has none. */
  async getThumbnail(id: string): Promise<Blob | undefined> {
    const plugin = await this.store.getPlugin(id);
    if (!plugin?.thumbnailPath) {
      return undefined;
    }

    const file = await this.store.getFile(id, plugin.thumbnailPath);
    if (!file) {
      return undefined;
    }

    return new Blob([file.bytes.slice().buffer as ArrayBuffer], {
      type: file.mimeType,
    });
  }

  async getSettings(id: string): Promise<PluginSettingsValues> {
    const plugin = await this.store.getPlugin(id);
    if (!plugin) {
      throw new PluginLoadError(id, `Plugin "${id}" is not installed.`);
    }

    const stored = await this.store.getSettings(id);
    return coerceSettingsValues(plugin.manifest.settings, stored?.values);
  }

  async saveSettings(
    id: string,
    values: PluginSettingsValues
  ): Promise<PluginSettingsValues> {
    const plugin = await this.store.getPlugin(id);
    if (!plugin) {
      throw new PluginLoadError(id, `Plugin "${id}" is not installed.`);
    }

    const coerced = coerceSettingsValues(plugin.manifest.settings, values);
    await this.store.putSettings({
      pluginId: id,
      values: coerced,
      updatedAt: this.now(),
    });

    return coerced;
  }

  async resetSettings(id: string): Promise<PluginSettingsValues> {
    const plugin = await this.store.getPlugin(id);
    if (!plugin) {
      throw new PluginLoadError(id, `Plugin "${id}" is not installed.`);
    }

    await this.store.deleteSettings(id);
    return getDefaultSettings(plugin.manifest.settings);
  }
}
