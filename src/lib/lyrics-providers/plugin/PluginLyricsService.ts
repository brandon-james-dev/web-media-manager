import type { LyricsResult } from "@/core/contracts";
import type {
  PluginLyricsFieldMap,
  PluginLyricsProviderDescriptor,
  PluginLyricsQueryField,
} from "@/core/plugins";
import type {
  ILyricsLookupOptions,
  ILyricsQuery,
  ILyricsService,
} from "../ILyricsService";

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

function readBoolean(
  record: unknown,
  key: string | undefined
): boolean | undefined {
  if (!key) return undefined;
  const value = readPath(record, key);
  return typeof value === "boolean" ? value : undefined;
}

/** Maps one response record through the manifest's field map. */
function mapRecord(
  record: unknown,
  fields: PluginLyricsFieldMap,
  source: string
): LyricsResult | null {
  if (typeof record !== "object" || record === null) {
    return null;
  }

  const title = readString(record, fields.title);
  const artist = readString(record, fields.artist);
  if (!title || !artist) {
    return null;
  }

  const rawId = fields.id ? readPath(record, fields.id) : undefined;
  const id =
    typeof rawId === "string" || typeof rawId === "number" ? rawId : undefined;
  const album = readString(record, fields.album);
  const duration = readNumber(record, fields.duration);
  const plainLyrics = readString(record, fields.plainLyrics);
  const syncedLyrics = readString(record, fields.syncedLyrics);
  const hasWordSync = readBoolean(record, fields.hasWordSync);
  const instrumental = readBoolean(record, fields.instrumental);

  return {
    source,
    ...(id !== undefined ? { id } : {}),
    title,
    artist,
    ...(album ? { album } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(plainLyrics ? { plainLyrics } : {}),
    ...(syncedLyrics ? { syncedLyrics } : {}),
    ...(hasWordSync !== undefined ? { hasWordSync } : {}),
    ...(instrumental !== undefined ? { instrumental } : {}),
  };
}

/**
 * A lyrics provider driven by a plugin's declarative descriptor.
 *
 * The plugin supplies an endpoint and a field map; the host performs the
 * request and maps the response. No third-party code runs to answer a lookup,
 * which is what lets a lyrics plugin be installed from a ZIP without a runtime.
 *
 * @example
 * ```ts
 * const service = new PluginLyricsService(manifest.provider);
 * const results = await service.search({ title, artist });
 * ```
 */
export class PluginLyricsService implements ILyricsService {
  readonly provider: string;
  private readonly descriptor: PluginLyricsProviderDescriptor;

  constructor(descriptor: PluginLyricsProviderDescriptor) {
    this.descriptor = descriptor;
    this.provider = descriptor.id;
  }

  async search(
    query: ILyricsQuery,
    options: ILyricsLookupOptions = {}
  ): Promise<LyricsResult[] | null> {
    const { search } = this.descriptor;
    const params = new URLSearchParams();

    for (const [field, param] of Object.entries(search.params ?? {})) {
      const value = query[field as PluginLyricsQueryField];
      if (value === undefined || value === "") {
        continue;
      }
      params.set(param, String(value));
    }

    const queryString = params.toString();
    const url = queryString ? `${search.url}?${queryString}` : search.url;
    const response = await fetch(url, { headers: search.headers });

    if (options.isCancelled?.()) return null;
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
      .filter((result): result is LyricsResult => result !== null);

    return results.length ? results : null;
  }
}
