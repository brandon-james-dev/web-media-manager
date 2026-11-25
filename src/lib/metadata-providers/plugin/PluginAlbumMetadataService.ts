import type {
  AlbumMetadataResult,
  AlbumMetadataTrack,
  MetadataPicture,
} from "@/core/contracts";
import type {
  PluginAlbumFieldMap,
  PluginAlbumSearchDescriptor,
  PluginMetadataProviderDescriptor,
  PluginMetadataQueryField,
} from "@/core/plugins";
import { expandHeaders } from "@/lib/plugins";
import {
  buildPluginUrl,
  pluginSettingValues,
  readNumberField,
  readPath,
  readStringField,
  readYearField,
  resolvePluginAuthHeader,
} from "./pluginRequest";

/** Maps one album record through the manifest's field map. */
function mapAlbum(
  record: unknown,
  fields: PluginAlbumFieldMap,
  source: string
): AlbumMetadataResult | null {
  if (typeof record !== "object" || record === null) {
    return null;
  }

  const id = readStringField(record, fields.id);
  const title = readStringField(record, fields.title);
  if (!id || !title) {
    return null;
  }

  const artist = readStringField(record, fields.artist);
  const albumArtist = readStringField(record, fields.albumArtist);
  const genre = readStringField(record, fields.genre);
  const year = readYearField(record, fields.year);
  const trackCount = readNumberField(record, fields.trackCount);
  const coverArtUrl = readStringField(record, fields.coverArtUrl);

  return {
    source,
    id,
    title,
    ...(artist ? { artist } : {}),
    ...(albumArtist ? { albumArtist } : {}),
    ...(genre ? { genre } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(trackCount !== undefined ? { trackCount } : {}),
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
 * Album lookups driven by a plugin's declarative descriptor.
 *
 * The album search and the track list are two separate requests, so a plugin
 * declares both. `tracks.url` is a template over `{id}`, the album id the
 * search returned, which keeps the track fetch lazy: it runs only when a
 * result is applied.
 *
 * @example
 * ```ts
 * const service = new PluginAlbumMetadataService(manifest.provider);
 * const albums = await service.searchAlbums("|Panic! at the Disco|");
 * ```
 */
export class PluginAlbumMetadataService {
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

  private get albumSearch(): PluginAlbumSearchDescriptor | undefined {
    return this.descriptor.albumSearch;
  }

  /** Headers for a request: expanded templates plus the auth token. */
  private async requestHeaders(
    headers: Record<string, string> | undefined
  ): Promise<Record<string, string>> {
    const values = await pluginSettingValues(this.pluginId);
    const resolved = expandHeaders(headers, values) ?? {};
    const authHeader = await resolvePluginAuthHeader(
      this.descriptor.auth,
      this.descriptor.name,
      values
    );
    if (authHeader) {
      resolved[authHeader.header] = authHeader.value;
    }
    return resolved;
  }

  async searchAlbums(
    query: string
  ): Promise<AlbumMetadataResult[] | null> {
    const albumSearch = this.albumSearch;
    if (!albumSearch) {
      return null;
    }

    const [title, artist, album] = query.split("|").map((part) => part.trim());
    const queryFields: Record<PluginMetadataQueryField, string> = {
      title,
      artist,
      album,
    };

    const params: Record<string, string> = {};
    for (const [field, param] of Object.entries(albumSearch.params ?? {})) {
      const value = queryFields[field as PluginMetadataQueryField];
      if (value === undefined || value === "") {
        continue;
      }
      params[String(param)] = value;
    }

    // A provider that maps one field to its query parameter sends nothing when
    // that field is blank — Spotify maps `album` to `q`, so an album search
    // with an empty Album box would go out with no `q` at all and be rejected.
    // Fall back to whatever the other fields hold.
    if (Object.keys(params).length === 0) {
      const fallback = [album, title, artist]
        .filter((part): part is string => Boolean(part))
        .join(" ");
      const param = Object.values(albumSearch.params ?? {})[0];
      if (fallback && param) {
        params[String(param)] = fallback;
      }
    }

    const response = await fetch(
      buildPluginUrl(albumSearch.url, params, albumSearch.query),
      {
        method: albumSearch.method ?? "GET",
        headers: await this.requestHeaders(albumSearch.headers),
      }
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(
        `${this.descriptor.name} album search failed (${response.status})`
      );
    }

    const data: unknown = await response.json();
    const records = albumSearch.resultsPath
      ? readPath(data, albumSearch.resultsPath)
      : data;
    if (!Array.isArray(records)) {
      return null;
    }

    const mapped: { album: AlbumMetadataResult; record: unknown }[] = [];
    for (const record of records) {
      const album = mapAlbum(record, albumSearch.fields, this.provider);
      if (album) {
        mapped.push({ album, record });
      }
    }

    if (!albumSearch.detail) {
      return mapped.map((entry) => entry.album);
    }

    const detail = albumSearch.detail;
    return await Promise.all(
      mapped.map((entry) => this.enrichAlbum(entry.album, entry.record, detail))
    );
  }

  /**
   * Fill fields the album search omits, one request per album.
   *
   * The search wins: a detail field only fills a key the search left unset, and
   * a failed detail request leaves the search result intact rather than failing
   * the whole lookup.
   */
  private async enrichAlbum(
    album: AlbumMetadataResult,
    record: unknown,
    detail: NonNullable<PluginAlbumSearchDescriptor["detail"]>
  ): Promise<AlbumMetadataResult> {
    let missing = false;
    const url = detail.url.replace(/\{([^{}]+)\}/g, (_match, path: string) => {
      const value = readPath(record, path);
      if (value === undefined || value === null || value === "") {
        missing = true;
        return "";
      }
      return encodeURIComponent(String(value));
    });
    if (missing) {
      return album;
    }

    let data: unknown;
    try {
      const response = await fetch(buildPluginUrl(url, {}, detail.query), {
        method: "GET",
        headers: await this.requestHeaders(detail.headers),
      });
      if (!response.ok) {
        return album;
      }
      data = await response.json();
    } catch {
      return album;
    }

    const target = detail.resultsPath ? readPath(data, detail.resultsPath) : data;
    const genre =
      album.genre ?? readStringField(target, detail.fields.genre);
    const year = album.year ?? readYearField(target, detail.fields.year);
    const trackCount =
      album.trackCount ?? readNumberField(target, detail.fields.trackCount);
    const coverArtUrl =
      album.pictures?.[0]?.url ??
      readStringField(target, detail.fields.coverArtUrl);

    return {
      ...album,
      ...(genre ? { genre } : {}),
      ...(year !== undefined ? { year } : {}),
      ...(trackCount !== undefined ? { trackCount } : {}),
      ...(coverArtUrl && !album.pictures
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

  async lookupAlbumTracks(
    album: AlbumMetadataResult
  ): Promise<AlbumMetadataResult | null> {
    const tracks = this.albumSearch?.tracks;
    if (!tracks) {
      return album;
    }

    const url = tracks.url.replaceAll("{id}", encodeURIComponent(album.id));
    const response = await fetch(buildPluginUrl(url, {}, tracks.query), {
      method: "GET",
      headers: await this.requestHeaders(tracks.headers),
    });

    if (!response.ok) {
      throw new Error(
        `${this.descriptor.name} track list failed (${response.status})`
      );
    }

    const data: unknown = await response.json();
    const records = tracks.resultsPath
      ? readPath(data, tracks.resultsPath)
      : data;
    if (!Array.isArray(records)) {
      return album;
    }

    const mapped: AlbumMetadataTrack[] = [];
    for (const record of records) {
      const title = readStringField(record, tracks.fields.title);
      if (!title) {
        continue;
      }
      const track = readNumberField(record, tracks.fields.track);
      const discNumber = readNumberField(record, tracks.fields.discNumber);
      mapped.push({
        title,
        ...(track !== undefined ? { track } : {}),
        ...(discNumber !== undefined ? { discNumber } : {}),
      });
    }

    return { ...album, tracks: mapped };
  }

  async searchAlbumArt(query: string): Promise<MetadataPicture[] | null> {
    const albums = await this.searchAlbums(query);
    if (!albums) {
      return null;
    }

    return albums
      .map((album) => album.pictures?.[0])
      .filter((picture): picture is MetadataPicture => picture !== undefined);
  }
}
