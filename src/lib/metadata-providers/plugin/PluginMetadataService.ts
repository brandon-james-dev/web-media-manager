import type { MetadataResult } from "@/core/contracts";
import type {
  PluginMetadataFieldMap,
  PluginMetadataProviderDescriptor,
  PluginMetadataQueryField,
} from "@/core/visualizers";
import { expandHeaders } from "@/lib/plugins";
import { getPluginSettingSecret } from "@/lib/secrets/pluginSettingSecrets";
import { getVisualizerPluginManager } from "../../visualizers/getPluginManager";
import type { IOnlineMetadataService } from "../online/IOnlineMetadataService";

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

function readString(
  record: unknown,
  key: string | undefined
): string | undefined {
  if (!key) return undefined;
  const value = readPath(record, key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(
  record: unknown,
  key: string | undefined
): number | undefined {
  if (!key) return undefined;
  const value = readPath(record, key);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Maps one response record through the manifest's field map. */
function mapRecord(
  record: unknown,
  fields: PluginMetadataFieldMap,
  source: string
): MetadataResult | null {
  if (typeof record !== "object" || record === null) {
    return null;
  }

  const title = readString(record, fields.title);
  const artist = readString(record, fields.artist);
  if (!title || !artist) {
    return null;
  }

  const album = readString(record, fields.album);
  const albumArtist = readString(record, fields.albumArtist);
  const genre = readString(record, fields.genre);
  const year = readNumber(record, fields.year);
  const date = readString(record, fields.date);
  const track = readNumber(record, fields.track);
  const discNumber = readNumber(record, fields.discNumber);
  const duration = readNumber(record, fields.duration);
  const isrc = readString(record, fields.isrc);
  const label = readString(record, fields.label);
  const composer = readString(record, fields.composer);
  const coverArtUrl = readString(record, fields.coverArtUrl);

  return {
    source,
    title,
    artist,
    ...(album ? { album } : {}),
    ...(albumArtist ? { albumArtist } : {}),
    ...(genre ? { genre } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(date ? { date } : {}),
    ...(track !== undefined ? { track } : {}),
    ...(discNumber !== undefined ? { discNumber } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(isrc ? { isrc } : {}),
    ...(label ? { label } : {}),
    ...(composer ? { composer } : {}),
    ...(coverArtUrl
      ? {
          pictures: [
            {
              mimeType: "image/jpeg",
              url: coverArtUrl,
              type: "FrontCover",
              description: "Front Cover",
            },
          ],
        }
      : {}),
  };
}

/**
 * A metadata provider driven by a plugin's declarative descriptor.
 *
 * The plugin supplies an endpoint and a field map; the host performs the
 * request and maps the response. No third-party code runs to answer a lookup,
 * which is what lets a metadata plugin be installed from a ZIP without a
 * runtime.
 *
 * @example
 * ```ts
 * const service = new PluginMetadataService(manifest.provider);
 * const results = await service.lookup("kind of blue");
 * ```
 */
export class PluginMetadataService implements IOnlineMetadataService {
  readonly provider: string;
  private readonly descriptor: PluginMetadataProviderDescriptor;
  private readonly pluginId: string | undefined;

  constructor(
    descriptor: PluginMetadataProviderDescriptor,
    pluginId?: string
  ) {
    this.descriptor = descriptor;
    this.pluginId = pluginId;
    this.provider = descriptor.id;
  }

  /**
   * Values a header template can reference: every declared setting, with a
   * secret read from the encrypted store rather than the settings row.
   */
  private async settingValues(): Promise<Record<string, string | undefined>> {
    const pluginId = this.pluginId;
    if (!pluginId) {
      return {};
    }

    const manager = getVisualizerPluginManager();
    const plugin = await manager.get(pluginId);
    const settings = await manager.getSettings(pluginId);
    const values: Record<string, string | undefined> = {};

    for (const descriptor of plugin?.manifest.settings ?? []) {
      if (descriptor.type === "string" && descriptor.secret) {
        values[descriptor.key] =
          (await getPluginSettingSecret(pluginId, descriptor.key)) ?? undefined;
        continue;
      }
      const value = settings[descriptor.key];
      if (value !== undefined) {
        values[descriptor.key] = String(value);
      }
    }

    return values;
  }

  async lookup(query: string): Promise<MetadataResult[] | null> {
    const { search } = this.descriptor;
    const params = new URLSearchParams();

    // The panels pass "title|artist|album" for structured providers, the same
    // shape the built-ins split themselves.
    const [title, artist, album] = query.split("|").map((part) => part.trim());
    const queryFields: Record<PluginMetadataQueryField, string> = {
      title,
      artist,
      album,
    };

    for (const [field, param] of Object.entries(search.params ?? {})) {
      const value = queryFields[field as PluginMetadataQueryField];
      if (value === undefined || value === "") {
        continue;
      }
      params.set(String(param), value);
    }

    const url = new URL(search.url);
    for (const [key, value] of params) {
      url.searchParams.set(key, value);
    }

    const headers = expandHeaders(search.headers, await this.settingValues());
    const response = await fetch(url.toString(), { headers });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(
        `${this.descriptor.name} search failed (${response.status})`
      );
    }

    const data: unknown = await response.json();
    const records = search.resultsPath
      ? readPath(data, search.resultsPath)
      : data;

    if (!Array.isArray(records)) {
      return null;
    }

    const results = records
      .map((record) => mapRecord(record, search.fields, this.provider))
      .filter((result): result is MetadataResult => result !== null);

    return results.length ? results : null;
  }
}
