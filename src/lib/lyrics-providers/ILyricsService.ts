import type { LyricsProvider } from "./LyricsProvider";

/**
 * What the caller knows about the track it wants lyrics for. Providers match
 * on whatever they support; `duration` disambiguates versions of a song.
 */
export interface ILyricsQuery {
  title: string;
  artist: string;
  album?: string;
  /** Track length in seconds. */
  duration?: number;
}

/** One lyrics record returned by a provider. */
export interface ILyricsResult {
  source: LyricsProvider;
  /** Provider-assigned record id, when the provider has one. */
  id?: number | string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  /** Plain text, one line per lyric line. */
  plainLyrics?: string;
  /** LRC text with `[mm:ss.xx]` timestamps, when the provider has it. */
  syncedLyrics?: string;
  /** True when the timestamps are per word rather than per line. */
  hasWordSync?: boolean;
  instrumental?: boolean;
}

/** Per-provider configuration, read from settings before a lookup. */
export interface ILyricsServiceConfig {
  /** Registered application id, sent to providers that rate-limit per app. */
  applicationId?: string;
}

export interface ILyricsLookupOptions {
  isCancelled?: () => boolean;
  reportProgress?: (progress: any) => void;
}

/**
 * The strategy every lyrics provider implements. A provider turns a track
 * query into candidate lyrics records; the UI decides which one to apply.
 */
export interface ILyricsService {
  readonly provider: LyricsProvider;
  search(
    query: ILyricsQuery,
    options?: ILyricsLookupOptions
  ): Promise<ILyricsResult[] | null>;
}
