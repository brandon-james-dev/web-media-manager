import { uuidv7 } from "uuidv7";
import type { MusicSource, PluginMusicSource } from "@/models";
import { ArtworkType } from "@/lib/contracts";
import type { Song } from "@/models/Song";
import type { MusicSourceCapabilities } from "@/core/contracts";
import { sourceUri } from "@/core/contracts/sources";
import type { PluginSourceProviderDescriptor } from "@/core/visualizers";
import { getJobService, type WorkerProgress } from "@/core/jobs";
import { getSourcesStore } from "@/core/ports";
import { createEncryptedSecretStore } from "@/lib/secrets/encryptedSecretStore";
import { expandHeaders } from "@/lib/plugins";
import type {
  IJobHandle,
  IMusicSourceStrategy,
  SongChanges,
} from "../IMusicSourceStrategy";
import type { MusicSourceConfigField } from "../MusicSourceConfigField";
import {
  getMusicSourceImportConfig,
  type MusicSourceImportConfig,
} from "../config";

const pluginSourceSecrets = createEncryptedSecretStore("plugin-source");

/** Store a plugin source's secret config value (encrypted at rest). */
export async function setPluginSourceSecret(
  sourceId: string,
  secret: string
): Promise<void> {
  await pluginSourceSecrets.setSecret(sourceId, secret);
}

/** Read a plugin source's secret config value, or null when unset. */
export async function getPluginSourceSecret(
  sourceId: string
): Promise<string | null> {
  return await pluginSourceSecrets.getSecret(sourceId);
}

/** Drop a plugin source's secret config value. */
export async function deletePluginSourceSecret(
  sourceId: string
): Promise<void> {
  await pluginSourceSecrets.deleteSecret(sourceId);
}

/** Capabilities a plugin source starts from; the manifest refines none yet. */
const PLUGIN_SOURCE_CAPABILITIES: MusicSourceCapabilities = {
  streaming: true,
  browsing: true,
  searching: false,
  metadataWrite: false,
  libraryScanning: false,
  offline: false,
  playlistWrite: false,
  syncWrite: false,
};

