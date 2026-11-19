import type {
  ILyricsLookupOptions,
  ILyricsQuery,
  ILyricsResult,
  ILyricsService,
  ILyricsServiceConfig,
} from "../ILyricsService";
import { LyricsProvider } from "../LyricsProvider";
import type { ILrcLibSearchResult } from "./ILrcLibSearchResult";

const SEARCH_URL = "https://lrclib.net/api/search";

// LRCLIB asks every client to identify itself so it can raise the per-IP
// rate limit above the anonymous bucket.
const CLIENT_HEADER =
  "web-media-manager (https://github.com/brandon-james-dev/web-media-manager)";

/**
 * LRCLIB strategy: a free, keyless lyrics database. A registered application
 * id is optional — it only raises the rate limit — so the service works with
 * or without one.
 */
export class LrcLibLyricsService implements ILyricsService {
  readonly provider = LyricsProvider.LrcLib;
  private readonly config: ILyricsServiceConfig;

  constructor(config: ILyricsServiceConfig = {}) {
    this.config = config;
  }

  async search(
    query: ILyricsQuery,
    options: ILyricsLookupOptions = {}
  ): Promise<ILyricsResult[] | null> {
    const params = new URLSearchParams();
    if (query.title) params.set("track_name", query.title);
    if (query.artist) params.set("artist_name", query.artist);
    if (query.album) params.set("album_name", query.album);

    // LRCLIB needs at least a track name to search.
    if (!params.has("track_name")) return null;

    const headers: Record<string, string> = { "Lrclib-Client": CLIENT_HEADER };
    const applicationId = this.config.applicationId?.trim();
    if (applicationId) headers["Lrclib-App-Id"] = applicationId;

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, { headers });

    if (options.isCancelled?.()) return null;
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`LRCLIB search failed (${res.status})`);
    }

    const data = (await res.json()) as ILrcLibSearchResult[];
    if (!Array.isArray(data) || data.length === 0) return null;

    return data.map((entry) => ({
      source: LyricsProvider.LrcLib,
      id: entry.id,
      title: entry.trackName,
      artist: entry.artistName,
      album: entry.albumName,
      duration: entry.duration,
      plainLyrics: entry.plainLyrics ?? undefined,
      syncedLyrics: entry.syncedLyrics ?? undefined,
      hasWordSync: entry.hasWordSync,
      instrumental: entry.instrumental,
    }));
  }
}
