import type { MetadataResult } from "@/core/contracts";
import type {
  PluginMetadataDetailFieldMap,
  PluginMetadataFieldMap,
  PluginMetadataProviderDescriptor,
  PluginMetadataQueryField,
} from "@/core/plugins";
import { expandHeaders, expandTemplate } from "@/lib/plugins";
import { notification$ } from "@/events/notification-events";
import type { IOnlineMetadataService } from "../online/IOnlineMetadataService";
import {
  pluginSettingValues,
  readNumberField as readNumber,
  readPath,
  readStringField as readString,
  readYearField,
  resolvePluginAuthHeader,
} from "./pluginRequest";

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
  const year = readYearField(record, fields.year);
  const date = readString(record, fields.date);
  const track = readNumber(record, fields.track);
  const discNumber = readNumber(record, fields.discNumber);
  const totalTracks = readNumber(record, fields.totalTracks);
  const totalDiscs = readNumber(record, fields.totalDiscs);
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
    ...(totalTracks !== undefined ? { totalTracks } : {}),
    ...(totalDiscs !== undefined ? { totalDiscs } : {}),
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

/** Substitutes `{dot.path}` placeholders from a search record. */
function expandRecordTemplate(template: string, record: unknown): string {
  return template.replace(/\{([^{}]+)\}/g, (_match, path: string) => {
    const value = readPath(record, path.trim());
    return value === undefined || value === null ? "" : String(value);
  });
}

/** Maps a detail record through the manifest's optional field map. */
function mapDetailFields(
  record: unknown,
  fields: PluginMetadataDetailFieldMap
): Partial<MetadataResult> {
  if (typeof record !== "object" || record === null) {
    return {};
  }

  const album = readString(record, fields.album);
  const albumArtist = readString(record, fields.albumArtist);
  const genre = readString(record, fields.genre);
  const year = readYearField(record, fields.year);
  const date = readString(record, fields.date);
  const track = readNumber(record, fields.track);
  const discNumber = readNumber(record, fields.discNumber);
  const totalTracks = readNumber(record, fields.totalTracks);
  const totalDiscs = readNumber(record, fields.totalDiscs);
  const duration = readNumber(record, fields.duration);
  const isrc = readString(record, fields.isrc);
  const label = readString(record, fields.label);
  const composer = readString(record, fields.composer);
  const coverArtUrl = readString(record, fields.coverArtUrl);

  return {
    ...(album ? { album } : {}),
    ...(albumArtist ? { albumArtist } : {}),
    ...(genre ? { genre } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(date ? { date } : {}),
    ...(track !== undefined ? { track } : {}),
    ...(discNumber !== undefined ? { discNumber } : {}),
    ...(totalTracks !== undefined ? { totalTracks } : {}),
    ...(totalDiscs !== undefined ? { totalDiscs } : {}),
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

/** Copies only the keys the search left unset, so a search field always wins. */
function fillGaps(result: MetadataResult, extra: Partial<MetadataResult>): void {
  const target = result as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && target[key] === undefined) {
      target[key] = value;
    }
  }
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
    // Literal parameters the provider requires on every search, e.g. Apple's
    // `types=songs` or Spotify's `type=track`.
    for (const [key, value] of Object.entries(search.query ?? {})) {
      url.searchParams.set(key, value);
    }

    const values = await pluginSettingValues(this.pluginId);
    const headers = expandHeaders(search.headers, values) ?? {};
    const authHeader = await resolvePluginAuthHeader(
      this.descriptor.auth,
      this.descriptor.name,
      values
    );
    if (authHeader) {
      headers[authHeader.header] = authHeader.value;
    }

    const method = search.method ?? "GET";
    const body =
      method === "POST" && search.body
        ? expandTemplate(search.body, values)
        : undefined;

    const response = await fetch(url.toString(), {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(
        `${this.descriptor.name} search failed (${response.status})`
      );
    }

    const maxPages = Math.max(1, search.maxPages ?? 1);
    const nextPath = search.resultsPath
      ? `${search.resultsPath.replace(/[^.]*$/, "")}next`
      : undefined;

    const results: { record: unknown; result: MetadataResult }[] = [];
    let pageUrl: string | undefined = url.toString();
    let page = 0;

    while (pageUrl && page < maxPages) {
      const pageResponse =
        page === 0 ? response : await fetch(pageUrl, { headers });
      if (!pageResponse.ok) {
        break;
      }

      const data: unknown = await pageResponse.json();
      const records = search.resultsPath
        ? readPath(data, search.resultsPath)
        : data;
      if (!Array.isArray(records)) {
        break;
      }

      for (const record of records) {
        const result = mapRecord(record, search.fields, this.provider);
        if (result) {
          results.push({ record, result });
        }
      }

      page++;
      const next = nextPath ? readPath(data, nextPath) : undefined;
      pageUrl = typeof next === "string" && next ? next : undefined;
    }

    if (!results.length) {
      return null;
    }

    // A second request per record for fields the search omits, e.g. Spotify's
    // artist genres. Failures leave the search result as it was rather than
    // discarding a usable match.
    if (search.detail) {
      const detail = search.detail;
      await Promise.all(
        results.map(async (entry) => {
          try {
            const detailUrl = expandRecordTemplate(detail.url, entry.record);
            if (!detailUrl) {
              return;
            }
            const detailHeaders = {
              ...headers,
              ...expandHeaders(detail.headers, values),
            };
            const detailResponse = await fetch(detailUrl, {
              headers: detailHeaders,
            });
            if (!detailResponse.ok) {
              return;
            }
            const detailData: unknown = await detailResponse.json();
            fillGaps(entry.result, mapDetailFields(detailData, detail.fields));
          } catch (error) {
            // Keep the search result; the detail request is an enrichment. The
            // failure is surfaced rather than swallowed, because a silently
            // failing enrichment looks identical to a provider with no data.
            notification$.next({
              id: `metadata-detail-${this.provider}`,
              title: this.descriptor.name,
              state: "error",
              kind: "metadata",
              detail:
                error instanceof Error
                  ? error.message
                  : `Detail request failed for ${this.descriptor.name}.`,
            });
          }
        })
      );
    }

    return results.map((entry) => entry.result);
  }
}