/** Reads a dot path out of a parsed JSON value. */
function readPath(record: unknown, path: string): unknown {
  let current: unknown = record;
  for (const segment of path.split(".")) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function readString(record: unknown, key: string | undefined): string | undefined {
  if (!key) return undefined;
  const value = readPath(record, key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(record: unknown, key: string | undefined): number | undefined {
  if (!key) return undefined;
  const value = readPath(record, key);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Escape a string for use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split an XML document into one flat record per `recordTag` element.
 *
 * Each record maps child element local names to their text, so a field map
 * names `getcontentlength` rather than a JSON path. Namespaced tags
 * (`d:response`) match on their local name. This is deliberately a small
 * splitter, not a general XML parser: it runs in a worker, where DOMParser is
 * unavailable, and a WebDAV listing is a flat, well-formed document.
 */
function parseXmlRecords(
  xml: string,
  recordTag: string
): Array<Record<string, string>> {
  const local = recordTag.includes(":")
    ? recordTag.split(":").pop() ?? recordTag
    : recordTag;
  const localTag = escapeRegExp(local);
  const recordPattern = new RegExp(
    `<(?:(?:[\\w.-]+):)?${localTag}\\b[^>]*>([\\s\\S]*?)</(?:(?:[\\w.-]+):)?${localTag}>`,
    "g"
  );
  const childPattern = /<((?:[\w.-]+:)?[\w.-]+)\b[^>]*>([\s\S]*?)<\/\1>/g;

  const records: Array<Record<string, string>> = [];
  for (const match of xml.matchAll(recordPattern)) {
    const body = match[1] ?? "";
    const record: Record<string, string> = {};
    for (const child of body.matchAll(childPattern)) {
      const name = (child[1] ?? "").split(":").pop() ?? "";
      if (!name) continue;
      record[name] = (child[2] ?? "").trim();
    }
    records.push(record);
  }

  return records;
}

/** Substitute `{baseUrl}`, `{id}` and `{path}` in a descriptor URL template. */function expandUrl(
  template: string,
  values: { baseUrl?: string; id?: string; path?: string }
): string {
  return template
    .replaceAll("{baseUrl}", values.baseUrl ?? "")
    .replaceAll("{id}", values.id ?? "")
    .replaceAll("{path}", values.path ?? "");
}

/** The non-secret config values a plugin source instance carries. */
function sourceConfig(source: MusicSource): Record<string, string> {
  return source.kind === "plugin" ? source.config : {};
}

/**
 * A music source driven by a plugin's declarative descriptor.
 *
 * The plugin supplies a library endpoint, a field map and a stream URL
 * template; the host performs the requests and maps the records. No
 * third-party code runs to read a library or stream a song, which is what
 * lets a source plugin be installed from a ZIP without a runtime.
 *
 * @example
 * ```ts
 * const strategy = new PluginSourceStrategy(manifest.provider, plugin.id);
 * ```
 */
export class PluginSourceStrategy implements IMusicSourceStrategy {
  readonly kind = "plugin" as const;
  readonly name: string;
  readonly description: string;
  readonly requiresConfig: boolean;
  readonly configFields?: MusicSourceConfigField[];

  private readonly descriptor: PluginSourceProviderDescriptor;
  private readonly pluginIdValue: string;

  constructor(descriptor: PluginSourceProviderDescriptor, pluginId: string) {
    this.descriptor = descriptor;
    this.pluginIdValue = pluginId;
    this.name = descriptor.name;
    this.description = descriptor.description ?? "";
    this.requiresConfig = Boolean(descriptor.config?.length);
    this.configFields = descriptor.config?.map((field) => ({
      name: field.key,
      label: field.label,
      ...(field.placeholder ? { placeholder: field.placeholder } : {}),
      ...(field.required ? { required: true } : {}),
      ...(field.secret ? { type: "password" } : {}),
    }));
  }

  /** The provider id this strategy serves. */
  get providerId(): string {
    return this.descriptor.id;
  }

  /** Installed plugin that contributed this provider, for the settings row. */
  get pluginId(): string {
    return this.pluginIdValue;
  }

  async add(options: {
    onSourceAdded?: () => void | Promise<void>;
    config?: unknown;
  }): Promise<void> {
    const values = (options.config ?? {}) as Record<string, string>;
    const secretKey = this.descriptor.config?.find((f) => f.secret)?.key;
    const baseUrl = values.baseUrl ?? values.url ?? "";

    const id = uuidv7();
    const uriDomain = baseUrl
      ? (() => {
          try {
            return new URL(baseUrl).hostname;
          } catch {
            return this.descriptor.id;
          }
        })()
      : this.descriptor.id;

    const config: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === secretKey) continue;
      if (typeof value === "string") config[key] = value;
    }

    const source: PluginMusicSource = {
      id,
      uriDomain,
      name: values.name?.trim() || this.descriptor.name,
      enabled: true,
      createdAt: new Date(),
      priority: 50,
      capabilities: PLUGIN_SOURCE_CAPABILITIES,
      kind: "plugin",
      pluginId: this.pluginIdValue,
      providerId: this.descriptor.id,
      config,
    };

    await getSourcesStore().addSource(source);

    if (secretKey && values[secretKey]) {
      await setPluginSourceSecret(id, values[secretKey]);
    }

    const importConfig = await getMusicSourceImportConfig(source);
    importConfig.sourceProvider = this.descriptor;

    getJobService().enqueue({
      type: "Bulk Import",
      payload: { musicSource: source, musicSourceConfig: importConfig },
    });

    await options.onSourceAdded?.();
  }

  async updateSource(options: {
    source: MusicSource;
    config?: unknown;
  }): Promise<void> {
    if (options.source.kind !== "plugin") return;

    const values = (options.config ?? {}) as Record<string, string>;
    const secretKey = this.descriptor.config?.find((f) => f.secret)?.key;

    const config: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === secretKey) continue;
      if (typeof value === "string") config[key] = value;
    }

    const updated: PluginMusicSource = {
      ...options.source,
      name: values.name?.trim() || options.source.name,
      config,
    };

    await getSourcesStore().saveSource(updated);

    if (secretKey && values[secretKey]) {
      await setPluginSourceSecret(options.source.id, values[secretKey]);
    }
  }

  async resolveSongBytes(song: Song): Promise<ArrayBuffer | null> {
    const { stream } = this.descriptor;
    if (!stream) return null;

    const sources = await getSourcesStore().getSources();
    const source = sources.find((s) => s.id === song.sourceId);
    if (!source || source.kind !== "plugin") return null;

    const url = expandUrl(stream.url, {
      baseUrl: sourceConfig(source).baseUrl,
      id: song.id,
      path: song.relativePath,
    });

    try {
      const response = await fetch(url, {
        headers: expandHeaders(stream.headers, await this.requestValues(source)),
      });
      if (!response.ok) return null;
      return await response.arrayBuffer();
    } catch (error) {
      console.error("Failed to stream plugin source song:", error);
      return null;
    }
  }

  async getSecret(source: MusicSource): Promise<string | undefined> {
    return (await getPluginSourceSecret(source.id)) ?? undefined;
  }

  /**
   * Values a header template can reference: the source's non-secret config
   * plus its stored secret, so `"Authorization": "Basic {base64:secret}"`
   * works without the credential ever entering the source record.
   */
  private async requestValues(
    source: MusicSource
  ): Promise<Record<string, string | undefined>> {
    const values: Record<string, string | undefined> = {
      ...sourceConfig(source),
    };
    const secret = await getPluginSourceSecret(source.id);
    if (secret) {
      values.secret = secret;
    }
    return values;
  }

  sync(options: {
    source: MusicSource;
    silent?: boolean;
  }): IJobHandle | null {
    if (options.source.kind !== "plugin") return null;

    getJobService().enqueue({
      type: "Bulk Import",
      payload: {
        musicSource: options.source,
        musicSourceConfig: {
          sourceId: options.source.id,
          config: undefined,
          sourceProvider: this.descriptor,
        },
      },
    });

    return null;
  }

  cancelSync(jobId?: string): void {
    if (jobId) getJobService().cancelJob(jobId);
  }

  async removeSource(options: {
    source: MusicSource;
    onSourceRemoved?: () => void | Promise<void>;
  }): Promise<void> {
    await getSourcesStore().deleteSource(options.source.id);
    await deletePluginSourceSecret(options.source.id);
    await options.onSourceRemoved?.();
  }

  async cleanupRemovedSource(source: MusicSource): Promise<void> {
    await deletePluginSourceSecret(source.id);
  }

  async collectSongs(options: {
    source: MusicSource;
    isCancelled?: () => boolean;
    reportProgress?: (progress: WorkerProgress) => void;
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<Song[]> {
    const { source } = options;
    if (source.kind !== "plugin") return [];

    const { library } = this.descriptor;
    const url = expandUrl(library.url, {
      baseUrl: sourceConfig(source).baseUrl,
    });

    options.reportProgress?.({
      index: 0,
      total: 0,
      percent: 0,
      label: `Reading ${this.descriptor.name} library`,
    });

    // A cross-origin library request only succeeds when the server answers the
    // preflight with Access-Control-Allow-Origin. The browser rejects the
    // fetch with a bare "Failed to fetch" before any response is readable, so
    // name the cause and the origin the server has to allow.
    let response: Response;
    try {
      response = await fetch(url, {
        method: library.method ?? "GET",
        headers: expandHeaders(library.headers, await this.requestValues(source)),
        ...(library.body ? { body: library.body } : {}),
      });
    } catch {
      throw new Error(
        `${this.descriptor.name} could not reach ${url}. The server must allow cross-origin requests from ${globalThis.location?.origin ?? "this app"} (Access-Control-Allow-Origin), including a preflight for ${library.method ?? "GET"}.`
      );
    }
    if (!response.ok) {
      throw new Error(
        `${this.descriptor.name} library request failed (${response.status})`
      );
    }

    // One read of the body, then either an XML record split or a JSON path.
    const text = await response.text();
    if (options.isCancelled?.()) return [];

    let list: unknown[];
    if (library.recordTag) {
      list = parseXmlRecords(text, library.recordTag);
    } else {
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        return [];
      }
      const found = library.resultsPath
        ? readPath(data, library.resultsPath)
        : data;
      list = Array.isArray(found) ? found : [];
    }
    if (!list.length) return [];

    const songs: Song[] = [];
    for (const record of list) {
      if (typeof record !== "object" || record === null) continue;

      const remoteId = readString(record, library.fields.id);
      const title = readString(record, library.fields.title);
      const artist = readString(record, library.fields.artist);
      if (!remoteId || !title || !artist) continue;

      const album = readString(record, library.fields.album);
      const albumArtist = readString(record, library.fields.albumArtist);
      const relativePath =
        readString(record, library.fields.path) ??
        `${artist}/${album ?? "Unknown"}/${title}`;
      const coverArtUrl = readString(record, library.fields.coverArtUrl);

      songs.push({
        id: sourceUri(source, remoteId),
        sourceId: source.id,
        relativePath,
        filename: relativePath.split("/").pop() ?? title,
        filesize: readNumber(record, library.fields.fileSize) ?? 0,
        title,
        artist,
        ...(album ? { album } : {}),
        ...(albumArtist ? { albumArtist } : {}),
        ...(readString(record, library.fields.genre)
          ? { genre: readString(record, library.fields.genre) }
          : {}),
        ...(readNumber(record, library.fields.year) !== undefined
          ? { year: readNumber(record, library.fields.year) }
          : {}),
        ...(readNumber(record, library.fields.track) !== undefined
          ? { track: readNumber(record, library.fields.track) }
          : {}),
        ...(readNumber(record, library.fields.discNumber) !== undefined
          ? { discNumber: readNumber(record, library.fields.discNumber) }
          : {}),
        ...(readNumber(record, library.fields.duration) !== undefined
          ? { duration: readNumber(record, library.fields.duration) }
          : {}),
        ...(readNumber(record, library.fields.bitrate) !== undefined
          ? { bitrate: readNumber(record, library.fields.bitrate) }
          : {}),
        ...(coverArtUrl
          ? {
              pictures: [
                {
                  type: ArtworkType.FrontCover,
                  mimeType: "image/jpeg",
                  url: coverArtUrl,
                },
              ],
            }
          : {}),
      });
    }

    options.reportProgress?.({
      index: songs.length,
      total: songs.length,
      percent: 1,
      label: `Read ${songs.length} songs`,
    });

    return songs;
  }

  async collectSongChanges(): Promise<SongChanges | null> {
    return null;
  }

  async resolvePictureBytes(
    pic: { data?: Uint8Array; url?: string }
  ): Promise<Uint8Array | null> {
    if (pic.data) return pic.data;
    if (!pic.url) return null;

    try {
      const response = await fetch(pic.url);
      if (!response.ok) return null;
      return new Uint8Array(await response.arrayBuffer());
    } catch {
      return null;
    }
  }
}
